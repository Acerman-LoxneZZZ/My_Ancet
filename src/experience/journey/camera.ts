import * as THREE from "three";
import { bendGalleryPoint, finaleRoom, finaleView, galleryStops } from "./galleryRoute";
import { exhibitChapters, FINALE_FROM, JOURNEY_LIMIT } from "./chapters";
import { entranceEnd, shadowHold } from "./entrance";

type Point = readonly [number, number, number];
type Key = {
  at: number;
  position: Point;
  look: Point;
  fov: number;
  zVelocity?: number;
};

export type JourneyVisibility = {
  portrait: boolean;
  activeRoom: number | null;
  visibleRooms: readonly number[];
};

export type JourneyCamera = {
  fit(aspect: number): void;
  update(progress: number, pointer: readonly [number, number], reduced: boolean): void;
};

const stops = exhibitChapters.map(chapter => chapter.at);
const centers = galleryStops.map(distance => -distance);
const allRooms = stops.map((_, index) => index);
const singleRooms = allRooms.map(index => [index]);
const noRooms: readonly number[] = [];

const keys: Key[] = [
  {at: 0, position: [7.1, 7.1, 19.3], look: [-3.55, 2.22, 0], fov: 37},
  {at: shadowHold.to, position: [7.1, 7.1, 19.3], look: [-3.55, 2.22, 0], fov: 37},
  {at: 0.079, position: [4.5, 5.7, 12.8], look: [-0.8, 2.45, -4], fov: 43},
  {at: 0.103, position: [0.65, 3.95, 5.5], look: [0, 2.8, -11], fov: 52},
  {at: 0.126, position: [0, 3.3, 0.35], look: [0, 3, -18], fov: 50},
  {at: entranceEnd, position: [0, 3, -6.1], look: [-0.5, 3, -24], fov: 49},
];
for (let room = 0; room < stops.length; room++) {
  const at = stops[room], z = centers[room];
  // Give the corner after the watch and the approach to ПРОЯВЛЕНО more
  // of the scroll range without changing the settled reading poses.
  const enter = room === 0 || room === 2 ? -0.030 : -0.020;
  const leave = room === stops.length - 1 ? FINALE_FROM - at : room === 1 ? 0.030 : 0.020;
  for (const offset of [enter, 0, leave]) {
    keys.push({
      at: at + offset,
      position: [room === 0 ? 0.4 : 0, room === 0 ? 2.6 : 3.1, z + 12 - offset * (3 / 0.06)],
      look: [room === 0 ? 0.6 : 0, room === 0 ? 3.2 : 2.8, z],
      fov: room === 0 ? 44 : 50,
      zVelocity: -3 / 0.06,
    });
  }
}

/** Monotone cubic tangents keep the dolly from overshooting or moving backward. */
function tangents(values: readonly number[]): number[] {
  const slopes = values.slice(1).map((value, i) =>
    (value - values[i]) / (keys[i + 1].at - keys[i].at));
  return values.map((_, i) => {
    if (i === 0) return slopes[0];
    if (i === values.length - 1) return slopes[i - 1];
    const before = slopes[i - 1], after = slopes[i];
    if (before * after <= 0) return 0;
    const left = keys[i].at - keys[i - 1].at;
    const right = keys[i + 1].at - keys[i].at;
    const w1 = 2 * right + left, w2 = right + 2 * left;
    return (w1 + w2) / (w1 / before + w2 / after);
  });
}

const channels = [
  ...[0, 1, 2].map(axis => keys.map(key => key.position[axis])),
  ...[0, 1, 2].map(axis => keys.map(key => key.look[axis])),
  keys.map(key => key.fov),
];
const velocities = channels.map(tangents);
keys.forEach((key, index) => {
  if (key.zVelocity !== undefined) velocities[2][index] = key.zVelocity;
});

const clamp = (value: number, min: number, max: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;

/**
 * Absolute camera rig: the caller owns scroll/pointer damping and rendering.
 * fit() reapplies the last pose for the new aspect. update() uses no clock/RAF.
 * camera.userData.journeyVisibility is a scene-owner hint; this module does not
 * change visibility or layers of rooms it does not own.
 */
export function createJourneyCamera(camera: THREE.PerspectiveCamera): JourneyCamera {
  let aspect = Math.max(0.1, camera.aspect || 1);
  let lastProgress = 0;
  let lastPointer: readonly [number, number] = [0, 0];
  let lastReduced = false;
  const position = new THREE.Vector3();
  const look = new THREE.Vector3();
  const backward = new THREE.Vector3();
  const finaleCurve = new THREE.CubicBezierCurve3();
  const finaleLook = new THREE.Vector3(finaleRoom.x, 3.2, finaleRoom.z);
  const galleryLook = new THREE.Vector3();
  const previousPoint = new THREE.Vector3();
  const previousLook = new THREE.Vector3(), entryVelocity = new THREE.Vector3();
  const values = new Float64Array(7);
  const visibility: JourneyVisibility = {portrait: aspect < 1.25, activeRoom: null, visibleRooms: allRooms};
  camera.userData.journeyVisibility = visibility;
  camera.near = 0.08;
  camera.far = 260;
  camera.updateProjectionMatrix();

  const sample = (p: number, pointer: readonly [number, number], reduced: boolean,
    position: THREE.Vector3, look: THREE.Vector3) => {
    let index = 0;
    while (index < keys.length - 2 && p > keys[index + 1].at) index++;
    const duration = keys[index + 1].at - keys[index].at;
    const t = clamp((p - keys[index].at) / duration, 0, 1);
    const t2 = t * t, t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
    for (let channel = 0; channel < channels.length; channel++) {
      values[channel] = h00 * channels[channel][index]
        + h10 * duration * velocities[channel][index]
        + h01 * channels[channel][index + 1]
        + h11 * duration * velocities[channel][index + 1];
    }
    position.set(values[0], values[1], values[2]);
    look.set(values[3], values[4], values[5]);
    const portraitOpening = clamp((1.3 - aspect) / 0.5, 0, 1)
      * (1 - THREE.MathUtils.smootherstep(p, shadowHold.to, 0.104));
    look.x = THREE.MathUtils.lerp(look.x, 0.65, portraitOpening);
    look.y = THREE.MathUtils.lerp(look.y, -0.23, portraitOpening);
    position.x = THREE.MathUtils.lerp(position.x, 6.65, portraitOpening);
    position.z += 1.65 * portraitOpening;

    // Portrait exhibits are stacked by the scene owner. A bounded distance
    // adjustment leaves the opening monolith large and preserves the aisle.
    const distanceScale = Math.min(1.38, Math.max(1, Math.sqrt(1.25 / aspect)));
    const entryBlend = clamp((p - 0.06) / 0.13, 0, 1);
    const responsiveWeight = 0.45 + 0.55 * entryBlend * entryBlend * (3 - 2 * entryBlend);
    backward.copy(position).sub(look).multiplyScalar((distanceScale - 1) * responsiveWeight);
    position.add(backward);
    const px = reduced || !Number.isFinite(pointer[0]) ? 0 : clamp(pointer[0], -1, 1);
    const py = reduced || !Number.isFinite(pointer[1]) ? 0 : clamp(pointer[1], -1, 1);
    position.x += px * 0.12;
    position.y -= py * 0.08;
    look.x += px * 0.30;
    look.y -= py * 0.16;
    // A narrow screen stacks the exhibits in the aisle. Skirt each display
    // after its reading stop, then ease back onto the centerline.
    const compact = 1 - THREE.MathUtils.smoothstep(aspect, 0.82, 1.25);
    const screenCenter = THREE.MathUtils.lerp(4.7, 0, compact);
    const aisleOffset = compact > 0.28 ? screenCenter + 3.45 : 0;
    const distance = -position.z;
    for (const [room, stop] of galleryStops.entries()) {
      const entering = THREE.MathUtils.smootherstep(distance, stop - 8, stop - 3);
      const leaveBy = room === 0 || room === 2 ? 10 : 5;
      const leaving = THREE.MathUtils.smootherstep(distance, stop + 1, stop + leaveBy);
      position.x += aisleOffset * entering * (1 - leaving);
    }
    bendGalleryPoint(position);
    bendGalleryPoint(look);
    return values[6] + portraitOpening * 7;
  };

  const update: JourneyCamera["update"] = (progress, pointer, reduced) => {
    lastProgress = clamp(progress, 0, JOURNEY_LIMIT);
    lastPointer = [pointer[0], pointer[1]];
    lastReduced = reduced;
    const p = Math.min(lastProgress, FINALE_FROM);
    let fov = sample(p, pointer, reduced, position, look);
    if (lastProgress > FINALE_FROM) {
      const u = clamp((lastProgress - FINALE_FROM) / (JOURNEY_LIMIT - FINALE_FROM), 0, 1);
      const t = u + u * u - u * u * u;
      const compact = 1 - THREE.MathUtils.smoothstep(aspect, 0.82, 1.25);
      galleryLook.copy(look);
      finaleCurve.v0.copy(position);
      sample(FINALE_FROM - 0.0001, pointer, reduced, previousPoint, previousLook);
      entryVelocity.copy(position).sub(previousPoint).multiplyScalar(1 / 0.0001);
      finaleCurve.v1.copy(position).addScaledVector(entryVelocity, (JOURNEY_LIMIT - FINALE_FROM) / 3);
      // Enter the clear side aisle before passing the last display. This keeps
      // the camera away from its face instead of enlarging it across the view.
      finaleCurve.v3.set(finaleView.x - compact * 0.8, finaleView.y, finaleView.z - compact * 3.1);
      finaleCurve.v2.set(finaleCurve.v3.x, 3.05, finaleCurve.v3.z);
      finaleCurve.getPoint(t, position);
      finaleCurve.getPoint(Math.max(0, t - 0.015), previousPoint);
      finaleCurve.getPoint(Math.min(1, t + 0.04), look);
      look.sub(previousPoint).normalize().multiplyScalar(10).add(position);
      look.lerp(galleryLook, 1 - THREE.MathUtils.smoothstep(t, 0, 0.28));
      look.lerp(finaleLook, THREE.MathUtils.smoothstep(t, 0.36, 0.85));
      fov = THREE.MathUtils.lerp(fov, 44 + compact * 7, THREE.MathUtils.smoothstep(t, 0.2, 0.85));
    }
    camera.position.copy(position);
    camera.lookAt(look);
    if (camera.aspect !== aspect || camera.fov !== fov) {
      camera.aspect = aspect;
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld();

    visibility.portrait = aspect < 1.25;
    visibility.activeRoom = p < exhibitChapters[0].from || lastProgress > FINALE_FROM
      ? null
      : stops.reduce<number>((nearest, stop, room) => Math.abs(stop - p) < Math.abs(stops[nearest] - p) ? room : nearest, 0);
    visibility.visibleRooms = visibility.portrait
      ? visibility.activeRoom === null ? noRooms : singleRooms[visibility.activeRoom]
      : allRooms;
  };

  update(0, [0, 0], false);
  return {
    fit(nextAspect) {
      aspect = Number.isFinite(nextAspect) && nextAspect > 0 ? nextAspect : 1;
      update(lastProgress, lastPointer, lastReduced);
    },
    update,
  };
}
