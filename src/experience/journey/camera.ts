import * as THREE from "three";
import { bendGalleryPoint, finaleRoom, galleryStops } from "./galleryRoute";
import { FINALE_FROM, JOURNEY_LIMIT } from "./chapters";

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

const stops = [0.24, 0.42, 0.60, 0.78] as const;
const centers = galleryStops.map(distance => -distance);
const allRooms = [0, 1, 2, 3] as const;
const singleRooms = [[0], [1], [2], [3]] as const;
const noRooms: readonly number[] = [];

const keys: Key[] = [
  {at: 0, position: [7.8, 2.7, 17], look: [-3.5, 3.4, -0.4], fov: 34},
  {at: 0.03, position: [7.8, 2.7, 17], look: [-3.5, 3.4, -0.4], fov: 34},
  {at: 0.07, position: [4.9, 3.0, 10.7], look: [-0.4, 3.3, -5], fov: 40},
  {at: 0.11, position: [0.15, 3.1, 2.2], look: [0, 3.2, -16], fov: 46},
  {at: 0.14, position: [0, 3, -4], look: [0, 3, -24], fov: 50},
];
for (let room = 0; room < stops.length; room++) {
  const at = stops[room], z = centers[room];
  // A three-unit dolly across the entire reading window. Matching endpoint
  // velocities let the connecting Hermite arcs accelerate without a cut.
  for (const offset of [-0.045, 0, 0.045]) {
    keys.push({
      at: at + offset,
      position: [room === 0 ? 0.4 : 0, room === 0 ? 2.6 : 3.1, z + 12 - offset * (3 / 0.09)],
      look: [room === 0 ? 0.6 : 0, room === 0 ? 3.2 : 2.8, z],
      fov: room === 0 ? 44 : 50,
      zVelocity: -3 / 0.09,
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
 * change visibility or layers of rooms it does not own. Room indices are 0..3.
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
      * (1 - clamp((p - 0.035) / 0.055, 0, 1));
    look.x = THREE.MathUtils.lerp(look.x, -0.3, portraitOpening);
    look.y = THREE.MathUtils.lerp(look.y, 1.65, portraitOpening);
    position.x = THREE.MathUtils.lerp(position.x, 5.8, portraitOpening);

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
    for (const stop of galleryStops) {
      const entering = THREE.MathUtils.smootherstep(distance, stop - 8, stop - 3);
      const leaving = THREE.MathUtils.smootherstep(distance, stop + 1, stop + 5);
      position.x += aisleOffset * entering * (1 - leaving);
    }
    bendGalleryPoint(position);
    bendGalleryPoint(look);
    return values[6];
  };

  const update: JourneyCamera["update"] = (progress, pointer, reduced) => {
    lastProgress = clamp(progress, 0, JOURNEY_LIMIT);
    lastPointer = [pointer[0], pointer[1]];
    lastReduced = reduced;
    const p = Math.min(lastProgress, FINALE_FROM);
    let fov = sample(p, pointer, reduced, position, look);
    if (lastProgress > FINALE_FROM) {
      const t = THREE.MathUtils.smoothstep(lastProgress, FINALE_FROM, JOURNEY_LIMIT);
      const compact = 1 - THREE.MathUtils.smoothstep(aspect, 0.82, 1.25);
      galleryLook.copy(look);
      finaleCurve.v0.copy(position);
      finaleCurve.v1.copy(position);
      finaleCurve.v1.x += 8;
      finaleCurve.v3.set(finaleRoom.x + THREE.MathUtils.lerp(1.4, 0.45, compact), 2.9,
        finaleRoom.z - 13.2 - compact * 3.1);
      finaleCurve.v2.set(finaleCurve.v3.x, 3.05, -32.8);
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
    visibility.activeRoom = p < 0.165 || p > 0.875
      ? null
      : stops.reduce((nearest, stop, room) => Math.abs(stop - p) < Math.abs(stops[nearest] - p) ? room : nearest, 0);
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
