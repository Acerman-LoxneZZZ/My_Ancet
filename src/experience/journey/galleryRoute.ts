import type { Object3D, Vector3 } from "three";
import { exhibitChapters } from "./chapters";

export const galleryStops = exhibitChapters.map((_, index) => 24 + 28 * index);
export const lastGalleryStop = galleryStops[galleryStops.length - 1];
const bendStart = 29;
const bendRadius = 9;
const bendEnd = bendStart + Math.PI * bendRadius / 2;
export const wingZ = -bendStart - bendRadius;
const extension = lastGalleryStop - 108;
export const galleryFloor = { width: 132 + extension, depth: 82, x: 46 + extension / 2, z: -22 };

export function wingX(distance: number) {
  return bendRadius + distance - bendEnd;
}

export const finaleRoom = { x: wingX(lastGalleryStop), z: -10.5, width: 15 };
export const finaleView = { x: finaleRoom.x + 3.25, y: 3.15, z: finaleRoom.z - 13.2 };

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
