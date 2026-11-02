import { describe, expect, it } from "vitest";
import { resolveScrollDestination } from "../src/navigation/restoreDestination";

const metrics = {
  maxY: 12000,
  chapters: { egypt: { start: 6000, end: 9000 } },
};
const saved = {
  y: 7000,
  chapter: "egypt",
  progress: 0.5,
  focusId: "world-egypt-title",
};

describe("history restoration with a hash in the stored URL", () => {
  it("restores the gallery chapter on Back even when the entry URL still contains #works", () => {
    expect(resolveScrollDestination("pop", saved, 1800, metrics)).toEqual({
      top: 7500,
      source: "snapshot",
    });
  });
  it("retains a saved position of zero rather than treating it as absent", () => {
    expect(resolveScrollDestination("pop", { y: 0 }, 1800, metrics)).toEqual({
      top: 0,
      source: "snapshot",
    });
  });
  it("uses a hash for a fresh link and for a history entry without a saved visit", () => {
    expect(resolveScrollDestination("push", saved, 1800, metrics)).toEqual({
      top: 1800,
      source: "hash",
    });
    expect(resolveScrollDestination("pop", undefined, 1800, metrics)).toEqual({
      top: 1800,
      source: "hash",
    });
  });
  it("still supports an explicit gallery return without a hash and ordinary page top", () => {
    expect(resolveScrollDestination("push", saved, undefined, metrics)).toEqual(
      { top: 7500, source: "snapshot" },
    );
    expect(
      resolveScrollDestination("push", undefined, undefined, metrics),
    ).toEqual({ top: 0, source: "top" });
  });
});
