import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { gsap } from "gsap";
import { createWorld } from "../experience/worlds";
import { AssetManager, type AssetLease } from "../experience/AssetManager";
import { chooseQuality, lowerQuality } from "../experience/QualityManager";
import {
  clamp01,
  getChapterProgress,
  mapViewportChange,
} from "../experience/story";
import { chapterMetrics, currentSnapshot } from "../experience/domStory";
import type { WorldId, WorldInstance, FrameState } from "../experience/types";

export default function SceneHost() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const element = canvas.current!;
    let disposed = false,
      lost = false,
      dirty = true;
    let renderer!: THREE.WebGLRenderer, environment: THREE.WebGLRenderTarget;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    const devParams = import.meta.env.DEV
      ? new URLSearchParams(location.search)
      : null;
    const reducedMotion = () =>
      motion.matches || devParams?.get("motion") === "reduce";
    let quality = chooseQuality({
      width: innerWidth,
      dpr: devicePixelRatio,
      saveData: !!connection?.saveData,
      reducedMotion: reducedMotion(),
    });
    try {
      if (devParams?.has("no-webgl")) throw Error("Requested WebGL fallback");
      renderer = new THREE.WebGLRenderer({
        canvas: element,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
      renderer.setClearColor(0x080b10, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.9;
      renderer.setPixelRatio(quality.dpr);
      renderer.setSize(innerWidth, innerHeight, false);
      const room = new RoomEnvironment();
      let pmrem: THREE.PMREMGenerator | undefined;
      try {
        pmrem = new THREE.PMREMGenerator(renderer);
        environment = pmrem.fromScene(room, 0.04);
      } finally {
        room.dispose();
        pmrem?.dispose();
      }
      renderer.setClearColor(0x080b10, 0);
      renderer.autoClear = false;
      setError(false);
    } catch (cause) {
      renderer?.dispose();
      console.info("Static presentation is active", cause);
      setError(true);
      return;
    }
    const manager = new AssetManager<WorldInstance>({
      load: (key) => {
        if (
          import.meta.env.DEV &&
          attempt === 0 &&
          devParams?.get("fail-world") === key
        )
          return Promise.reject(
            Error(`Requested first-attempt failure: ${key}`),
          );
        return createWorld(key as WorldId, {
          quality,
          resolveAsset: (path) => `/assets/${path}`,
        });
      },
      dispose: (world) => world.dispose(),
    });
    const entries = new Map<
      WorldId,
      { lease: AssetLease<WorldInstance>; world?: WorldInstance }
    >();
    // Failure is scoped to this explicit renderer attempt, including prefetches.
    const failed = new Set<WorldId>();
    let anchors: HTMLElement[] = [],
      metrics = chapterMetrics(),
      lastSnapshot = currentSnapshot();
    let active: HTMLElement | undefined;
    let lastAnchor: HTMLElement | undefined;
    let lastSize = "";
    let lastY = -1;
    let pointer: [number, number] = [0, 0],
      target: [number, number] = [0, 0],
      pulseAt = -100;
    let frameCount = 0,
      slowFrames = 0,
      lastRenderStart: number | undefined;
    const cpuSamples: Array<{ at: number; ms: number }> = [],
      intervalSamples: Array<{ at: number; ms: number }> = [];
    const acquire = (id: WorldId) => {
      if (entries.has(id) || failed.has(id)) return;
      const entry = {
        lease: manager.acquire(id),
        world: undefined as WorldInstance | undefined,
      };
      entries.set(id, entry);
      entry.lease.promise
        .then((world) => {
          if (disposed || entries.get(id) !== entry) return;
          entry.world = world;
          world.scene.background = null;
          world.scene.environment = environment.texture;
          world.setQuality(quality);
          dirty = true;
        })
        .catch((cause) => {
          if (disposed || entries.get(id) !== entry) return;
          failed.add(id);
          entry.lease.release();
          entries.delete(id);
          console.error(`Scene ${id}`, cause);
          anchors
            .filter((a) => a.dataset.world === id)
            .forEach((a) => (a.dataset.worldError = "true"));
          setError(true);
        });
    };
    const refresh = () => {
      anchors = [
        ...document.querySelectorAll<HTMLElement>(".scene-anchor[data-world]"),
      ];
      metrics = chapterMetrics();
      lastSnapshot = currentSnapshot();
      anchors.forEach((a) => {
        if (failed.has(a.dataset.world as WorldId))
          a.dataset.worldError = "true";
        else delete a.dataset.worldError;
      });
      const present = new Set(anchors.map((a) => a.dataset.world as WorldId));
      // Keep the small procedural world on the renderer's lifetime: Three r187
      // caches transmission targets by Scene/camera without a public scene-release
      // API. Reusing this identity prevents allocation growth across route visits.
      for (const [id, entry] of entries)
        if (id !== "monolith" && !present.has(id)) {
          entry.lease.release();
          entries.delete(id);
        }
      dirty = true;
      lastAnchor = undefined;
      lastSize = "";
    };
    const onScroll = () => {
      dirty = true;
    };
    const resize = () => {
      const snapshot = lastSnapshot;
      renderer.setSize(innerWidth, innerHeight, false);
      const next = chooseQuality({
        width: innerWidth,
        dpr: devicePixelRatio,
        saveData: !!connection?.saveData,
        reducedMotion: reducedMotion(),
      });
      quality = next;
      renderer.setPixelRatio(quality.dpr);
      entries.forEach((e) => e.world?.setQuality(quality));
      refresh();
      window.scrollTo({
        top: mapViewportChange(snapshot, metrics),
        behavior: "instant",
      });
      lastSize = "";
      dirty = true;
    };
    const mode = () => {
      document.documentElement.dataset.motion = reducedMotion()
        ? "reduced"
        : "full";
      resize();
    };
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || reducedMotion() || !active) return;
      const r = active.getBoundingClientRect();
      target = [
        THREE.MathUtils.clamp(
          ((event.clientX - r.left) / r.width) * 2 - 1,
          -1,
          1,
        ),
        THREE.MathUtils.clamp(
          ((event.clientY - r.top) / r.height) * 2 - 1,
          -1,
          1,
        ),
      ];
      dirty = true;
    };
    const onPress = (event: PointerEvent) => {
      if (!active || active.dataset.world !== "monolith") return;
      const r = active.getBoundingClientRect();
      if (
        event.clientX >= r.left &&
        event.clientX <= r.right &&
        event.clientY >= r.top &&
        event.clientY <= r.bottom
      ) {
        pulseAt = performance.now() / 1000;
        dirty = true;
      }
    };
    const visibility = () => {
      if (document.hidden) gsap.ticker.remove(tick);
      else {
        dirty = true;
        gsap.ticker.add(tick);
      }
    };
    const tick = () => {
      if (
        disposed ||
        lost ||
        document.hidden ||
        document.querySelector("dialog[open]")
      )
        return;
      const begin = performance.now();
      const now = begin / 1000;
      const moving =
        Math.abs(pointer[0] - target[0]) + Math.abs(pointer[1] - target[1]) >
        0.001;
      if (moving) {
        pointer = [
          pointer[0] + (target[0] - pointer[0]) * 0.12,
          pointer[1] + (target[1] - pointer[1]) * 0.12,
        ];
        dirty = true;
      }
      const impulse = reducedMotion() ? 0 : Math.exp(-(now - pulseAt) * 3);
      if (impulse > 0.005) dirty = true;
      if (!dirty && lastY === scrollY) return;
      dirty = false;
      lastY = scrollY;
      let best = -Infinity;
      active = undefined;
      for (const anchor of anchors) {
        const r = anchor.getBoundingClientRect();
        const shown = Math.min(innerHeight, r.bottom) - Math.max(0, r.top);
        if (shown < 24 || r.width < 1) continue;
        const score =
          shown / r.height -
          (Math.abs((r.top + r.bottom) / 2 - innerHeight / 2) / innerHeight) *
            0.25;
        if (score > best) {
          best = score;
          active = anchor;
        }
      }
      document
        .querySelectorAll<HTMLElement>("[data-chapter]")
        .forEach((chapter) => {
          const m = metrics.chapters[chapter.dataset.chapter!];
          if (!m) return;
          chapter.style.setProperty(
            "--progress",
            getChapterProgress(scrollY, m).toFixed(4),
          );
        });
      lastSnapshot = currentSnapshot();
      // PMREM and offscreen reflections can change renderer state. The shared
      // canvas always starts with a transparent full-frame clear.
      renderer.setClearColor(0x080b10, 0);
      renderer.setViewport(0, 0, innerWidth, innerHeight);
      renderer.setScissorTest(false);
      renderer.clear();
      anchors.forEach((a) => {
        if (a !== active) delete a.dataset.worldReady;
      });
      delete element.dataset.ready;
      delete element.dataset.world;
      if (!active) return;
      const id = active.dataset.world as WorldId;
      const index = anchors.indexOf(active);
      const nextId = anchors
        .slice(index + 1)
        .find((a) => a.dataset.world !== id)?.dataset.world as
        | WorldId
        | undefined;
      const keep = new Set([
        id,
        ...(!connection?.saveData && nextId ? [nextId] : []),
      ]);
      for (const [key, entry] of entries)
        if (key !== "monolith" && !keep.has(key)) {
          entry.lease.release();
          entries.delete(key);
          anchors
            .filter((a) => a.dataset.world === key)
            .forEach((a) => delete a.dataset.worldReady);
        }
      acquire(id);
      if (nextId && !connection?.saveData) acquire(nextId);
      const world = entries.get(id)?.world;
      if (!world) {
        delete active.dataset.worldReady;
        return;
      }
      const rect = active.getBoundingClientRect();
      const chapter = active.closest<HTMLElement>("[data-chapter]");
      const interval = chapter && metrics.chapters[chapter.dataset.chapter!];
      let progress = interval ? getChapterProgress(scrollY, interval) : 0.36;
      const manual = active.hasAttribute("data-progress");
      if (manual) progress = clamp01(Number(active.dataset.progress));
      else if (id === "timepiece") progress = 0.16 + progress * 0.45;
      const frame: FrameState = {
        progress,
        time: now,
        pointer: reducedMotion() ? [0, 0] : pointer,
        reducedMotion: reducedMotion(),
        manual,
        finale: active.dataset.finale === "true",
        selected: active.dataset.selected || undefined,
        impulse: impulse > 0.005 ? impulse : 0,
      };
      const size = `${rect.width.toFixed(0)}:${rect.height.toFixed(0)}`;
      if (lastAnchor !== active || lastSize !== size) {
        world.fit(rect.width, rect.height);
        lastSize = size;
        lastAnchor = active;
      }
      world.update(frame);
      const x = Math.max(0, rect.left),
        y = Math.max(0, innerHeight - rect.bottom);
      const width = Math.min(innerWidth, rect.right) - x,
        height = Math.min(innerHeight, innerHeight - rect.top) - y;
      renderer.setViewport(
        rect.left,
        innerHeight - rect.bottom,
        rect.width,
        rect.height,
      );
      renderer.setScissor(x, y, Math.max(0, width), Math.max(0, height));
      renderer.setScissorTest(true);
      renderer.render(world.scene, world.camera);
      active.dataset.worldReady = "true";
      element.dataset.world = id;
      element.dataset.ready = "true";
      const elapsed = performance.now() - begin;
      frameCount++;
      if (elapsed > 26) slowFrames++;
      else slowFrames = Math.max(0, slowFrames - 1);
      if (slowFrames > 36 && quality.tier !== "low") {
        quality = lowerQuality(quality);
        renderer.setPixelRatio(quality.dpr);
        entries.forEach((e) => e.world?.setQuality(quality));
        slowFrames = 0;
        dirty = true;
      }
      if (import.meta.env.DEV) {
        cpuSamples.push({ at: begin, ms: elapsed });
        const interval =
          lastRenderStart === undefined ? 0 : begin - lastRenderStart;
        if (interval > 0 && interval < 250)
          intervalSamples.push({ at: begin, ms: interval });
        lastRenderStart = begin;
        while (cpuSamples.length && cpuSamples[0].at < begin - 30000)
          cpuSamples.shift();
        while (intervalSamples.length && intervalSamples[0].at < begin - 30000)
          intervalSamples.shift();
        const stats = (values: Array<{ ms: number }>) => {
          const sorted = values.map((s) => s.ms).sort((a, b) => a - b);
          return {
            mean: sorted.length
              ? sorted.reduce((sum, n) => sum + n, 0) / sorted.length
              : null,
            p95: sorted.length
              ? sorted[
                  Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))
                ]
              : null,
          };
        };
        const cpu = stats(cpuSamples),
          frames = stats(intervalSamples);
        element.dataset.qa = JSON.stringify({
          world: id,
          tier: quality.tier,
          dpr: quality.dpr,
          draws: renderer.info.render.calls,
          geometries: renderer.info.memory.geometries,
          textures: renderer.info.memory.textures,
          renderedFrames: frameCount,
          sampleWindowSeconds: 30,
          cpuRenderMeanMs: cpu.mean,
          cpuRenderP95Ms: cpu.p95,
          activeFrameIntervalMeanMs: frames.mean,
          activeFrameIntervalP95Ms: frames.p95,
          activeEstimatedFps: frames.mean ? 1000 / frames.mean : null,
          activeIntervalSamples: intervalSamples.length,
        });
      }
    };
    const onLost = (event: Event) => {
      event.preventDefault();
      lost = true;
      anchors.forEach((a) => delete a.dataset.worldReady);
      setError(true);
    };
    const onRestored = () => {
      if (!disposed) setAttempt((n) => n + 1);
    };
    const prefetch = (event: Event) => {
      const id = (event as CustomEvent).detail;
      const modelCount = [...entries.keys()].filter(
        (key) => key !== "monolith",
      ).length;
      if ((id === "timepiece" || id === "faro") && modelCount < 2) acquire(id);
    };
    const observer = new MutationObserver(() => {
      dirty = true;
    });
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-progress", "data-selected"],
    });
    refresh();
    document.documentElement.dataset.motion = reducedMotion()
      ? "reduced"
      : "full";
    gsap.ticker.add(tick);
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", resize);
    addEventListener("pointermove", onPointer, { passive: true });
    addEventListener("pointerdown", onPress, { passive: true });
    addEventListener("portfolio:navigated", refresh);
    addEventListener("portfolio:prefetch", prefetch);
    document.addEventListener("visibilitychange", visibility);
    motion.addEventListener("change", mode);
    element.addEventListener("webglcontextlost", onLost);
    element.addEventListener("webglcontextrestored", onRestored);
    return () => {
      disposed = true;
      gsap.ticker.remove(tick);
      observer.disconnect();
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", resize);
      removeEventListener("pointermove", onPointer);
      removeEventListener("pointerdown", onPress);
      removeEventListener("portfolio:navigated", refresh);
      removeEventListener("portfolio:prefetch", prefetch);
      document.removeEventListener("visibilitychange", visibility);
      motion.removeEventListener("change", mode);
      element.removeEventListener("webglcontextlost", onLost);
      element.removeEventListener("webglcontextrestored", onRestored);
      entries.forEach((e) => e.lease.release());
      entries.clear();
      manager.disposeAll();
      environment.dispose();
      renderer.dispose();
      anchors.forEach((a) => {
        delete a.dataset.worldReady;
        delete a.dataset.worldError;
      });
      delete element.dataset.ready;
      delete element.dataset.world;
    };
  }, [attempt]);
  return (
    <>
      <canvas ref={canvas} className="experience-canvas" aria-hidden="true" />
      {error && (
        <div className="scene-notice" role="status">
          Показаны статичные экраны{" "}
          <button
            onClick={() => {
              setError(false);
              setAttempt((n) => n + 1);
            }}
          >
            Повторить 3D
          </button>
        </div>
      )}
    </>
  );
}
