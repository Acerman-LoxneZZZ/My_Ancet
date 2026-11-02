import { describe, expect, it } from "vitest";
import {
  clamp01,
  getChapterProgress,
  mapViewportChange,
} from "../src/experience/story";

// Plan tasks 4/9: pure scroll mathematics, reverse seek, and resize restoration.
// Camera poses and ScrollTrigger lifecycle need their own later contracts.
describe("clamp01", () => {
  it.each([
    { input: -4, expected: 0 },
    { input: 0, expected: 0 },
    { input: 0.25, expected: 0.25 },
    { input: 1, expected: 1 },
    { input: 4, expected: 1 },
  ])("clamps $input to $expected", ({ input, expected }) => {
    expect(clamp01(input)).toBe(expected);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "returns a safe initial progress for non-finite input %s",
    (input) => {
      expect(clamp01(input)).toBe(0);
    },
  );
});

describe("getChapterProgress", () => {
  const chapter = { start: 100, end: 300 };

  it.each([
    { scrollY: -50, expected: 0 },
    { scrollY: 100, expected: 0 },
    { scrollY: 150, expected: 0.25 },
    { scrollY: 200, expected: 0.5 },
    { scrollY: 300, expected: 1 },
    { scrollY: 450, expected: 1 },
  ])("maps scrollY=$scrollY to $expected", ({ scrollY, expected }) => {
    expect(getChapterProgress(scrollY, chapter)).toBe(expected);
  });

  it("gives the same result after backward and forward seeking", () => {
    const expected = getChapterProgress(220, chapter);

    getChapterProgress(140, chapter);
    getChapterProgress(450, chapter);

    expect(getChapterProgress(220, chapter)).toBe(expected);
    expect(chapter).toEqual({ start: 100, end: 300 });
  });

  it.each([99, 100, 101])(
    "keeps a zero-height chapter finite at scrollY=%s",
    (scrollY) => {
      const progress = getChapterProgress(scrollY, { start: 100, end: 100 });

      expect(Number.isFinite(progress)).toBe(true);
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
    },
  );

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "does not propagate a non-finite scroll position %s into the scene",
    (scrollY) => {
      const progress = getChapterProgress(scrollY, chapter);

      expect(Number.isFinite(progress)).toBe(true);
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
    },
  );
});

describe("mapViewportChange", () => {
  const narrowMetrics = {
    chapters: { faro: { start: 3000, end: 5000 } },
    maxY: 9000,
  };

  it("restores the FARO chapter progress after resize instead of old pixels", () => {
    const snapshot = { y: 6000, chapter: "faro", progress: 0.5 };

    const restoredY = mapViewportChange(snapshot, narrowMetrics);

    expect(restoredY).toBe(4000);
    expect(
      getChapterProgress(restoredY, narrowMetrics.chapters.faro),
    ).toBeCloseTo(0.5, 6);
  });

  it("preserves position within the chapter through narrow and wide layouts", () => {
    const wide = {
      chapters: { faro: { start: 5000, end: 7000 } },
      maxY: 12000,
    };
    const original = { y: 6300, chapter: "faro", progress: 0.65 };
    const narrowY = mapViewportChange(original, narrowMetrics);
    const narrowSnapshot = {
      y: narrowY,
      chapter: "faro",
      progress: getChapterProgress(narrowY, narrowMetrics.chapters.faro),
    };

    expect(narrowY).toBe(4300);
    expect(mapViewportChange(narrowSnapshot, wide)).toBeCloseTo(original.y, 6);
  });

  it.each([
    { progress: -2, expected: 3000 },
    { progress: 0, expected: 3000 },
    { progress: 0.5, expected: 4000 },
    { progress: 1, expected: 5000 },
    { progress: 2, expected: 5000 },
  ])(
    "clamps chapter progress $progress before mapping",
    ({ progress, expected }) => {
      expect(
        mapViewportChange(
          { y: 6000, chapter: "faro", progress },
          narrowMetrics,
        ),
      ).toBe(expected);
    },
  );

  it("limits the restored chapter position to the new document scroll range", () => {
    expect(
      mapViewportChange(
        { y: 6000, chapter: "faro", progress: 1 },
        { chapters: { faro: { start: 3000, end: 5000 } }, maxY: 4200 },
      ),
    ).toBe(4200);
  });

  it("returns the chapter start when the new chapter has zero height", () => {
    expect(
      mapViewportChange(
        { y: 6000, chapter: "faro", progress: 0.5 },
        { chapters: { faro: { start: 3000, end: 3000 } }, maxY: 9000 },
      ),
    ).toBe(3000);
  });

  it.each([
    { label: "no chapter", snapshot: { y: 1200 } },
    {
      label: "missing chapter metrics",
      snapshot: { y: 1200, chapter: "egypt", progress: 0.5 },
    },
    { label: "missing progress", snapshot: { y: 1200, chapter: "faro" } },
    {
      label: "NaN progress",
      snapshot: { y: 1200, chapter: "faro", progress: Number.NaN },
    },
    {
      label: "infinite progress",
      snapshot: {
        y: 1200,
        chapter: "faro",
        progress: Number.POSITIVE_INFINITY,
      },
    },
  ])("uses saved pixels when there is $label", ({ snapshot }) => {
    expect(mapViewportChange(snapshot, narrowMetrics)).toBe(1200);
  });

  it.each([
    { y: -100, expected: 0 },
    { y: 0, expected: 0 },
    { y: 20000, expected: 9000 },
    { y: Number.NaN, expected: 0 },
    { y: Number.POSITIVE_INFINITY, expected: 0 },
    { y: Number.NEGATIVE_INFINITY, expected: 0 },
  ])("clamps fallback y=$y to the valid scroll range", ({ y, expected }) => {
    expect(mapViewportChange({ y }, narrowMetrics)).toBe(expected);
  });

  it("handles a document with no scrollable range", () => {
    expect(mapViewportChange({ y: 1200 }, { chapters: {}, maxY: 0 })).toBe(0);
    expect(
      mapViewportChange(
        { y: 1200, chapter: "faro", progress: 0.5 },
        { ...narrowMetrics, maxY: 0 },
      ),
    ).toBe(0);
  });

  it("does not modify the saved snapshot or new chapter measurements", () => {
    const snapshot = Object.freeze({ y: 6000, chapter: "faro", progress: 0.5 });
    const metrics = Object.freeze({
      chapters: Object.freeze({
        faro: Object.freeze({ start: 3000, end: 5000 }),
      }),
      maxY: 9000,
    });

    expect(mapViewportChange(snapshot, metrics)).toBe(4000);
    expect(snapshot).toEqual({ y: 6000, chapter: "faro", progress: 0.5 });
    expect(metrics.chapters.faro).toEqual({ start: 3000, end: 5000 });
  });
});
