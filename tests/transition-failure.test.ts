import { describe, expect, it, vi } from "vitest";
import { createTransitionController } from "../src/navigation/TransitionController";

const flush = async () => {
  for (let i = 0; i < 32; i++) await Promise.resolve();
};

describe("persistent transition failure", () => {
  it("abandons a failed cover instead of retrying the same click indefinitely", async () => {
    const failure = new Error("Cover cannot be rendered");
    const cover = vi.fn(async () => {
      throw failure;
    });
    const swap = vi.fn(async () => {});
    const uncover = vi.fn(async () => {});
    let errors = 0;
    let controller: ReturnType<typeof createTransitionController>;
    const onError = vi.fn(() => {
      errors++;
      // Bound the RED run even if the controller recursively retries forever.
      if (errors === 3) controller.dispose();
    });
    controller = createTransitionController({ cover, swap, uncover, onError });
    try {
      controller.request({
        key: "one-user-click",
        path: "/work/faro",
        kind: "push",
        scroll: "top",
      });
      await flush();
      expect(cover).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledExactlyOnceWith(failure);
      expect(swap).not.toHaveBeenCalled();
      expect(uncover).toHaveBeenCalledTimes(1);
      expect(controller.state).toBe("idle");
    } finally {
      controller.dispose();
    }
  });
});
