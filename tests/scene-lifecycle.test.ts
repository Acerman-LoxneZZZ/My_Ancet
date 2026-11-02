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
import { describe, expect, it, vi } from 'vitest';
import { AssetManager } from '../src/experience/AssetManager';

type Asset = { name: string };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

describe('AssetManager: shared scene resources', () => {
  it('coalesces concurrent loads, retains the asset for the remaining consumer, and disposes on the last release', async () => {
    const pending = deferred<Asset>();
    const load = vi.fn(() => pending.promise);
    const dispose = vi.fn();
    const manager = new AssetManager<Asset>({ load, dispose });
    const first = manager.acquire('watch');
    const second = manager.acquire('watch');
    expect(first.promise).toBe(second.promise);
    await Promise.resolve();
    expect(load).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledWith('watch');

    first.release();
    first.release();
    const asset = { name: 'watch' };
    pending.resolve(asset);
    expect(await second.promise).toBe(asset);
    expect(dispose).not.toHaveBeenCalled();

    const third = manager.acquire('watch');
    expect(await third.promise).toBe(asset);
    expect(load).toHaveBeenCalledTimes(1);
    second.release();
    expect(dispose).not.toHaveBeenCalled();
    third.release();
    third.release();
    manager.disposeAll();
    expect(dispose).toHaveBeenCalledExactlyOnceWith(asset);
  });

  it('disposes an abandoned pending result and loads afresh after it resolves', async () => {
    const abandoned = deferred<Asset>();
    const replacement = { name: 'new watch' };
    const load = vi.fn<((key: string) => Promise<Asset>)>()
      .mockImplementationOnce(() => abandoned.promise)
      .mockResolvedValueOnce(replacement);
    const dispose = vi.fn();
    const manager = new AssetManager<Asset>({ load, dispose });
    const first = manager.acquire('watch');
    await Promise.resolve();
    first.release();
    first.release();
    expect(dispose).not.toHaveBeenCalled();
    const lateAsset = { name: 'abandoned watch' };
    abandoned.resolve(lateAsset);
    expect(await first.promise).toBe(lateAsset);
    expect(dispose).toHaveBeenCalledExactlyOnceWith(lateAsset);

    const next = manager.acquire('watch');
    expect(await next.promise).toBe(replacement);
    expect(load).toHaveBeenCalledTimes(2);
    expect(dispose).toHaveBeenCalledTimes(1);
    next.release();
    expect(dispose).toHaveBeenCalledTimes(2);
    expect(dispose).toHaveBeenLastCalledWith(replacement);
  });

  it('does not let an old late result or stale release evict a newer load of the same key', async () => {
    const oldLoad = deferred<Asset>();
    const newLoad = deferred<Asset>();
    const load = vi.fn<((key: string) => Promise<Asset>)>()
      .mockImplementationOnce(() => oldLoad.promise)
      .mockImplementationOnce(() => newLoad.promise);
    const dispose = vi.fn();
    const manager = new AssetManager<Asset>({ load, dispose });
    const oldLease = manager.acquire('faro');
    await Promise.resolve();
    oldLease.release();
    const newLease = manager.acquire('faro');
    await Promise.resolve();
    expect(load).toHaveBeenCalledTimes(2);

    const current = { name: 'current pizza' };
    newLoad.resolve(current);
    expect(await newLease.promise).toBe(current);
    const stale = { name: 'stale pizza' };
    oldLoad.resolve(stale);
    await oldLease.promise;
    oldLease.release();
    expect(dispose).toHaveBeenCalledExactlyOnceWith(stale);

    const extra = manager.acquire('faro');
    expect(await extra.promise).toBe(current);
    expect(load).toHaveBeenCalledTimes(2);
    newLease.release();
    expect(dispose).toHaveBeenCalledTimes(1);
    extra.release();
    expect(dispose).toHaveBeenCalledTimes(2);
    expect(dispose).toHaveBeenLastCalledWith(current);
  });

  it('evicts a rejected load and permits retry without waiting for failed consumers to release', async () => {
    const pending = deferred<Asset>();
    const good = { name: 'recovered watch' };
    const load = vi.fn<((key: string) => Promise<Asset>)>()
      .mockImplementationOnce(() => pending.promise)
      .mockResolvedValueOnce(good);
    const dispose = vi.fn();
    const manager = new AssetManager<Asset>({ load, dispose });
    const failed = manager.acquire('watch');
    const alsoFailed = manager.acquire('watch');
    const error = new Error('GLB request failed');
    const observed = expect(failed.promise).rejects.toBe(error);
    pending.reject(error);
    await observed;
    expect(alsoFailed.promise).toBe(failed.promise);
    expect(dispose).not.toHaveBeenCalled();

    const retry = manager.acquire('watch');
    expect(await retry.promise).toBe(good);
    expect(load).toHaveBeenCalledTimes(2);
    failed.release();
    alsoFailed.release();
    expect(dispose).not.toHaveBeenCalled();
    retry.release();
    expect(dispose).toHaveBeenCalledExactlyOnceWith(good);
  });

  it('keeps unrelated world assets independent', async () => {
    const watch = { name: 'watch' };
    const pizza = { name: 'pizza' };
    const load = vi.fn(async (key: string) => key === 'watch' ? watch : pizza);
    const dispose = vi.fn();
    const manager = new AssetManager<Asset>({ load, dispose });
    const watchLease = manager.acquire('watch');
    const pizzaLease = manager.acquire('faro');
    expect(await watchLease.promise).toBe(watch);
    expect(await pizzaLease.promise).toBe(pizza);
    watchLease.release();
    expect(dispose).toHaveBeenCalledExactlyOnceWith(watch);
    const pizzaAgain = manager.acquire('faro');
    expect(await pizzaAgain.promise).toBe(pizza);
    expect(load).toHaveBeenCalledTimes(2);
    pizzaLease.release();
    expect(dispose).toHaveBeenCalledTimes(1);
    pizzaAgain.release();
    expect(dispose).toHaveBeenCalledTimes(2);
    expect(dispose).toHaveBeenLastCalledWith(pizza);
  });

  it('disposeAll disposes ready resources once and ignores all subsequent stale releases', async () => {
    const watch = { name: 'watch' };
    const pizza = { name: 'pizza' };
    const load = vi.fn(async (key: string) => key === 'watch' ? watch : pizza);
    const dispose = vi.fn();
    const manager = new AssetManager<Asset>({ load, dispose });
    const first = manager.acquire('watch');
    const second = manager.acquire('watch');
    const third = manager.acquire('faro');
    await Promise.all([first.promise, second.promise, third.promise]);
    manager.disposeAll();
    manager.disposeAll();
    first.release(); second.release(); third.release();
    first.release(); manager.disposeAll();
    expect(dispose).toHaveBeenCalledTimes(2);
    expect(dispose.mock.calls.filter(([asset]) => asset === watch)).toHaveLength(1);
    expect(dispose.mock.calls.filter(([asset]) => asset === pizza)).toHaveLength(1);
  });

  it('disposeAll isolates pending generations, remains reusable and disposes late assets exactly once', async () => {
    const oldLoad = deferred<Asset>();
    const newLoad = deferred<Asset>();
    const load = vi.fn<((key: string) => Promise<Asset>)>()
      .mockImplementationOnce(() => oldLoad.promise)
      .mockImplementationOnce(() => newLoad.promise);
    const dispose = vi.fn();
    const manager = new AssetManager<Asset>({ load, dispose });
    const oldLease = manager.acquire('watch');
    await Promise.resolve();
    manager.disposeAll();
    manager.disposeAll();
    oldLease.release();
    expect(dispose).not.toHaveBeenCalled();
    const newLease = manager.acquire('watch');
    const stale = { name: 'old world' };
    const current = { name: 'new world' };
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
