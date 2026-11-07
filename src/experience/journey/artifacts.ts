import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { AtelierMaterials } from './materials';

type Owner = {
  geometry<T extends THREE.BufferGeometry>(value: T): T;
  material<T extends THREE.Material>(value: T): T;
};

/** Small, real solids sharing the gallery's material and disposal lifecycle. */
export function createEgyptArtifact(atelier: AtelierMaterials, own: Owner) {
  const group = new THREE.Group();
  group.name = 'Egypt / sculpted brass ankh';
  const gold = own.material(new THREE.MeshStandardMaterial({
    name: 'Egypt / brushed warm gold', color: '#cfab68', metalness: 0.8,
    roughness: 0.3, roughnessMap: atelier.brushing,
  }));
  const loop = new THREE.Shape();
  loop.absellipse(0, 0.83, 0.7, 0.97, 0, Math.PI * 2, false, 0);
  const aperture = new THREE.Path();
  aperture.absellipse(0, 0.83, 0.42, 0.66, 0, Math.PI * 2, true, 0);
  loop.holes.push(aperture);
  const loopGeometry = own.geometry(new THREE.ExtrudeGeometry(loop, {
    depth: 0.2, bevelEnabled: true, bevelSegments: 2, steps: 1,
    bevelSize: 0.045, bevelThickness: 0.04, curveSegments: 32,
  }));
  loopGeometry.translate(0, 0, -0.1);
  const head = new THREE.Mesh(loopGeometry, gold);
  const stem = new THREE.Mesh(own.geometry(new RoundedBoxGeometry(0.3, 1.83, 0.26, 2, 0.045)), gold);
  stem.position.y = -0.91;
  const arms = new THREE.Mesh(own.geometry(new RoundedBoxGeometry(1.94, 0.3, 0.26, 2, 0.045)), gold);
  arms.position.y = -0.17;
  const inset = new THREE.Mesh(own.geometry(new THREE.BoxGeometry(0.042, 1.49, 0.012)), atelier.polished);
  inset.position.set(0, -0.96, 0.137);
  group.add(head, stem, arms, inset);
  group.traverse(child => { if (child instanceof THREE.Mesh) child.castShadow = child.receiveShadow = true; });
  return group;
}

export function createCastleArtifact(atelier: AtelierMaterials, own: Owner) {
  const group = new THREE.Group();
  group.name = 'Castle / miniature stone gateway';
  const stone = own.material(new THREE.MeshStandardMaterial({
    name: 'Castle / honed limestone', color: '#c1b69d', roughness: 0.8,
    bumpMap: atelier.stoneMap, bumpScale: 0.024, roughnessMap: atelier.brushing,
  }));
  const courses = new THREE.InstancedMesh(own.geometry(new THREE.CylinderGeometry(0.47, 0.48, 0.42, 20)), stone, 14);
  const merlons = new THREE.InstancedMesh(own.geometry(new THREE.BoxGeometry(0.22, 0.32, 0.22)), stone, 16);
  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion();
  const axis = new THREE.Vector3(0, 1, 0), scale = new THREE.Vector3(1, 1, 1);
  const position = new THREE.Vector3();
  for (let tower = 0; tower < 2; tower++) {
    const x = tower === 0 ? -1.22 : 1.22;
    for (let row = 0; row < 7; row++) {
      position.set(x, -1.33 + row * 0.426, 0);
      rotation.setFromAxisAngle(axis, row % 2 * Math.PI / 20);
      courses.setMatrixAt(tower * 7 + row, matrix.compose(position, rotation, scale));
    }
    for (let tooth = 0; tooth < 8; tooth++) {
      const angle = tooth / 8 * Math.PI * 2;
      position.set(x + Math.sin(angle) * 0.34, 1.58, Math.cos(angle) * 0.34);
      rotation.setFromAxisAngle(axis, angle);
      merlons.setMatrixAt(tower * 8 + tooth, matrix.compose(position, rotation, scale));
    }
    const slit = new THREE.Mesh(own.geometry(new THREE.BoxGeometry(0.075, 0.45, 0.02)), atelier.black);
    slit.position.set(x, 0.54, 0.475);
    group.add(slit);
  }
  group.add(courses, merlons);
  const blockGeometry = own.geometry(new RoundedBoxGeometry(0.36, 0.32, 0.66, 1, 0.014));
  for (const side of [-1, 1]) for (let row = 0; row < 4; row++) {
    const block = new THREE.Mesh(blockGeometry, stone);
    block.position.set(side * 0.81, -1.35 + row * 0.326, 0.03);
    group.add(block);
  }
  // Individual voussoirs leave a genuinely open, deep archway.
  for (let i = 0; i < 11; i++) {
    const a = i / 11 * Math.PI + 0.012, b = (i + 1) / 11 * Math.PI - 0.012;
    const wedge = new THREE.Shape();
    wedge.absarc(0, -0.16, 0.99, a, b, false);
    wedge.lineTo(Math.cos(b) * 0.63, -0.16 + Math.sin(b) * 0.63);
    wedge.absarc(0, -0.16, 0.63, b, a, true);
    wedge.closePath();
    const geometry = own.geometry(new THREE.ExtrudeGeometry(wedge, {
      depth: 0.64, steps: 1, curveSegments: 3, bevelEnabled: true,
      bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 1,
    }));
    geometry.translate(0, 0, -0.29);
    group.add(new THREE.Mesh(geometry, stone));
  }
  const foundation = new THREE.Mesh(own.geometry(new RoundedBoxGeometry(3.55, 0.22, 1.38, 2, 0.055)), atelier.stone);
  foundation.position.y = -1.64;
  group.add(foundation);
  group.traverse(child => { if (child instanceof THREE.Mesh) child.castShadow = child.receiveShadow = true; });
  return group;
}
