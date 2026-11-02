export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number];
export type WatchPart = {
  id: string;
  nodeName: string;
  title: string;
  description: string;
  materialLabel: string;
  category: "case" | "dial" | "movement" | "fastener";
  start: number;
  end: number;
  restPosition: Vec3;
  explodedOffset: Vec3;
  restQuaternion: Quat;
  explodedQuaternion: Quat;
  restScale: Vec3;
  labelAnchor: Vec3;
  selectable: boolean;
};
export type WatchPose = { position: Vec3; quaternion: Quat; scale: Vec3 };

export const clampProgress = (value: number): number =>
  Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

/** Deterministic data-only evaluation; shared by the live scene and video frames. */
export function sampleWatchPart(part: WatchPart, progress: number): WatchPose {
  const p = clampProgress(progress);
  const u =
    part.end > part.start
      ? clampProgress((p - part.start) / (part.end - part.start))
      : 0;
  const t = u * u * (3 - 2 * u);
  const position = part.restPosition.map(
    (value, axis) => value + part.explodedOffset[axis] * t,
  ) as Vec3;
  const a = part.restQuaternion;
  const b = part.explodedQuaternion;
  let quaternion: Quat;
  if (t === 0 || t === 1) {
    quaternion = [...(t === 0 ? a : b)];
  } else {
    const dot = a.reduce((sum, value, axis) => sum + value * b[axis], 0);
    const sign = dot < 0 ? -1 : 1;
    const cosine = Math.min(1, Math.abs(dot));
    let from = 1 - t;
    let to = t;
    if (cosine < 0.9995) {
      const angle = Math.acos(cosine);
      from = Math.sin((1 - t) * angle) / Math.sin(angle);
      to = Math.sin(t * angle) / Math.sin(angle);
    }
    quaternion = a.map(
      (value, axis) => value * from + b[axis] * sign * to,
    ) as Quat;
    const norm = Math.hypot(...quaternion);
    quaternion = quaternion.map((value) => value / norm) as Quat;
  }
  return { position, quaternion, scale: [...part.restScale] };
}

export function verifyWatchManifest(
  value: unknown,
): asserts value is WatchPart[] {
  if (!Array.isArray(value) || value.length !== 47)
    throw new Error("Манифест часов должен содержать 47 деталей.");
  const ids = new Set<string>();
  const names = new Set<string>();
  const vector = (input: unknown, size: number): input is number[] =>
    Array.isArray(input) &&
    input.length === size &&
    input.every((n) => typeof n === "number" && Number.isFinite(n));
  for (const raw of value) {
    if (!raw || typeof raw !== "object")
      throw new Error("Некорректная запись детали часов.");
    const part = raw as Record<string, unknown>;
    for (const key of [
      "id",
      "nodeName",
      "title",
      "description",
      "materialLabel",
    ]) {
      if (typeof part[key] !== "string" || !(part[key] as string).trim())
        throw new Error(`Отсутствует ${key} детали часов.`);
    }
    const id = part.id as string;
    const name = part.nodeName as string;
    if (ids.has(id) || names.has(name))
      throw new Error(`Повторяющаяся деталь: ${name}`);
    ids.add(id);
    names.add(name);
    if (
      !["case", "dial", "movement", "fastener"].includes(
        part.category as string,
      ) ||
      typeof part.selectable !== "boolean"
    ) {
      throw new Error(`Некорректные свойства детали: ${name}`);
    }
    for (const key of [
      "restPosition",
      "explodedOffset",
      "restScale",
      "labelAnchor",
    ]) {
      if (!vector(part[key], 3))
        throw new Error(`Некорректный ${key}: ${name}`);
    }
    if ((part.restScale as number[]).some((n) => n <= 0))
      throw new Error(`Неположительный масштаб: ${name}`);
    for (const key of ["restQuaternion", "explodedQuaternion"]) {
      const rotation = part[key];
      if (
        !vector(rotation, 4) ||
        Math.abs(Math.hypot(...rotation) - 1) > 0.0001
      )
        throw new Error(`Некорректный ${key}: ${name}`);
    }
    const { start, end } = part;
    if (
      typeof start !== "number" ||
      typeof end !== "number" ||
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start < 0 ||
      end > 1 ||
      end < start
    )
      throw new Error(`Некорректный диапазон: ${name}`);
    if (end === start) {
      const dot = (part.restQuaternion as number[]).reduce(
        (sum, n, i) => sum + n * (part.explodedQuaternion as number[])[i],
        0,
      );
      if (
        (part.explodedOffset as number[]).some((n) => n !== 0) ||
        Math.abs(Math.abs(dot) - 1) > 0.0001
      ) {
        throw new Error(`Движущейся детали нужен диапазон: ${name}`);
      }
    }
  }
}
