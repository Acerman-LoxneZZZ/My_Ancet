import * as THREE from "three";
import type { FrameState } from "../types";

export const idleFrame = (): FrameState => ({
  progress: 0,
  time: 0,
  pointer: [0, 0],
  reducedMotion: false,
  finale: false,
  impulse: 0,
});
export const unit = (n: number): number =>
  Number.isFinite(n) ? THREE.MathUtils.clamp(n, 0, 1) : 0;
export const easeRange = (start: number, end: number, p: number): number => {
  const t = unit((p - start) / (end - start));
  return t * t * (3 - 2 * t);
};
export const materialsOf = (object: THREE.Mesh): THREE.Material[] =>
  Array.isArray(object.material) ? object.material : [object.material];

export function addDirectional(
  scene: THREE.Scene,
  color: THREE.ColorRepresentation,
  intensity: number,
  position: [number, number, number],
): THREE.DirectionalLight {
  const light = new THREE.DirectionalLight(color, intensity);
  light.position.set(...position);
  scene.add(light);
  return light;
}

/** Only owned geometry/material/maps. The renderer's scene.environment is excluded. */
export function disposeTree(root: THREE.Object3D, closeImages = false): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const images = new Set<{ close(): void }>();
  root.traverse((object) => {
    const drawable = object as THREE.Mesh;
    if (drawable.geometry) geometries.add(drawable.geometry);
    if (drawable.material)
      materialsOf(drawable).forEach((material) => materials.add(material));
    if (
      object instanceof THREE.DirectionalLight ||
      object instanceof THREE.SpotLight ||
      object instanceof THREE.PointLight
    )
      object.shadow?.dispose();
  });
  for (const material of materials) {
    for (const value of Object.values(material)) {
      if (
        value instanceof THREE.Texture &&
        value !== (root as THREE.Scene).environment
      )
        textures.add(value);
    }
    material.dispose();
  }
  for (const texture of textures) {
    const bitmap = texture.image as { close?: () => void } | undefined;
    if (closeImages && typeof bitmap?.close === "function")
      images.add(bitmap as { close(): void });
    texture.dispose();
  }
  images.forEach((bitmap) => bitmap.close());
  geometries.forEach((geometry) => geometry.dispose());
  root.clear();
}

/** Per-instance materials with borrowed geometry/textures owned by the asset lease. */
export function cloneModel(source: THREE.Group): {
  object: THREE.Group;
  materials: Set<THREE.Material>;
} {
  const object = source.clone(true);
  const materials = new Set<THREE.Material>();
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const copies = materialsOf(child).map((material) => {
      const copy = material.clone();
      materials.add(copy);
      return copy;
    });
    child.material = copies.length === 1 ? copies[0] : copies;
  });
  return { object, materials };
}

const box = new THREE.Box3();
const center = new THREE.Vector3();
const corner = new THREE.Vector3();
const inverse = new THREE.Quaternion();

/** Fit only the exhibit (not its floor/lights), preserving the chosen perspective. */
export function fitObjectCamera(
  camera: THREE.PerspectiveCamera,
  object: THREE.Object3D,
  direction: THREE.Vector3,
  width: number,
  height: number,
  fill = 0.9,
): void {
  object.updateWorldMatrix(true, true);
  box.setFromObject(object);
  fitBoundsCamera(camera, box, direction, width, height, fill);
}

/** Frame already measured bounds without traversing a model's mesh hierarchy. */
export function fitBoundsCamera(
  camera: THREE.PerspectiveCamera,
  bounds: THREE.Box3,
  direction: THREE.Vector3,
  width: number,
  height: number,
  fill = 0.9,
): void {
  if (bounds.isEmpty()) return;
  bounds.getCenter(center);
  camera.aspect = Math.max(1, width) / Math.max(1, height);
  camera.position.copy(center).add(direction);
  camera.lookAt(center);
  inverse.copy(camera.quaternion).invert();
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const tanH = tanV * camera.aspect;
  let distance = 0.5;
  for (const x of [bounds.min.x, bounds.max.x])
    for (const y of [bounds.min.y, bounds.max.y])
      for (const z of [bounds.min.z, bounds.max.z]) {
        corner.set(x, y, z).sub(center).applyQuaternion(inverse);
        distance = Math.max(
          distance,
          corner.z +
            Math.max(
              Math.abs(corner.x) / (tanH * fill),
              Math.abs(corner.y) / (tanV * fill),
            ),
        );
      }
  camera.position.copy(center).addScaledVector(direction, distance);
  camera.near = Math.max(0.01, distance / 120);
  camera.far = Math.max(60, distance * 10);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

/** Procedural contact shadow; data-only so it also works in video rendering. */
export function contactShadow(radius: number, opacity = 0.4): THREE.Mesh {
  const size = 64;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const r = Math.hypot(
        ((x + 0.5) / size) * 2 - 1,
        ((y + 0.5) / size) * 2 - 1,
      );
      const index = (y * size + x) * 4;
      pixels[index + 3] = Math.round(Math.pow(Math.max(0, 1 - r), 1.5) * 255);
    }
  const map = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  map.needsUpdate = true;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({
      map,
      transparent: true,
      opacity,
      depthWrite: false,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}
