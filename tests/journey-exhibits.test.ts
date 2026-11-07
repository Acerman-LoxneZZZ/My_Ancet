import { Box3, BoxGeometry, Frustum, Group, Matrix4, Mesh, MeshStandardMaterial, PerspectiveCamera, Texture, TextureLoader } from "three";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createExhibits } from "../src/experience/journey/exhibits";
import { modelAssets } from "../src/experience/worlds/modelAssets";
import { createJourneyCamera } from "../src/experience/journey/camera";

beforeEach(() => {
  vi.spyOn(TextureLoader.prototype, "loadAsync").mockImplementation(async () => new Texture());
  vi.spyOn(modelAssets, "acquire").mockImplementation(() => {
    const scene = new Group();
    const geometry = new BoxGeometry();
    geometry.computeBoundingBox();
    const mesh = new Mesh(geometry, new MeshStandardMaterial());
    mesh.name = "Proyavleno_ribbon";
    scene.add(mesh);
    return { promise: Promise.resolve({ scene } as GLTF), release: vi.fn() };
  });
});

describe("prepared gallery exhibits", () => {
  it("prepares the watch in advance, keeping it hidden until its original load boundary", async () => {
    let finish!: () => void;
    const prepare = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    const exhibits = createExhibits(prepare);
    const mounted = vi.fn();
    exhibits.prepare(0, mounted);
    await vi.waitFor(() => expect(prepare).toHaveBeenCalledTimes(1));
    const room = exhibits.group.getObjectByName("journey-room-timepiece")!;
    expect(room.visible).toBe(false);
    exhibits.update(0.214);
    expect(room.visible).toBe(false);
    finish();
    await vi.waitFor(() => expect(mounted).toHaveBeenCalledTimes(1));
    expect(room.visible).toBe(true);
    exhibits.update(0);
    expect(room.visible).toBe(false);
    exhibits.dispose();
  });

  it("allows a direct jump past unloaded earlier rooms", async () => {
    const exhibits = createExhibits();
    const mounted = vi.fn();
    exhibits.update(0.704);
    exhibits.prepare(0.704, mounted);
    await vi.waitFor(() => expect(mounted).toHaveBeenCalledTimes(3));
    expect(exhibits.group.getObjectByName("journey-room-dal")?.visible).toBe(true);
    expect(exhibits.group.getObjectByName("journey-room-tutor")?.visible).toBe(false);
    exhibits.dispose();
  });

  it("does not mount a prepared room after leaving the page", async () => {
    let finish!: () => void;
    const prepare = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    const exhibits = createExhibits(prepare);
    const mounted = vi.fn();
    exhibits.prepare(0, mounted);
    await vi.waitFor(() => expect(prepare).toHaveBeenCalledTimes(1));
    exhibits.dispose();
    finish();
    await Promise.resolve();
    await Promise.resolve();
    expect(mounted).not.toHaveBeenCalled();
    expect(exhibits.group.children).toHaveLength(0);
  });

  it.each([360 / 800, 390 / 844, 430 / 932, 1, 1.6, 844 / 390])(
    "hides the final room only after passing it and leaving it outside the view at aspect %s", async aspect => {
    const camera = new PerspectiveCamera();
    const rail = createJourneyCamera(camera);
    rail.fit(aspect);
    const exhibits = createExhibits(undefined, camera);
    try {
      rail.update(0.826, [0, 0], false);
      exhibits.update(0.826);
      const mounted = vi.fn();
      exhibits.prepare(0.826, mounted);
      await vi.waitFor(() => expect(mounted).toHaveBeenCalledTimes(2));
      exhibits.fit(aspect);
      const tutor = exhibits.group.getObjectByName("journey-room-tutor")!;
      const screen = tutor.children.find(child => child.name === "3D-репетитор")!;
      tutor.updateWorldMatrix(true, true);
      const bounds = new Box3().setFromObject(tutor);
      const screenBounds = new Box3().setFromObject(screen).expandByScalar(camera.near * 2);
      const screenPlaneX = screen.matrixWorld.elements[12];
      const frustum = new Frustum(), projection = new Matrix4();
      let firstHidden = Infinity;
      for (let step = 0; step <= 240; step++) {
        const progress = 0.826 + (1 - 0.826) * step / 240;
        rail.update(progress, [0, 0], false);
        exhibits.update(progress);
        expect(screenBounds.containsPoint(camera.position), `camera clips display at ${progress}: ${camera.position.toArray()} in ${screenBounds.min.toArray()} to ${screenBounds.max.toArray()}`).toBe(false);
        if (!tutor.visible) {
          firstHidden = Math.min(firstHidden, progress);
          frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
          expect(camera.position.x, `progress ${progress}`).toBeGreaterThan(screenPlaneX + 0.25);
          expect(frustum.intersectsBox(bounds), `progress ${progress}`).toBe(false);
        }
      }
      expect(firstHidden).toBeLessThan(0.995);
      expect(tutor.visible).toBe(false);
      // Backtracking restores the screen before it can re-enter the image.
      for (let step = 240; step >= 0; step--) {
        const progress = 0.826 + (1 - 0.826) * step / 240;
        rail.update(progress, [0, 0], false);
        exhibits.update(progress);
        frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
        if (frustum.intersectsBox(bounds)) expect(tutor.visible).toBe(true);
      }
    } finally { exhibits.dispose(); }
  });

  it("does not load the display behind the camera on a fresh visit to the finale", async () => {
    const camera = new PerspectiveCamera();
    const rail = createJourneyCamera(camera);
    rail.fit(1.6);
    rail.update(1, [0, 0], false);
    const exhibits = createExhibits(undefined, camera);
    try {
      exhibits.update(1);
      const mounted = vi.fn();
      exhibits.prepare(1, mounted);
      expect(TextureLoader.prototype.loadAsync).not.toHaveBeenCalled();
      expect(mounted).not.toHaveBeenCalled();
    } finally { exhibits.dispose(); }
  });
});
