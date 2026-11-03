import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { clearTransmission, type AtelierMaterials } from "./materials";
import { batchRigidMeshes } from "./batching";

type Point = readonly [number, number];
type Rotor = { object: THREE.Group; phase: number; speed: number };
type Leaf = { object: THREE.Group; rest: THREE.Vector3; travel: THREE.Vector3; turn: THREE.Vector3 };
const smooth = (a: number, b: number, value: number) => {
  const t = THREE.MathUtils.clamp((value - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Crystal shell, recessed load-bearing chassis, stepped shafts and bridges. */
export function createMachine(m: AtelierMaterials) {
  const group = new THREE.Group();
  group.name = "LOXNE / optical mechanical cabinet";
  group.position.y = 3;
  const geometries = new Set<THREE.BufferGeometry>();
  const batches = new Set<THREE.InstancedMesh>();
  const own = <T extends THREE.BufferGeometry>(value: T) => { geometries.add(value); return value; };
  const surfaces: THREE.Object3D[] = [];
  const leaves: Leaf[] = [];
  const rotors: Rotor[] = [];
  const interaction = {
    uContact: { value: new THREE.Vector3(0, 3, 0.78) },
    uWaveAge: { value: 10 }, uStrength: { value: 0 },
    uHover: { value: new THREE.Vector3(0, 3, 0.78) },
    uHoverStrength: { value: 0 },
  };
  const glass = m.own(new THREE.MeshPhysicalMaterial({
    name: "Clear optical crystal / physical transmission",
    color: "#ffffff", metalness: 0, roughness: 0,
    transmission: 1,
    thickness: 1.15, ior: 1.42, attenuationColor: "#f1f6fa",
    attenuationDistance: 30, clearcoat: 0,
    specularIntensity: 0.65, envMapIntensity: 0.42, side: THREE.FrontSide,
  }));
  glass.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, interaction);
    const declarations = `
      uniform vec3 uContact; uniform float uWaveAge; uniform float uStrength;
      varying vec3 vCabinetWorld;
      vec2 cabinetWave(float r) {
        float d = r - uWaveAge * 3.4;
        float e = exp(-d * d / .28) * exp(-uWaveAge * 1.3) * uStrength;
        return vec2(sin(d * 11.) * e, (11. * cos(d * 11.) - 2. * d / .28 * sin(d * 11.)) * e);
      }
    `;
    shader.vertexShader = declarations + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `
      #include <begin_vertex>
      vec3 restWorld = (modelMatrix * vec4(transformed, 1.)).xyz;
      transformed += objectNormal * cabinetWave(length(restWorld - uContact)).x * .16;
    `).replace("#include <worldpos_vertex>", `
      #include <worldpos_vertex>
      vCabinetWorld = (modelMatrix * vec4(transformed, 1.)).xyz;
    `);
    shader.fragmentShader = declarations + `
      uniform vec3 uHover; uniform float uHoverStrength;
    ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace("#include <normal_fragment_maps>", `
      #include <normal_fragment_maps>
      vec3 deltaContact = vCabinetWorld - uContact;
      vec3 radialView = (viewMatrix * vec4(normalize(deltaContact + .0001), 0.)).xyz;
      vec3 tangentWave = radialView - normal * dot(normal, radialView);
      float slopeWave = clamp(cabinetWave(length(deltaContact)).y, -.55, .55);
      vec3 opticalOffset = tangentWave * slopeWave;
      vec3 hoverDelta = vCabinetWorld - uHover;
      vec3 hoverView = (viewMatrix * vec4(hoverDelta, 0.)).xyz;
      opticalOffset += (hoverView - normal * dot(normal, hoverView))
        * exp(-dot(hoverDelta, hoverDelta) * 3.) * uHoverStrength * .025;
      normal = normalize(normal - opticalOffset);
    `).replace("#include <clearcoat_normal_fragment_maps>", `
      #include <clearcoat_normal_fragment_maps>
      #ifdef USE_CLEARCOAT
        clearcoatNormal = normalize(clearcoatNormal - opticalOffset);
      #endif
    `);
  };
  glass.customProgramCacheKey = () => "loxne-clear-crystal-contact-v4";
  clearTransmission(glass);
  const boxGeometry = own(new RoundedBoxGeometry(1, 1, 1, 2, 0.06));
  const unitCylinder = own(new THREE.CylinderGeometry(1, 1, 1, 32));
  const screwGeometry = own(new THREE.CylinderGeometry(0.038, 0.038, 0.045, 24));
  const screwSlot = own(new THREE.BoxGeometry(0.043, 0.009, 0.004));
  function box(parent: THREE.Object3D, material: THREE.Material, size: readonly [number, number, number], position: readonly [number, number, number]) {
    const mesh = new THREE.Mesh(boxGeometry, material);
    mesh.scale.set(...size);
    mesh.position.set(...position);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function cylinder(parent: THREE.Object3D, radius: number, depth: number, position: readonly [number, number, number], material: THREE.Material) {
    const mesh = new THREE.Mesh(unitCylinder, material);
    mesh.scale.set(radius, depth, radius);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(...position);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function screws(parent: THREE.Group, points: readonly THREE.Vector3[]) {
    const heads = new THREE.InstancedMesh(screwGeometry, m.silver, points.length);
    const slots = new THREE.InstancedMesh(screwSlot, m.black, points.length);
    const pose = new THREE.Object3D();
    points.forEach((point, i) => {
      pose.position.copy(point);
      pose.rotation.set(Math.PI / 2, 0, 0);
      pose.updateMatrix();
      heads.setMatrixAt(i, pose.matrix);
      pose.position.z += 0.025;
      pose.rotation.set(0, 0, i * 0.71);
      pose.updateMatrix();
      slots.setMatrixAt(i, pose.matrix);
    });
    heads.instanceMatrix.needsUpdate = slots.instanceMatrix.needsUpdate = true;
    batches.add(heads); batches.add(slots);
    parent.add(heads, slots);
  }
  function outline(points: readonly Point[], inset = 1) {
    const center = points.reduce((sum, p) => sum.add(new THREE.Vector2(...p)), new THREE.Vector2()).multiplyScalar(1 / points.length);
    const result = new THREE.Shape();
    points.forEach((p, i) => {
      const x = THREE.MathUtils.lerp(center.x, p[0], inset);
      const y = THREE.MathUtils.lerp(center.y, p[1], inset);
      if (i) result.lineTo(x, y); else result.moveTo(x, y);
    });
    result.closePath();
    return result;
  }
  function ring(points: readonly Point[], inset: number, depth: number) {
    const shape = outline(points);
    const inner = outline(points, inset);
    shape.holes.push(new THREE.Path(inner.getPoints()));
    return own(new THREE.ExtrudeGeometry(shape, {
      depth, steps: 1, bevelEnabled: true, bevelSize: 0.012,
      bevelThickness: 0.012, bevelSegments: 2, curveSegments: 12,
    }));
  }
  function beam(parent: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, width: number, depth: number, material: THREE.Material) {
    const center = a.clone().add(b).multiplyScalar(0.5);
    const vector = b.clone().sub(a);
    const mesh = box(parent, material, [width, vector.length(), depth], [center.x, center.y, center.z]);
    mesh.rotation.z = -Math.atan2(vector.x, vector.y);
    return mesh;
  }
  const cogGeometries = new Map<number, THREE.ExtrudeGeometry>();
  function cog(teeth: number) {
    if (cogGeometries.has(teeth)) return cogGeometries.get(teeth)!;
    const shape = new THREE.Shape();
    for (let i = 0; i < teeth * 6; i++) {
      const a = i / (teeth * 6) * Math.PI * 2;
      const r = [0.91, 0.92, 1, 1, 0.92, 0.91][i % 6];
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i) shape.lineTo(x, y); else shape.moveTo(x, y);
    }
    shape.closePath();
    const hole = new THREE.Path();
    hole.absarc(0, 0, 0.74, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const value = own(new THREE.ExtrudeGeometry(shape, {
      depth: 0.13, steps: 1, bevelEnabled: true, bevelSegments: 2,
      bevelSize: 0.007, bevelThickness: 0.009, curveSegments: 64,
    }));
    value.translate(0, 0, -0.065);
    cogGeometries.set(teeth, value);
    return value;
  }
  function gear(parent: THREE.Group, x: number, y: number, radius: number, z: number, teeth: number, speed: number) {
    cylinder(parent, radius * 0.18, 0.9, [x, y, -0.12], m.silver);
    cylinder(parent, radius * 0.31, 0.09, [x, y, -0.56], m.black);
    cylinder(parent, radius * 0.23, 0.06, [x, y, 0.37], m.polished);
    const rotor = new THREE.Group();
    rotor.position.set(x, y, z);
    rotor.scale.setScalar(radius);
    rotor.add(new THREE.Mesh(cog(teeth), m.brass));
    const rim = new THREE.Mesh(own(new THREE.TorusGeometry(0.785, 0.018, 8, 80)), m.polished);
    rim.position.z = 0.07;
    rotor.add(rim);
    for (let j = 0; j < 5; j++) {
      const a = j / 5 * Math.PI * 2;
      const spoke = box(rotor, m.brass, [0.69, 0.10, 0.10], [Math.cos(a) * 0.40, Math.sin(a) * 0.40, 0]);
      spoke.rotation.z = a;
    }
    cylinder(rotor, 0.18, 0.18, [0, 0, 0.02], m.polished);
    parent.add(rotor);
    rotors.push({ object: rotor, phase: teeth * 0.12, speed });
    const bridge = box(parent, m.steel, [radius * 0.4, radius * 2.2, 0.085], [x, y, 0.43]);
    bridge.rotation.z = -0.24;
    screws(parent, [-1, 1].map(sign => new THREE.Vector3(
      x + sign * Math.sin(0.24) * radius * 0.93,
      y + sign * Math.cos(0.24) * radius * 0.93, 0.49)));
    cylinder(parent, radius * 0.105, 0.12, [x, y, 0.49], m.silver);
  }
  const definitions = [
    { points: [[-3.5, -3], [-2.15, -2.8], [-1.92, 3.35], [-3.32, 4]] as Point[],
      pivot: [-2.72, 0.4, 0], travel: [-1.6, 0.05, -0.35], turn: [0.015, -0.18, -0.025] },
    { points: [[-1.62, 0.18], [-1.32, 0.9], [2.94, 3.94], [3.5, 3.8], [3.2, 2.02], [-0.28, 0.66]] as Point[],
      pivot: [0.84, 2.03, -0.08], travel: [2.35, 0.6, -0.55], turn: [-0.04, 0.18, 0.06] },
    { points: [[-1.75, -2.96], [3.5, -3], [3.08, -1.94], [-0.34, 0.5], [-1.68, -0.28]] as Point[],
      pivot: [0.69, -1.34, 0.08], travel: [2.45, 0.24, 0.52], turn: [0.045, -0.15, -0.045] },
  ];
  definitions.forEach((definition, index) => {
    const leaf = new THREE.Group();
    const rest = new THREE.Vector3(...definition.pivot);
    leaf.position.copy(rest);
    const content = new THREE.Group();
    content.position.set(-rest.x, -rest.y, 0);
    leaf.add(content);
    const shell = own(new THREE.ExtrudeGeometry(outline(definition.points), {
      depth: 1.45, steps: 1, bevelEnabled: true, bevelSize: 0.055,
      bevelThickness: 0.055, bevelSegments: 5, curveSegments: 24,
    }));
    shell.translate(0, 0, -0.725);
    const skin = new THREE.Mesh(shell, glass);
    skin.name = "Closed thick crystal / refractive shell";
    content.add(skin);
    surfaces.push(skin);
    const front = new THREE.Mesh(ring(definition.points, 0.966, 0.055), m.silver);
    front.position.z = 0.70;
    front.castShadow = true;
    const back = new THREE.Mesh(ring(definition.points, 0.91, 0.11), m.steel);
    back.position.z = -0.71;
    back.castShadow = true;
    content.add(front, back);
    // The mechanisms mount to a recessed, drilled chassis, not the crystal cap.
    const chassisShape = outline(definition.points, 0.90);
    const bores: Point[] = index === 0
      ? [[-2.7, 2.64], [-2.7, 1.56], [-2.7, 0.48], [-2.7, -0.6], [-2.7, -1.68]]
      : index === 1 ? [[0.44, 1.55], [1.62, 2.37], [2.68, 3.15]]
        : [[-0.75, -0.72], [0.17, -1.37], [1.42, -2.13]];
    for (const [x, y] of bores) {
      const bore = new THREE.Path();
      bore.absarc(x, y, 0.115, 0, Math.PI * 2, true);
      chassisShape.holes.push(bore);
    }
    const chassis = new THREE.Mesh(own(new THREE.ExtrudeGeometry(chassisShape, {
      depth: 0.10, bevelEnabled: true, bevelSize: 0.012,
      bevelThickness: 0.012, bevelSegments: 2, steps: 1, curveSegments: 32,
    })), m.black);
    chassis.position.z = -0.63;
    content.add(chassis);
    const center = definition.points.reduce((v, p) => v.add(new THREE.Vector2(...p)), new THREE.Vector2()).multiplyScalar(1 / definition.points.length);
    const bolts: THREE.Vector3[] = [];
    definition.points.forEach((point, i) => {
      const p = new THREE.Vector3(THREE.MathUtils.lerp(center.x, point[0], 0.91), THREE.MathUtils.lerp(center.y, point[1], 0.91), -0.48);
      const next = definition.points[(i + 1) % definition.points.length];
      const q = new THREE.Vector3(THREE.MathUtils.lerp(center.x, next[0], 0.91), THREE.MathUtils.lerp(center.y, next[1], 0.91), -0.48);
      beam(content, p, q, 0.09, 0.2, m.steel);
      cylinder(content, 0.07, 1.08, [p.x, p.y, 0.04], m.silver);
      bolts.push(new THREE.Vector3(p.x, p.y, 0.78));
    });
    screws(content, bolts);
    // Small service decks and their railings explain the cabinet's multiple levels.
    const deckCenters: Point[] = index === 0
      ? [[-2.7, 1.03], [-2.7, -1.12]]
      : index === 1 ? [[0.14, 1.28], [1.65, 2.35]]
        : [[0.12, -1.6], [1.45, -2.42]];
    for (const [x, y] of deckCenters) {
      box(content, m.steel, [index === 0 ? 0.80 : 0.68, 0.055, 0.75], [x, y, -0.17]);
      for (const side of [-1, 1]) {
        box(content, m.silver, [0.018, 0.28, 0.025], [x + side * 0.29, y + 0.15, 0.17]);
        box(content, m.steel, [0.027, 0.34, 0.31], [x + side * 0.26, y - 0.18, -0.32]);
      }
      box(content, m.polished, [0.64, 0.022, 0.023], [x, y + 0.28, 0.17]);
    }
    if (index === 0) {
      for (const x of [-3.05, -2.40]) {
        box(content, m.steel, [0.075, 6.0, 0.21], [x, 0.45, -0.43]);
        box(content, m.polished, [0.019, 5.75, 0.04], [x + 0.07, 0.42, -0.24]);
      }
      [2.64, 1.56, 0.48, -0.6, -1.68].forEach((y, i) => {
        gear(content, -2.70, y, i % 2 ? 0.55 : 0.52, -0.08 + (i % 2) * 0.16, 36, i % 2 ? -0.035 : 0.038);
      });
    } else if (index === 1) {
      gear(content, -0.39, 0.98, 0.39, -0.12, 28, 0.04);
      gear(content, 0.44, 1.55, 0.59, 0.08, 42, -0.027);
      gear(content, 1.62, 2.37, 0.82, -0.12, 56, 0.019);
      gear(content, 2.68, 3.15, 0.48, 0.10, 32, -0.033);
      beam(content, new THREE.Vector3(-0.7, 0.9, -0.42), new THREE.Vector3(2.9, 3.5, -0.42), 0.14, 0.25, m.steel);
      beam(content, new THREE.Vector3(-0.6, 0.76, -0.21), new THREE.Vector3(2.6, 3.03, -0.21), 0.025, 0.05, m.polished);
    } else {
      gear(content, -0.75, -0.72, 0.41, -0.10, 28, -0.039);
      gear(content, 0.17, -1.37, 0.68, 0.10, 48, 0.025);
      gear(content, 1.42, -2.13, 0.79, -0.09, 56, -0.02);
      beam(content, new THREE.Vector3(-1.1, -0.42, -0.43), new THREE.Vector3(2.25, -2.5, -0.43), 0.16, 0.22, m.steel);
      for (let j = 0; j < 3; j++) {
        beam(content, new THREE.Vector3(-0.78, -0.45 - j * 0.09, -0.26), new THREE.Vector3(2.13, -2.20 - j * 0.09, -0.26), 0.018, 0.035, m.polished);
      }
    }
    group.add(leaf);
    leaves.push({ object: leaf, rest, travel: new THREE.Vector3(...definition.travel), turn: new THREE.Vector3(...definition.turn) });
  });
  group.traverse(object => {
    if (object instanceof THREE.Mesh && object.material !== glass) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  const disposeInstances = batchRigidMeshes(group);
  let hitAt = -100, hoverStrength = 0, targetHover = 0, time = 0;
  let lastOpening = -1;
  return {
    group, surfaces,
    hover(value: THREE.Vector3 | null) {
      targetHover = value ? 1 : 0;
      if (value) interaction.uHover.value.copy(value);
    },
    interact(value: THREE.Vector3, strength = 1) {
      hitAt = time;
      interaction.uContact.value.copy(value);
      interaction.uStrength.value = Math.min(1, Math.max(0, strength)) * 0.10;
    },
    update(progress: number, seconds: number) {
      const dt = Math.max(0, Math.min(0.1, seconds - time));
      time = seconds;
      const opening = smooth(0.03, 0.145, progress);
      const wasVisible = group.visible;
      // Past the crossing the whole cabinet is behind both viewing cameras.
      group.visible = progress < 0.17;
      const openingChanged = opening !== lastOpening;
      if (openingChanged) {
        for (const leaf of leaves) {
          leaf.object.position.copy(leaf.rest).addScaledVector(leaf.travel, opening);
          leaf.object.rotation.set(leaf.turn.x * opening, leaf.turn.y * opening, leaf.turn.z * opening);
        }
        lastOpening = opening;
      }
      const age = Math.max(0, time - hitAt);
      hoverStrength += (targetHover - hoverStrength) * (1 - Math.exp(-dt * 10));
      interaction.uHoverStrength.value = hoverStrength;
      interaction.uWaveAge.value = age;
      const kick = 0.30 * (1 - Math.exp(-age * 5));
      if (group.visible) {
        rotors.forEach(rotor => {
          rotor.object.rotation.z = rotor.phase + time * rotor.speed + opening * rotor.speed * 6 + Math.sign(rotor.speed) * kick;
        });
      }
      return wasVisible !== group.visible || (group.visible && (openingChanged || dt > 0));
    },
    dispose() {
      group.removeFromParent();
      group.clear();
      geometries.forEach(value => value.dispose());
      batches.forEach(value => value.dispose());
      disposeInstances();
    },
  };
}
