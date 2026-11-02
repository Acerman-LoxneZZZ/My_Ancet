import * as THREE from "three";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import type { AssetLease } from "../AssetManager";
import type {
  FrameState,
  Quality,
  WorldInstance,
  WorldOptions,
} from "../types";
import { modelAssets } from "./modelAssets";
import {
  addDirectional,
  cloneModel,
  contactShadow,
  disposeTree,
  easeRange,
  fitBoundsCamera,
  idleFrame,
  materialsOf,
  unit,
} from "./shared";

export class FaroWorld implements WorldInstance {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(34, 1, 0.05, 100);
  private exhibit = new THREE.Group();
  private staging = new THREE.Group();
  private model: THREE.Group;
  private materials: Set<THREE.Material>;
  private shadow: THREE.Mesh;
  private width = 800;
  private height = 800;
  private frame = idleFrame();
  private direction = new THREE.Vector3();
  private bounds = new THREE.Box3();
  private center = new THREE.Vector3();
  private orbitRadius = 1;
  private disposed = false;

  static async create(options: WorldOptions): Promise<FaroWorld> {
    const lease = modelAssets.acquire(
      options.resolveAsset("models/pizza-web.glb"),
    );
    try {
      return new FaroWorld(await lease.promise, lease, options.quality);
    } catch (error) {
      lease.release();
      throw error;
    }
  }

  private constructor(
    gltf: GLTF,
    private lease: AssetLease<GLTF>,
    quality: Quality,
  ) {
    const clone = cloneModel(gltf.scene);
    this.model = clone.object;
    this.materials = clone.materials;
    this.exhibit.add(this.model, this.staging);
    this.scene.add(this.exhibit);
    this.model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      for (const material of materialsOf(child)) {
        if (!(material instanceof THREE.MeshStandardMaterial)) continue;
        material.side = THREE.FrontSide;
        material.metalness = 0;
        material.envMapIntensity = 0.45;
        material.roughness = 0.62;
        material.bumpMap = material.map;
        material.bumpScale = 0.012;
      }
    });
    const bounds = new THREE.Box3().setFromObject(this.model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const radius = Math.max(size.x, size.z) * 0.55;
    const profile = [
      [0, -0.13],
      [radius * 0.82, -0.13],
      [radius * 0.98, -0.075],
      [radius, -0.02],
      [radius * 0.995, 0.015],
      [radius * 0.97, 0.025],
      [radius * 0.91, -0.035],
      [radius * 0.78, -0.055],
      [0, -0.055],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const plate = new THREE.Mesh(
      new THREE.LatheGeometry(profile, 96),
      new THREE.MeshPhysicalMaterial({
        name: "FARO / graphite ceramic",
        color: "#393b37",
        metalness: 0,
        roughness: 0.4,
        clearcoat: 0.35,
        clearcoatRoughness: 0.2,
      }),
    );
    plate.position.set(center.x, bounds.min.y + 0.055, center.z);
    this.staging.add(plate);
    this.shadow = contactShadow(radius * 1.3, 0.62);
    this.shadow.position.set(center.x, bounds.min.y - 0.15, center.z);
    this.scene.add(this.shadow);
    this.scene.environmentIntensity = 0.35;
    this.scene.add(new THREE.HemisphereLight("#fff0d8", "#292c30", 0.55));
    addDirectional(this.scene, "#ffe3bd", 1.9, [-4, 7, 5]);
    addDirectional(this.scene, "#e4edff", 0.5, [4, 3, 4]);
    addDirectional(this.scene, "#ffcd8b", 1.2, [2, 5, -5]);
    this.exhibit.updateWorldMatrix(true, true);
    this.bounds.setFromObject(this.exhibit);
    this.bounds.getCenter(this.center);
    this.setQuality(quality);
    this.fit(this.width, this.height);
  }

  update(frame: FrameState): void {
    if (this.disposed) return;
    this.frame = frame;
    const progress = frame.reducedMotion ? 0.46 : unit(frame.progress);
    // Slow, short reveal with a reading hold in the middle of the source scan.
    const orbit =
      easeRange(0.08, 0.42, progress) * 0.7 +
      easeRange(0.69, 0.95, progress) * 0.3;
    const angle = THREE.MathUtils.degToRad(14 + orbit * 42);
    const elevation = THREE.MathUtils.degToRad(
      34 + Math.sin(orbit * Math.PI) * 7,
    );
    const px = frame.reducedMotion ? 0 : frame.pointer[0] * 0.035;
    this.direction.set(
      Math.sin(angle + px) * Math.cos(elevation),
      Math.sin(elevation),
      Math.cos(angle + px) * Math.cos(elevation),
    );
    this.camera.position.copy(this.center).addScaledVector(this.direction, this.orbitRadius);
    this.camera.lookAt(this.center);
    this.camera.updateMatrixWorld();
  }

  fit(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    const framingCamera = new THREE.PerspectiveCamera(this.camera.fov);
    this.orbitRadius = 0;
    // One constant radius covers the short orbit. The stationary scan is never
    // remeasured during pointer movement or scrolling.
    for (let i = 0; i <= 8; i++) {
      const orbit = i / 8;
      const angle = THREE.MathUtils.degToRad(14 + orbit * 42);
      const elevation = THREE.MathUtils.degToRad(34 + Math.sin(orbit * Math.PI) * 7);
      this.direction.set(Math.sin(angle) * Math.cos(elevation), Math.sin(elevation), Math.cos(angle) * Math.cos(elevation));
      fitBoundsCamera(framingCamera, this.bounds, this.direction, this.width, this.height, 0.89);
      this.orbitRadius = Math.max(this.orbitRadius, framingCamera.position.distanceTo(this.center));
    }
    this.camera.aspect = this.width / this.height;
    this.camera.near = Math.max(0.01, this.orbitRadius / 120);
    this.camera.far = Math.max(60, this.orbitRadius * 10);
    this.camera.updateProjectionMatrix();
    this.update(this.frame);
  }

  setQuality(quality: Quality): void {
    this.scene.environmentIntensity = quality.tier === "low" ? 0.3 : 0.35;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    disposeTree(this.staging);
    disposeTree(this.shadow);
    this.materials.forEach((material) => material.dispose());
    this.materials.clear();
    this.scene.clear();
    this.lease.release();
  }
}
