export type AssetLease<T> = { promise: Promise<T>; release(): void };
export type AssetManagerOptions<T> = {
  load(key: string): Promise<T>;
  dispose(asset: T): void;
};

type Entry<T> = {
  promise: Promise<T>;
  references: number;
  active: boolean;
  ready: boolean;
  disposed: boolean;
  asset?: T;
};

/** Reference-counted assets. An entry's identity also protects a newer generation. */
export class AssetManager<T> {
  private entries = new Map<string, Entry<T>>();

  constructor(private options: AssetManagerOptions<T>) {}

  acquire(key: string): AssetLease<T> {
    let entry = this.entries.get(key);
    if (!entry) {
      const created: Entry<T> = {
        promise: undefined as unknown as Promise<T>,
        references: 0,
        active: true,
        ready: false,
        disposed: false,
      };
      created.promise = Promise.resolve()
        .then(() => this.options.load(key))
        .then(
          (asset) => {
            created.asset = asset;
            created.ready = true;
            if (!created.active) this.disposeReady(created);
            return asset;
          },
          (error: unknown) => {
            this.evict(key, created);
            throw error;
          },
        );
      this.entries.set(key, created);
      entry = created;
    }
    entry.references++;
    const owned = entry;
    let released = false;
    return {
      promise: owned.promise,
      release: () => {
        if (released) return;
        released = true;
        if (!owned.active) return;
        if (--owned.references === 0) this.evict(key, owned);
      },
    };
  }

  disposeAll(): void {
    // Delete each identity before disposal; stale leases can never delete a new one.
    for (const [key, entry] of [...this.entries]) this.evict(key, entry);
  }

  private evict(key: string, entry: Entry<T>): void {
    entry.active = false;
    if (this.entries.get(key) === entry) this.entries.delete(key);
    this.disposeReady(entry);
  }

  private disposeReady(entry: Entry<T>): void {
    if (!entry.ready || entry.disposed) return;
    entry.disposed = true;
    this.options.dispose(entry.asset as T);
  }
}
