import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";

/** Fixed studio sources: the camera moves through the light, not with it. */
export function createAtelierLighting(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  RectAreaLightUniformsLib.init();
  const environmentScene = new THREE.Scene();
  environmentScene.background = new THREE.Color("#101922");
  const owned: THREE.Object3D[] = [];
  const resources: Array<{ dispose(): void }> = [];
  function softbox(color: string, intensity: number, width: number, height: number,
    position: [number, number, number], target: [number, number, number]) {
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide,
    });
    const object = new THREE.Mesh(geometry, material);
    object.position.set(...position);
    object.lookAt(...target);
    environmentScene.add(object);
    resources.push(geometry, material);
  }
  softbox("#d1e8ff", 1.5, 2.0, 9, [-8, 5, -2], [0, 3, 0]);
  softbox("#f0d5ab", 1.6, 3.3, 8, [8, 4, -4], [0, 2, 0]);
  softbox("#eaf1f4", 0.8, 11, 5, [0, 10, 0], [0, 0, 0]);
  softbox("#8dabc7", 0.55, 13, 8, [0, 5, -10], [0, 3, 0]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(environmentScene, 0.035, 0.1, 100);
  pmrem.dispose();
  resources.forEach(value => value.dispose());
  environmentScene.clear();
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.72;
  const ambient = new THREE.HemisphereLight("#adc5d6", "#14100c", 0.19);
  const key = new THREE.DirectionalLight("#d7eaff", 1.6);
  key.position.set(-7, 13, 11);
  key.target.position.set(0, 2.5, -9);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -18, right: 18, top: 17, bottom: -17, near: 0.5, far: 78 });
  key.shadow.bias = -0.00012;
  key.shadow.normalBias = 0.008;
  key.shadow.radius = 3;
  key.shadow.camera.updateProjectionMatrix();
  const rim = new THREE.RectAreaLight("#b9dbff", 2.2, 3.0, 8);
  rim.position.set(6.2, 5.4, -3.5);
  rim.lookAt(0, 3.2, 0);
  const left = new THREE.RectAreaLight("#d8e9ff", 1.6, 4, 8);
  left.position.set(-7, 5.5, 5);
  left.lookAt(0, 3.1, 0);
  const gold = new THREE.RectAreaLight("#e8be80", 3.8, 3.8, 5.5);
  gold.position.set(-4.2, 5.8, -20);
  gold.lookAt(-2.0, 3, -24);
  const watchRim = new THREE.SpotLight("#b4d7fa", 100, 24, 0.65, 0.85, 2);
  watchRim.position.set(2.5, 9.7, -29);
  watchRim.target.position.set(-2.3, 3.3, -24);
  const warmFill = new THREE.PointLight("#f9d89d", 50, 18, 2);
  warmFill.position.set(-4.5, 4.5, -20.5);
  owned.push(ambient, key, key.target, rim, left, gold, watchRim, watchRim.target, warmFill);
  scene.add(...owned);
  return {
    environment,
    dispose() {
      owned.forEach(object => {
        object.removeFromParent();
        if (object instanceof THREE.DirectionalLight || object instanceof THREE.SpotLight) object.shadow.dispose();
      });
      environment.dispose();
    },
  };
}
