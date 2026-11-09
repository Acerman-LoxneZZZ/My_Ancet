import { Box3, Group, PerspectiveCamera, Ray, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { createArchitecture } from "../src/experience/journey/architecture";
import { createJourneyCamera } from "../src/experience/journey/camera";
import { exhibitChapters, galleryShutterStart } from "../src/experience/journey/chapters";
import { entrancePose, limitEntranceStep, shadowHold } from "../src/experience/journey/entrance";
import { galleryStops } from "../src/experience/journey/galleryRoute";

describe("the entrance choreography", () => {
  it("leaves the assembled K on the floor before opening the glass", () => {
    expect(entrancePose(0, Infinity, false).assembly).toBe(0);
    for (const progress of [shadowHold.from, shadowHold.to]) {
      expect(entrancePose(progress, Infinity, false)).toMatchObject({ assembly: 1, transfer: 0, opening: 0 });
    }
    expect(entrancePose(0.126, Infinity, false)).toMatchObject({ assembly: 1, transfer: 1, opening: 1 });
  });

  it("assembles and releases a touch without advancing the shutters", () => {
    expect(entrancePose(0, 0.2, false).glint).toBeGreaterThan(0);
    expect(entrancePose(0, 0.5, false)).toMatchObject({ assembly: 1, transfer: 0, opening: 0 });
    expect(entrancePose(0, 1.28, false)).toMatchObject({ assembly: 0, glint: 0 });
    expect(entrancePose(0, 0.2, true)).toMatchObject({ assembly: 1, glint: 0 });
  });

  it.each([[0, 0.35], [0.35, 0]])("keeps a readable dwell on a jump from %s to %s", (start, target) => {
    const dt = 1 / 60;
    let progress = start;
    let held = 0;
    for (let i = 0; i < 120; i++) {
      progress = limitEntranceStep(progress, target, dt);
      if (progress >= shadowHold.from && progress <= shadowHold.to) held += dt;
    }
    expect(held).toBeGreaterThanOrEqual(0.35);
    expect(progress).toBe(target);
  });

  it("keeps the camera clear of the moving cabinet on wide and narrow screens", () => {
    const architecture = createArchitecture();
    const cabinet = architecture.group.getObjectByName("LOXNE / optical mechanical cabinet")!;
    const camera = new PerspectiveCamera();
    const rig = createJourneyCamera(camera);
    const bounds = new Box3();
    try {
      for (const aspect of [320 / 720, 390 / 844, 1.2, 1.6, 21 / 9]) {
        rig.fit(aspect);
        for (let frame = 80; frame <= 170; frame++) {
          const progress = frame / 1000;
          architecture.update(progress, 0, entrancePose(progress, Infinity, false));
          architecture.group.updateMatrixWorld(true);
          for (const pointer of [[-1, -1], [1, 1]] as const) {
            rig.update(progress, pointer, false);
            for (const leaf of cabinet.children) {
              bounds.setFromObject(leaf).expandByScalar(camera.near * 2);
              expect(bounds.containsPoint(camera.position), `aspect ${aspect}, progress ${progress}`).toBe(false);
            }
          }
        }
      }
    } finally {
      architecture.dispose();
    }
  });

  it.each([390 / 844, 1.6])("reveals the watch behind its shutters at aspect %s", aspect => {
    const architecture = createArchitecture();
    const gate = architecture.group.getObjectByName("Gallery / sliding shutters / timepiece")!;
    const leaves = gate.children.filter(child => child instanceof Group);
    const camera = new PerspectiveCamera();
    const rig = createJourneyCamera(camera);
    rig.fit(aspect);
    const [watch, next] = exhibitChapters;
    const watchCenter = new Vector3(aspect < 1 ? 0 : -2.25, aspect < 1 ? 6.1 : 3.48, 0.35 - galleryStops[0]);
    const update = (progress: number) => {
      architecture.update(progress, 0, entrancePose(progress, Infinity, false));
      rig.update(progress, [0, 0], false);
      gate.updateWorldMatrix(true, true);
      return leaves.map(leaf => new Box3().setFromObject(leaf));
    };
    const sightline = () => new Ray(camera.position, watchCenter.clone().sub(camera.position).normalize());
    try {
      const closed = update(galleryShutterStart(watch) - 0.003);
      expect(closed.some(bounds => sightline().intersectsBox(bounds))).toBe(true);
      const open = update(watch.at);
      expect(open.some(bounds => sightline().intersectsBox(bounds))).toBe(false);
      for (let progress = galleryShutterStart(watch); progress <= next.from; progress += 0.001) {
        expect(update(progress).some(bounds => bounds.expandByScalar(camera.near).containsPoint(camera.position))).toBe(false);
      }
    } finally {
      architecture.dispose();
    }
  });
});
