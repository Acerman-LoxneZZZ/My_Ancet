export type NavigationRequest = {
  key: string;
  path: string;
  kind: "push" | "replace" | "pop";
  scroll: "top" | "restore" | { project: string };
  payload?: unknown;
};
type State = "idle" | "covering" | "swapping" | "uncovering" | "disposed";
type Hooks = {
  cover: (request: NavigationRequest) => Promise<void>;
  swap: (request: NavigationRequest) => Promise<void>;
  uncover: () => Promise<void>;
  onError: (error: unknown) => void;
};
export function createTransitionController(hooks: Hooks) {
  let state: State = "idle";
  let queued: NavigationRequest | undefined;
  let active: NavigationRequest | undefined;
  let disposed = false;
  async function run() {
    if (disposed || state !== "idle" || !queued) return;
    try {
      state = "covering";
      await hooks.cover(queued);
      while (queued && !disposed) {
        active = queued;
        queued = undefined;
        state = "swapping";
        await hooks.swap(active);
      }
      if (!disposed) {
        state = "uncovering";
        await hooks.uncover();
      }
    } catch (error) {
      queued = undefined;
      if (!disposed) {
        hooks.onError(error);
        try {
          await hooks.uncover();
        } catch {
          /* onError owns the visual fallback */
        }
      }
    } finally {
      active = undefined;
      if (!disposed) {
        state = "idle";
        if (queued) void run();
      }
    }
  }
  return {
    get state() {
      return state;
    },
    request(req: NavigationRequest) {
      if (disposed) return;
      const previous = queued || active;
      if (
        previous?.path === req.path &&
        previous.kind === req.kind &&
        (req.kind !== "pop" || previous.key === req.key)
      )
        return;
      queued = req;
      void run();
    },
    dispose() {
      disposed = true;
      queued = undefined;
      active = undefined;
      state = "disposed";
    },
  };
}
