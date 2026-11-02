import * as THREE from 'three';

type Point = readonly [number, number];
type Rotor = { object: THREE.Group; phase: number; speed: number };
type Plate = {
  group: THREE.Group;
  rest: THREE.Vector3;
  travel: THREE.Vector3;
  turn: THREE.Vector3;
};
type Gate = {
  group: THREE.Group;
  surfaces: THREE.Object3D[];
  plates: Plate[];
  mechanisms: THREE.Group[];
  rotors: Rotor[];
  glass: THREE.MeshPhysicalMaterial;
  outline: THREE.LineBasicMaterial;
};

const clamp = (value: number) => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
const smooth = (start: number, end: number, value: number) => {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
};

/**
 * A renderer-independent exhibition along -Z. All positions are absolute:
 * floor=-.04; gate origins=(0,3,0)/(0,3,-138); rooms=-24/-52/-80/-108.
 * The caller owns environment, lights, camera, fog and model reflections.
 */
export function createArchitecture(): {
  group: THREE.Group;
  surfaces: THREE.Object3D[];
  hover(point: THREE.Vector3 | null): void;
  interact(point: THREE.Vector3, strength?: number): void;
  update(progress: number, time: number): void;
  dispose(): void;
} {
  const group = new THREE.Group();
  group.name = 'Journey / glass and metal architecture';
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const instances = new Set<THREE.InstancedMesh>();
  let disposed = false;
  let lastTime = 0;
  let lastProgress = 0;
  let hitTime = -Infinity;
  let hoverTarget = 0;
  let rotorKickBase = 0;
  let rotorKickStrength = 0;
  const interaction = {
    uArchitectureHit: { value: new THREE.Vector3(0, 3, 0.4) },
    uArchitectureWaveTime: { value: -1 },
    uArchitectureWaveStrength: { value: 0 },
    uArchitectureHover: { value: new THREE.Vector3(0, 3, 0.4) },
    uArchitectureHoverStrength: { value: 0 },
  };
  // Keep one light in the scene for the lifetime of the architecture: pointer
  // activity changes intensity and position, never the shader's light count.
  const interactionLight = new THREE.PointLight('#c3e3ff', 0, 4.6, 2);
  interactionLight.name = 'Entrance glass / local interaction reflection';
  interactionLight.castShadow = false;
  group.add(interactionLight);
  const lightPosition = new THREE.Vector3();

  const geometry = <T extends THREE.BufferGeometry>(value: T): T => {
    geometries.add(value);
    return value;
  };
  const material = <T extends THREE.Material>(value: T): T => {
    materials.add(value);
    return value;
  };
  const unitBox = geometry(new THREE.BoxGeometry(1, 1, 1));
  const unitPlane = geometry(new THREE.PlaneGeometry(1, 1));
  const metal = material(new THREE.MeshStandardMaterial({
    name: 'Brushed titanium edges', color: '#687881', metalness: 0.94,
    roughness: 0.27, envMapIntensity: 0.85,
  }));
  const darkMetal = material(new THREE.MeshStandardMaterial({
    name: 'Graphite structural steel', color: '#121a21', metalness: 0.82,
    roughness: 0.42, envMapIntensity: 0.52,
  }));
  const brass = material(new THREE.MeshStandardMaterial({
    name: 'Aged warm brass', color: '#9b7740', metalness: 0.92,
    roughness: 0.31, envMapIntensity: 0.95,
  }));
  const brightBrass = material(new THREE.MeshStandardMaterial({
    name: 'Machined brass bevels', color: '#bd985d', metalness: 0.94,
    roughness: 0.23, envMapIntensity: 0.8,
  }));
  const blackSteel = material(new THREE.MeshStandardMaterial({
    name: 'Oxidised mechanism backing', color: '#171d20', metalness: 0.78,
    roughness: 0.37,
  }));
  const floorMaterial = material(new THREE.MeshPhysicalMaterial({
    name: 'Opaque black exhibition floor', color: '#030508', metalness: 0.78,
    roughness: 0.2, clearcoat: 0.62, clearcoatRoughness: 0.19,
    envMapIntensity: 0.65, transparent: false, depthWrite: true,
  }));

  function box(parent: THREE.Object3D, surface: THREE.Material, size: [number, number, number], position: [number, number, number]) {
    const object = new THREE.Mesh(unitBox, surface);
    object.scale.set(...size);
    object.position.set(...position);
    parent.add(object);
    return object;
  }

  function shape(points: readonly Point[]): THREE.Shape {
    const result = new THREE.Shape();
    points.forEach(([x, y], index) => index ? result.lineTo(x, y) : result.moveTo(x, y));
    result.closePath();
    return result;
  }

  function makeGlass(name: string, opacity = 0.18, interactive = false) {
    const value = material(new THREE.MeshPhysicalMaterial({
      name, color: '#435967', metalness: 0.22, roughness: 0.16,
      clearcoat: 0.84, clearcoatRoughness: 0.18, envMapIntensity: 0.72,
      transmission: 0, transparent: true, opacity, depthWrite: false,
      side: THREE.DoubleSide,
    }));
    // Angular opacity and a restrained edge reflection provide optical weight
    // without a transmission pass, framebuffer copy or render target.
    value.onBeforeCompile = (shader) => {
      if (interactive) {
        Object.assign(shader.uniforms, interaction);
        const wave = `
          uniform vec3 uArchitectureHit;
          uniform float uArchitectureWaveTime;
          uniform float uArchitectureWaveStrength;
          varying vec3 vArchitectureWorldPosition;
          // Height and radial derivative of one travelling, damped glass wave.
          vec2 architectureWave(float distanceToHit) {
            float age = max(0.0, uArchitectureWaveTime);
            float active = step(0.0, uArchitectureWaveTime);
            float offset = distanceToHit - age * 3.25;
            float envelope = exp(-offset * offset / 0.23) * exp(-age * 1.55);
            float phase = offset * 9.0;
            float amplitude = uArchitectureWaveStrength * active * envelope;
            return vec2(
              sin(phase) * amplitude,
              (9.0 * cos(phase) - 2.0 * offset / 0.23 * sin(phase)) * amplitude
            );
          }
        `;
        shader.vertexShader = wave + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
          #include <begin_vertex>
          vec3 architectureRestWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
          float architectureDisplacement = architectureWave(length(architectureRestWorld - uArchitectureHit)).x;
          transformed += objectNormal * architectureDisplacement;
        `).replace('#include <worldpos_vertex>', `
          #include <worldpos_vertex>
          vArchitectureWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
        `);
        shader.fragmentShader = wave + `
          uniform vec3 uArchitectureHover;
          uniform float uArchitectureHoverStrength;
        ` + shader.fragmentShader;
        // Cap geometry deliberately stays economical. Per-fragment normals make
        // the wave read in environmental reflections between its sparse vertices.
        shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `
          #include <normal_fragment_maps>
          vec3 architectureDelta = vArchitectureWorldPosition - uArchitectureHit;
          float architectureDistance = length(architectureDelta);
          vec3 architectureRadial = architectureDelta / max(architectureDistance, 0.001);
          vec3 architectureViewRadial = (viewMatrix * vec4(architectureRadial, 0.0)).xyz;
          vec3 architectureTangent = architectureViewRadial - normal * dot(normal, architectureViewRadial);
          float architectureSlope = clamp(architectureWave(architectureDistance).y, -0.48, 0.48);
          vec3 architectureNormalOffset = architectureTangent * architectureSlope;
          normal = normalize(normal - architectureNormalOffset);
        `).replace('#include <clearcoat_normal_fragment_maps>', `
          #include <clearcoat_normal_fragment_maps>
          #ifdef USE_CLEARCOAT
            clearcoatNormal = normalize(clearcoatNormal - architectureNormalOffset);
          #endif
        `);
      }
      shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
        float architectureRim = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 3.0);
        outgoingLight += vec3(0.20, 0.29, 0.35) * architectureRim * 0.32;
        diffuseColor.a = min(1.0, diffuseColor.a + architectureRim * 0.22);
        ${interactive ? `
          float architectureHoverDistance = length(vArchitectureWorldPosition - uArchitectureHover);
          float architectureHoverFalloff = exp(-architectureHoverDistance * architectureHoverDistance * 3.8) * uArchitectureHoverStrength;
          outgoingLight += vec3(0.19, 0.28, 0.34) * architectureHoverFalloff * (0.12 + architectureRim * 0.28);
        ` : ''}
        #include <opaque_fragment>
      `);
    };
    value.customProgramCacheKey = () => interactive ? 'journey-smoked-glass-wave-v2' : 'journey-smoked-glass-rim-v1';
    return value;
  }

  function makeInstances(parent: THREE.Object3D, source: THREE.BufferGeometry, surface: THREE.Material, transforms: (pose: THREE.Object3D, index: number) => void, count: number) {
    const batch = new THREE.InstancedMesh(source, surface, count);
    const pose = new THREE.Object3D();
    for (let index = 0; index < count; index++) {
      pose.position.set(0, 0, 0);
      pose.rotation.set(0, 0, 0);
      pose.scale.set(1, 1, 1);
      transforms(pose, index);
      pose.updateMatrix();
      batch.setMatrixAt(index, pose.matrix);
    }
    batch.instanceMatrix.needsUpdate = true;
    instances.add(batch);
    parent.add(batch);
    return batch;
  }

  const screwGeometry = geometry(new THREE.CylinderGeometry(0.034, 0.034, 0.038, 6));
  const axleGeometry = geometry(new THREE.CylinderGeometry(0.13, 0.13, 0.17, 20));
  const collarGeometry = geometry(new THREE.TorusGeometry(0.22, 0.018, 6, 28));
  const gearGeometries = new Map<number, THREE.ExtrudeGeometry>();

  function gearGeometry(teeth: number): THREE.ExtrudeGeometry {
    const existing = gearGeometries.get(teeth);
    if (existing) return existing;
    const outline = new THREE.Shape();
    for (let index = 0; index < teeth * 4; index++) {
      const angle = (index / (teeth * 4)) * Math.PI * 2;
      const radius = index % 4 === 0 || index % 4 === 3 ? 0.93 : 1;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (index === 0) outline.moveTo(x, y); else outline.lineTo(x, y);
    }
    outline.closePath();
    const opening = new THREE.Path();
    opening.absarc(0, 0, 0.7, 0, Math.PI * 2, true);
    outline.holes.push(opening);
    const result = geometry(new THREE.ExtrudeGeometry(outline, {
      depth: 0.085, steps: 1, bevelEnabled: true, bevelSize: 0.008,
      bevelThickness: 0.008, bevelSegments: 1, curveSegments: 40,
    }));
    result.translate(0, 0, -0.0425);
    gearGeometries.set(teeth, result);
    return result;
  }

  function mechanism(parent: THREE.Group, rotors: Rotor[], x: number, y: number, radius: number, z: number, teeth: number, direction: number) {
    const rotor = new THREE.Group();
    rotor.name = 'Brass escapement / toothed ring and spokes';
    rotor.position.set(x, y, z);
    rotor.scale.setScalar(radius);
    rotor.add(new THREE.Mesh(gearGeometry(teeth), brass));
    makeInstances(rotor, unitBox, brightBrass, (pose, index) => {
      const angle = index / 5 * Math.PI * 2;
      pose.position.set(Math.cos(angle) * 0.4, Math.sin(angle) * 0.4, 0);
      pose.rotation.z = angle;
      pose.scale.set(0.66, 0.055, 0.064);
    }, 5);
    const axle = new THREE.Mesh(axleGeometry, metal);
    axle.rotation.x = Math.PI / 2;
    rotor.add(axle, new THREE.Mesh(collarGeometry, brightBrass));
    makeInstances(rotor, screwGeometry, metal, (pose, index) => {
      const angle = index / 8 * Math.PI * 2;
      pose.position.set(Math.cos(angle) * 0.81, Math.sin(angle) * 0.81, 0.052);
      pose.rotation.x = Math.PI / 2;
    }, 8);
    parent.add(rotor);
    rotors.push({ object: rotor, phase: x * 0.31 + y * 0.14, speed: direction * 0.045 });

    const bearing = new THREE.Mesh(geometry(new THREE.RingGeometry(radius * 0.16, radius * 0.3, 28)), blackSteel);
    bearing.position.set(x, y, z - 0.105);
    parent.add(bearing);
  }

  function monolith(z: number, name: string, interactive = false): Gate {
    const root = new THREE.Group();
    root.name = name;
    root.position.set(0, 3, z);
    group.add(root);
    const glass = makeGlass(`${name} / smoked optical plates`, 0.18, interactive);
    const outline = material(new THREE.LineBasicMaterial({
      name: 'Fine blue polished silhouette', color: '#77a7c8', transparent: true,
      opacity: 0.36, depthWrite: false,
    }));
    const plates: Plate[] = [];
    const mechanisms: THREE.Group[] = [];
    const rotors: Rotor[] = [];
    const surfaces: THREE.Object3D[] = [];
    const definitions: Array<{
      points: Point[];
      pivot: [number, number, number];
      travel: [number, number, number];
      turn: [number, number, number];
    }> = [
      {
        points: [[-3.5, -3], [-2.15, -2.8], [-1.92, 3.35], [-3.32, 4]],
        pivot: [-2.72, 0.4, 0], travel: [-1.45, 0.08, -0.24], turn: [0.015, -0.14, -0.025],
      },
      {
        points: [[-1.62, 0.18], [-1.32, 0.9], [2.94, 3.94], [3.5, 3.8], [3.2, 2.02], [-0.28, 0.66]],
        pivot: [0.84, 2.03, -0.08], travel: [2.1, 0.65, -0.5], turn: [-0.04, 0.14, 0.06],
      },
      {
        points: [[-1.75, -2.96], [3.5, -3], [3.08, -1.94], [-0.34, 0.5], [-1.68, -0.28]],
        pivot: [0.69, -1.34, 0.08], travel: [2.2, 0.42, 0.42], turn: [0.045, -0.12, -0.045],
      },
    ];

    definitions.forEach((definition, index) => {
      const plate = new THREE.Group();
      plate.name = `${name} / cut plane ${index + 1}`;
      const rest = new THREE.Vector3(...definition.pivot);
      plate.position.copy(rest);
      const content = new THREE.Group();
      content.position.set(-rest.x, -rest.y, 0);
      plate.add(content);
      const solid = geometry(new THREE.ExtrudeGeometry(shape(definition.points), {
        depth: 0.76, steps: 1, bevelEnabled: true,
        bevelSize: 0.035, bevelThickness: 0.035, bevelSegments: 3,
      }));
      solid.translate(0, 0, -0.38);
      const skin = new THREE.Mesh(solid, [glass, metal]);
      skin.name = 'Glass faces / solid satin metal cut edges';
      content.add(skin);
      surfaces.push(skin);
      content.add(new THREE.LineSegments(geometry(new THREE.EdgesGeometry(solid, 32)), outline));

      const internal = new THREE.Group();
      internal.name = 'Visible warm mechanical interior';
      content.add(internal);
      mechanisms.push(internal);
      root.add(plate);
      plates.push({ group: plate, rest, travel: new THREE.Vector3(...definition.travel), turn: new THREE.Vector3(...definition.turn) });

      // Countersunk fasteners sit inside each cut edge, rather than floating on it.
      const centroid = definition.points.reduce((sum, point) => sum.add(new THREE.Vector2(...point)), new THREE.Vector2()).multiplyScalar(1 / definition.points.length);
      makeInstances(content, screwGeometry, brightBrass, (pose, vertex) => {
        const point = definition.points[vertex];
        pose.position.set(THREE.MathUtils.lerp(point[0], centroid.x, 0.12), THREE.MathUtils.lerp(point[1], centroid.y, 0.12), 0.405);
        pose.rotation.x = Math.PI / 2;
      }, definition.points.length);
    });

    mechanism(mechanisms[0], rotors, -2.68, 2.45, 0.36, 0.02, 28, 1);
    mechanism(mechanisms[0], rotors, -2.68, 0.78, 0.42, -0.05, 36, -1);
    mechanism(mechanisms[0], rotors, -2.76, -1.05, 0.37, 0.07, 28, 1);
    mechanism(mechanisms[1], rotors, 0.38, 1.61, 0.48, 0.04, 36, -1);
    mechanism(mechanisms[1], rotors, 1.45, 2.38, 0.58, -0.02, 42, 1);
    mechanism(mechanisms[1], rotors, 2.54, 2.98, 0.39, 0.05, 28, -1);
    mechanism(mechanisms[2], rotors, 1.43, -2.03, 0.65, 0.01, 42, 1);
    mechanism(mechanisms[2], rotors, 0.16, -1.74, 0.49, -0.1, 36, -1);
    mechanism(mechanisms[2], rotors, -0.68, -0.91, 0.35, 0.04, 28, 1);

    for (const x of [-3.01, -2.37]) {
      box(mechanisms[0], blackSteel, [0.06, 5.9, 0.18], [x, 0.46, -0.18]);
      box(mechanisms[0], brightBrass, [0.018, 5.5, 0.04], [x + 0.05, 0.4, 0.16]);
    }
    makeInstances(mechanisms[0], unitBox, brass, (pose, index) => {
      pose.position.set(-2.68, -2.32 + index * 0.51, -0.21);
      pose.scale.set(0.68, 0.045, 0.22);
    }, 11);
    makeInstances(mechanisms[1], unitBox, blackSteel, (pose, index) => {
      pose.position.set(-0.4 + index * 0.66, 1.11 + index * 0.46, -0.21);
      pose.rotation.z = -0.92;
      pose.scale.set(0.62, 0.045, 0.2);
    }, 5);
    const diagonalBrace = box(mechanisms[2], blackSteel, [3.25, 0.085, 0.15], [0.9, -1.37, -0.22]);
    diagonalBrace.rotation.z = -0.62;
    const fineBrace = box(mechanisms[2], brightBrass, [3.45, 0.025, 0.045], [0.84, -1.28, 0.15]);
    fineBrace.rotation.z = -0.62;
    return { group: root, surfaces, plates, mechanisms, rotors, glass, outline };
  }

  const floor = new THREE.Mesh(geometry(new THREE.PlaneGeometry(38, 182)), floorMaterial);
  floor.name = 'journey-floor';
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -0.04, -66);
  group.add(floor);

  // Almost-black architecture supplies scale and parallax. Only seven structural
  // spans exist; they are not luminous portal outlines repeated into infinity.
  const structure = new THREE.Group();
  structure.name = 'Deep hall / dark structural spans';
  group.add(structure);
  box(structure, darkMetal, [0.22, 10.4, 178], [-11.8, 5.1, -65]);
  box(structure, darkMetal, [0.22, 10.4, 178], [11.8, 5.1, -65]);
  box(structure, blackSteel, [23.6, 0.18, 178], [0, 10.4, -65]);
  const spanZ = [10, -10, -38, -66, -94, -122, -151];
  makeInstances(structure, unitBox, metal, (pose, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    pose.position.set(side * 10.85, 4.9, spanZ[Math.floor(index / 2)]);
    pose.rotation.z = side * -0.045;
    pose.scale.set(0.24, 9.8, 0.36);
  }, spanZ.length * 2);
  makeInstances(structure, unitBox, darkMetal, (pose, index) => {
    pose.position.set(0, 9.8, spanZ[index]);
    pose.scale.set(21.8, 0.32, 0.4);
  }, spanZ.length);
  makeInstances(structure, unitBox, darkMetal, (pose, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    pose.position.set(side * 9.9, 8.9, spanZ[Math.floor(index / 2)]);
    pose.rotation.z = side * -0.7;
    pose.scale.set(0.22, 2.7, 0.42);
  }, spanZ.length * 2);

  // A shared alpha gradient makes grazing light echoes soft at every boundary.
  // Model reflection planes can occupy y=.005; these sparse edge lights use .012.
  const fadePixels = new Uint8Array(32 * 64 * 4);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 32; x++) {
    const horizontal = Math.max(0, 1 - Math.abs((x + 0.5) / 16 - 1));
    const vertical = Math.sin((y + 0.5) / 64 * Math.PI);
    const offset = (y * 32 + x) * 4;
    fadePixels[offset] = 255;
    fadePixels[offset + 1] = 255;
    fadePixels[offset + 2] = 255;
    fadePixels[offset + 3] = Math.round(Math.pow(horizontal, 2.4) * Math.pow(vertical, 1.5) * 255);
  }
  const fade = new THREE.DataTexture(fadePixels, 32, 64, THREE.RGBAFormat);
  fade.minFilter = THREE.LinearFilter;
  fade.magFilter = THREE.LinearFilter;
  fade.generateMipmaps = false;
  fade.needsUpdate = true;
  textures.add(fade);
  const echoMaterial = material(new THREE.MeshBasicMaterial({
    name: 'Soft grazing light on black floor', color: '#5d8fae', map: fade,
    transparent: true, opacity: 0.075, depthWrite: false, toneMapped: false,
  }));
  const trackMaterial = material(new THREE.MeshBasicMaterial({
    name: 'Recessed cool floor guide', color: '#5785a2', transparent: true,
    opacity: 0.27, depthWrite: false, toneMapped: false,
  }));
  const trackZ = [-6, -30, -58, -86, -114, -140];
  makeInstances(group, unitPlane, echoMaterial, (pose, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    pose.rotation.x = -Math.PI / 2;
    pose.position.set(side * 5.85, 0.012, trackZ[Math.floor(index / 2)]);
    pose.scale.set(0.8, 17, 1);
  }, trackZ.length * 2);
  makeInstances(group, unitPlane, trackMaterial, (pose, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    pose.rotation.x = -Math.PI / 2;
    pose.position.set(side * 6.12, 0.014, trackZ[Math.floor(index / 2)]);
    pose.scale.set(0.018, 9.5, 1);
  }, trackZ.length * 2);

  const panelGeometry = geometry(new THREE.ExtrudeGeometry(shape([
    [-2.35, 0], [1.72, 0], [2.35, 0.78], [2.35, 5.7], [1.4, 6.3], [-2.35, 5.82],
  ]), { depth: 0.16, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1, steps: 1 }));
  panelGeometry.translate(0, 0, -0.08);
  const roomGlass = makeGlass('Tall folded smoke-glass wall panels', 0.08);
  const roomAccents: Array<{ group: THREE.Group; material: THREE.MeshBasicMaterial; progress: number }> = [];
  const rooms = [
    { z: -24, progress: 0.24, tint: '#a58b5b', name: 'Timepiece' },
    { z: -52, progress: 0.42, tint: '#94715a', name: 'FARO' },
    { z: -80, progress: 0.60, tint: '#a18a65', name: 'Egypt' },
    { z: -108, progress: 0.78, tint: '#6a8c9e', name: 'Wordflow' },
  ];
  rooms.forEach((room, index) => {
    const bay = new THREE.Group();
    bay.name = `${room.name} / architectural bay`;
    bay.position.z = room.z;
    group.add(bay);
    const accent = material(new THREE.MeshBasicMaterial({
      name: `${room.name} / restrained floor inlay`, color: room.tint,
      transparent: true, opacity: 0.14, depthWrite: false, toneMapped: false,
    }));
    roomAccents.push({ group: bay, material: accent, progress: room.progress });
    for (const side of [-1, 1]) {
      const panel = new THREE.Mesh(panelGeometry, [roomGlass, metal]);
      panel.position.set(side * 9.1, 0.08, -1.5);
      panel.rotation.y = side * -0.62;
      bay.add(panel);
      const outerFin = box(bay, blackSteel, [0.32, 7.5, 5.3], [side * 11.3, 3.75, -2.2]);
      outerFin.rotation.y = side * -0.12;
      const sill = box(bay, metal, [0.7, 0.14, 12], [side * 8.4, 0.07, 0]);
      sill.rotation.y = side * 0.035;
      box(bay, brass, [0.034, 4.8, 0.12], [side * 8.9, 2.6, 1.7]);
      const threshold = new THREE.Mesh(unitPlane, accent);
      threshold.rotation.x = -Math.PI / 2;
      threshold.position.set(side * 4.75, 0.013, 3.8);
      threshold.scale.set(2.1, 0.026, 1);
      bay.add(threshold);
    }
    const ring = new THREE.Mesh(geometry(new THREE.RingGeometry(4.65, 4.675, 72, 1, 0.2, Math.PI * 1.25)), accent);
    ring.rotation.x = -Math.PI / 2;
    ring.rotation.z = index % 2 ? 0.7 : -0.15;
    ring.position.y = 0.012;
    bay.add(ring);
    // Solid ceiling coffers imply rooms while keeping the central viewing axis open.
    makeInstances(bay, unitBox, blackSteel, (pose, column) => {
      pose.position.set(-8.4 + column * 2.8, 9.4, -1.8);
      pose.rotation.x = 0.06;
      pose.scale.set(0.13, 0.45, 12.8);
    }, 7);
  });

  const first = monolith(0, 'Entrance monolith', true);
  const last = monolith(-138, 'Final monolith');
  const smoke = new THREE.Color('#435967');
  const silver = new THREE.Color('#91a0a9');

  function setGate(gate: Gate, opening: number, time: number, assembly: number, interiorVisible: boolean, kick = 0) {
    for (const plate of gate.plates) {
      plate.group.position.copy(plate.rest).addScaledVector(plate.travel, opening);
      plate.group.rotation.set(plate.turn.x * opening, plate.turn.y * opening, plate.turn.z * opening);
    }
    for (const rotor of gate.rotors) rotor.object.rotation.z = rotor.phase + opening * rotor.speed * 8 + time * rotor.speed + Math.sign(rotor.speed) * kick;
    gate.mechanisms.forEach((internal) => { internal.visible = interiorVisible && assembly < 0.97; });
    gate.glass.color.copy(smoke).lerp(silver, assembly);
    gate.glass.opacity = 0.18 + assembly * 0.78;
    gate.glass.metalness = 0.22 + assembly * 0.6;
    gate.glass.roughness = 0.16 + assembly * 0.05;
    gate.outline.opacity = 0.36 - assembly * 0.16;
  }

  function validPoint(point: THREE.Vector3): boolean {
    return Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z);
  }

  function placeInteractionLight(point: THREE.Vector3): void {
    // Public points are world-space ray intersections, including when the caller
    // transforms the architecture's parent. The lamp sits just ahead of the face.
    group.updateWorldMatrix(true, false);
    lightPosition.copy(point);
    group.worldToLocal(lightPosition);
    lightPosition.x += 0.18;
    lightPosition.y += 0.12;
    lightPosition.z += 0.65;
    interactionLight.position.copy(lightPosition);
  }

  function kickAt(time: number): number {
    const elapsed = Math.max(0, time - hitTime);
    return rotorKickBase + rotorKickStrength * (1 - Math.exp(-elapsed * 4.2));
  }

  function hover(point: THREE.Vector3 | null): void {
    if (disposed) return;
    hoverTarget = point && validPoint(point) && lastProgress < 0.22 ? 1 : 0;
    if (point && hoverTarget) {
      interaction.uArchitectureHover.value.copy(point);
      // Immediate feedback also works when the host renders only on demand.
      interaction.uArchitectureHoverStrength.value = Math.max(0.45, interaction.uArchitectureHoverStrength.value);
      placeInteractionLight(point);
      interactionLight.intensity = Math.max(interactionLight.intensity, 1.4);
    }
  }

  function interact(point: THREE.Vector3, strength = 1): void {
    if (disposed || lastProgress >= 0.22 || !validPoint(point)) return;
    const amount = clamp(strength);
    if (amount === 0) return;
    rotorKickBase = kickAt(lastTime);
    rotorKickStrength = amount * 0.95;
    hitTime = lastTime;
    interaction.uArchitectureHit.value.copy(point);
    interaction.uArchitectureWaveTime.value = 0.025;
    interaction.uArchitectureWaveStrength.value = amount * 0.105;
    placeInteractionLight(point);
    interactionLight.intensity = 2.4 + amount * 3.4;
  }

  function update(progress: number, time: number): void {
    if (disposed) return;
    const p = clamp(progress);
    const seconds = Number.isFinite(time) ? time : 0;
    const delta = Math.min(0.1, Math.max(0, seconds - lastTime));
    lastTime = seconds;
    lastProgress = p;
    const hitAge = Math.max(0, seconds - hitTime);
    const entrancePresence = 1 - smooth(0.155, 0.22, p);
    interaction.uArchitectureWaveTime.value = hitAge < 2.8 ? hitAge + 0.025 : -1;
    const hoverStrength = interaction.uArchitectureHoverStrength;
    hoverStrength.value += (hoverTarget * entrancePresence - hoverStrength.value) * (1 - Math.exp(-delta * 15));
    interactionLight.intensity = entrancePresence * (hoverStrength.value * 2.4 + Math.exp(-hitAge * 4.5) * rotorKickStrength * 5.4);
    first.group.visible = p < 0.22;
    last.group.visible = p > 0.64;
    const opening = smooth(0.03, 0.15, p);
    const assembly = smooth(0.86, 1, p);
    setGate(first, opening, seconds, 0, p < 0.175, kickAt(seconds));
    setGate(last, 1 - assembly, seconds, assembly, p > 0.83);
    for (const accent of roomAccents) {
      accent.group.visible = Math.abs(p - accent.progress) < 0.165;
      const proximity = 1 - smooth(0.025, 0.19, Math.abs(p - accent.progress));
      accent.material.opacity = 0.07 + proximity * 0.19;
    }
  }

  update(0, 0);
  return {
    group,
    surfaces: first.surfaces,
    hover,
    interact,
    update,
    dispose() {
      if (disposed) return;
      disposed = true;
      interactionLight.shadow.dispose();
      group.removeFromParent();
      group.clear();
      instances.forEach((object) => object.dispose());
      geometries.forEach((value) => value.dispose());
      materials.forEach((value) => value.dispose());
      textures.forEach((value) => value.dispose());
      instances.clear();
      geometries.clear();
      materials.clear();
      textures.clear();
    },
  };
}
