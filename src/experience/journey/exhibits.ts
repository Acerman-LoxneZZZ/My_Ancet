import * as THREE from 'three';
import {modelAssets} from '../worlds/modelAssets';
import {cloneModel, materialsOf, unit} from '../worlds/shared';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createAtelierMaterials} from './materials';
import {galleryStops, placeGalleryRoom} from './galleryRoute';
import {clampJourneyProgress, exhibitChapters, galleryShutterStart, JOURNEY_LIMIT} from './chapters';
import {createCastleArtifact, createEgyptArtifact} from './artifacts';
import {getProject, timepieceHero} from '../../content/portfolio';

type Room = {
  group: THREE.Group;
  ready: boolean;
  visibleFrom: number;
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
  egypt: getProject('egypt')!.screen,
  proyavleno: getProject('proyavleno')!.screen,
  dal: getProject('dal')!.screen,
  tutor: getProject('tutor')!.screen,
  castle: getProject('castle')!.screen,
} as const;

const smooth = (start: number, end: number, progress: number): number => {
  const t = unit((progress - start) / (end - start));
  return t * t * (3 - 2 * t);
};

/** Mount exhibit assets as the camera approaches each room. */
export function createExhibits(prepareObject: (object: THREE.Object3D) => Promise<void> = async () => {}, camera?: THREE.PerspectiveCamera): {
  group: THREE.Group;
  prepare(progress: number, onMount: () => void): Promise<void>;
  update(progress: number): boolean;
  fit(aspect: number): void;
  dispose(): void;
} {
  const group = new THREE.Group();
  group.name = 'journey-exhibits';
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const atelier = createAtelierMaterials();
  const images = {} as Record<keyof typeof imagePaths, THREE.Texture>;
  const leases: ReturnType<typeof modelAssets.acquire>[] = [];
  const requested = new Map<number, Promise<void>>();
  const layouts: ((mix: (wide: number, narrow: number) => number, x: number, y: number, scale: number) => void)[] = [];
  const poses: ((progress: number) => boolean)[] = [];
  const loadModel = (path: string) => {
    const lease = modelAssets.acquire(path);
    leases.push(lease);
    return lease.promise;
  };
  const rooms: Room[] = [];
  let disposed = false;
  let lastAspect = 16 / 9;
  let lastProgress = 0;
  let finalScreen: THREE.Group | undefined;
  const finalBounds = new THREE.Box3();
  const finalScreenPlane = new THREE.Plane();
  const finalNormal = new THREE.Vector3(), finalPoint = new THREE.Vector3();
  const viewProjection = new THREE.Matrix4(), frustum = new THREE.Frustum();
  const finalRoomPassed = () => {
    if (!camera || !finalScreen || finalBounds.isEmpty()) return true;
    if (finalScreenPlane.distanceToPoint(camera.position) >= -0.35) return false;
    frustum.setFromProjectionMatrix(viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    return !frustum.intersectsBox(finalBounds);
  };

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
    group.traverse(child => { if (child instanceof THREE.InstancedMesh) child.dispose(); });
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
    leases.forEach(lease => lease.release());
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
      const chapter = exhibitChapters[index];
      const roomGroup = new THREE.Group();
      roomGroup.name = `journey-room-${chapter.id}`;
      roomGroup.visible = false;
      placeGalleryRoom(roomGroup, galleryStops[index]);
      group.add(roomGroup);
      // Closed shutters already hide the exhibits from the camera.
      const visibleFrom = index === 0 ? chapter.from - 0.075 : galleryShutterStart(chapter);
      rooms[index] = {group: roomGroup, ready: false, visibleFrom, end: chapter.to};
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

    const loadWatch = async () => {
      const [source] = await Promise.all([loadModel('/assets/models/gallery-watch.glb'), loadImages(['watch'])]);
      if (disposed) return;
      const watchRoom = room(0);

      const watchClone = cloneModel(source.scene);
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
      layouts.push((mix, screenX, screenY, screenScale) => {
        watchScreen.place(screenX, screenY, -1.4, screenScale);
        watchScreen.group.rotation.y = mix(-0.16, 0);
        watchMount.place(mix(-2.25, 0), mix(3.48, 6.1), 0.35, mix(1.17, 0.83));
      });
      rotate(watchObject, 0, 0.23, 0.09, 0.04);
    };

    const rotate = (object: THREE.Object3D, index: number, start: number, amount: number, span: number) => {
      const at = exhibitChapters[index].at;
      poses.push(progress => {
        const yaw = start + smooth(at - span, at, progress) * amount;
        if (object.rotation.y === yaw) return false;
        object.rotation.y = yaw;
        return true;
      });
    };

    const loadFaro = async () => {
      const [source] = await Promise.all([loadModel('/assets/models/gallery-pizza.glb'), loadImages(['faro', 'menu'])]);
      if (disposed) return;
      const faroRoom = room(1);
      const pizzaClone = cloneModel(source.scene);
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
      layouts.push((mix, screenX, screenY, screenScale) => {
        faroScreen.place(screenX, screenY, mix(0, 1.25), screenScale);
        pizzaMount.place(mix(-3.7, -1.5), mix(2.5, 6.1), 0.45, mix(1, 0.78));
        menuScreen.place(mix(-4.4, 2.1), mix(6.2, 5.7), mix(-0.85, -0.04), mix(1.2, 0.75));
      });
      rotate(pizzaObject, 1, -0.08, 0.16, 0.04);
    };

    const loadEgypt = async () => {
      await loadImages(['egypt']);
      if (disposed) return;
      const egyptRoom = room(2);
      const artifact = createEgyptArtifact(atelier, {geometry: ownGeometry, material: ownMaterial});
      const artifactMount = mounted(egyptRoom, artifact, 3.72, 3.1);
      const egyptScreen = panel(egyptRoom, 'egypt-original-screen', images.egypt, 6.4, 3.6);
      layouts.push((mix, screenX, screenY, screenScale) => {
        egyptScreen.place(screenX, screenY, mix(0, 1.25), screenScale);
        artifactMount.place(mix(-3.5, 0), mix(3.7, 6.25), 0.12, mix(1, 0.78));
      });
      rotate(artifact, 2, -0.24, 0.37, 0.05);
    };

    const loadRibbon = async () => {
      const [source] = await Promise.all([loadModel('/assets/models/gallery-ribbon.glb'), loadImages(['proyavleno'])]);
      if (disposed) return;
      const ribbonRoom = room(3);
      // The original analytic ribbon, sampled for the gallery's viewing distance.
      const ribbonSource = source.scene.getObjectByName('Proyavleno_ribbon');
      if (!(ribbonSource instanceof THREE.Mesh)) throw new Error('Gallery ribbon mesh is missing');
      const ribbonGeometry = ribbonSource.geometry;
      const ribbonMaterial = ownMaterial(new THREE.MeshPhysicalMaterial({
        name: 'ПРОЯВЛЕНО / satin silver with a lavender edge',
        color: '#c5bcdb', metalness: 0.56, roughness: 0.29,
        clearcoat: 0.35, clearcoatRoughness: 0.26, envMapIntensity: 1.4,
        emissive: '#403055', emissiveIntensity: 0.31,
      }));
      ribbonMaterial.onBeforeCompile = shader => {
        shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
          float ribbonFacing = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
          outgoingLight += vec3(0.31, 0.14, 0.68) * pow(1.0 - ribbonFacing, 2.7);
          #include <opaque_fragment>
        `);
      };
      const ribbonObject = new THREE.Group();
      ribbonObject.name = 'journey-original-proyavleno-ribbon';
      ribbonObject.add(new THREE.Mesh(ribbonGeometry, ribbonMaterial));
      const ribbonHeight = ribbonGeometry.boundingBox!.max.y - ribbonGeometry.boundingBox!.min.y;
      const ribbonMount = mounted(ribbonRoom, ribbonObject, ribbonHeight, 3.35);
      const ribbonScreen = panel(ribbonRoom, 'ПРОЯВЛЕНО / original screen', images.proyavleno, 6.4, 4);
      layouts.push((mix, screenX, screenY, screenScale) => {
        ribbonScreen.place(screenX, screenY - mix(0, 0.24), mix(-0.5, 1.68), screenScale * mix(1, 0.94));
        ribbonMount.place(mix(-3.35, 0), mix(3.5, 6.42), 0.30, mix(1, 0.77));
      });
      rotate(ribbonObject, 3, -0.36, 0.58, 0.054);
    };

    const loadNewExhibit = async (index: number, id: 'dal' | 'tutor') => {
      await loadImages([id]);
      if (disposed) return;
      const parent = room(index);
      const screen = panel(parent, exhibitChapters[index].title, images[id], 7, 4.375);
      if (index === exhibitChapters.length - 1) finalScreen = screen.group;
      const sculpture = new THREE.Group();
      if (id === 'dal') {
        const ring = mesh(new THREE.TorusGeometry(1.33, 0.065, 10, 56), atelier.brass);
        const innerRing = mesh(new THREE.TorusGeometry(1.15, 0.025, 8, 48), atelier.polished);
        const needle = mesh(new THREE.ConeGeometry(0.27, 1.02, 4), atelier.brass);
        needle.position.y = 0.48;
        const tail = mesh(new THREE.ConeGeometry(0.27, 1.02, 4), atelier.steel);
        tail.rotation.z = Math.PI;
        tail.position.y = -0.48;
        sculpture.add(ring, innerRing, needle, tail);
        sculpture.rotation.z = -0.32;
      } else {
        const vertices = [[-1.15, -0.95], [1.14, -0.95], [-1.15, 1.16]];
        vertices.forEach(([x, y], index) => {
          const [nextX, nextY] = vertices[(index + 1) % vertices.length];
          const edge = mesh(new THREE.BoxGeometry(Math.hypot(nextX - x, nextY - y), 0.10, 0.15), atelier.polished);
          edge.position.set((x + nextX) / 2, (y + nextY) / 2, 0);
          edge.rotation.z = Math.atan2(nextY - y, nextX - x);
          sculpture.add(edge);
        });
        const glassShape = new THREE.Shape(vertices.map(([x, y]) => new THREE.Vector2(x, y)));
        sculpture.add(mesh(new THREE.ShapeGeometry(glassShape), backing));
        sculpture.rotation.z = 0.22;
      }
      const mount = mounted(parent, sculpture, 2.75, 2.9);
      layouts.push((mix, screenX, screenY, scale) => {
        screen.place(screenX, screenY, mix(-0.4, 1.3), scale * 0.91);
        mount.place(mix(-3.5, 0), mix(3.7, 5.65), 0.42, mix(1.04, 0.88));
      });
      rotate(sculpture, index, -0.22, 0.37, 0.05);
    };

    const loadCastle = async () => {
      await loadImages(['castle']);
      if (disposed) return;
      const parent = room(6);
      const screen = panel(parent, 'Замок', images.castle, 7, 4.375);
      finalScreen = screen.group;
      const sculpture = createCastleArtifact(atelier, {geometry: ownGeometry, material: ownMaterial});
      const mount = mounted(parent, sculpture, 3.55, 3.8);
      layouts.push((mix, screenX, screenY, scale) => {
        screen.place(-screenX, screenY, mix(-0.4, 1.3), scale * 0.91);
        mount.place(mix(3.5, 0), mix(3.7, 6.1), -0.5, mix(1, 0.78));
      });
      rotate(sculpture, 6, -0.26, 0.4, 0.05);
    };

    const loaders = [loadWatch, loadFaro, loadEgypt, loadRibbon,
      () => loadNewExhibit(4, 'dal'), () => loadNewExhibit(5, 'tutor'), loadCastle];
    const prepare = (progress: number, onMount: () => void): Promise<void> => {
      if (disposed) return Promise.resolve();
      const pending: Promise<void>[] = [];
      exhibitChapters.forEach((chapter, index) => {
        const pastRoom = progress > chapter.to + 0.055;
        const leavingFinalRoom = index === exhibitChapters.length - 1 && progress < JOURNEY_LIMIT;
        if ((index > 0 && progress < chapter.from - 0.14) || (pastRoom && !leavingFinalRoom)) return;
        const existing = requested.get(index);
        if (existing) { pending.push(existing); return; }
        const task = loaders[index]().then(async () => {
          if (disposed) return;
          fit(lastAspect);
          try { await prepareObject(rooms[index].group); }
          catch (error) { if (!disposed) console.warn('Could not prepare gallery resources', chapter.id, error); }
          if (disposed) return;
          rooms[index].ready = true;
          update(lastProgress);
          onMount();
        }).catch(error => {
          if (!disposed) console.warn('Could not load gallery exhibit', chapter.id, error);
        });
        requested.set(index, task);
        pending.push(task);
      });
      return Promise.all(pending).then(() => {});
    };

    const updateVisibility = () => {
      let changed = false;
      for (const entry of rooms) {
        if (!entry) continue;
        const leavingFinalRoom = entry === rooms[exhibitChapters.length - 1] && !finalRoomPassed();
        const visible = entry.ready && lastProgress >= entry.visibleFrom
          && (lastProgress <= entry.end + 0.055 || leavingFinalRoom);
        changed ||= entry.group.visible !== visible;
        entry.group.visible = visible;
      }
      return changed;
    };

    const update = (progress: number) => {
      if (disposed) return false;
      lastProgress = clampJourneyProgress(progress);
      let changed = updateVisibility();
      for (const pose of poses) changed = pose(lastProgress) || changed;
      return changed;
    };

    const fit = (aspect: number) => {
      if (disposed) return;
      lastAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1.6;
      const compact = 1 - smooth(0.82, 1.25, lastAspect);
      const mix = (wide: number, narrow: number) => THREE.MathUtils.lerp(wide, narrow, compact);
      // Keep the center aisle free on desktop and stack the displays in portrait.
      const screenX = mix(4.7, 0);
      const screenY = mix(3.75, 2.3);
      const screenScale = mix(0.88, 5.5 / 6.4);
      for (const layout of layouts) layout(mix, screenX, screenY, screenScale);
      const finalRoom = rooms[exhibitChapters.length - 1];
      if (finalRoom && finalScreen) {
        finalRoom.group.updateWorldMatrix(true, true);
        finalBounds.setFromObject(finalRoom.group).expandByScalar(0.2);
        finalNormal.set(0, 0, 1).transformDirection(finalScreen.matrixWorld);
        finalPoint.setFromMatrixPosition(finalScreen.matrixWorld);
        finalScreenPlane.setFromNormalAndCoplanarPoint(finalNormal, finalPoint);
      }
      updateVisibility();
    };

    fit(16 / 9);
    update(0);
    return {group, prepare, update, fit, dispose};
  } catch (error) {
    dispose();
    throw error;
  }
}
