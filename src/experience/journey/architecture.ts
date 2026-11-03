import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { clearTransmission, createAtelierMaterials } from "./materials";
import { createMachine } from "./machine";
import { batchRigidMeshes } from "./batching";

/** The opening gallery only. The existing case pages keep their own worlds. */
export function createArchitecture() {
  const group = new THREE.Group();
  group.name = "Atelier / mechanical crystal hall";
  const materials = createAtelierMaterials();
  const machine = createMachine(materials);
  group.add(machine.group);
  const geometries = new Set<THREE.BufferGeometry>();
  const own = <T extends THREE.BufferGeometry>(value: T) => { geometries.add(value); return value; };
  const block = own(new RoundedBoxGeometry(1, 1, 1, 2, 0.035));
  const plane = own(new THREE.PlaneGeometry(1, 1));
  function box(material: THREE.Material, size: [number, number, number], position: [number, number, number], parent: THREE.Object3D = group) {
    const object = new THREE.Mesh(block, material);
    object.scale.set(...size);
    object.position.set(...position);
    object.castShadow = object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  const floor = new THREE.Mesh(own(new THREE.PlaneGeometry(40, 82)), materials.stone);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -0.045, -22);
  floor.receiveShadow = true;
  group.add(floor);

  // A translucent shadow-catching skin sits above the planar reflection.
  const receiver = materials.own(new THREE.MeshStandardMaterial({
    name: "Floor / shadow-catching mineral skin", color: "#10171f",
    roughness: 0.38, metalness: 0.1, transparent: true, opacity: 0.12,
    depthWrite: false,
  }));
  const groundShadows = new THREE.Mesh(floor.geometry, receiver);
  groundShadows.rotation.x = -Math.PI / 2;
  groundShadows.position.set(0, -0.028, -22);
  groundShadows.receiveShadow = true;
  group.add(groundShadows);

  // Grounded foundations and expansion joints establish a human-sized hall.
  box(materials.black, [8.05, 0.16, 2.35], [0, 0.01, 0]);
  box(materials.silver, [8.1, 0.027, 2.4], [0, 0.095, 0]);
  // Sparse joints remain below the reflection skin, so they cannot alias into dots.
  for (let z = 9; z > -49; z -= 9.6) {
    box(materials.black, [34, 0.006, 0.018], [0, -0.041, z]);
  }
  // Deep side walls, pilasters, inset panels and visible metal junctions.
  for (const side of [-1, 1]) {
    box(materials.black, [0.8, 12.7, 67], [side * 10.9, 6.2, -19]);
    box(materials.steel, [0.28, 0.38, 65], [side * 10.24, 0.22, -19]);
    for (const z of [8, -1.5, -11.5, -22.5, -34, -46]) {
      box(materials.stone, [0.78, 11.2, 0.94], [side * 9.9, 5.6, z]);
      box(materials.steel, [1.1, 0.24, 1.23], [side * 9.9, 0.14, z]);
      box(materials.silver, [0.045, 10.9, 0.12], [side * 9.46, 5.65, z + 0.27]);
      box(materials.steel, [0.43, 0.22, 0.73], [side * 9.45, 8.3, z]);
      const source = box(z < -15 ? materials.glow : materials.coolGlow,
        [0.025, 6.9, 0.05], [side * 10.43, 4.45, z - 3.2]);
      source.castShadow = false;
      // A broad recessed slab gives highlights a physical neighbour and depth.
      box(materials.steel, [0.16, 7.1, 3.6], [side * 10.39, 4.45, z - 2.1]);
      box(materials.black, [0.17, 0.16, 3.8], [side * 10.23, 8.1, z - 2.1]);
    }
  }
  box(materials.black, [22, 0.3, 70], [0, 12.2, -20]);
  for (let z = 5; z > -47; z -= 5.8) {
    box(materials.steel, [20, 0.28, 0.4], [0, 11.7, z]);
    box(materials.black, [18.7, 0.19, 1.6], [0, 11.95, z - 1.2]);
    box(materials.coolGlow, [5.2, 0.025, 0.055], [0, 11.53, z - 0.3]).castShadow = false;
  }
  // Faceted optical partitions frame the crossing on several depth planes.
  const partitionMaterial = materials.own(new THREE.MeshPhysicalMaterial({
    name: "Gallery / clear optical partition",
    color: "#ffffff", transmission: 1, thickness: 0.24, ior: 1.40,
    roughness: 0, metalness: 0, clearcoat: 0,
    attenuationColor: "#f1f6fa", attenuationDistance: 30,
    specularIntensity: 0.65, envMapIntensity: 0.42,
  }));
  clearTransmission(partitionMaterial);
  const partitionShape = new THREE.Shape();
  partitionShape.moveTo(-1.6, 0);
  partitionShape.lineTo(1.6, 0);
  partitionShape.lineTo(1.6, 8.2);
  partitionShape.lineTo(0.9, 9.8);
  partitionShape.lineTo(-1.6, 9.25);
  partitionShape.closePath();
  const partitionOpening = new THREE.Path();
  partitionOpening.moveTo(-1.03, 0.7);
  partitionOpening.lineTo(-1.03, 8.4);
  partitionOpening.lineTo(0.60, 8.74);
  partitionOpening.lineTo(1.03, 7.75);
  partitionOpening.lineTo(1.03, 0.7);
  partitionOpening.closePath();
  partitionShape.holes.push(partitionOpening);
  const partitionGeometry = own(new THREE.ExtrudeGeometry(partitionShape, {
    depth: 0.24, bevelEnabled: true, bevelSize: 0.035,
    bevelThickness: 0.035, bevelSegments: 3, steps: 1,
  }));
  for (const z of [-9, -19, -30]) for (const side of [-1, 1]) {
    const partition = new THREE.Group();
    partition.position.set(side * 7.8, 0.1, z);
    partition.rotation.y = side * -0.42;
    const crystal = new THREE.Mesh(partitionGeometry, partitionMaterial);
    partition.add(crystal);
    box(materials.steel, [3.5, 0.12, 0.55], [0, 0.03, 0.12], partition);
    box(materials.silver, [0.035, 9.2, 0.10], [-1.57, 4.65, 0.17], partition);
    box(materials.silver, [0.035, 8.1, 0.10], [1.57, 4.1, 0.17], partition);
    group.add(partition);
  }

  // The inner chamber ends with a real relief wall, arch and warm reveal.
  const chamber = new THREE.Group();
  chamber.position.set(-2.2, 0, -28);
  group.add(chamber);
  box(materials.black, [20.8, 11.8, 0.9], [2.2, 5.9, -6], chamber);
  for (let i = 0; i < 9; i++) {
    const x = -7.2 + i * 1.85;
    box(materials.steel, [0.13, 9.6, 0.3], [x, 5.0, -5.4], chamber);
    box(materials.brass, [0.028, 8.5, 0.045], [x + 0.18, 4.8, -5.2], chamber);
  }
  const archShape = new THREE.Shape();
  archShape.moveTo(-4.9, 0);
  archShape.lineTo(-4.9, 5.3);
  archShape.absarc(0, 5.3, 4.9, Math.PI, 0, true);
  archShape.lineTo(4.9, 0);
  archShape.lineTo(4.5, 0);
  archShape.lineTo(4.5, 5.3);
  archShape.absarc(0, 5.3, 4.5, 0, Math.PI, false);
  archShape.lineTo(-4.5, 0);
  archShape.closePath();
  const arch = new THREE.Mesh(own(new THREE.ExtrudeGeometry(archShape, {
    depth: 0.65, steps: 1, bevelEnabled: true, bevelSize: 0.055,
    bevelThickness: 0.055, bevelSegments: 3, curveSegments: 72,
  })), materials.steel);
  arch.position.z = -1.6;
  arch.castShadow = true;
  chamber.add(arch);
  for (const side of [-1, 1]) {
    box(materials.polished, [0.04, 5.15, 0.06], [side * 4.48, 2.7, -1.42], chamber);
    box(materials.glow, [0.03, 4.9, 0.045], [side * 4.63, 2.7, -1.55], chamber).castShadow = false;
  }
  // A few floating dust motes are a scale cue, not a screen-space wash.
  const dustPositions = new Float32Array(210 * 3);
  for (let i = 0; i < 210; i++) {
    dustPositions[i * 3] = Math.sin(i * 127.1) * 8.8;
    dustPositions[i * 3 + 1] = 0.7 + ((i * 37.13) % 8.1);
    dustPositions[i * 3 + 2] = 7 - ((i * 13.73) % 45);
  }
  const dustGeometry = own(new THREE.BufferGeometry());
  dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(dustGeometry, materials.own(new THREE.PointsMaterial({
    color: "#beced4", size: 0.022, transparent: true, opacity: 0.28,
    depthWrite: false, sizeAttenuation: true,
  })));
  group.add(dust);
  const fill = new THREE.PointLight("#f0b46c", 24, 16, 2);
  fill.position.set(-2.2, 4.7, -26);
  const interior = new THREE.PointLight("#e5ae63", 2.0, 12, 2);
  interior.position.set(0, 3.8, -1.7);
  group.add(fill, interior);
  const disposeInstances = batchRigidMeshes(group);
  return {
    group,
    surfaces: machine.surfaces,
    hover: machine.hover,
    interact: machine.interact,
    update(progress: number, time: number) {
      return machine.update(progress, time);
    },
    dispose() {
      machine.dispose();
      group.removeFromParent();
      group.clear();
      geometries.forEach(value => value.dispose());
      disposeInstances();
      materials.dispose();
    },
  };
}
