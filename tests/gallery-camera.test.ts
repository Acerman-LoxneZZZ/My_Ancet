import { PerspectiveCamera, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { createJourneyCamera } from "../src/experience/journey/camera";
import { exhibitProgress, FINALE_FROM } from "../src/experience/journey/chapters";
import { finaleView } from "../src/experience/journey/galleryRoute";

describe("gallery camera transitions", () => {
  it.each([["timepiece", "faro"], ["egypt", "proyavleno"], ["proyavleno", "dal"], ["dal", "tutor"]] as const)(
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

  it("leaves the sixth room before aiming at the original finale", () => {
    const camera = new PerspectiveCamera();
    const rail = createJourneyCamera(camera);
    rail.fit(1.6);
    rail.update(exhibitProgress("tutor"), [0, 0], false);
    expect(camera.userData.journeyVisibility.activeRoom).toBe(5);
    rail.update(FINALE_FROM + 0.01, [0, 0], false);
    expect(camera.userData.journeyVisibility.activeRoom).toBeNull();
    rail.update(1, [0, 0], false);
    expect(camera.position.distanceTo(new Vector3(finaleView.x, finaleView.y, finaleView.z))).toBeLessThan(0.01);
  });
});
