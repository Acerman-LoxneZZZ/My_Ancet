/**
 * Contract before implementation — src/experience/watchPose.ts:
 * - sampleWatchPart(part, progress) returns fresh position/quaternion/scale arrays.
 * - Finite progress is clamped to [0,1]; NaN and ±Infinity mean progress 0.
 * - Pose is absolute, using the part's start/end and smoothstep; quaternion uses
 *   normalized shortest-path interpolation. Input data must never be mutated.
 * - verifyWatchManifest(unknown) throws for anything other than 47 complete,
 *   uniquely identified parts with valid finite TRS and animation ranges.
 *   It may assert/narrow the type; no particular return value/message is required.
 */
import { describe, expect, it } from "vitest";
import sourceManifest from "../docs/design/review-v2/assets/watch-parts.json";
import {
  sampleWatchPart,
  verifyWatchManifest,
} from "../src/experience/watchPose";

type WatchPart = Parameters<typeof sampleWatchPart>[0];
type RawPart = Record<string, unknown>;
const manifest = sourceManifest as unknown as WatchPart[];

function expectVector(actual: readonly number[], expected: readonly number[]) {
  expect(actual).toHaveLength(expected.length);
  expected.forEach((value, index) =>
    expect(actual[index]).toBeCloseTo(value, 8),
  );
}

function expectRotation(
  actual: readonly number[],
  expected: readonly number[],
) {
  expect(actual).toHaveLength(4);
  expect(Math.hypot(...actual)).toBeCloseTo(1, 8);
  // q and -q represent the same orientation.
  const dot = actual.reduce(
    (sum, value, index) => sum + value * expected[index],
    0,
  );
  expect(Math.abs(dot)).toBeCloseTo(1, 8);
}

function freezeDeep<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}

describe("the actual 47-part watch manifest", () => {
  it("accepts the source asset manifest unchanged", () => {
    expect(manifest).toHaveLength(47);
    expect(() => verifyWatchManifest(sourceManifest)).not.toThrow();
  });

  const invalidCases: Array<[string, (parts: RawPart[]) => void]> = [
    [
      "a missing part",
      (parts) => {
        parts.pop();
      },
    ],
    [
      "duplicate ids",
      (parts) => {
        parts[1].id = parts[0].id;
      },
    ],
    [
      "duplicate exported node names",
      (parts) => {
        parts[1].nodeName = parts[0].nodeName;
      },
    ],
    [
      "an empty exported node name",
      (parts) => {
        parts[0].nodeName = "";
      },
    ],
    [
      "missing rest position",
      (parts) => {
        delete parts[0].restPosition;
      },
    ],
    [
      "missing rest quaternion",
      (parts) => {
        delete parts[0].restQuaternion;
      },
    ],
    [
      "missing rest scale",
      (parts) => {
        delete parts[0].restScale;
      },
    ],
    [
      "a truncated position",
      (parts) => {
        parts[0].restPosition = [0, 0];
      },
    ],
    [
      "a nonnumeric position",
      (parts) => {
        parts[0].restPosition = [0, "1", 0];
      },
    ],
    [
      "a non-finite offset",
      (parts) => {
        parts[0].explodedOffset = [0, Infinity, 0];
      },
    ],
    [
      "a non-positive scale",
      (parts) => {
        parts[0].restScale = [1, 0, 1];
      },
    ],
    [
      "a non-unit rest quaternion",
      (parts) => {
        parts[0].restQuaternion = [0, 0, 0, 2];
      },
    ],
    [
      "a zero end quaternion",
      (parts) => {
        parts[0].explodedQuaternion = [0, 0, 0, 0];
      },
    ],
    [
      "a reversed progress interval",
      (parts) => {
        parts[0].start = 0.8;
        parts[0].end = 0.2;
      },
    ],
    [
      "an interval outside 0..1",
      (parts) => {
        parts[0].end = 1.1;
      },
    ],
    [
      "a non-finite interval",
      (parts) => {
        parts[0].start = NaN;
      },
    ],
    [
      "movement in a zero-length interval",
      (parts) => {
        parts[0].start = 0.4;
        parts[0].end = 0.4;
        parts[0].explodedOffset = [1, 0, 0];
      },
    ],
  ];

  it.each(invalidCases)("rejects %s before animation", (_label, mutate) => {
    const invalid = structuredClone(sourceManifest) as RawPart[];
    mutate(invalid);
    expect(() => verifyWatchManifest(invalid)).toThrow();
  });

  it.each([null, undefined, {}, [], "watch"])(
    "rejects non-manifests (%j)",
    (invalid) => {
      expect(() => verifyWatchManifest(invalid)).toThrow();
    },
  );
});

describe("sampleWatchPart", () => {
  it("preserves the actual rest pose of all 47 exported parts at progress 0", () => {
    for (const part of manifest) {
      const pose = sampleWatchPart(part, 0);
      expectVector(pose.position, part.restPosition);
      expectRotation(pose.quaternion, part.restQuaternion);
      expectVector(pose.scale, part.restScale);
    }
  });

  it("fully disassembles all 47 parts at progress 1 without losing their scale", () => {
    for (const part of manifest) {
      const pose = sampleWatchPart(part, 1);
      const moves = part.end > part.start;
      expectVector(
        pose.position,
        part.restPosition.map(
          (value, axis) => value + (moves ? part.explodedOffset[axis] : 0),
        ),
      );
      expectRotation(
        pose.quaternion,
        moves ? part.explodedQuaternion : part.restQuaternion,
      );
      expectVector(pose.scale, part.restScale);
    }
  });

  it("respects an individual part’s start, midpoint and end while other parts keep moving", () => {
    const part = manifest.find((entry) => entry.id === "dial_face")!;
    expect(part.start).toBeGreaterThan(0);
    expect(part.end).toBeLessThan(1);
    expectVector(
      sampleWatchPart(part, part.start - 0.05).position,
      part.restPosition,
    );
    expectVector(sampleWatchPart(part, part.start).position, part.restPosition);
    expectVector(
      sampleWatchPart(part, (part.start + part.end) / 2).position,
      part.restPosition.map(
        (value, axis) => value + part.explodedOffset[axis] / 2,
      ),
    );
    expectVector(
      sampleWatchPart(part, part.end).position,
      part.restPosition.map((value, axis) => value + part.explodedOffset[axis]),
    );
    expectVector(
      sampleWatchPart(part, part.end + 0.05).position,
      part.restPosition.map((value, axis) => value + part.explodedOffset[axis]),
    );
  });

  it("gives the same absolute pose after forward, reverse and repeated scrolling without changing the manifest", () => {
    const frozen = freezeDeep(structuredClone(manifest));
    const before = JSON.stringify(frozen);
    const stops = [0, 0.12, 0.36, 0.55, 0.82, 1];
    const expected = stops.map((progress) =>
      frozen.map((part) => sampleWatchPart(part, progress)),
    );
    const visitOrder = [0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0, 5, 2, 2, 5, 0];
    for (const index of visitOrder) {
      expect(frozen.map((part) => sampleWatchPart(part, stops[index]))).toEqual(
        expected[index],
      );
    }
    expect(JSON.stringify(frozen)).toBe(before);
  });

  it.each([
    [-3, 0],
    [2, 1],
    [NaN, 0],
    [Infinity, 0],
    [-Infinity, 0],
  ])("normalizes progress %s to %s", (input, normalized) => {
    for (const part of manifest) {
      expect(sampleWatchPart(part, input)).toEqual(
        sampleWatchPart(part, normalized),
      );
    }
  });

  it("interpolates rotations along the shortest arc and keeps them normalized", () => {
    const part = structuredClone(manifest[0]);
    part.start = 0;
    part.end = 1;
    part.restQuaternion = [0, 0, 0, 1];
    // The negative quaternion is the same 90-degree end orientation.
    part.explodedQuaternion = [0, 0, -Math.SQRT1_2, -Math.SQRT1_2];
    expectRotation(sampleWatchPart(part, 0.5).quaternion, [
      0,
      0,
      Math.sin(Math.PI / 8),
      Math.cos(Math.PI / 8),
    ]);
    expectRotation(
      sampleWatchPart(part, 1).quaternion,
      part.explodedQuaternion,
    );
  });

  it("returns independent arrays so a consumer cannot corrupt the source or another frame", () => {
    const part = structuredClone(manifest[0]);
    const before = structuredClone(part);
    const first = sampleWatchPart(part, 0);
    const second = sampleWatchPart(part, 0);
    first.position[0] = 123;
    first.quaternion[0] = 123;
    first.scale[0] = 123;
    expect(part).toEqual(before);
    expectVector(second.position, before.restPosition);
    expectRotation(second.quaternion, before.restQuaternion);
    expectVector(second.scale, before.restScale);
  });
});
