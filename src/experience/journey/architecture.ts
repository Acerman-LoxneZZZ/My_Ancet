import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createAtelierMaterials, createClearGlass } from "./materials";
import { createMachine } from "./machine";
import { batchRigidMeshes } from "./batching";
import { galleryShutterStart, journeyChapters } from "./chapters";
import { bendGalleryPoint, finaleRoom, finaleView, galleryFloor, galleryStops, lastGalleryStop, placeGalleryRoom, wingX, wingZ } from "./galleryRoute";
import { railEnd, railStart, railX, type entrancePose } from "./entrance";

/** The entrance and adjoining portfolio wing share the same material library. */
export function createArchitecture() {
  const group = new THREE.Group();
  group.name = "Atelier / mechanical crystal hall";
  const materials = createAtelierMaterials();
  const machine = createMachine(materials);
  const finale = createMachine(materials, true);
  group.add(machine.group);
  finale.group.position.set(finaleRoom.x, 3, finaleRoom.z);
  finale.group.rotation.y = Math.PI - 0.08;
  finale.group.visible = false;
  group.add(finale.group);
  const geometries = new Set<THREE.BufferGeometry>();
  const own = <T extends THREE.BufferGeometry>(value: T) => { geometries.add(value); return value; };
  const block = own(new RoundedBoxGeometry(1, 1, 1, 2, 0.035));
  function box(material: THREE.Material, size: [number, number, number], position: [number, number, number], parent: THREE.Object3D = group) {
    const object = new THREE.Mesh(block, material);
    object.scale.set(...size);
    object.position.set(...position);
    object.castShadow = object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  const floor = new THREE.Mesh(own(new THREE.PlaneGeometry(galleryFloor.width, galleryFloor.depth)), materials.stone);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(galleryFloor.x, -0.045, galleryFloor.z);
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
  groundShadows.position.set(galleryFloor.x, -0.028, galleryFloor.z);
  groundShadows.receiveShadow = true;
  group.add(groundShadows);

  const pedestalGeometry = own(new RoundedBoxGeometry(8.1, 0.155, 2.4, 2, 0.025));
  box(materials.trim, [8.1, 0.025, 2.4], [0, -0.023, 0]);
  for (const side of [-1, 1]) {
    box(materials.trim, [2.18, 0.132, 2.4], [side * 2.96, 0.030, 0]);
  }
  const inlay = materials.own(new THREE.MeshStandardMaterial({
    name: "Floor / satin brass guide", color: "#b08b55", roughness: 0.42,
    metalness: 0.47, roughnessMap: materials.brushing, envMapIntensity: 0.92,
  }));
  function inlayBetween(a: THREE.Vector3, b: THREE.Vector3, parent: THREE.Group, width = 0.074) {
    const strip = box(inlay, [width, 0.016, a.distanceTo(b) + 0.012],
      [(a.x + b.x) / 2, -0.003, (a.z + b.z) / 2], parent);
    strip.rotation.y = Math.atan2(a.x - b.x, a.z - b.z);
    strip.castShadow = false;
  }
  for (const side of [-1, 1]) {
    inlayBetween(new THREE.Vector3(side * railX, 0, railStart),
      new THREE.Vector3(side * railX, 0, railEnd), group);
  }
  // Sparse joints remain below the reflection skin, so they cannot alias into dots.
  for (let z = 9; z > -49; z -= 9.6) {
    box(materials.black, [34, 0.006, 0.018], [0, -0.041, z]);
  }
  // Deep side walls, pilasters, inset panels and visible metal junctions.
  for (const side of [-1, 1]) {
    const length = side === 1 ? 42.8 : 67;
    const middle = 14.5 - length / 2;
    box(materials.black, [0.8, 12.7, length], [side * 10.9, 6.2, middle]);
    box(materials.steel, [0.28, 0.38, length], [side * 10.24, 0.22, middle]);
    for (const z of [8, -1.5, -11.5, -22.5, -34, -46]) {
      if (side === 1 && z < -28) continue;
      box(materials.stone, [0.78, 11.2, 0.94], [side * 9.9, 5.6, z]);
      box(materials.steel, [1.1, 0.24, 1.23], [side * 9.9, 0.14, z]);
      box(materials.trim, [0.065, 10.9, 0.12], [side * 9.46, 5.65, z + 0.27]);
      box(materials.steel, [0.43, 0.22, 0.73], [side * 9.45, 8.3, z]);
      // A broad recessed slab gives highlights a physical neighbour and depth.
      box(materials.steel, [0.16, 7.1, 3.6], [side * 10.39, 4.45, z - 2.1]);
      box(materials.black, [0.17, 0.16, 3.8], [side * 10.23, 8.1, z - 2.1]);
    }
  }
  box(materials.black, [22, 0.3, 70], [0, 12.2, -20]);
  for (let z = 5; z > -47; z -= 5.8) {
    box(materials.steel, [20, 0.28, 0.4], [0, 11.7, z]);
    box(materials.black, [18.7, 0.19, 1.6], [0, 11.95, z - 1.2]);
  }
  // Faceted optical partitions frame the crossing on several depth planes.
  const partitionMaterial = materials.own(createClearGlass("Gallery / clear optical partition"));
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
    box(materials.trim, [0.06, 9.2, 0.10], [-1.57, 4.65, 0.17], partition);
    box(materials.trim, [0.06, 8.1, 0.10], [1.57, 4.1, 0.17], partition);
    group.add(partition);
  }

  // Openings are built into the wall with a dark return and a material on the
  // oblique reveal. The samples share the scale and illumination of the wall.
  const sampleWall = new THREE.Group();
  sampleWall.name = "Entrance / four material reveals";
  sampleWall.position.z = -8.8;
  group.add(sampleWall);
  const brassSample = materials.own(materials.polished.clone());
  brassSample.color.set("#af813f");
  brassSample.metalness = 0.63;
  const claySample = materials.own(new THREE.MeshStandardMaterial({
    name: "FARO / fired terracotta", color: "#874633", roughness: 0.84,
    bumpMap: materials.stoneMap, bumpScale: 0.016,
  }));
  const sandSample = materials.own(new THREE.MeshStandardMaterial({
    name: "Egypt / cut sandstone", color: "#a79573", roughness: 0.92,
    bumpMap: materials.stoneMap, bumpScale: 0.032,
  }));
  const glassSample = materials.own(new THREE.MeshPhysicalMaterial({
    name: "ПРОЯВЛЕНО / cold laminated glass", color: "#687a9a", roughness: 0.24,
    metalness: 0.32, clearcoat: 0.88, clearcoatRoughness: 0.16,
  }));
  const samples = [brassSample, claySample, sandSample, glassSample];
  const wallY = 3.1, slotHeight = 4.45, slotWidth = 0.62;
  const apertureWidth = 6;
  for (const side of [-1, 1]) {
    const centerX = side * 6.7;
    box(materials.black, [7.4, 6.8, 0.7], [centerX, 8.72, 0], sampleWall);
    box(materials.black, [7.4, 0.90, 0.7], [centerX, 0.41, 0], sampleWall);
    const centers = side < 0 ? [-5.86, -3.86] : [3.86, 5.86];
    let edge = side < 0 ? -10.4 : apertureWidth / 2;
    for (const x of centers) {
      const width = x - slotWidth / 2 - edge;
      box(materials.black, [width, slotHeight, 0.7], [edge + width / 2, wallY, 0], sampleWall);
      box(materials.steel, [0.035, slotHeight, 0.08], [x - side * 0.325, wallY, 0.37], sampleWall);
      box(materials.black, [slotWidth, slotHeight, 0.11], [x, wallY, -0.93], sampleWall);
      box(materials.steel, [slotWidth, 0.055, 1.14], [x, wallY - slotHeight / 2, -0.24], sampleWall);
      const index = (side < 0 ? 0 : 2) + centers.indexOf(x);
      const finish = samples[index];
      const reveal = new THREE.Group();
      reveal.position.set(x + side * 0.21, wallY, -0.39);
      reveal.rotation.y = side * -0.55;
      sampleWall.add(reveal);
      box(finish, [0.39, slotHeight - 0.08, 0.06], [0, 0, 0], reveal);
      const courses = [15, 10, 6, 3][index];
      for (let i = 1; i < courses; i++) {
        const y = (i / courses - 0.5) * slotHeight;
        box(index === 0 ? materials.brass : index === 3 ? materials.trim : materials.black,
          [0.37, [0.018, 0.045, 0.026, 0.016][index], 0.042], [0, y, 0.044], reveal);
        if (index === 2) {
          box(materials.black, [0.021, slotHeight / courses, 0.03], [i % 2 ? -0.09 : 0.06, y - 0.35, 0.04], reveal);
        }
      }
      edge = x + slotWidth / 2;
    }
    const end = side < 0 ? -apertureWidth / 2 : 10.4;
    box(materials.black, [end - edge, slotHeight, 0.7], [(end + edge) / 2, wallY, 0], sampleWall);
    box(materials.steel, [0.18, 10.5, 0.62], [side * 3.10, 5.25, 0.13], sampleWall);
  }
  box(materials.black, [apertureWidth, 2.05, 0.76], [0, 11.0, 0], sampleWall);
  const sampleLight = new THREE.RectAreaLight("#f1e8da", 0.95, 8, 3);
  sampleLight.position.set(0, 6.7, 1.5);
  sampleLight.lookAt(0, 2.8, -1.2);
  sampleWall.add(sampleLight);

  // The watch alcove keeps its relief wall. The aisle opens on its right.
  const chamber = new THREE.Group();
  chamber.position.set(-2.2, 0, -28);
  group.add(chamber);
  box(materials.black, [9.8, 11.8, 0.9], [-3.3, 5.9, -6], chamber);
  for (let i = 0; i < 5; i++) {
    const x = -7.2 + i * 1.85;
    box(materials.steel, [0.13, 9.6, 0.3], [x, 5.0, -5.4], chamber);
    box(materials.trim, [0.055, 8.5, 0.045], [x + 0.18, 4.8, -5.2], chamber);
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
    box(materials.steel, [0.04, 5.15, 0.06], [side * 4.48, 2.7, -1.42], chamber);
  }

  // A continuous floor and a full-width opening reveal the second wing at the turn.
  const wing = new THREE.Group();
  wing.name = "Gallery / projects after the bend";
  group.add(wing);
  const endX = wingX(lastGalleryStop + 10);
  const wingLength = endX - 10.5;
  const wingMiddle = 10.5 + wingLength / 2;
  box(materials.black, [22, 12.7, 0.8], [0, 6.2, wingZ - 9.7]);
  const doorZ = wingZ + 9.7;
  const halfFinale = finaleRoom.width / 2;
  const doorLeft = finaleRoom.x - halfFinale;
  const doorRight = finaleRoom.x + halfFinale;
  function wingWall(from: number, to: number, side: number) {
    const length = to - from;
    const middle = (from + to) / 2;
    box(materials.black, [length, 12.7, 0.8], [middle, 6.2, wingZ + side * 9.7], wing);
    box(materials.steel, [length, 0.28, 0.20], [middle, 0.18, wingZ + side * 9.15], wing);
  }
  wingWall(10.5, endX, -1);
  wingWall(10.5, doorLeft, 1);
  wingWall(doorRight, endX, 1);
  box(materials.black, [wingLength, 0.32, 19.6], [wingMiddle, 12.2, wingZ], wing);
  box(materials.black, [0.85, 12.7, 19.6], [endX, 6.2, wingZ], wing);

  const finalHall = new THREE.Group();
  finalHall.name = "Gallery / final letter chamber";
  group.add(finalHall);
  const rearZ = finaleRoom.z + 4;
  const hallLength = rearZ - doorZ;
  const hallMiddle = (rearZ + doorZ) / 2;
  for (const side of [-1, 1]) {
    const x = finaleRoom.x + halfFinale * side;
    box(materials.black, [0.82, 12.7, hallLength], [x, 6.2, hallMiddle], finalHall);
    box(materials.steel, [0.40, 11.55, 0.85], [x - side * 0.5, 5.77, doorZ], finalHall);
    box(materials.steel, [0.40, 10.9, 0.62], [x - side * 0.5, 5.45, finaleRoom.z - 2.9], finalHall);
  }
  box(materials.black, [finaleRoom.width + 0.8, 12.7, 0.85], [finaleRoom.x, 6.2, rearZ], finalHall);
  box(materials.black, [finaleRoom.width + 0.8, 0.32, hallLength], [finaleRoom.x, 12.2, hallMiddle], finalHall);
  box(materials.steel, [finaleRoom.width, 0.38, 0.76], [finaleRoom.x, 11.66, doorZ], finalHall);
  const finalArch = new THREE.Mesh(arch.geometry, materials.steel);
  finalArch.position.set(finaleRoom.x, 0, finaleRoom.z + 2.1);
  finalArch.rotation.y = Math.PI;
  finalHall.add(finalArch);
  const finalPedestal = new THREE.Mesh(pedestalGeometry, materials.trim);
  finalPedestal.position.set(finaleRoom.x, 0.0425, finaleRoom.z);
  finalHall.add(finalPedestal);
  const finaleLight = new THREE.PointLight("#efdbc0", 32, 19, 2);
  finaleLight.position.set(finaleRoom.x + 1.1, 6.2, finaleRoom.z - 4.5);
  finalHall.add(finaleLight);

  const roomColors = ["#6c3328", "#66523b", "#413652", "#2e4b47", "#345065"];
  const lightColors = ["#ffd3a6", "#f9dfb9", "#dacbff", "#b7e1cb", "#b7d7ff"];
  const shutters: { leaves: THREE.Group[]; from: number; to: number }[] = [];
  const shutterWidth = 9.15;
  const shutterRest = shutterWidth / 2 + 0.012;
  const shutterMetal = materials.own(materials.steel.clone());
  shutterMetal.color.set("#222b32");
  shutterMetal.roughness = 0.47;
  galleryStops.slice(1).forEach((distance, index) => {
    const room = new THREE.Group();
    placeGalleryRoom(room, distance);
    wing.add(room);
    const accent = materials.own(materials.steel.clone());
    accent.color.set(roomColors[index]);
    accent.metalness = 0.35;
    accent.roughness = 0.56;
    for (const side of [-1, 1]) {
      box(accent, [6.15, 10.4, 0.48], [side * 6.0, 5.2, -4.0], room);
      box(materials.stone, [0.35, 10.9, 0.70], [side * 2.95, 5.45, -3.7], room);
      box(materials.trim, [0.065, 9.8, 0.1], [side * 3.18, 4.9, -3.43], room);
      box(materials.steel, [0.55, 9.6, 0.75], [side * 8.85, 4.8, 5.5], room);
    }
    box(materials.steel, [18.2, 0.32, 0.85], [0, 10.55, -3.72], room);
    box(materials.steel, [18.2, 0.27, 0.66], [0, 11.65, 5.5], room);
    const gate = new THREE.Group();
    gate.name = "Gallery / sliding shutters";
    gate.position.z = 6.5;
    room.add(gate);
    box(materials.steel, [19.1, 0.42, 0.75], [0, 11.18, 0], gate);
    const leaves = [-1, 1].map(side => {
      box(materials.steel, [0.38, 11.15, 0.75], [side * 9.35, 5.58, 0], gate);
      const leaf = new THREE.Group();
      leaf.position.x = side * shutterRest;
      gate.add(leaf);
      box(shutterMetal, [shutterWidth, 10.98, 0.38], [0, 5.53, 0], leaf);
      for (const x of [-2.75, 0, 2.75]) {
        box(materials.trim, [0.048, 10.4, 0.028], [x, 5.53, 0.197], leaf);
      }
      box(materials.polished, [0.068, 10.93, 0.055],
        [-side * (shutterWidth / 2 - 0.048), 5.53, 0.207], leaf);
      return leaf;
    });
    const chapter = journeyChapters[index + 2];
    shutters.push({ leaves, from: galleryShutterStart(chapter), to: chapter.at - 0.005 });
    const light = new THREE.PointLight(lightColors[index], 32, 17, 2);
    light.position.set(-2.8, 5.3, 4.4);
    room.add(light);
  });

  // Carry the paired inlays through the bend. One peels off into the final hall.
  for (const side of [-1, 1]) {
    const endDistance = lastGalleryStop + (side > 0 ? -7 : 2);
    for (let distance = -railEnd; distance < endDistance; distance += 1) {
      const start = new THREE.Vector3(side * railX, 0, -distance);
      const end = new THREE.Vector3(side * railX, 0, -distance - 1);
      bendGalleryPoint(start);
      bendGalleryPoint(end);
      inlayBetween(start, end, wing);
    }
  }
  // The sight plane through the track makes its lower stop and the inlay
  // collinear in the final view, while the guide itself stays in the floor.
  const { stop, direction } = finale.diagonalTrack;
  const sightPlane = new THREE.Plane().setFromCoplanarPoints(
    new THREE.Vector3(finaleView.x, finaleView.y, finaleView.z),
    finale.group.localToWorld(stop.clone()),
    finale.group.localToWorld(stop.clone().add(direction)),
  );
  const railInSightPlane = (z: number) => new THREE.Vector3(
    -(sightPlane.normal.z * z + sightPlane.constant) / sightPlane.normal.x, 0, z,
  );
  const floorEnd = railInSightPlane(finaleRoom.z - 1.21);
  const straightStart = railInSightPlane(floorEnd.z - 8);
  const returnRail = new THREE.CubicBezierCurve3(
    new THREE.Vector3(wingX(lastGalleryStop - 7), 0, wingZ + railX),
    new THREE.Vector3(wingX(lastGalleryStop - 7) + 7.2, 0, wingZ + railX),
    straightStart.clone().add(new THREE.Vector3(0.3, 0, -4.3)),
    straightStart,
  );
  const bends = returnRail.getPoints(22);
  for (let i = 1; i < bends.length; i++) inlayBetween(bends[i - 1], bends[i], finalHall);
  inlayBetween(straightStart, floorEnd, finalHall);
  const fill = new THREE.PointLight("#f0b46c", 24, 16, 2);
  fill.position.set(-2.2, 4.7, -26);
  const interior = new THREE.PointLight("#e5ae63", 2.0, 12, 2);
  interior.position.set(0, 3.8, -1.7);
  group.add(fill, interior);
  const disposeInstances = batchRigidMeshes(group);
  return {
    group,
    finale: finale.group,
    interact: machine.interact,
    update(progress: number, time: number, entrance: ReturnType<typeof entrancePose>) {
      let shuttersChanged = false;
      for (const { leaves, from, to } of shutters) {
        const offset = shutterRest + shutterWidth * THREE.MathUtils.smootherstep(progress, from, to);
        if (leaves[1].position.x === offset) continue;
        leaves[0].position.x = -offset;
        leaves[1].position.x = offset;
        shuttersChanged = true;
      }
      machine.setSweep(entrance.sweep, entrance.glint);
      const machineChanged = machine.update(progress, time, entrance.opening);
      return finale.update(progress, time) || machineChanged || shuttersChanged;
    },
    dispose() {
      machine.dispose();
      finale.dispose();
      group.removeFromParent();
      group.clear();
      geometries.forEach(value => value.dispose());
      disposeInstances();
      materials.dispose();
    },
  };
}
