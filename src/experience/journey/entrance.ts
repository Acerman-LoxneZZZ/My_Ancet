import { MathUtils } from "three";

export const shadowHold = { from: 0.028, to: 0.054 };
export const openingCaptionEnd = 0.095;
export const entranceEnd = 0.151;
export const railX = 1.3;
export const railStart = 1.85;
export const railEnd = -26;
const forwardEdges = [0, shadowHold.from, shadowHold.to, entranceEnd];
const reverseEdges = [...forwardEdges].reverse();

export function entrancePose(progress: number, contact: number, reduced: boolean) {
  const ease = (from: number, to: number, value: number) => MathUtils.smootherstep(value, from, to);
  const fromScroll = ease(0.006, shadowHold.from, progress);
  const fromContact = ease(0.07, 0.38, contact) * (1 - ease(0.78, 1.27, contact));
  return {
    assembly: reduced && progress < shadowHold.to ? 1 : Math.max(fromScroll, fromContact),
    transfer: ease(shadowHold.to, 0.114, progress),
    opening: ease(0.061, 0.126, progress),
    glint: reduced ? 0 : ease(0, 0.12, contact) * (1 - ease(0.34, 0.65, contact)),
    sweep: MathUtils.lerp(-3.4, 4.35, MathUtils.clamp(contact / 0.62, 0, 1)),
  };
}

/** Bound visual progress through the entrance even when the scroll target jumps. */
export function limitEntranceStep(progress: number, next: number, dt: number) {
  const forward = next > progress;
  const sign = forward ? 1 : -1;
  const edges = forward ? forwardEdges : reverseEdges;
  for (let i = 0; i < edges.length - 1; i++) {
    const [start, end] = [edges[i], edges[i + 1]];
    if ((next - start) * sign <= 0 || (progress - end) * sign >= 0) continue;
    if ((progress - start) * sign < 0) return start;
    const speed = i === 1 ? 0.068 : 0.22;
    return forward ? Math.min(next, end, progress + speed * dt)
      : Math.max(next, end, progress - speed * dt);
  }
  return next;
}
