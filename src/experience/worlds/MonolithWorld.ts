import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import type { FrameState, Quality, WorldInstance } from "../types";
import {
  addDirectional,
  contactShadow,
  disposeTree,
  easeRange,
  fitObjectCamera,
  idleFrame,
  unit,
} from "./shared";

type Piece = {
  group: THREE.Group;
  rest: THREE.Vector3;
  travel: THREE.Vector3;
  turn: THREE.Euler;
};
type Point = [number, number];

function shapeOf(points: Point[]): THREE.Shape {
  const shape = new THREE.Shape();
  points.forEach(([x, y], index) =>
    index ? shape.lineTo(x, y) : shape.moveTo(x, y),
  );
  shape.closePath();
  return shape;
}

function gear(
  radius: number,
  teeth: number,
  material: THREE.Material,
): THREE.Group {
  const shape = new THREE.Shape();
  for (let i = 0; i < teeth * 4; i++) {
    const angle = (i / (teeth * 4)) * Math.PI * 2;
    const r = radius * (i % 4 === 1 || i % 4 === 2 ? 1 : 0.91);
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const opening = new THREE.Path();
  opening.absarc(0, 0, radius * 0.73, 0, Math.PI * 2, true);
  shape.holes.push(opening);
  const body = new THREE.ExtrudeGeometry(shape, {
    depth: 0.055,
    steps: 1,
    bevelEnabled: true,
    bevelSize: 0.004,
    bevelThickness: 0.004,
    bevelSegments: 1,
    curveSegments: 36,
  });
  body.translate(0, 0, -0.028);
  const group = new THREE.Group();
  group.add(new THREE.Mesh(body, material));
  const spokes = new THREE.InstancedMesh(
    new THREE.BoxGeometry(radius * 0.75, radius * 0.055, 0.035),
    material,
    5,
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    dummy.position.set(
      Math.cos(angle) * radius * 0.34,
      Math.sin(angle) * radius * 0.34,
      0,
    );
    dummy.rotation.set(0, 0, angle);
    dummy.updateMatrix();
    spokes.setMatrixAt(i, dummy.matrix);
  }
  spokes.instanceMatrix.needsUpdate = true;
  group.add(spokes);
  const axle = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.11, radius * 0.11, 0.11, 20),
    material,
  );
  axle.rotation.x = Math.PI / 2;
  group.add(axle);
  return group;
}

/** Three cut crystal/metal planes form the author's mark and reveal its interior. */
export class MonolithWorld implements WorldInstance {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(34, 1, 0.03, 100);
  private sculpture = new THREE.Group();
  private pieces: Piece[] = [];
  private interiors: THREE.Group[] = [];
  private gears: THREE.Group[] = [];
  private glass: THREE.MeshPhysicalMaterial;
  private reflector: Reflector;
  private particles: THREE.Points;
  private pulse = { value: 0 };
  private pulsePhase = { value: 0 };
  private pulseCenter = { value: new THREE.Vector2() };
  private smoke = new THREE.Color("#526575");
  private silver = new THREE.Color("#c5d3df");
  private frame = idleFrame();
  private quality: Quality;
  private width = 900;
  private height = 800;
  private disposed = false;
  private direction = new THREE.Vector3(0.43, 0.15, 1).normalize();
  private baseCamera = new THREE.Vector3();
  private target = new THREE.Vector3();

  constructor(quality: Quality) {
    this.quality = quality;
    this.sculpture.name = "LOXNE / three cut planes";
    this.scene.add(this.sculpture);
    this.glass = new THREE.MeshPhysicalMaterial({
      name: "Smoked optical crystal",
      color: this.smoke,
      metalness: 0.06,
      roughness: 0.11,
      transmission: 0.86,
      thickness: 0.54,
      ior: 1.43,
      attenuationColor: "#4a6579",
      attenuationDistance: 1.8,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      envMapIntensity: 0.85,
    });
    this.glass.onBeforeCompile = (shader) => {
      shader.uniforms.uSurfaceImpulse = this.pulse;
      shader.uniforms.uSurfacePhase = this.pulsePhase;
      shader.uniforms.uSurfaceCenter = this.pulseCenter;
      shader.vertexShader = `uniform float uSurfaceImpulse;\nuniform float uSurfacePhase;\nuniform vec2 uSurfaceCenter;\n${shader.vertexShader}`;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `
        #include <begin_vertex>
        float waveRadius = length(position.xy - uSurfaceCenter);
        float wave = sin(waveRadius * 13.0 - uSurfacePhase * 8.0);
        transformed.z += wave * exp(-waveRadius * 1.35) * uSurfaceImpulse * 0.038;
      `,
      );
    };
    this.glass.customProgramCacheKey = () => "loxne-monolith-local-impulse-v1";
    const metal = new THREE.MeshStandardMaterial({
      name: "Satin silver cut edges",
      color: "#9aaeba",
      metalness: 0.96,
      roughness: 0.23,
      envMapIntensity: 1.25,
    });
    const innerMetal = new THREE.MeshStandardMaterial({
      name: "Interior warm brass",
      color: "#a18554",
      metalness: 0.94,
      roughness: 0.3,
      envMapIntensity: 0.9,
    });
    const darkMetal = new THREE.MeshStandardMaterial({
      name: "Interior graphite architecture",
      color: "#324553",
      metalness: 0.82,
      roughness: 0.32,
    });
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: "#9ac8ee",
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    });

    const definitions: Array<{
      shape: Point[];
      pivot: [number, number, number];
      travel: [number, number, number];
      turn: [number, number, number];
    }> = [
      {
        shape: [
          [-1.52, -1.8],
          [-0.91, -1.62],
          [-0.78, 1.43],
          [-1.48, 1.95],
        ],
        pivot: [-1.15, 0.05, 0],
        travel: [-0.5, 0.08, 0.28],
        turn: [0, -0.24, -0.06],
      },
      {
        shape: [
          [-0.55, -0.16],
          [1.28, 0.55],
          [1.85, 1.62],
          [0.12, 1.39],
        ],
        pivot: [0.63, 0.72, -0.03],
        travel: [0.5, 0.42, -0.22],
        turn: [-0.08, 0.2, 0.1],
      },
      {
        shape: [
          [-0.56, -1.8],
          [1.98, -1.8],
          [0.63, -0.21],
          [0.22, -0.59],
        ],
        pivot: [0.72, -1.2, 0.03],
        travel: [0.33, -0.24, 0.38],
        turn: [0.1, -0.15, -0.08],
      },
    ];
    definitions.forEach((definition, index) => {
      const group = new THREE.Group();
      group.name = [
        "cut-plane / spine",
        "cut-plane / rising wing",
        "cut-plane / lower wing",
      ][index];
      const rest = new THREE.Vector3(...definition.pivot);
      group.position.copy(rest);
      const content = new THREE.Group();
      content.position.set(-rest.x, -rest.y, 0);
      group.add(content);
      const geometry = new THREE.ExtrudeGeometry(shapeOf(definition.shape), {
        depth: 0.5,
        steps: 1,
        bevelEnabled: true,
        bevelThickness: 0.025,
        bevelSize: 0.022,
        bevelSegments: 3,
        curveSegments: 12,
      });
      geometry.translate(0, 0, -0.25);
      content.add(new THREE.Mesh(geometry, [this.glass, metal]));
      content.add(
        new THREE.LineSegments(
          new THREE.EdgesGeometry(geometry, 25),
          edgeMaterial,
        ),
      );
      const interior = new THREE.Group();
      content.add(interior);
      this.interiors.push(interior);
      this.sculpture.add(group);
      this.pieces.push({
        group,
        rest,
        travel: new THREE.Vector3(...definition.travel),
        turn: new THREE.Euler(...definition.turn),
      });
    });

    const makeGear = (
      where: number,
      x: number,
      y: number,
      radius: number,
      teeth: number,
      depth: number,
    ) => {
      const item = gear(radius, teeth, innerMetal);
      item.position.set(x, y, depth);
      this.interiors[where].add(item);
      this.gears.push(item);
    };
    makeGear(0, -1.18, 0.73, 0.245, 28, 0.03);
    makeGear(0, -1.2, -0.48, 0.205, 24, -0.05);
    makeGear(1, 0.63, 0.91, 0.29, 32, 0.03);
    makeGear(2, 0.91, -1.3, 0.39, 36, 0.02);
    makeGear(2, 0.15, -1.48, 0.175, 20, -0.04);

    // Small floors, rails and apertures suggest architecture inside the cut planes.
    const ribs = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.39, 0.018, 0.14),
      darkMetal,
      8,
    );
    const pose = new THREE.Object3D();
    for (let i = 0; i < 8; i++) {
      pose.position.set(-1.19, -1.42 + i * 0.42, -0.06);
      pose.updateMatrix();
      ribs.setMatrixAt(i, pose.matrix);
    }
    ribs.instanceMatrix.needsUpdate = true;
    this.interiors[0].add(ribs);
    for (const [where, x, y, height] of [
      [0, -1.37, 0.02, 3.25],
      [0, -0.99, 0.02, 3.1],
      [1, 1.0, 0.91, 0.74],
      [1, 0.2, 0.65, 0.45],
      [2, 1.35, -1.38, 0.6],
    ]) {
      const column = new THREE.Mesh(
        new THREE.BoxGeometry(0.027, height, 0.12),
        darkMetal,
      );
      column.position.set(x, y, -0.07);
      this.interiors[where].add(column);
    }
    for (let i = 0; i < 4; i++) {
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.025, 0.18),
        metal,
      );
      panel.position.set(1.02, 0.66 + i * 0.16, -0.07);
      this.interiors[1].add(panel);
    }
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.52, 0.011, 6, 72, Math.PI * 1.6),
      metal,
    );
    ring.position.set(0.92, -1.3, -0.1);
    this.interiors[2].add(ring);

    // Only reflected objects contribute alpha; the supporting plane fades away
    // radially instead of drawing an opaque rectangular floor over the page.
    this.reflector = new Reflector(new THREE.PlaneGeometry(11, 10), {
      color: "#60778a",
      textureWidth: 768,
      textureHeight: 512,
      clipBias: 0.003,
      multisample: 0,
    });
    const reflectionMaterial = this.reflector.material as THREE.ShaderMaterial;
    reflectionMaterial.vertexShader = reflectionMaterial.vertexShader
      .replace("varying vec4 vUv;", "varying vec4 vUv;\nvarying vec2 vFloorUv;")
      .replace("vUv = textureMatrix", "vFloorUv = uv;\nvUv = textureMatrix");
    reflectionMaterial.fragmentShader = reflectionMaterial.fragmentShader
      .replace("varying vec4 vUv;", "varying vec4 vUv;\nvarying vec2 vFloorUv;")
      .replace(
        "gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );",
        `
          float radius = length((vFloorUv - vec2(0.5)) * vec2(1.0, 1.25));
          float fade = 1.0 - smoothstep(0.08, 0.28, radius);
          gl_FragColor = vec4(blendOverlay(base.rgb, color), base.a * fade * 0.38);
        `,
      );
    reflectionMaterial.transparent = true;
    reflectionMaterial.depthWrite = false;
    this.reflector.rotation.x = -Math.PI / 2;
    this.reflector.position.y = -1.858;
    this.scene.add(this.reflector);
    const shadow = contactShadow(3.1, 0.75);
    shadow.position.y = -1.85;
    this.scene.add(shadow);

    const positions = new Float32Array(128 * 3);
    for (let i = 0; i < 128; i++) {
      const fraction = (seed: number) =>
        (Math.sin((i + 1) * seed) * 43758.5453) % 1;
      positions[i * 3] = fraction(12.9898) * 3.6;
      positions[i * 3 + 1] = Math.abs(fraction(31.573)) * 4 - 1.7;
      positions[i * 3 + 2] = fraction(78.233) * 2.3 - 0.5;
    }
    const pointsGeometry = new THREE.BufferGeometry();
    pointsGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );
    this.particles = new THREE.Points(
      pointsGeometry,
      new THREE.PointsMaterial({
        color: "#a4c1d9",
        size: 0.012,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
    this.scene.add(this.particles);
    this.scene.environmentIntensity = 0.85;
    this.scene.add(new THREE.AmbientLight("#9cbed8", 0.23));
    addDirectional(this.scene, "#e5efff", 3.0, [-4, 6, 5]);
    addDirectional(this.scene, "#82b9e7", 2.3, [4, 2, -4]);
    addDirectional(this.scene, "#f5e6d0", 1.2, [-2, -0.5, 5]);
    const interiorGlow = new THREE.PointLight("#e0b77a", 1.8, 4, 2);
    interiorGlow.position.set(0.3, 0.5, 0.4);
    this.scene.add(interiorGlow);
    this.setQuality(quality);
  }

  update(frame: FrameState): void {
    if (this.disposed) return;
    this.frame = frame;
    const progress = unit(frame.progress);
    const assembly = frame.finale
      ? frame.reducedMotion
        ? 1
        : easeRange(0, 0.85, progress)
      : 0;
    const opened = frame.finale
      ? 1 - assembly
      : frame.reducedMotion
        ? 0
        : easeRange(0.2, 0.65, progress);
    const pointerX = frame.reducedMotion
      ? 0
      : THREE.MathUtils.clamp(frame.pointer[0], -1, 1);
    const pointerY = frame.reducedMotion
      ? 0
      : THREE.MathUtils.clamp(frame.pointer[1], -1, 1);
    this.sculpture.rotation.set(
      pointerY * 0.025,
      -0.12 * (1 - assembly) + pointerX * 0.045,
      0,
    );
    for (const piece of this.pieces) {
      piece.group.position
        .copy(piece.rest)
        .addScaledVector(piece.travel, opened);
      piece.group.rotation.set(
        piece.turn.x * opened,
        piece.turn.y * opened,
        piece.turn.z * opened,
      );
    }
    this.gears.forEach((item, index) => {
      item.rotation.z = opened * (index % 2 ? -0.32 : 0.25);
    });
    this.interiors.forEach((interior) => {
      interior.visible = assembly < 0.96;
    });
    this.glass.color.copy(this.smoke).lerp(this.silver, assembly);
    this.glass.metalness = THREE.MathUtils.lerp(
      this.quality.transmission ? 0.06 : 0.15,
      0.88,
      assembly,
    );
    this.glass.transmission = this.quality.transmission
      ? 0.86 * (1 - assembly)
      : 0;
    this.glass.opacity = this.quality.transmission
      ? 1
      : THREE.MathUtils.lerp(0.46, 1, assembly);
    this.glass.roughness = THREE.MathUtils.lerp(0.11, 0.2, assembly);
    this.pulse.value = frame.reducedMotion ? 0 : unit(frame.impulse);
    this.pulsePhase.value = Number.isFinite(frame.time) ? frame.time : 0;
    this.pulseCenter.value.set(pointerX * 1.8, -pointerY * 1.8);

    fitObjectCamera(
      this.camera,
      this.sculpture,
      this.direction,
      this.width,
      this.height,
      0.83,
    );
    const dolly =
      frame.finale || frame.reducedMotion ? 0 : easeRange(0.8, 1, progress);
    if (dolly > 0) {
      this.baseCamera.copy(this.camera.position);
      this.target.set(-0.55, 0.02, -1.35);
      this.camera.position.lerpVectors(this.baseCamera, this.target, dolly);
      this.target
        .set(0.1, 0.06, 0)
        .lerp(new THREE.Vector3(-0.55, 0.02, -4.2), dolly);
      this.camera.lookAt(this.target);
      this.camera.near = 0.015;
      this.camera.updateProjectionMatrix();
      this.camera.updateMatrixWorld();
    }
    this.particles.visible =
      !frame.reducedMotion && this.quality.particles > 0 && assembly < 0.95;
  }

  fit(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    const resolution = this.quality.tier === "desktop" ? 768 : 256;
    this.reflector
      .getRenderTarget()
      .setSize(
        resolution,
        Math.max(
          128,
          Math.round(resolution * Math.min(1, height / Math.max(1, width))),
        ),
      );
    this.update(this.frame);
  }

  setQuality(quality: Quality): void {
    const changed = this.glass.transparent !== !quality.transmission;
    this.quality = quality;
    this.glass.transparent = !quality.transmission;
    this.glass.depthWrite = quality.transmission;
    if (changed) this.glass.needsUpdate = true;
    this.reflector.visible = quality.tier === "desktop" && quality.transmission;
    this.particles.geometry.setDrawRange(
      0,
      Math.min(128, Math.max(0, quality.particles)),
    );
    this.update(this.frame);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.scene.remove(this.reflector);
    this.reflector.dispose();
    this.reflector.geometry.dispose();
    disposeTree(this.scene);
    this.pieces.length = 0;
    this.gears.length = 0;
    this.interiors.length = 0;
  }
}
