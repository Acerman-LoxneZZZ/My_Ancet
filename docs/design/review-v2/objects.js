// Design proof only. Both objects are unmodified GLB assets from the source apps.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const mounted = new WeakMap();
const asset = (name) => new URL(`./assets/${name}`, import.meta.url).href;
const materialsOf = (mesh) => Array.isArray(mesh.material) ? mesh.material : [mesh.material];

function addLight(scene, color, intensity, position) {
  const light = new THREE.DirectionalLight(color, intensity);
  light.position.set(...position);
  scene.add(light);
  return light;
}

async function makeTimepiece(scene, ownedMaterials) {
  const [gltf, response] = await Promise.all([
    new GLTFLoader().loadAsync(asset('pocket-watch.glb')),
    fetch(asset('watch-parts.json')),
  ]);
  if (!response.ok) throw new Error(`Манифест часов: HTTP ${response.status}`);
  const parts = await response.json();
  const root = gltf.scene.getObjectByName('watch_root');
  if (!root || parts.length !== 47 || root.children.length !== 47) {
    throw new Error('GLB и манифест часов должны содержать 47 деталей.');
  }
  scene.add(gltf.scene);

  // Same browser overrides as the actual source application.
  const glass = new THREE.MeshPhysicalMaterial({
    name: 'watch_glass_browser', color: '#dce9ef', metalness: 0,
    roughness: 0.08, transmission: 0, thickness: 0.018, ior: 1.46,
    transparent: true, opacity: 0.12, depthWrite: false,
    side: THREE.DoubleSide, envMapIntensity: 0.55,
  });
  ownedMaterials.add(glass);
  const progress = 0.36;
  for (const part of parts) {
    const carrier = root.getObjectByName(part.nodeName);
    if (!carrier || carrier.parent !== root) throw new Error(`Нет carrier: ${part.nodeName}`);
    const rest = [...carrier.position.toArray(), ...carrier.quaternion.toArray(), ...carrier.scale.toArray()];
    const declared = [...part.restPosition, ...part.restQuaternion, ...part.restScale];
    if (rest.some((value, i) => Math.abs(value - declared[i]) > 0.0001)) {
      throw new Error(`Несогласованная исходная поза: ${part.nodeName}`);
    }
    const u = part.end > part.start
      ? THREE.MathUtils.clamp((progress - part.start) / (part.end - part.start), 0, 1) : 0;
    const eased = u * u * (3 - 2 * u);
    carrier.position.fromArray(part.restPosition)
      .addScaledVector(new THREE.Vector3().fromArray(part.explodedOffset), eased);
    carrier.quaternion.fromArray(part.restQuaternion)
      .slerp(new THREE.Quaternion().fromArray(part.explodedQuaternion), eased);
    carrier.scale.fromArray(part.restScale);
    carrier.traverse((mesh) => {
      if (!mesh.isMesh) return;
      materialsOf(mesh).forEach((material) => ownedMaterials.add(material));
      if (part.nodeName === 'front_glass') {
        mesh.material = glass;
        mesh.renderOrder = 2;
      } else {
        for (const material of materialsOf(mesh)) {
          if (material.name === 'Charcoal dial printing') {
            material.metalness = 0;
            material.roughness = 0.8;
            material.envMapIntensity = 0.2;
          }
        }
      }
    });
  }
  scene.environmentIntensity = 1;
  scene.add(new THREE.AmbientLight('#c5d4e5', 0.45));
  addLight(scene, '#fff1d7', 2.2, [-3, 6, 8]);
  addLight(scene, '#d8e9ff', 1.1, [4, 1, 3]);
  addLight(scene, '#f2cf92', 2.5, [1, 2, -5]);
  return {
    object: gltf.scene,
    direction: new THREE.Vector3(0.72, 0.26, 1).normalize(),
    fill: 0.88,
  };
}

async function makeFaro(scene, renderer, ownedMaterials) {
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
    .loadAsync(asset('pizza-web.glb'));
  const exhibit = new THREE.Group();
  exhibit.add(gltf.scene);
  scene.add(exhibit);
  const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  gltf.scene.traverse((mesh) => {
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    for (const material of materialsOf(mesh)) {
      ownedMaterials.add(material);
      // Source FARO material settings preserve all three original texture maps.
      material.side = THREE.FrontSide;
      material.metalness = 0;
      material.envMapIntensity = 0.45;
      material.roughness = 0.62;
      material.bumpMap = material.map;
      material.bumpScale = 0.012;
      for (const property of ['map', 'normalMap', 'roughnessMap', 'metalnessMap']) {
        if (material[property]) material[property].anisotropy = maxAnisotropy;
      }
    }
  });

  const pizzaBounds = new THREE.Box3().setFromObject(gltf.scene);
  const size = pizzaBounds.getSize(new THREE.Vector3());
  const center = pizzaBounds.getCenter(new THREE.Vector3());
  const radius = Math.max(size.x, size.z) * 0.55;
  // A low, closed ceramic plate: the scan itself stays untouched.
  const profile = [
    [0, -0.13], [radius * 0.82, -0.13], [radius * 0.98, -0.075],
    [radius, -0.02], [radius * 0.995, 0.015], [radius * 0.97, 0.025],
    [radius * 0.91, -0.035], [radius * 0.78, -0.055], [0, -0.055],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const ceramic = new THREE.MeshStandardMaterial({
    name: 'presentation_ceramic_plate', color: '#292b2e',
    metalness: 0, roughness: 0.39, envMapIntensity: 0.5,
  });
  ownedMaterials.add(ceramic);
  const plate = new THREE.Mesh(new THREE.LatheGeometry(profile, 96), ceramic);
  plate.position.set(center.x, pizzaBounds.min.y + 0.055, center.z);
  plate.receiveShadow = true;
  plate.castShadow = true;
  exhibit.add(plate);

  scene.environmentIntensity = 0.35;
  scene.add(new THREE.HemisphereLight('#fff0d8', '#292c30', 0.55));
  const key = addLight(scene, '#ffe3bd', 1.9, [-4, 7, 5]);
  addLight(scene, '#e4edff', 0.55, [4, 3, 4]);
  addLight(scene, '#ffcd8b', 1.2, [2, 5, -5]);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 0.5, far: 25 });
  key.shadow.bias = -0.00025;
  key.shadow.normalBias = 0.015;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  return { object: exhibit, direction: new THREE.Vector3(0.3, 0.9, 1).normalize(), fill: 0.9 };
}

function fitCamera(camera, object, direction, fill, width, height) {
  object.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(object, true);
  if (bounds.isEmpty()) throw new Error('Модель не содержит видимой геометрии.');
  const center = bounds.getCenter(new THREE.Vector3());
  camera.aspect = width / height;
  camera.position.copy(center).add(direction);
  camera.lookAt(center);
  camera.updateMatrixWorld();
  const inverseRotation = camera.quaternion.clone().invert();
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const tanH = tanV * camera.aspect;
  let distance = 1;
  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        const corner = new THREE.Vector3(x, y, z).sub(center).applyQuaternion(inverseRotation);
        distance = Math.max(distance, corner.z + Math.max(
          Math.abs(corner.x) / (tanH * fill), Math.abs(corner.y) / (tanV * fill),
        ));
      }
    }
  }
  camera.position.copy(center).addScaledVector(direction, distance);
  camera.near = Math.max(0.01, distance / 100);
  camera.far = distance * 10;
  camera.updateProjectionMatrix();
}

async function mountOne(element) {
  let renderer, environmentTarget, observer, scene, resizeFrame = 0;
  let disposed = false;
  const ownedMaterials = new Set();
  const canvas = document.createElement('canvas');
  const name = element.dataset.model;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', name === 'timepiece'
    ? 'Оригинальная модель «Ход времени»: частично разобранные карманные часы'
    : 'Оригинальная 3D-модель FARO с прошутто и рукколой на новой керамической тарелке');
  Object.assign(canvas.style, { display: 'block', width: '100%', height: '100%' });
  element.dataset.ready = 'false';
  element.setAttribute('aria-busy', 'true');
  element.append(canvas);

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    observer?.disconnect();
    cancelAnimationFrame(resizeFrame);
    const geometries = new Set();
    const textures = new Set();
    scene?.traverse((object) => {
      if (!object.isMesh) return;
      geometries.add(object.geometry);
      materialsOf(object).forEach((material) => ownedMaterials.add(material));
    });
    for (const material of ownedMaterials) {
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      material.dispose();
    }
    textures.forEach((texture) => texture.dispose());
    geometries.forEach((geometry) => geometry.dispose());
    environmentTarget?.dispose();
    renderer?.dispose();
    canvas.remove();
    mounted.delete(element);
  };
  mounted.set(element, dispose);

  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    scene = new THREE.Scene();
    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    environmentTarget = pmrem.fromScene(room, 0.04);
    scene.environment = environmentTarget.texture;
    room.dispose();
    pmrem.dispose();
    const framing = name === 'timepiece'
      ? await makeTimepiece(scene, ownedMaterials)
      : await makeFaro(scene, renderer, ownedMaterials);
    if (disposed) return dispose;
    const camera = new THREE.PerspectiveCamera(33, 1, 0.05, 100);
    const render = () => {
      if (disposed) return;
      const { width, height } = element.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(Math.round(width), Math.round(height), false);
      fitCamera(camera, framing.object, framing.direction, framing.fill, width, height);
      renderer.render(scene, camera);
      element.dataset.ready = 'true';
      element.setAttribute('aria-busy', 'false');
    };
    render();
    observer = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(render);
    });
    observer.observe(element);
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      element.dataset.ready = 'false';
      element.dataset.error = 'Графический контекст временно потерян.';
    });
    canvas.addEventListener('webglcontextrestored', () => {
      delete element.dataset.error;
      render();
    });
  } catch (error) {
    dispose();
    element.dataset.ready = 'false';
    element.setAttribute('aria-busy', 'false');
    const message = document.createElement('p');
    message.className = 'object-render-error';
    message.setAttribute('role', 'status');
    message.textContent = `Предметный кадр не загрузился: ${error.message || String(error)}`;
    element.append(message);
    console.error(`Object design proof (${name})`, error);
  }
  return dispose;
}

export async function mountObjects() {
  const elements = [...document.querySelectorAll(
    '.object-render[data-model="timepiece"], .object-render[data-model="faro"]',
  )];
  const cleanups = await Promise.all(elements.map((element) => mounted.get(element) || mountOne(element)));
  return () => cleanups.forEach((cleanup) => cleanup?.());
}
