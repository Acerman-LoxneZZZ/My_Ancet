import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture, TextureLoader } from "three";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createExhibits } from "../src/experience/journey/exhibits";
import { modelAssets } from "../src/experience/worlds/modelAssets";

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

  it("keeps the final exhibit mounted and visible throughout the turn into the finale", async () => {
    const exhibits = createExhibits();
    try {
      exhibits.update(0.826);
      const mounted = vi.fn();
      exhibits.prepare(0.826, mounted);
      await vi.waitFor(() => expect(mounted).toHaveBeenCalledTimes(2));
      const tutor = exhibits.group.getObjectByName("journey-room-tutor")!;
      for (const progress of [0.858, 0.91, 0.914, 0.94, 1, 0.94, 0.826]) {
        exhibits.update(progress);
        expect(tutor.visible, `progress ${progress}`).toBe(true);
      }
    } finally { exhibits.dispose(); }
  });

  it("loads the last exhibit when restoring a page at the very end", async () => {
    const exhibits = createExhibits();
    try {
      exhibits.update(1);
      const mounted = vi.fn();
      exhibits.prepare(1, mounted);
      await vi.waitFor(() => expect(mounted).toHaveBeenCalledTimes(1));
      expect(exhibits.group.getObjectByName("journey-room-tutor")?.visible).toBe(true);
    } finally { exhibits.dispose(); }
  });
});
