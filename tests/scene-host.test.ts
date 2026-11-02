import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  effect: undefined as undefined | (() => undefined | (() => void)),
  refIndex: 0,
  attempt: 0,
  pmremFails: false,
  canvas: {} as any,
  anchors: [] as any[],
  ticks: new Set<() => void>(),
  renderer: {} as any,
  createWorld: vi.fn(),
  worlds: new Map<string, any>(),
}));
vi.mock("react", async () => ({
  ...(await vi.importActual<any>("react")),
  useRef: () => ({
    current: harness.refIndex++ === 0 ? harness.canvas : undefined,
  }),
  useState: (value: unknown) => [
    value === 0 ? harness.attempt : value,
    vi.fn(),
  ],
  useEffect: (effect: () => () => void) => {
    harness.effect = effect;
  },
}));
vi.mock("gsap", () => ({
  gsap: {
    ticker: {
      add: (fn: () => void) => harness.ticks.add(fn),
      remove: (fn: () => void) => harness.ticks.delete(fn),
    },
  },
}));
vi.mock("../src/experience/worlds", () => ({
  createWorld: harness.createWorld,
}));
vi.mock("../src/experience/domStory", () => ({
  chapterMetrics: () => ({ chapters: {}, maxY: 10000 }),
  currentSnapshot: () => ({ y: 0 }),
}));
vi.mock("three/addons/environments/RoomEnvironment.js", () => ({
  RoomEnvironment: class {
    dispose() {}
  },
}));
vi.mock("three", async () => ({
  ...(await vi.importActual<any>("three")),
  WebGLRenderer: class {
    constructor() {
      return harness.renderer;
    }
  },
  PMREMGenerator: class {
    // PMREM's offscreen background pass can leave the renderer clear state opaque.
    fromScene() {
      if (harness.pmremFails) throw Error("GPU environment allocation failed");
      harness.renderer.alpha = 1;
      return { texture: {}, dispose: vi.fn() };
    }
    dispose() {}
  },
}));
import SceneHost from "../src/app/SceneHost";

const settle = async () => {
  for (let i = 0; i < 24; i++) await Promise.resolve();
};
const tick = () => {
  for (const fn of harness.ticks) fn();
};
let cleanup: undefined | (() => void);
let events: EventTarget;
function mount() {
  harness.refIndex = 0;
  SceneHost();
  cleanup = harness.effect?.() || undefined;
}
function anchor(id: string, top = 0) {
  const value = {
    dataset: { world: id } as Record<string, string>,
    style: { setProperty: vi.fn() },
    getBoundingClientRect: () => ({
      top,
      bottom: top + 500,
      left: 0,
      right: 500,
      width: 500,
      height: 500,
    }),
    hasAttribute: () => false,
    closest: () => null,
  };
  return value;
}
function world() {
  return {
    scene: { environment: null },
    camera: {},
    fit: vi.fn(),
    update: vi.fn(),
    setQuality: vi.fn(),
    dispose: vi.fn(),
  };
}

beforeEach(() => {
  events = new EventTarget();
  harness.attempt = 0;
  harness.pmremFails = false;
  harness.ticks.clear();
  harness.worlds.clear();
  harness.createWorld.mockReset();
  harness.canvas = Object.assign(new EventTarget(), { dataset: {} });
  harness.anchors = [];
  harness.renderer = {
    alpha: 0,
    autoClear: true,
    setClearColor: vi.fn((_color: number, alpha: number) => {
      harness.renderer.alpha = alpha;
    }),
    setPixelRatio: vi.fn(),
    setSize: vi.fn(),
    setViewport: vi.fn(),
    setScissor: vi.fn(),
    setScissorTest: vi.fn(),
    clear: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    info: { render: { calls: 1 }, memory: { geometries: 1, textures: 1 } },
  };
  harness.createWorld.mockImplementation(async (id: string) => {
    const value = world();
    harness.worlds.set(id, value);
    return value;
  });
  vi.stubGlobal("window", globalThis);
  vi.stubGlobal("innerWidth", 1000);
  vi.stubGlobal("innerHeight", 800);
  vi.stubGlobal("devicePixelRatio", 1);
  vi.stubGlobal("scrollY", 0);
  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubGlobal("navigator", { connection: { saveData: false } });
  vi.stubGlobal("location", { search: "" });
  vi.stubGlobal("document", {
    hidden: false,
    body: {},
    documentElement: { dataset: {} },
    querySelector: () => null,
    querySelectorAll: (selector: string) =>
      selector.startsWith(".scene-anchor") ? harness.anchors : [],
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  vi.stubGlobal("addEventListener", events.addEventListener.bind(events));
  vi.stubGlobal("removeEventListener", events.removeEventListener.bind(events));
  vi.stubGlobal("matchMedia", () =>
    Object.assign(new EventTarget(), { matches: false }),
  );
  vi.stubGlobal(
    "MutationObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  vi.unstubAllGlobals();
});

describe("SceneHost failure recovery and transparent shared canvas", () => {
  it("keeps one procedural monolith for the renderer lifetime through repeated case/gallery visits", async () => {
    harness.anchors = [anchor("monolith"), anchor("timepiece", 1000)];
    mount();
    tick();
    await settle();
    tick();
    const resident = harness.worlds.get("monolith");
    for (let i = 0; i < 4; i++) {
      harness.anchors = [anchor("timepiece")];
      events.dispatchEvent(new Event("portfolio:navigated"));
      tick();
      await settle();
      tick();
      harness.anchors = [anchor("monolith"), anchor("timepiece", 1000)];
      events.dispatchEvent(new Event("portfolio:navigated"));
      tick();
      await settle();
      tick();
    }
    expect(
      harness.createWorld.mock.calls.filter(([id]) => id === "monolith"),
    ).toHaveLength(1);
    expect(resident.dispose).not.toHaveBeenCalled();
    cleanup?.();
    cleanup = undefined;
    expect(resident.dispose).toHaveBeenCalledTimes(1);
  });
  it("keeps the static app mounted and releases the renderer if environment generation fails", () => {
    harness.pmremFails = true;
    harness.anchors = [anchor("monolith")];
    expect(mount).not.toThrow();
    expect(harness.renderer.dispose).toHaveBeenCalledTimes(1);
    expect(harness.ticks.size).toBe(0);
    expect(harness.createWorld).not.toHaveBeenCalled();
  });
  it("applies the development reduced-motion override to both quality and absolute world updates", async () => {
    location.search = "?motion=reduce";
    harness.anchors = [anchor("monolith")];
    mount();
    tick();
    await settle();
    tick();
    expect(document.documentElement.dataset.motion).toBe("reduced");
    expect(harness.createWorld.mock.calls[0][1].quality).toMatchObject({
      tier: "low",
      particles: 0,
      transmission: false,
    });
    expect(harness.worlds.get("monolith").update).toHaveBeenLastCalledWith(
      expect.objectContaining({ reducedMotion: true, pointer: [0, 0] }),
    );
  });
  it("injects one development world failure but lets the explicit retry succeed", async () => {
    location.search = "?fail-world=timepiece";
    harness.anchors = [anchor("timepiece")];
    mount();
    tick();
    await settle();
    expect(harness.anchors[0].dataset.worldError).toBe("true");
    expect(harness.createWorld).not.toHaveBeenCalled();
    cleanup?.();
    cleanup = undefined;
    harness.attempt = 1;
    mount();
    tick();
    await settle();
    tick();
    expect(harness.createWorld).toHaveBeenCalledTimes(1);
    expect(harness.anchors[0].dataset.worldReady).toBe("true");
  });
  it("does not request a failed prefetched world on every subsequent pointer/scroll frame", async () => {
    harness.anchors = [anchor("monolith"), anchor("timepiece", 1000)];
    harness.createWorld.mockImplementation(async (id: string) => {
      if (id === "timepiece") throw Error("offline");
      return world();
    });
    mount();
    tick();
    await settle();
    for (let i = 0; i < 5; i++) {
      events.dispatchEvent(new Event("scroll"));
      tick();
      await settle();
    }
    expect(
      harness.createWorld.mock.calls.filter(([id]) => id === "timepiece"),
    ).toHaveLength(1);
  });
  it("allows an explicit new attempt to load the same direct case after an earlier failure", async () => {
    harness.anchors = [anchor("timepiece")];
    harness.createWorld
      .mockRejectedValueOnce(Error("offline"))
      .mockResolvedValue(world());
    mount();
    tick();
    await settle();
    expect(harness.anchors[0].dataset.worldError).toBe("true");
    cleanup?.();
    cleanup = undefined;
    mount();
    tick();
    await settle();
    tick();
    expect(harness.createWorld).toHaveBeenCalledTimes(2);
    expect(harness.anchors[0].dataset.worldError).toBeUndefined();
    expect(harness.anchors[0].dataset.worldReady).toBe("true");
  });
  it("clears the full canvas transparently after PMREM before rendering a scissored world", async () => {
    harness.anchors = [anchor("monolith")];
    mount();
    tick();
    await settle();
    tick();
    expect(harness.renderer.alpha).toBe(0);
    expect(harness.renderer.autoClear).toBe(false);
    expect(harness.renderer.setViewport).toHaveBeenCalledWith(0, 0, 1000, 800);
    expect(harness.renderer.render).toHaveBeenCalledTimes(1);
  });
  it("restores the fallback of the previously active anchor when the shared canvas moves", async () => {
    const first = anchor("timepiece"),
      second = anchor("timepiece", 1000);
    harness.anchors = [first, second];
    mount();
    tick();
    await settle();
    tick();
    expect(first.dataset.worldReady).toBe("true");
    first.getBoundingClientRect = () => ({
      top: -500,
      bottom: 0,
      left: 0,
      right: 500,
      width: 500,
      height: 500,
    });
    second.getBoundingClientRect = () => ({
      top: 0,
      bottom: 500,
      left: 0,
      right: 500,
      width: 500,
      height: 500,
    });
    events.dispatchEvent(new Event("scroll"));
    tick();
    expect(first.dataset.worldReady).toBeUndefined();
    expect(second.dataset.worldReady).toBe("true");
  });
});
