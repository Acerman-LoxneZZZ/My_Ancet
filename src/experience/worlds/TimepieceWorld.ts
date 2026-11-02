import * as THREE from "three";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import type { AssetLease } from "../AssetManager";
import type {
  FrameState,
  Quality,
  WorldInstance,
  WorldOptions,
} from "../types";
import { sampleWatchPart, type WatchPart } from "../watchPose";
import { modelAssets, watchManifests } from "./modelAssets";
import {
  addDirectional,
  cloneModel,
  fitBoundsCamera,
  idleFrame,
  materialsOf,
  unit,
} from "./shared";

type BoundPart = {
  data: WatchPart;
  object: THREE.Object3D;
  materials: THREE.MeshStandardMaterial[];
};

export class TimepieceWorld implements WorldInstance {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(33, 1, 0.05, 100);
  private model: THREE.Group;
  private materials: Set<THREE.Material>;
  private parts: BoundPart[] = [];
  private selected?: string;
  private width = 800;
  private height = 800;
  private frame = idleFrame();
  private direction = new THREE.Vector3();
  private poseProgress = Number.NaN;
  private framingBounds: THREE.Box3[] = [];
  private cameraRail!: THREE.CatmullRomCurve3;
  private focusRail!: THREE.CatmullRomCurve3;
  private cameraTarget = new THREE.Vector3();
  private disposed = false;

  static async create(options: WorldOptions): Promise<TimepieceWorld> {
    const model = modelAssets.acquire(
      options.resolveAsset("models/pocket-watch.glb"),
    );
    const manifest = watchManifests.acquire(
      options.resolveAsset("data/watch-parts.json"),
    );
    try {
      const [gltf, parts] = await Promise.all([
        model.promise,
        manifest.promise,
      ]);
      return new TimepieceWorld(gltf, parts, model, manifest, options.quality);
    } catch (error) {
      model.release();
      manifest.release();
      throw error;
    }
  }

  private constructor(
    gltf: GLTF,
    manifest: WatchPart[],
    private modelLease: AssetLease<GLTF>,
    private manifestLease: AssetLease<WatchPart[]>,
    quality: Quality,
  ) {
    const clone = cloneModel(gltf.scene);
    this.model = clone.object;
    this.materials = clone.materials;
    this.scene.add(this.model);
    try {
      const root = this.model.getObjectByName("watch_root");
      if (!root || root.children.length !== 47)
        throw new Error("Модель часов не содержит 47 независимых деталей.");
      const glass = new THREE.MeshPhysicalMaterial({
        name: "watch_glass_browser",
        color: "#dce9ef",
        metalness: 0,
        roughness: 0.08,
        transmission: 0,
        thickness: 0.018,
        ior: 1.46,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
        side: THREE.DoubleSide,
        envMapIntensity: 0.55,
      });
      this.materials.add(glass);
      for (const part of manifest) {
        const object: THREE.Object3D | undefined = root.getObjectByName(
          part.nodeName,
        );
        if (!object || object.parent !== root)
          throw new Error(`В GLB отсутствует деталь ${part.nodeName}`);
        const actual = [
          ...object.position.toArray(),
          ...object.quaternion.toArray(),
          ...object.scale.toArray(),
        ];
        const expected = [
          ...part.restPosition,
          ...part.restQuaternion,
          ...part.restScale,
        ];
        if (actual.some((n, index) => Math.abs(n - expected[index]) > 0.0001))
          throw new Error(`GLB и манифест расходятся: ${part.nodeName}`);
        const partMaterials: THREE.MeshStandardMaterial[] = [];
        object.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          child.userData.partId = part.id;
          if (part.nodeName === "front_glass") {
            child.material = glass;
            child.renderOrder = 2;
          }
          for (const material of materialsOf(child)) {
            if (!(material instanceof THREE.MeshStandardMaterial)) continue;
            if (material.name === "Charcoal dial printing") {
              material.metalness = 0;
              material.roughness = 0.8;
              material.envMapIntensity = 0.2;
            }
            material.userData.baseEmissive = material.emissive.clone();
            material.userData.baseEmissiveIntensity =
              material.emissiveIntensity;
            partMaterials.push(material);
          }
        });
        this.parts.push({ data: part, object, materials: partMaterials });
      }
      this.scene.environmentIntensity = 0.85;
      this.scene.add(new THREE.AmbientLight("#c5d4e5", 0.38));
      addDirectional(this.scene, "#fff1d7", 2.2, [-3, 6, 8]);
      addDirectional(this.scene, "#d8e9ff", 0.9, [4, 1, 3]);
      addDirectional(this.scene, "#f2cf92", 2.3, [1, 2, -5]);
      // Measure five absolute assembly poses once. Camera motion follows a
      // continuous rail, rather than chasing a different AABB on every frame.
      this.model.rotation.set(0, 0, -0.025);
      for (let i = 0; i <= 4; i++) {
        this.applyPose(i / 4);
        this.model.updateWorldMatrix(true, true);
        this.framingBounds.push(new THREE.Box3().setFromObject(this.model));
      }
      this.focusRail = new THREE.CatmullRomCurve3(
        this.framingBounds.map((bounds) => bounds.getCenter(new THREE.Vector3())),
      );
      this.setQuality(quality);
      this.fit(this.width, this.height);
    } catch (error) {
      this.materials.forEach((material) => material.dispose());
      this.scene.clear();
      throw error;
    }
  }

  update(frame: FrameState): void {
    if (this.disposed) return;
    this.frame = frame;
    const progress =
      frame.reducedMotion && !frame.manual ? 0.4 : unit(frame.progress);
    this.applyPose(progress);
    if (this.selected !== frame.selected) {
      this.selected = frame.selected;
      for (const part of this.parts)
        for (const material of part.materials) {
          const active = part.data.id === frame.selected;
          material.emissive.copy(
            active
              ? new THREE.Color("#9b6c2f")
              : material.userData.baseEmissive,
          );
          material.emissiveIntensity = active
            ? 0.24
            : material.userData.baseEmissiveIntensity;
        }
    }
    const px = frame.reducedMotion ? 0 : frame.pointer[0];
    const py = frame.reducedMotion ? 0 : frame.pointer[1];
    this.model.rotation.set(py * 0.025, px * 0.055, -0.025);
    this.cameraRail.getPoint(progress, this.camera.position);
    this.focusRail.getPoint(progress, this.cameraTarget);
    this.camera.lookAt(this.cameraTarget);
    this.camera.updateMatrixWorld();
  }

  fit(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    const framingCamera = new THREE.PerspectiveCamera(this.camera.fov);
    const positions: THREE.Vector3[] = [];
    let near = Infinity, far = 0;
    this.framingBounds.forEach((bounds, index) => {
      this.direction.set(0.64 + index / 4 * 0.16, 0.25, 1).normalize();
      fitBoundsCamera(framingCamera, bounds, this.direction, this.width, this.height, 0.88);
      positions.push(framingCamera.position.clone());
      near = Math.min(near, framingCamera.near);
      far = Math.max(far, framingCamera.far);
    });
    this.cameraRail = new THREE.CatmullRomCurve3(positions);
    this.camera.aspect = this.width / this.height;
    this.camera.near = near;
    this.camera.far = far;
    this.camera.updateProjectionMatrix();
    this.update(this.frame);
  }

  private applyPose(progress: number): void {
    if (progress === this.poseProgress) return;
    this.poseProgress = progress;
    for (const part of this.parts) {
      const pose = sampleWatchPart(part.data, progress);
      part.object.position.fromArray(pose.position);
      part.object.quaternion.fromArray(pose.quaternion);
      part.object.scale.fromArray(pose.scale);
    }
  }

  setQuality(quality: Quality): void {
    this.scene.environmentIntensity = quality.tier === "low" ? 0.7 : 0.85;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.scene.clear();
    this.materials.forEach((material) => material.dispose());
    this.materials.clear();
    this.parts.length = 0;
    this.modelLease.release();
    this.manifestLease.release();
  }
}
