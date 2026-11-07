import * as THREE from "three";
import { railEnd, railStart, railX } from "./entrance";

type Stroke = readonly [number, number, number, number];
type Fragment = { rest: Stroke; letter: Stroke; width: number };

// Each bracket has a resting impression and a registration point in the K.
// World-space coordinates keep the impression attached to the mineral floor.
const fragments: Fragment[] = [
  { rest: [-1.46, 2.48, -0.26, 3.73], letter: [-0.15, 2.75, 0.76, 4.79], width: 0.36 },
  { rest: [-0.11, 4.43, 0.72, 6.05], letter: [0.66, 4.57, 1.52, 6.51], width: 0.36 },
  { rest: [1.54, 3.85, 2.5, 3.15], letter: [0.65, 4.68, 1.97, 2.97], width: 0.51 },
  { rest: [2.59, 2.6, 3.86, 1.68], letter: [1.86, 3.15, 2.98, 1.57], width: 0.51 },
  { rest: [2.12, 5.66, 3.44, 5.84], letter: [0.66, 4.69, 2.50, 5.02], width: 0.35 },
  { rest: [3.91, 5.34, 5.0, 4.75], letter: [2.38, 4.99, 4.08, 5.29], width: 0.35 },
];
const transfers: Stroke[] = [
  [-railX, railStart, -railX, -2.6], [-railX, -2.6, -railX, -7.2],
  [railX, -7.2, railX, -2.6], [railX, -2.6, railX, railStart],
  [railX, -7.2, railX, -11.8], [railX, -11.8, railX, -15.6],
];

export const entranceShadowGLSL = /* glsl */ `
  uniform vec4 entranceStrokes[6];
  uniform float entranceWidths[6];
  uniform float entranceAssembly;
  uniform float entranceTransfer;

  float barDistance(vec2 point, vec4 stroke, float width) {
    vec2 axis = stroke.zw - stroke.xy;
    float lengthOfBar = max(length(axis), 0.001);
    vec2 direction = axis / lengthOfBar;
    vec2 center = point - (stroke.xy + stroke.zw) * 0.5;
    vec2 local = vec2(dot(center, direction), dot(center, vec2(-direction.y, direction.x)));
    return max(abs(local.x) - lengthOfBar * 0.5, abs(local.y) - width);
  }

  float cogDistance(vec2 point, vec2 center, float radius, float phase) {
    vec2 p = (point - center) * vec2(1.0, 0.64);
    float r = length(p);
    float teeth = smoothstep(-0.35, 0.32, cos(atan(p.y, p.x + 0.0001) * 18.0 + phase));
    return max(r - radius * (0.87 + 0.13 * teeth), radius * 0.61 - r);
  }

  vec3 exposeEntrance(vec3 floorColor, vec2 point) {
    vec2 offset = (point - vec2(1.45, 3.0)) / vec2(6.7, 7.7);
    float pool = 1.0 - smoothstep(0.0, 1.0, dot(offset, offset));
    float aisle = exp(-0.22 * point.x * point.x) *
      smoothstep(${railEnd.toFixed(1)}, -15.0, point.y) * (1.0 - smoothstep(-4.0, 3.0, point.y));
    if (pool <= 0.0 && aisle < 0.001) return floorColor;
    vec3 lit = floorColor * (1.0 - 0.64 * pool) +
      vec3(0.080, 0.085, 0.086) * pool + vec3(0.030, 0.036, 0.040) * aisle;
    float d = 100.0;
    for (int i = 0; i < 6; i++) {
      d = min(d, barDistance(point, entranceStrokes[i], entranceWidths[i]));
    }
    float penumbra = mix(0.135, 0.055, entranceAssembly);
    float shadow = 1.0 - smoothstep(-0.015, penumbra, d);
    float cogs = min(cogDistance(point, vec2(-1.28, 4.46), 0.35, 0.4),
      min(cogDistance(point, vec2(1.95, 2.56), 0.33, 0.0),
          cogDistance(point, vec2(3.69, 4.79), 0.43, 1.1)));
    shadow = max(shadow, (1.0 - smoothstep(-0.026, 0.075, cogs)) * (1.0 - entranceAssembly) * 0.83);
    return lit * (1.0 - 0.86 * shadow * (1.0 - 0.34 * entranceTransfer));
  }
`;

export function createEntranceShadowUniforms() {
  return {
    entranceStrokes: { value: fragments.map(() => new THREE.Vector4()) },
    entranceWidths: { value: fragments.map(fragment => fragment.width) },
    entranceAssembly: { value: 0 },
    entranceTransfer: { value: 0 },
  };
}

export function setEntranceShadow(
  uniforms: ReturnType<typeof createEntranceShadowUniforms>, assembly: number, transfer: number,
) {
  uniforms.entranceAssembly.value = assembly;
  uniforms.entranceTransfer.value = transfer;
  const lerp = THREE.MathUtils.lerp;
  fragments.forEach(({ rest, letter, width }, i) => {
    const [ax, az, bx, bz] = transfers[i];
    const stroke = uniforms.entranceStrokes.value[i];
    stroke.set(
      lerp(lerp(rest[0], letter[0], assembly), ax, transfer),
      lerp(lerp(rest[1], letter[1], assembly), az, transfer),
      lerp(lerp(rest[2], letter[2], assembly), bx, transfer),
      lerp(lerp(rest[3], letter[3], assembly), bz, transfer),
    );
    uniforms.entranceWidths.value[i] = lerp(width * lerp(0.75, 1, assembly), 0.095, transfer);
  });
}
