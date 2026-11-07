import { useEffect, useRef } from "react";
import * as THREE from "three";
import { createArchitecture } from "../experience/journey/architecture";
import { createExhibits } from "../experience/journey/exhibits";
import { createJourneyCamera } from "../experience/journey/camera";
import { createJourneyReflection } from "../experience/journey/reflection";
import { FINALE_FROM, JOURNEY_LIMIT } from "../experience/journey/chapters";
import { createAtelierLighting } from "../experience/journey/lighting";
import { entrancePose, limitEntranceStep, openingCaptionEnd } from "../experience/journey/entrance";
import { createJourneyResources } from "../experience/journey/resources";

type Props = {
  onFrame: (progress: number) => void;
  onStatus: (status: "loading" | "ready" | "fallback") => void;
  paused: boolean;
};

const unit = (v: number) => Math.min(1, Math.max(0, v));

export default function JourneyCanvas({ onFrame, onStatus, paused }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frameCallback = useRef(onFrame);
  const statusCallback = useRef(onStatus);
  const pause = useRef(paused);
  const wake = useRef<(() => void) | undefined>(undefined);
  frameCallback.current = onFrame;
  statusCallback.current = onStatus;
  pause.current = paused;

  useEffect(() => {
    if (!paused) wake.current?.();
  }, [paused]);

  useEffect(() => {
    const element = canvas.current!;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const compact = innerWidth < 700;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: element,
        alpha: false,
        antialias: !compact,
        powerPreference: "high-performance",
      });
    } catch {
      statusCallback.current("fallback");
      return;
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.setClearColor(0x080e15, 1);
    const scene = new THREE.Scene();
    // The screen and mirror share the same world transforms for this frame.
    scene.matrixWorldAutoUpdate = false;
    scene.background = new THREE.Color(0x080e15);
    scene.fog = new THREE.FogExp2(0x101c28, 0.006);
    const camera = new THREE.PerspectiveCamera(50, 1, 0.08, 90);
    const lighting = createAtelierLighting(scene, renderer, compact);
    const architecture = createArchitecture();
    scene.add(architecture.group);
    const reflection = createJourneyReflection(compact);
    scene.add(reflection.floor);
    const rail = createJourneyCamera(camera);
    const resources = createJourneyResources(renderer, scene, camera, reflection.floor.getRenderTarget());
    const exhibits = createExhibits(resources.prepare);
    scene.add(exhibits.group);
    let alive = true;
    let resourcesReady = false;
    let raf = 0;
    let maxY = 1;
    let target = 0;
    let progress = 0;
    let last = performance.now();
    let lastRender = 0;
    let elapsed = 0;
    let dirty = true;
    let pointerX = 0, pointerY = 0, px = 0, py = 0;
    let pilot: { start: number; from: number; to: number; duration: number } | null = null;
    const pointer: [number, number] = [0, 0];
    let contactStart = -Infinity;
    let shadowDirty = true;
    let lastShadow = -Infinity;
    let lastFrameProgress = NaN;
    let viewportWidth = 0, viewportHeight = 0, viewportDpr = 0;
    let quality = compact ? 1 : 0;
    let frameAverage = 16.7;
    let slowTime = 0, fastTime = 0;
    let budgetChanged = performance.now();
    let previousFullCadence = false;
    let ready = false;

    const schedule = () => {
      if (alive && !raf && !pause.current && !document.hidden) raf = requestAnimationFrame(tick);
    };
    wake.current = schedule;
    const invalidate = () => {
      dirty = true;
      schedule();
    };
    const exhibitMounted = () => {
      shadowDirty = true;
      invalidate();
    };
    const applyRenderQuality = () => {
      const pixelRatio = viewportDpr * [1, 0.85, 0.72][quality];
      renderer.setDrawingBufferSize(viewportWidth, viewportHeight, pixelRatio);
      reflection.fit(viewportWidth * pixelRatio, viewportHeight * pixelRatio, quality);
    };
    const readScroll = () => {
      const next = unit(window.scrollY / maxY) * JOURNEY_LIMIT;
      if (next === target) return;
      target = next;
      exhibits.prepare(target, exhibitMounted);
      invalidate();
    };
    const resize = () => {
      const w = innerWidth, h = innerHeight;
      maxY = Math.max(1, document.documentElement.scrollHeight - h);
      // Cap the actual pixel buffer, not the CSS viewport.
      const limit = w < 700 ? 1200 : 1900;
      const dpr = Math.min(devicePixelRatio, w < 700 ? 1.25 : 1.5, limit / Math.max(w, h));
      if (w !== viewportWidth || h !== viewportHeight || dpr !== viewportDpr) {
        viewportWidth = w; viewportHeight = h; viewportDpr = dpr;
        applyRenderQuality();
        rail.fit(w / h);
        exhibits.fit(w / h);
        budgetChanged = performance.now();
        invalidate();
      }
      readScroll();
    };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || motion.matches) return;
      pointerX = (e.clientX / innerWidth - 0.5) * 2;
      pointerY = (e.clientY / innerHeight - 0.5) * 2;
      invalidate();
    };
    const clearPointer = () => {
      pointerX = 0;
      pointerY = 0;
      invalidate();
    };
    const cancelPilot = () => { pilot = null; };
    const seek = (event: Event) => {
      const to = Math.min(JOURNEY_LIMIT, unit(Number((event as CustomEvent<number>).detail)));
      const from = progress;
      exhibits.prepare(to, exhibitMounted);
      if (motion.matches || (from >= FINALE_FROM && to === 0) || Math.abs(to - from) < 0.000015) {
        pilot = null;
        window.scrollTo({ top: to / JOURNEY_LIMIT * maxY, behavior: "instant" });
        target = to;
        progress = target;
        invalidate();
      } else {
        pilot = {
          start: performance.now(), from, to,
          duration: to === JOURNEY_LIMIT ? 2700 : 1500 + Math.abs(to - from) * 1600,
        };
        schedule();
      }
    };
    const touchMachine = () => {
      if (progress >= openingCaptionEnd) return;
      architecture.interact(motion.matches);
      contactStart = performance.now();
      invalidate();
    };
    const touch = (event: PointerEvent) => {
      if ((event.target as HTMLElement).closest("button,a,input,dialog")) return;
      touchMachine();
    };
    const navigated = () => {
      readScroll();
      progress = target;
      pilot = null;
      invalidate();
    };
    function tick(now: number) {
      raf = 0;
      if (!alive || !resourcesReady || pause.current || document.hidden) return;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (pilot) {
        const t = unit((now - pilot.start) / pilot.duration);
        const smooth = t * t * t * (t * (t * 6 - 15) + 10);
        target = pilot.from + (pilot.to - pilot.from) * smooth;
        window.scrollTo({ top: target / JOURNEY_LIMIT * maxY, behavior: "instant" });
        if (t === 1) pilot = null;
      }
      const alpha = 1 - Math.exp(-dt / 0.19);
      const nextProgress = target;
      const scrollMoving = !motion.matches && Math.abs(progress - nextProgress) > 0.000015;
      const pointerMoving = !motion.matches && Math.abs(px - pointerX) + Math.abs(py - pointerY) > 0.001;
      const contact = (now - contactStart) / 1000;
      const fullCadence = scrollMoving || !!pilot || pointerMoving || (!motion.matches && contact < 1.28);
      progress = scrollMoving
        ? limitEntranceStep(progress, progress + (nextProgress - progress) * alpha, dt)
        : nextProgress;
      exhibits.prepare(progress, exhibitMounted);
      const pointerAlpha = 1 - Math.exp(-dt / 0.28);
      px = pointerMoving ? px + (pointerX - px) * pointerAlpha : pointerX;
      py = pointerMoving ? py + (pointerY - py) * pointerAlpha : pointerY;
      pointer[0] = motion.matches ? 0 : px;
      pointer[1] = motion.matches ? 0 : py;
      elapsed += motion.matches ? 0 : dt;
      const mechanismAnimating = !motion.matches && progress < 0.17;
      // Slow mechanical movement keeps a quiet 30 Hz cadence. A settled watch
      // requires no GPU work until the visitor moves, scrolls or touches it.
      if (!dirty && !fullCadence
        && progress === lastFrameProgress && ((!mechanismAnimating && !shadowDirty) || now - lastRender < 32)) {
        if (mechanismAnimating || shadowDirty) schedule();
        return;
      }
      const invalidated = dirty;
      dirty = false;
      const renderInterval = now - lastRender;
      if (ready && fullCadence && previousFullCadence && now - budgetChanged > 2500) {
        frameAverage += (Math.min(renderInterval, 100) - frameAverage) * 0.08;
        slowTime = frameAverage > 24 ? slowTime + renderInterval : 0;
        fastTime = frameAverage < 18.5 ? fastTime + renderInterval : 0;
        if ((slowTime > 1200 && quality < 2) || (fastTime > 7000 && quality > 0)) {
          quality += slowTime > 1200 ? 1 : -1;
          applyRenderQuality();
          slowTime = fastTime = 0;
          budgetChanged = now;
        }
      } else {
        slowTime = fastTime = 0;
      }
      previousFullCadence = fullCadence;
      lastRender = now;
      rail.update(progress, pointer, motion.matches);
      const entrance = entrancePose(progress, contact, motion.matches);
      reflection.setEntranceShadow(entrance.assembly, entrance.transfer);
      const machineChanged = architecture.update(progress, elapsed, entrance);
      const exhibitsChanged = exhibits.update(progress);
      shadowDirty ||= machineChanged || exhibitsChanged;
      if (shadowDirty && now - lastShadow >= (fullCadence ? 65 : 160) + quality * 35) {
        renderer.shadowMap.needsUpdate = true;
        shadowDirty = false;
        lastShadow = now;
      }
      scene.updateMatrixWorld();
      reflection.prepare(camera, now, machineChanged || exhibitsChanged, invalidated || exhibitsChanged);
      renderer.render(scene, camera);
      if (!ready) {
        ready = true;
        statusCallback.current("ready");
      }
      if (lastFrameProgress !== progress) {
        frameCallback.current(progress);
        lastFrameProgress = progress;
      }
      if (fullCadence || mechanismAnimating || shadowDirty) schedule();
    }
    const visibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
        return;
      }
      last = performance.now();
      invalidate();
    };
    const loseContext = (e: Event) => {
      e.preventDefault();
      alive = false;
      cancelAnimationFrame(raf);
      statusCallback.current("fallback");
    };
    void resources.prepare(scene).catch(error => {
      if (alive) console.warn("Could not prepare journey resources", error);
    }).then(() => {
      if (!alive) return;
      resourcesReady = true;
      last = performance.now();
      invalidate();
    });
    resize();
    exhibits.prepare(target, exhibitMounted);
    progress = target;
    rail.update(progress, pointer, motion.matches);
    architecture.update(progress, 0, entrancePose(progress, Infinity, motion.matches));
    schedule();
    const observer = new ResizeObserver(resize);
    const page = document.querySelector(".journey-page");
    if (page) observer.observe(page);
    window.addEventListener("scroll", readScroll, { passive: true });
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", touch, { passive: true });
    window.addEventListener("journey:touch", touchMachine);
    window.addEventListener("blur", clearPointer);
    window.addEventListener("wheel", cancelPilot, { passive: true });
    window.addEventListener("touchstart", cancelPilot, { passive: true });
    window.addEventListener("keydown", cancelPilot);
    window.addEventListener("journey:seek", seek);
    window.addEventListener("portfolio:navigated", navigated);
    document.addEventListener("visibilitychange", visibility);
    motion.addEventListener("change", clearPointer);
    element.addEventListener("webglcontextlost", loseContext);
    return () => {
      alive = false;
      wake.current = undefined;
      resources.dispose();
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("scroll", readScroll);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", touch);
      window.removeEventListener("journey:touch", touchMachine);
      window.removeEventListener("blur", clearPointer);
      window.removeEventListener("wheel", cancelPilot);
      window.removeEventListener("touchstart", cancelPilot);
      window.removeEventListener("keydown", cancelPilot);
      window.removeEventListener("journey:seek", seek);
      window.removeEventListener("portfolio:navigated", navigated);
      document.removeEventListener("visibilitychange", visibility);
      motion.removeEventListener("change", clearPointer);
      element.removeEventListener("webglcontextlost", loseContext);
      exhibits.dispose();
      architecture.dispose();
      reflection.dispose();
      lighting.dispose();
      renderer.dispose();
    };
  }, []);
  return <canvas ref={canvas} className="journey-canvas" aria-hidden="true" />;
}
