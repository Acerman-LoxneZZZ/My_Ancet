import type { Object3D, Vector3 } from "three";

export const galleryStops = [24, 52, 80, 108] as const;
const bendStart = 29;
const bendRadius = 9;
const bendEnd = bendStart + Math.PI * bendRadius / 2;
export const wingZ = -bendStart - bendRadius;
export const galleryFloor = { width: 132, depth: 82, x: 46, z: -22 };

export function wingX(distance: number) {
  return bendRadius + distance - bendEnd;
}

export const finaleRoom = { x: wingX(108), z: -10.5, width: 15 };

/** Map the straight camera rail into a quarter turn and then the side wing. */
export function bendGalleryPoint(point: Vector3) {
  const distance = -point.z;
  if (distance <= bendStart) return;
  const offset = point.x;
  if (distance >= bendEnd) {
    point.x = wingX(distance);
    point.z = wingZ + offset;
    return;
  }
  const angle = (distance - bendStart) / bendRadius;
  point.x = bendRadius - (bendRadius - offset) * Math.cos(angle);
  point.z = -bendStart - (bendRadius - offset) * Math.sin(angle);
}

export function placeGalleryRoom(room: Object3D, distance: number) {
  room.position.set(0, 0, -distance);
  bendGalleryPoint(room.position);
  if (distance >= bendEnd) room.rotation.y = -Math.PI / 2;
}
