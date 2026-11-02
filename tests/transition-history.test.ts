import { describe, expect, it, vi } from "vitest";
import {
  createTransitionController,
  type NavigationRequest,
} from "../src/navigation/TransitionController";

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
const flush = async () => {
  for (let i = 0; i < 16; i++) await Promise.resolve();
};
const pop = (key: string): NavigationRequest => ({
  key,
  path: "/",
  kind: "pop",
  scroll: "restore",
  payload: { pathname: "/", key },
});

describe("history identity during a page transition", () => {
  it.each(["covering", "swapping"] as const)(
    "preserves a newer POP to a different entry with the same URL while %s",
    async (phase) => {
      const gate = deferred();
      const swapped: NavigationRequest[] = [];
      const uncover = vi.fn(async () => {});
      const controller = createTransitionController({
        cover: () => (phase === "covering" ? gate.promise : Promise.resolve()),
        swap: async (request) => {
          swapped.push(request);
          if (phase === "swapping" && swapped.length === 1) await gate.promise;
        },
        uncover,
        onError: vi.fn(),
      });
      try {
        // The two '/' entries represent distinct gallery visits and scroll memories.
        controller.request(pop("home-before-timepiece"));
        await flush();
        expect(controller.state).toBe(phase);
        controller.request(pop("home-before-faro"));
        gate.resolve();
        await flush();
        expect(swapped.at(-1)).toMatchObject({
          key: "home-before-faro",
          path: "/",
          kind: "pop",
          payload: { pathname: "/", key: "home-before-faro" },
        });
        expect(swapped).toHaveLength(phase === "covering" ? 1 : 2);
        expect(uncover).toHaveBeenCalledTimes(1);
        expect(controller.state).toBe("idle");
      } finally {
        controller.dispose();
      }
    },
  );
});
