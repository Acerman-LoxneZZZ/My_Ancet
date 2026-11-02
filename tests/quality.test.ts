import { describe, it, expect } from "vitest";
import { chooseQuality, lowerQuality } from "../src/experience/QualityManager";

describe("GPU budget and graceful reduction", () => {
  it("caps DPR even on a dense desktop display", () => {
    expect(
      chooseQuality({
        width: 1920,
        dpr: 3,
        saveData: false,
        reducedMotion: false,
      }),
    ).toMatchObject({
      tier: "desktop",
      dpr: 1.5,
      particles: 120,
      transmission: true,
    });
  });
  it("uses a smaller mobile budget without exceeding the physical DPR", () => {
    expect(
      chooseQuality({
        width: 390,
        dpr: 3,
        saveData: false,
        reducedMotion: false,
      }),
    ).toMatchObject({
      tier: "mobile",
      dpr: 1.25,
      particles: 40,
      transmission: false,
    });
    expect(
      chooseQuality({
        width: 1440,
        dpr: 1,
        saveData: false,
        reducedMotion: false,
      }).dpr,
    ).toBe(1);
  });
  it("save-data and reduced motion avoid expensive optical effects and particles", () => {
    for (const options of [
      { saveData: true, reducedMotion: false },
      { saveData: false, reducedMotion: true },
    ]) {
      expect(chooseQuality({ width: 1920, dpr: 2, ...options })).toMatchObject({
        tier: "low",
        dpr: 1,
        particles: 0,
        transmission: false,
      });
    }
  });
  it("a sustained slow frame budget steps down and never rises by itself", () => {
    const desktop = chooseQuality({
      width: 1600,
      dpr: 2,
      saveData: false,
      reducedMotion: false,
    });
    const mobile = lowerQuality(desktop);
    const low = lowerQuality(mobile);
    expect(mobile.tier).toBe("mobile");
    expect(low).toMatchObject({
      tier: "low",
      dpr: 1,
      particles: 0,
      transmission: false,
    });
    expect(lowerQuality(low)).toEqual(low);
    expect(desktop.tier).toBe("desktop");
  });
});
