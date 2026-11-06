import * as THREE from 'three';
import {modelAssets} from '../worlds/modelAssets';
import {cloneModel, materialsOf, unit} from '../worlds/shared';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createAtelierMaterials} from './materials';
import {galleryStops, placeGalleryRoom} from './galleryRoute';
import {journeyChapters} from './chapters';
import {timepieceHero} from '../../content/portfolio';

type Room = {
  group: THREE.Group;
  start: number;
  end: number;
};

type Panel = {
  group: THREE.Group;
  place(x: number, y: number, z: number, scale?: number): void;
};

type MountedObject = {
  group: THREE.Group;
  object: THREE.Group;
  place(x: number, y: number, z: number, scale?: number): void;
};

const imagePaths = {
  watch: timepieceHero,
  faro: '/assets/images/faro-original.jpg',
  menu: '/assets/images/faro-menu.jpg',
  gateway: '/assets/images/egypt-gateway.png',
  landscape: '/assets/images/egypt-landscape.png',
  egypt: '/assets/images/egypt-original.jpg',
  wordflow: '/assets/images/wordflow-original.jpg',
  dictionary: '/assets/images/wordflow-dictionary.jpg',
} as const;

const smooth = (start: number, end: number, progress: number): number => {
  const t = unit((progress - start) / (end - start));
  return t * t * (3 - 2 * t);
};

/** Load the watch before bringing in the rest of the portfolio wing. */
export async function createExhibits(): Promise<{
  group: THREE.Group;
  loadRemaining(): Promise<void>;
  update(progress: number): boolean;
  fit(aspect: number): void;
  dispose(): void;
}> {
  const group = new THREE.Group();
  group.name = 'journey-exhibits';
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const atelier = createAtelierMaterials();
  const images = {} as Record<keyof typeof imagePaths, THREE.Texture>;
  const watchLease = modelAssets.acquire('/assets/models/gallery-watch.glb');
  let pizzaLease: ReturnType<typeof modelAssets.acquire> | undefined;
  const rooms: Room[] = [];
  let disposed = false;
  let lastAspect = 16 / 9;
  let lastProgress = 0;

  const ownGeometry = <T extends THREE.BufferGeometry>(value: T): T => {
    geometries.add(value);
    return value;
  };
  const ownMaterial = <T extends THREE.Material>(value: T): T => {
    materials.add(value);
    return value;
  };
  const mesh = <T extends THREE.BufferGeometry>(geometry: T, material: THREE.Material) =>
    new THREE.Mesh(ownGeometry(geometry), material);

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    group.clear();
    // GLB geometry/maps belong to their leases, not to these material clones.
    materials.forEach(material => material.dispose());
    geometries.forEach(geometry => geometry.dispose());
    textures.forEach(texture => texture.dispose());
    materials.clear();
    geometries.clear();
    textures.clear();
    atelier.dispose();
    rooms.length = 0;
    watchLease.release();
    pizzaLease?.release();
  };

  try {
    const loader = new THREE.TextureLoader();
    const loadImages = async (keys: (keyof typeof imagePaths)[]) => {
      const loads = await Promise.allSettled(keys.map(async key => {
        const url = imagePaths[key];
        const texture = await loader.loadAsync(url);
        if (disposed) { texture.dispose(); return; }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 4;
        texture.name = url;
        textures.add(texture);
        images[key] = texture;
      }));
      const failed = loads.find(result => result.status === 'rejected');
      if (failed?.status === 'rejected') throw failed.reason;
    };
    const [watchResult, posterResult] = await Promise.allSettled([
      watchLease.promise,
      loadImages(['watch']),
    ]);
    if (watchResult.status === 'rejected') throw watchResult.reason;
    if (posterResult.status === 'rejected') throw posterResult.reason;
    const watchSource = watchResult.value;

    const metal = ownMaterial(new THREE.MeshStandardMaterial({
      name: 'Exhibit / satin metal', color: '#89939d', metalness: 0.78,
      roughness: 0.26, envMapIntensity: 0.75,
    }));
    const darkMetal = ownMaterial(new THREE.MeshStandardMaterial({
      name: 'Exhibit / dark steel', color: '#202833', metalness: 0.62,
      roughness: 0.35, envMapIntensity: 0.65,
    }));
    const backing = ownMaterial(new THREE.MeshPhysicalMaterial({
      name: 'Exhibit / glass housing', color: '#263542', metalness: 0.18,
      roughness: 0.16, clearcoat: 0.7, clearcoatRoughness: 0.16,
      transparent: true, opacity: 0.72, depthWrite: false,
    }));

    const size = 64;
    const pixels = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const radius = Math.hypot((x + 0.5) / size * 2 - 1, (y + 0.5) / size * 2 - 1);
      const index = (y * size + x) * 4;
      pixels[index] = pixels[index + 1] = pixels[index + 2] = 255;
      pixels[index + 3] = Math.round(Math.pow(Math.max(0, 1 - radius), 2.5) * 255);
    }
    const contactMap = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
    contactMap.needsUpdate = true;
    textures.add(contactMap);

    function contact(parent: THREE.Group, width: number, depth: number) {
      const shadow = mesh(new THREE.PlaneGeometry(width, depth), ownMaterial(new THREE.MeshBasicMaterial({
        map: contactMap, color: '#000000', transparent: true, opacity: 0.56,
        depthWrite: false, toneMapped: false,
      })));
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.018;
      parent.add(shadow);
    }

    function room(index: number): THREE.Group {
      const chapter = journeyChapters[index + 1];
      const roomGroup = new THREE.Group();
      roomGroup.name = `journey-room-${chapter.id}`;
      placeGalleryRoom(roomGroup, galleryStops[index]);
      group.add(roomGroup);
      rooms.push({group: roomGroup, start: chapter.from, end: chapter.to});
      return roomGroup;
    }

    function panel(parent: THREE.Group, name: string, texture: THREE.Texture, width: number, height: number): Panel {
      const display = new THREE.Group();
      display.name = name;
      parent.add(display);
      const body = new THREE.Group();
      const frame = mesh(new THREE.BoxGeometry(width + 0.14, height + 0.14, 0.10), metal);
      const housing = mesh(new THREE.BoxGeometry(width + 0.07, height + 0.07, 0.18), backing);
      housing.position.z = -0.075;
      const screen = mesh(new THREE.PlaneGeometry(width, height), ownMaterial(new THREE.MeshBasicMaterial({
        name: `${name} / original screen`, map: texture, toneMapped: false, fog: false,
      })));
      screen.position.z = 0.061;
      body.add(frame, housing, screen);
      const post = mesh(new THREE.BoxGeometry(0.12, 1, 0.14), metal);
      const foot = mesh(new THREE.BoxGeometry(width * 0.42, 0.12, 0.75), darkMetal);
      foot.position.y = 0.06;
      display.add(body, post, foot);
      contact(display, width * 0.7, 2.5);
      return {
        group: display,
        place(x, y, z, scale = 1) {
          display.position.set(x, 0, z);
          body.position.y = y;
          body.scale.setScalar(scale);
          const stemHeight = Math.max(0.10, y - height * scale / 2 - 0.13);
          post.position.set(0, 0.12 + stemHeight / 2, -0.06);
          post.scale.set(1, stemHeight, 1);
          foot.scale.set(scale, 1, scale);
        },
      };
    }

    function mounted(parent: THREE.Group, object: THREE.Group, height: number, width: number): MountedObject {
      const mount = new THREE.Group();
      const base = mesh(new THREE.CylinderGeometry(width * 0.46, width * 0.49, 0.22, 48), darkMetal);
      base.position.y = 0.11;
      const column = mesh(new THREE.CylinderGeometry(0.10, 0.14, 1, 20), metal);
      const tray = mesh(new THREE.CylinderGeometry(width * 0.42, width * 0.44, 0.09, 48), metal);
      mount.add(base, column, tray, object);
      contact(mount, width * 1.5, 3.1);
      parent.add(mount);
      return {
        group: mount,
        object,
        place(x, y, z, scale = 1) {
          mount.position.set(x, 0, z);
          object.position.y = y;
          object.scale.setScalar(scale);
          const trayY = Math.max(0.28, y - height * scale / 2 - 0.075);
          column.scale.y = trayY - 0.16;
          column.position.y = 0.16 + column.scale.y / 2;
          tray.position.y = trayY;
          tray.scale.set(scale, 1, scale);
          base.scale.set(scale, 1, scale);
        },
      };
    }

    const watchRoom = room(0);

    const watchClone = cloneModel(watchSource.scene);
    watchClone.materials.forEach(material => materials.add(material));
    const glass = ownMaterial(new THREE.MeshPhysicalMaterial({
      name: 'Watch / thin optical crystal', color: '#d5e2e9',
      roughness: 0.18, ior: 1.46, specularIntensity: 0.5,
      transparent: true, opacity: 0.08, depthWrite: false,
    }));
    const dialInk = ownMaterial(new THREE.MeshBasicMaterial({
      name: 'Watch / charcoal dial printing', color: '#282723',
    }));
    watchClone.object.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      const material = object.material;
      if (!(material instanceof THREE.MeshStandardMaterial)) return;
      object.castShadow = true;
      object.receiveShadow = !/enamel$/i.test(material.name);
      if (material.name === 'Optical crystal') {
        object.material = glass;
        object.renderOrder = 2;
        object.castShadow = object.receiveShadow = false;
      } else if (material.name === 'Charcoal dial printing') {
        object.material = dialInk;
        object.castShadow = object.receiveShadow = false;
      } else if (material.name === 'Blued steel hands') {
        material.color.set('#172b40');
        material.metalness = 0.72;
        material.roughness = 0.34;
      } else if (/brass|steel|aged case/i.test(material.name)) {
        material.roughness = /polished/i.test(material.name) ? 0.28 : 0.39;
      } else if (/enamel$/i.test(material.name)) {
        material.roughness = 0.63;
      }
    });
    const watchBounds = new THREE.Box3().setFromObject(watchClone.object);
    const watchSize = watchBounds.getSize(new THREE.Vector3());
    const watchScale = Math.min(4 / Math.max(0.001, watchSize.y), 3.4 / Math.max(0.001, watchSize.x));
    const watchCenter = watchBounds.getCenter(new THREE.Vector3());
    watchClone.object.position.sub(watchCenter);
    const watchNormalized = new THREE.Group();
    watchNormalized.scale.setScalar(watchScale);
    watchNormalized.add(watchClone.object);
    const watchObject = new THREE.Group();
    watchObject.name = 'journey-assembled-watch';
    watchObject.add(watchNormalized);
    const plinth = new THREE.Group();
    plinth.name = 'Timepiece / bevelled mineral display plinth';
    const plinthGeometry = ownGeometry(new RoundedBoxGeometry(5.55, 1.05, 3.5, 3, 0.075));
    const plinthBody = new THREE.Mesh(plinthGeometry, atelier.stone);
    plinthBody.position.y = 0.54;
    plinthBody.castShadow = plinthBody.receiveShadow = true;
    const plinthTop = mesh(new RoundedBoxGeometry(5.62, 0.06, 3.56, 2, 0.024), atelier.silver);
    plinthTop.position.y = 1.085;
    const inset = mesh(new THREE.BoxGeometry(5.36, 0.027, 3.32), atelier.polished);
    inset.position.y = 0.96;
    plinth.add(plinthBody, plinthTop, inset);
    watchRoom.add(plinth, watchObject);
    contact(plinth, 7.5, 5.2);
    const watchMount = {
      place(x: number, y: number, z: number, scale = 1) {
        watchObject.position.set(x, y, z);
        watchObject.scale.setScalar(scale);
        plinth.position.set(x, 0, z);
        plinth.scale.set(scale, 1, scale);
      },
    };
    const watchScreen = panel(watchRoom, 'KARpOV / first screen', images.watch, 6.4, 6.4 * 1000 / 1440);
    let fitRemaining: ((mix: (wide: number, narrow: number) => number, screenX: number, screenY: number, screenScale: number) => void) | undefined;
    let updateRemaining: ((progress: number) => void) | undefined;
    const loadRemaining = async () => {
      if (disposed) return;
      pizzaLease = modelAssets.acquire('/assets/models/pizza-web.glb');
      const keys = (Object.keys(imagePaths) as (keyof typeof imagePaths)[]).filter(key => key !== 'watch');
      const [pizzaResult, imageResult] = await Promise.allSettled([pizzaLease.promise, loadImages(keys)]);
      if (disposed) return;
      if (pizzaResult.status === 'rejected') throw pizzaResult.reason;
      if (imageResult.status === 'rejected') throw imageResult.reason;
      const pizzaSource = pizzaResult.value;
      const faroRoom = room(1);
      const egyptRoom = room(2);
      const wordflowRoom = room(3);
      const pizzaClone = cloneModel(pizzaSource.scene);
      pizzaClone.materials.forEach(material => materials.add(material));
      pizzaClone.object.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        for (const material of materialsOf(object)) if (material instanceof THREE.MeshStandardMaterial) {
          material.side = THREE.FrontSide;
          material.metalness = 0;
          material.roughness = 0.62;
          material.envMapIntensity = 0.45;
        }
      });
      const pizzaBounds = new THREE.Box3().setFromObject(pizzaClone.object);
      const pizzaSize = pizzaBounds.getSize(new THREE.Vector3());
      const pizzaScale = 3.45 / Math.max(0.001, pizzaSize.x, pizzaSize.z);
      pizzaClone.object.position.sub(pizzaBounds.getCenter(new THREE.Vector3()));
      const pizzaNormalized = new THREE.Group();
      pizzaNormalized.scale.setScalar(pizzaScale);
      pizzaNormalized.add(pizzaClone.object);
      const pizzaObject = new THREE.Group();
      pizzaObject.name = 'journey-original-pizza';
      pizzaObject.rotation.set(1.04, 0.04, -0.06);
      const plate = mesh(new THREE.CylinderGeometry(1.92, 1.86, 0.10, 64), ownMaterial(new THREE.MeshPhysicalMaterial({
        name: 'FARO / presentation ceramic', color: '#343831', metalness: 0,
        roughness: 0.34, clearcoat: 0.48, clearcoatRoughness: 0.18,
      })));
      plate.position.y = -pizzaSize.y * pizzaScale / 2 - 0.07;
      pizzaObject.add(pizzaNormalized, plate);
      const pizzaMount = mounted(faroRoom, pizzaObject, 3.5, 4.0);
      const faroScreen = panel(faroRoom, 'faro-original-screen', images.faro, 6.4, 3.6);
      const menuScreen = panel(faroRoom, 'faro-original-menu', images.menu, 2.8, 1.575);

      const portal = new THREE.Group();
      portal.name = 'journey-original-egypt-portal';
      const portalWidth = 7.2;
      const portalHeight = portalWidth * 880 / 1788;
      const panorama = mesh(new THREE.PlaneGeometry(6.75, 6.75 * 809 / 1942), ownMaterial(new THREE.MeshBasicMaterial({
        name: 'Egypt / original panorama', map: images.landscape, toneMapped: false, fog: false,
      })));
      panorama.position.set(0, -0.12, -0.16);
      const gateway = mesh(new THREE.PlaneGeometry(portalWidth, portalHeight), ownMaterial(new THREE.MeshBasicMaterial({
        name: 'Egypt / original gateway', map: images.gateway, transparent: true,
        alphaTest: 0.025, depthWrite: false, toneMapped: false, fog: false,
      })));
      gateway.position.z = 0.025;
      portal.add(panorama, gateway);
      const portalMount = mounted(egyptRoom, portal, portalHeight, 7.25);
      const egyptScreen = panel(egyptRoom, 'egypt-original-screen', images.egypt, 6.4, 3.6);

      const wordScreen = panel(wordflowRoom, 'wordflow-original-card', images.wordflow, 2.6, 2.6 * 844 / 390);
      const dictionaryScreen = panel(wordflowRoom, 'wordflow-original-dictionary', images.dictionary, 2.6, 2.6 * 844 / 390);
      fitRemaining = (mix, screenX, screenY, screenScale) => {
        faroScreen.place(screenX, screenY, mix(0, 1.25), screenScale);
        pizzaMount.place(mix(-3.7, -1.5), mix(2.5, 6.1), 0.45, mix(1, 0.78));
        menuScreen.place(mix(-4.4, 2.1), mix(6.2, 5.7), mix(-0.85, -0.04), mix(1.2, 0.75));
        egyptScreen.place(screenX, screenY, mix(0, 1.25), screenScale);
        portalMount.place(mix(-4.3, 0), mix(2.45, 6.35), -0.10, mix(1, 0.84));
        wordScreen.place(mix(-2.8, -1.45), mix(3.35, 3.1), 0, mix(1, 0.91));
        dictionaryScreen.place(mix(2.8, 1.45), mix(3.35, 3.1), 0, mix(1, 0.91));
      };
      updateRemaining = progress => {
        pizzaObject.rotation.y = -0.08 + smooth(0.36, 0.42, progress) * 0.16;
      };
      fit(lastAspect);
      updateRemaining(lastProgress);
    };

    const updateVisibility = () => {
      for (const entry of rooms) {
        entry.group.visible = lastProgress <= entry.end + 0.08
          && (entry.group === watchRoom || lastProgress >= entry.start - 0.12);
      }
    };
    const update = (progress: number) => {
      if (disposed) return false;
      lastProgress = unit(progress);
      updateVisibility();
      const yaw = 0.23 + smooth(0.18, 0.24, lastProgress) * 0.09;
      const rotationChanged = watchObject.rotation.y !== yaw;
      watchObject.rotation.y = yaw;
      updateRemaining?.(lastProgress);
      return rotationChanged;
    };

    const fit = (aspect: number) => {
      if (disposed) return;
      const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1.6;
      lastAspect = safeAspect;
      const compact = 1 - smooth(0.82, 1.25, safeAspect);
      const mix = (wide: number, narrow: number) => THREE.MathUtils.lerp(wide, narrow, compact);
      // Desktop keeps the aisle x=-0.5…+0.5 free. The host uses a side rail
      // during portrait transit, where the display becomes a vertical pair.
      const screenX = mix(4.7, 0);
      const screenY = mix(3.75, 2.3);
      const screenScale = mix(0.88, 5.5 / 6.4);
      watchScreen.place(screenX, screenY, -1.4, screenScale);
      watchScreen.group.rotation.y = mix(-0.16, 0);
      watchMount.place(mix(-2.25, 0), mix(3.48, 6.1), 0.35, mix(1.17, 0.83));
      fitRemaining?.(mix, screenX, screenY, screenScale);
      updateVisibility();
    };

    fit(16 / 9);
    update(0);
    return {group, loadRemaining, update, fit, dispose};
  } catch (error) {
    dispose();
    throw error;
  }
}
