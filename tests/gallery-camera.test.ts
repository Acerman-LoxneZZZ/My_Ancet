import { PerspectiveCamera, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { createJourneyCamera } from "../src/experience/journey/camera";
import { clampJourneyProgress, exhibitProgress, FINALE_FROM, JOURNEY_LIMIT } from "../src/experience/journey/chapters";
import { finaleView } from "../src/experience/journey/galleryRoute";

describe("gallery camera transitions", () => {
  it.each([["timepiece", "faro"], ["egypt", "proyavleno"], ["proyavleno", "dal"], ["dal", "tutor"], ["tutor", "castle"]] as const)(
    "spreads the dolly from %s to %s across the connector",
    (start, end) => {
      const from = exhibitProgress(start), to = exhibitProgress(end);
      const camera = new PerspectiveCamera();
      const rail = createJourneyCamera(camera);
      rail.fit(1.6);
      const previous = new Vector3();
      rail.update(from, [0, 0], false);
      previous.copy(camera.position);
      let largestStep = 0;
      for (let step = 1; step <= 180; step++) {
        rail.update(from + (to - from) * step / 180, [0, 0], false);
        largestStep = Math.max(largestStep, camera.position.distanceTo(previous));
        previous.copy(camera.position);
      }
      expect(largestStep).toBeLessThan(0.34);
    },
  );

  it("returns from the portrait bypass without a sudden sideways step", () => {
    const camera = new PerspectiveCamera();
    const rail = createJourneyCamera(camera);
    rail.fit(390 / 844);
    const from = exhibitProgress("egypt"), to = exhibitProgress("proyavleno");
    rail.update(from, [0, 0], false);
    let lastZ = camera.position.z;
    let largestStep = 0;
    for (let step = 1; step <= 180; step++) {
      rail.update(from + (to - from) * step / 180, [0, 0], false);
      largestStep = Math.max(largestStep, lastZ - camera.position.z);
      lastZ = camera.position.z;
    }
    expect(largestStep).toBeLessThan(0.3);
    expect(camera.position.z).toBeCloseTo(-38);
  });

  it("leaves the castle room before aiming at the original finale", () => {
    const camera = new PerspectiveCamera();
    const rail = createJourneyCamera(camera);
    rail.fit(1.6);
    rail.update(exhibitProgress("castle"), [0, 0], false);
    expect(camera.userData.journeyVisibility.activeRoom).toBe(6);
    rail.update(FINALE_FROM + 0.01, [0, 0], false);
    expect(camera.userData.journeyVisibility.activeRoom).toBeNull();
    rail.update(JOURNEY_LIMIT, [0, 0], false);
    expect(camera.position.distanceTo(new Vector3(finaleView.x, finaleView.y, finaleView.z))).toBeLessThan(0.01);
  });

  it("keeps advancing from the last display into the final turn", () => {
    const camera = new PerspectiveCamera();
    const rail = createJourneyCamera(camera);
    rail.fit(1.6);
    rail.update(FINALE_FROM - 0.012, [0, 0], false);
    const previous = camera.position.clone();
    for (let step = 1; step <= 12; step++) {
      rail.update(FINALE_FROM - 0.012 + step * 0.001, [0, 0], false);
      expect(camera.position.distanceTo(previous)).toBeGreaterThan(0.02);
      previous.copy(camera.position);
    }
  });

  it("keeps the appended gallery and finale reachable beyond the original range", () => {
    expect(clampJourneyProgress(JOURNEY_LIMIT)).toBe(JOURNEY_LIMIT);
    expect(clampJourneyProgress(100)).toBe(JOURNEY_LIMIT);
    expect(clampJourneyProgress(-1)).toBe(0);
    expect(clampJourneyProgress(NaN)).toBe(0);
  });

  it.each([0.45, 1.6, 844 / 390])("enters the final turn without a speed or direction step at aspect %s", aspect => {
    const camera = new PerspectiveCamera();
    const rail = createJourneyCamera(camera);
    rail.fit(aspect);
    rail.update(FINALE_FROM - 0.0001, [0, 0], false);
    const before = camera.position.clone();
    rail.update(FINALE_FROM, [0, 0], false);
    const join = camera.position.clone();
    rail.update(FINALE_FROM + 0.0001, [0, 0], false);
    const incoming = join.clone().sub(before), outgoing = camera.position.clone().sub(join);
    expect(outgoing.length() / incoming.length()).toBeGreaterThan(0.95);
    expect(outgoing.length() / incoming.length()).toBeLessThan(1.05);
    expect(incoming.normalize().dot(outgoing.normalize())).toBeGreaterThan(0.999);
  });
});
