import { afterEach, describe, expect, it, vi } from "vitest";
import { currentSnapshot } from "../src/experience/domStory";
import { mapViewportChange } from "../src/experience/story";

const metrics = {
  maxY: 9000,
  chapters: {
    intro: { start: 0, end: 1440 },
    timepiece: { start: 2916, end: 3276 },
  },
};
function visit(y: number) {
  vi.stubGlobal("window", { scrollY: y, innerHeight: 900 });
  vi.stubGlobal("document", {
    documentElement: { scrollHeight: 9900 },
    activeElement: { id: "" },
    querySelectorAll: () => [
      {
        dataset: { chapter: "intro" },
        offsetHeight: 2340,
        getBoundingClientRect: () => ({ top: -y }),
      },
      {
        dataset: { chapter: "timepiece" },
        offsetHeight: 1260,
        getBoundingClientRect: () => ({ top: 2916 - y }),
      },
    ],
  });
}
afterEach(() => vi.unstubAllGlobals());
describe("gallery snapshots around animation intervals", () => {
  it("restores the approach to the watch at y2784, rather than clamping it back to intro end1440", () => {
    visit(2784);
    const saved = currentSnapshot();
    expect(mapViewportChange(saved, metrics)).toBe(2784);
    expect(saved.chapter).toBeUndefined();
  });
  it("keeps raw pixels just before and after a chapter animation range", () => {
    for (const y of [2880, 3300]) {
      visit(y);
      expect(mapViewportChange(currentSnapshot(), metrics)).toBe(y);
    }
  });
  it("retains chapter progress when actually inside the animation interval", () => {
    visit(3175);
    const saved = currentSnapshot();
    expect(saved).toMatchObject({
      y: 3175,
      chapter: "timepiece",
      progress: (3175 - 2916) / 360,
    });
    expect(mapViewportChange(saved, metrics)).toBe(3175);
  });
});
