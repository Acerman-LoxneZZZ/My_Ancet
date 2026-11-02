/**
 * Contract before implementation — src/experience/AssetManager.ts:
 * new AssetManager<T>({ load(key:string):Promise<T>, dispose(asset:T):void })
 * acquire(key) -> { promise:Promise<T>, release():void }; disposeAll():void.
 * - Concurrent/current leases share one promise and one loaded asset per key.
 * - A ready entry lives only while at least one lease remains. The last release
 *   evicts it and disposes it once; if pending, dispose its late result once.
 * - An abandoned promise still settles normally, but its asset is no longer usable.
 * - Rejections evict the failed entry, so acquire can retry even before old leases
 *   release. Old releases/results must never alter a newer entry with the same key.
 * - release and disposeAll are idempotent. disposeAll invalidates current leases,
 *   clears entries, and leaves the manager reusable for a later acquire.
 */
import { describe, expect, it, vi } from "vitest";
import { AssetManager } from "../src/experience/AssetManager";
import * as THREE from "three";
import { MonolithWorld } from "../src/experience/worlds/MonolithWorld";
import type { FrameState } from "../src/experience/types";
import { readFileSync } from "node:fs";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { TimepieceWorld } from "../src/experience/worlds/TimepieceWorld";
import {
  modelAssets,
  watchManifests,
} from "../src/experience/worlds/modelAssets";
import { disposeTree } from "../src/experience/worlds/shared";
import { sampleWatchPart, type WatchPart } from "../src/experience/watchPose";
import sourceWatchParts from "../docs/design/review-v2/assets/watch-parts.json";

type Asset = { name: string };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe("AssetManager: shared scene resources", () => {
  it("coalesces concurrent loads, retains the asset for the remaining consumer, and disposes on the last release", async () => {
    const pending = deferred<Asset>();
    const load = vi.fn(() => pending.promise);
    const dispose = vi.fn();
    const manager = new AssetManager<Asset>({ load, dispose });
    const first = manager.acquire("watch");
    const second = manager.acquire("watch");
    expect(first.promise).toBe(second.promise);
    await Promise.resolve();
    expect(load).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledWith("watch");

    first.release();
    first.release();
    const asset = { name: "watch" };
    pending.resolve(asset);
    expect(await second.promise).toBe(asset);
    expect(dispose).not.toHaveBeenCalled();

    const third = manager.acquire("watch");
    expect(await third.promise).toBe(asset);
    expect(load).toHaveBeenCalledTimes(1);
    second.release();
    expect(dispose).not.toHaveBeenCalled();
    third.release();
    third.release();
    manager.disposeAll();
    expect(dispose).toHaveBeenCalledExactlyOnceWith(asset);
  });

  it("disposes an abandoned pending result and loads afresh after it resolves", async () => {
    const abandoned = deferred<Asset>();
    const replacement = { name: "new watch" };
    const load = vi
      .fn<(key: string) => Promise<Asset>>()
      .mockImplementationOnce(() => abandoned.promise)
      .mockResolvedValueOnce(replacement);
    const dispose = vi.fn();
    const manager = new AssetManager<Asset>({ load, dispose });
    const first = manager.acquire("watch");
    await Promise.resolve();
    first.release();
    first.release();
    expect(dispose).not.toHaveBeenCalled();
    const lateAsset = { name: "abandoned watch" };
    abandoned.resolve(lateAsset);
    expect(await first.promise).toBe(lateAsset);
    expect(dispose).toHaveBeenCalledExactlyOnceWith(lateAsset);

    const next = manager.acquire("watch");
    expect(await next.promise).toBe(replacement);
    expect(load).toHaveBeenCalledTimes(2);
    expect(dispose).toHaveBeenCalledTimes(1);
    next.release();
    expect(dispose).toHaveBeenCalledTimes(2);
    expect(dispose).toHaveBeenLastCalledWith(replacement);
  });

  it("does not let an old late result or stale release evict a newer load of the same key", async () => {
    const oldLoad = deferred<Asset>();
    const newLoad = deferred<Asset>();
    const load = vi
      .fn<(key: string) => Promise<Asset>>()
      .mockImplementationOnce(() => oldLoad.promise)
      .mockImplementationOnce(() => newLoad.promise);
    const dispose = vi.fn();
    const manager = new AssetManager<Asset>({ load, dispose });
    const oldLease = manager.acquire("faro");
    await Promise.resolve();
    oldLease.release();
    const newLease = manager.acquire("faro");
    await Promise.resolve();
    expect(load).toHaveBeenCalledTimes(2);

    const current = { name: "current pizza" };
    newLoad.resolve(current);
    expect(await newLease.promise).toBe(current);
    const stale = { name: "stale pizza" };
    oldLoad.resolve(stale);
    await oldLease.promise;
    oldLease.release();
    expect(dispose).toHaveBeenCalledExactlyOnceWith(stale);

    const extra = manager.acquire("faro");
    expect(await extra.promise).toBe(current);
    expect(load).toHaveBeenCalledTimes(2);
    newLease.release();
    expect(dispose).toHaveBeenCalledTimes(1);
    extra.release();
    expect(dispose).toHaveBeenCalledTimes(2);
    expect(dispose).toHaveBeenLastCalledWith(current);
  });

  it("evicts a rejected load and permits retry without waiting for failed consumers to release", async () => {
    const pending = deferred<Asset>();
    const good = { name: "recovered watch" };
    const load = vi
      .fn<(key: string) => Promise<Asset>>()
      .mockImplementationOnce(() => pending.promise)
      .mockResolvedValueOnce(good);
    const dispose = vi.fn();
    const manager = new AssetManager<Asset>({ load, dispose });
    const failed = manager.acquire("watch");
    const alsoFailed = manager.acquire("watch");
    const error = new Error("GLB request failed");
    const observed = expect(failed.promise).rejects.toBe(error);
    pending.reject(error);
    await observed;
    expect(alsoFailed.promise).toBe(failed.promise);
    expect(dispose).not.toHaveBeenCalled();

    const retry = manager.acquire("watch");
    expect(await retry.promise).toBe(good);
    expect(load).toHaveBeenCalledTimes(2);
    failed.release();
    alsoFailed.release();
    expect(dispose).not.toHaveBeenCalled();
    retry.release();
    expect(dispose).toHaveBeenCalledExactlyOnceWith(good);
  });

  it("keeps unrelated world assets independent", async () => {
    const watch = { name: "watch" };
    const pizza = { name: "pizza" };
    const load = vi.fn(async (key: string) =>
      key === "watch" ? watch : pizza,
    );
    const dispose = vi.fn();
    const manager = new AssetManager<Asset>({ load, dispose });
    const watchLease = manager.acquire("watch");
    const pizzaLease = manager.acquire("faro");
    expect(await watchLease.promise).toBe(watch);
    expect(await pizzaLease.promise).toBe(pizza);
    watchLease.release();
    expect(dispose).toHaveBeenCalledExactlyOnceWith(watch);
    const pizzaAgain = manager.acquire("faro");
    expect(await pizzaAgain.promise).toBe(pizza);
    expect(load).toHaveBeenCalledTimes(2);
    pizzaLease.release();
    expect(dispose).toHaveBeenCalledTimes(1);
    pizzaAgain.release();
    expect(dispose).toHaveBeenCalledTimes(2);
    expect(dispose).toHaveBeenLastCalledWith(pizza);
  });

  it("disposeAll disposes ready resources once and ignores all subsequent stale releases", async () => {
    const watch = { name: "watch" };
    const pizza = { name: "pizza" };
    const load = vi.fn(async (key: string) =>
      key === "watch" ? watch : pizza,
    );
    const dispose = vi.fn();
    const manager = new AssetManager<Asset>({ load, dispose });
    const first = manager.acquire("watch");
    const second = manager.acquire("watch");
    const third = manager.acquire("faro");
    await Promise.all([first.promise, second.promise, third.promise]);
    manager.disposeAll();
    manager.disposeAll();
    first.release();
    second.release();
    third.release();
    first.release();
    manager.disposeAll();
    expect(dispose).toHaveBeenCalledTimes(2);
    expect(
      dispose.mock.calls.filter(([asset]) => asset === watch),
    ).toHaveLength(1);
    expect(
      dispose.mock.calls.filter(([asset]) => asset === pizza),
    ).toHaveLength(1);
  });

  it("disposeAll isolates pending generations, remains reusable and disposes late assets exactly once", async () => {
    const oldLoad = deferred<Asset>();
    const newLoad = deferred<Asset>();
    const load = vi
      .fn<(key: string) => Promise<Asset>>()
      .mockImplementationOnce(() => oldLoad.promise)
      .mockImplementationOnce(() => newLoad.promise);
    const dispose = vi.fn();
    const manager = new AssetManager<Asset>({ load, dispose });
    const oldLease = manager.acquire("watch");
    await Promise.resolve();
    manager.disposeAll();
    manager.disposeAll();
    oldLease.release();
    expect(dispose).not.toHaveBeenCalled();
    const newLease = manager.acquire("watch");
    const stale = { name: "old world" };
    const current = { name: "new world" };
    oldLoad.resolve(stale);
    newLoad.resolve(current);
    expect(await oldLease.promise).toBe(stale);
    expect(await newLease.promise).toBe(current);
    expect(load).toHaveBeenCalledTimes(2);
    oldLease.release();
    expect(dispose).toHaveBeenCalledExactlyOnceWith(stale);
    newLease.release();
    manager.disposeAll();
    expect(dispose).toHaveBeenCalledTimes(2);
    expect(dispose).toHaveBeenLastCalledWith(current);
  });
});

describe("monolith world: absolute rendering state and owned resources", () => {
  const quality = {
    tier: "desktop" as const,
    dpr: 1,
    particles: 32,
    transmission: true,
  };
  it.each(["desktop", "mobile"] as const)(
    "keeps the %s staging surface transparent so it cannot paint a rectangular horizon",
    (tier) => {
      const world = new MonolithWorld({ ...quality, tier });
      try {
        const surfaces: THREE.Material[] = [];
        world.scene.traverse((object) => {
          const mesh = object as THREE.Mesh;
          if (mesh.visible && mesh.geometry?.type === "PlaneGeometry")
            surfaces.push(
              ...(Array.isArray(mesh.material)
                ? mesh.material
                : [mesh.material]),
            );
        });
        expect(surfaces.length).toBeGreaterThan(0);
        for (const surface of surfaces) {
          expect(surface.transparent).toBe(true);
          expect(surface.depthWrite).toBe(false);
        }
      } finally {
        world.dispose();
      }
    },
  );
  const frame = (
    progress: number,
    extra: Partial<FrameState> = {},
  ): FrameState => ({
    progress,
    time: progress * 6,
    pointer: [0.2, -0.15],
    reducedMotion: false,
    finale: false,
    impulse: 0,
    ...extra,
  });
  const transforms = (world: MonolithWorld) => {
    world.scene.updateMatrixWorld(true);
    world.camera.updateMatrixWorld(true);
    const values: number[] = [
      ...world.camera.matrixWorld.elements,
      ...world.camera.projectionMatrix.elements,
    ];
    world.scene.traverse((object) =>
      values.push(...object.matrixWorld.elements),
    );
    return values;
  };

  it("returns to exactly the same scene and camera after the opening and fly-through", () => {
    const world = new MonolithWorld(quality);
    try {
      world.fit(900, 800);
      world.update(frame(0.42));
      const before = transforms(world);
      world.update(frame(0.95));
      const inside = transforms(world);
      expect(inside).not.toEqual(before);
      expect(inside.every(Number.isFinite)).toBe(true);
      world.update(frame(1));
      world.update(frame(0));
      world.update(frame(0.42));
      expect(transforms(world)).toEqual(before);
    } finally {
      world.dispose();
    }
  });

  it("uses stable completed compositions for reduced motion at narrow and wide sizes", () => {
    const world = new MonolithWorld(quality);
    try {
      for (const [width, height] of [
        [360, 720],
        [1920, 900],
      ]) {
        world.fit(width, height);
        for (const finale of [false, true]) {
          world.update(frame(0, { reducedMotion: true, finale }));
          const still = transforms(world);
          world.update(
            frame(1, {
              reducedMotion: true,
              finale,
              pointer: [-1, 1],
              impulse: 1,
            }),
          );
          expect(transforms(world)).toEqual(still);
          expect(still.every(Number.isFinite)).toBe(true);
          expect(world.camera.near).toBeGreaterThan(0);
          expect(world.camera.far).toBeGreaterThan(world.camera.near);
        }
      }
    } finally {
      world.dispose();
    }
  });

  it("disposes each owned geometry once and never disposes the renderer-owned environment", () => {
    const world = new MonolithWorld(quality);
    const environment = new THREE.Texture();
    const externalDispose = vi.spyOn(environment, "dispose");
    world.scene.environment = environment;
    const geometryDisposals = new Map<
      THREE.BufferGeometry,
      ReturnType<typeof vi.spyOn>
    >();
    world.scene.traverse((object) => {
      const geometry = (object as THREE.Mesh).geometry;
      if (geometry && !geometryDisposals.has(geometry))
        geometryDisposals.set(geometry, vi.spyOn(geometry, "dispose"));
    });
    expect(geometryDisposals.size).toBeGreaterThan(10);
    world.dispose();
    world.dispose();
    geometryDisposals.forEach((dispose) =>
      expect(dispose).toHaveBeenCalledTimes(1),
    );
    expect(externalDispose).not.toHaveBeenCalled();
    externalDispose.mockRestore();
    environment.dispose();
  });
});

describe("watch accessibility: explicit controls override automatic reduced-motion pose", () => {
  it("lets a visitor manually assemble/disassemble the real GLB with reduced motion enabled", async () => {
    const bytes = readFileSync(
      new URL(
        "../docs/design/review-v2/assets/pocket-watch.glb",
        import.meta.url,
      ),
    );
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    const gltf = await new GLTFLoader().parseAsync(buffer, "");
    const parts = sourceWatchParts as unknown as WatchPart[];
    const modelSpy = vi
      .spyOn(modelAssets, "acquire")
      .mockReturnValue({ promise: Promise.resolve(gltf), release: vi.fn() });
    const partsSpy = vi
      .spyOn(watchManifests, "acquire")
      .mockReturnValue({ promise: Promise.resolve(parts), release: vi.fn() });
    const world = await TimepieceWorld.create({
      resolveAsset: (path) => path,
      quality: { tier: "desktop", dpr: 1, particles: 0, transmission: true },
    });
    try {
      const part = parts.find((entry) => entry.id === "dial_face")!;
      const dial = world.scene.getObjectByName(part.nodeName)!;
      const reduced = {
        progress: 0.9,
        time: 0,
        pointer: [1, 1] as [number, number],
        reducedMotion: true,
        finale: false,
        impulse: 0,
      };
      world.update(reduced);
      expect(dial.position.toArray()).toEqual(
        sampleWatchPart(part, 0.4).position,
      );
      world.update({ ...reduced, manual: true, progress: 0 });
      expect(dial.position.toArray()).toEqual(part.restPosition);
      world.update({ ...reduced, manual: true, progress: 1 });
      expect(dial.position.toArray()).toEqual(
        sampleWatchPart(part, 1).position,
      );
      world.update({ ...reduced, manual: true, progress: 0.25 });
      expect(dial.position.toArray()).toEqual(
        sampleWatchPart(part, 0.25).position,
      );
    } finally {
      world.dispose();
      disposeTree(gltf.scene);
      modelSpy.mockRestore();
      partsSpy.mockRestore();
    }
  });
});
