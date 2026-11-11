import { Box3, BoxGeometry, Frustum, Group, Matrix4, Mesh, MeshStandardMaterial, PerspectiveCamera, Texture, TextureLoader } from "three";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createExhibits } from "../src/experience/journey/exhibits";
import { modelAssets } from "../src/experience/worlds/modelAssets";
import { createJourneyCamera } from "../src/experience/journey/camera";
import { exhibitChapters, exhibitProgress, galleryShutterStart, JOURNEY_LIMIT } from "../src/experience/journey/chapters";

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
  it("shares readiness across animation frames without loading a room twice", async () => {
    let finish!: () => void;
    const prepare = vi.fn(async () => {}).mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
    const exhibits = createExhibits(prepare);
    const mounted = vi.fn();
    try {
      const initial = exhibits.prepare(0, mounted);
      for (let frame = 0; frame < 240; frame++) expect(exhibits.prepare(frame / 240 * 0.1, mounted)).toBe(initial);
      await vi.waitFor(() => expect(prepare).toHaveBeenCalledTimes(1));
      finish();
      await initial;
      expect(exhibits.prepare(0, mounted)).toBe(initial);
      expect(modelAssets.acquire).toHaveBeenCalledTimes(1);
      const next = exhibits.prepare(0.337, mounted);
      expect(next).not.toBe(initial);
      await next;
      await vi.waitFor(() => expect(prepare).toHaveBeenCalledTimes(3));
      expect(mounted).toHaveBeenCalledTimes(3);
    } finally { exhibits.dispose(); finish?.(); }
  });

  it("lets the entrance render while keeping the camera outside the watch room until its assets are ready", async () => {
    let finish!: () => void;
    const prepare = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    const exhibits = createExhibits(prepare);
    const mounted = vi.fn();
    const preparation = exhibits.prepare(0, mounted);
    const watch = exhibitChapters[0];
    const shutter = galleryShutterStart(watch);
    const backBoundary = watch.to + 0.055;
    let prepared = false;
    void preparation.then(() => { prepared = true; });
    await vi.waitFor(() => expect(prepare).toHaveBeenCalledTimes(1));
    const room = exhibits.group.getObjectByName("journey-room-timepiece")!;
    expect(room.visible).toBe(false);
    expect(exhibits.isReadyAt(0)).toBe(true);
    expect(exhibits.isReadyAt(watch.at)).toBe(false);
    expect(exhibits.limitTravel(0, watch.at, false)).toBe(shutter);
    expect(exhibits.limitTravel(shutter, watch.at, false)).toBe(shutter);
    expect(exhibits.limitTravel(0, watch.at, true)).toBe(0);
    expect(exhibits.limitTravel(backBoundary, watch.at, false)).toBe(backBoundary);
    exhibits.update(0.214);
    expect(room.visible).toBe(false);
    expect(prepared).toBe(false);
    finish();
    await preparation;
    expect(prepared).toBe(true);
    expect(exhibits.isReadyAt(watch.at)).toBe(true);
    expect(exhibits.limitTravel(shutter, watch.at, false)).toBe(watch.at);
    expect(exhibits.limitTravel(0, watch.at, true)).toBe(watch.at);
    expect(exhibits.limitTravel(backBoundary, watch.at, false)).toBe(watch.at);
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
      const start = exhibitProgress('castle');
      rail.update(start, [0, 0], false);
      exhibits.update(start);
      const mounted = vi.fn();
      exhibits.prepare(start, mounted);
      await vi.waitFor(() => expect(mounted).toHaveBeenCalledTimes(1));
      exhibits.fit(aspect);
      const finalRoom = exhibits.group.getObjectByName("journey-room-castle")!;
      const screen = finalRoom.children.find(child => child.name === "Замок")!;
      finalRoom.updateWorldMatrix(true, true);
      const bounds = new Box3().setFromObject(finalRoom);
      const artifactBounds = new Box3().setFromObject(finalRoom.getObjectByName('Castle / miniature stone gateway')!).expandByScalar(camera.near * 2);
      const screenBounds = new Box3().setFromObject(screen).expandByScalar(camera.near * 2);
      const screenPlaneX = screen.matrixWorld.elements[12];
      const frustum = new Frustum(), projection = new Matrix4();
      let firstHidden = Infinity;
      for (let step = 0; step <= 240; step++) {
        const progress = start + (JOURNEY_LIMIT - start) * step / 240;
        rail.update(progress, [0, 0], false);
        exhibits.update(progress);
        expect(screenBounds.containsPoint(camera.position), `camera clips display at ${progress}: ${camera.position.toArray()} in ${screenBounds.min.toArray()} to ${screenBounds.max.toArray()}`).toBe(false);
        expect(artifactBounds.containsPoint(camera.position), `camera clips stone gate at ${progress}`).toBe(false);
        if (!finalRoom.visible) {
          firstHidden = Math.min(firstHidden, progress);
          frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
          expect(camera.position.x, `progress ${progress}`).toBeGreaterThan(screenPlaneX + 0.25);
          expect(frustum.intersectsBox(bounds), `progress ${progress}`).toBe(false);
        }
      }
      expect(firstHidden).toBeLessThan(JOURNEY_LIMIT - 0.005);
      expect(finalRoom.visible).toBe(false);
      // Backtracking restores the screen before it can re-enter the image.
      for (let step = 240; step >= 0; step--) {
        const progress = start + (JOURNEY_LIMIT - start) * step / 240;
        rail.update(progress, [0, 0], false);
        exhibits.update(progress);
        frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
        if (frustum.intersectsBox(bounds)) expect(finalRoom.visible).toBe(true);
      }
    } finally { exhibits.dispose(); }
  });

  it("does not load the display behind the camera on a fresh visit to the finale", async () => {
    const camera = new PerspectiveCamera();
    const rail = createJourneyCamera(camera);
    rail.fit(1.6);
    rail.update(JOURNEY_LIMIT, [0, 0], false);
    const exhibits = createExhibits(undefined, camera);
    try {
      exhibits.update(JOURNEY_LIMIT);
      const mounted = vi.fn();
      exhibits.prepare(JOURNEY_LIMIT, mounted);
      expect(TextureLoader.prototype.loadAsync).not.toHaveBeenCalled();
      expect(mounted).not.toHaveBeenCalled();
    } finally { exhibits.dispose(); }
  });
});
