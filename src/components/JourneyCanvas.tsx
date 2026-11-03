import { useEffect, useRef } from "react";
import * as THREE from "three";
import { createArchitecture } from "../experience/journey/architecture";
import { createExhibits } from "../experience/journey/exhibits";
import { createJourneyCamera } from "../experience/journey/camera";
import { createJourneyReflection } from "../experience/journey/reflection";
import { JOURNEY_LIMIT } from "../experience/journey/chapters";
import { createAtelierLighting } from "../experience/journey/lighting";

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
  frameCallback.current = onFrame;
  statusCallback.current = onStatus;
  pause.current = paused;

  useEffect(() => {
    const element = canvas.current!;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: element,
        alpha: false,
        antialias: true,
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
    scene.background = new THREE.Color(0x080e15);
    scene.fog = new THREE.FogExp2(0x101c28, 0.006);
    const camera = new THREE.PerspectiveCamera(50, 1, 0.08, 90);
    const lighting = createAtelierLighting(scene, renderer);
    const architecture = createArchitecture();
    scene.add(architecture.group);
    const reflection = createJourneyReflection();
    scene.add(reflection.floor);
    const rail = createJourneyCamera(camera);
    let exhibits: Awaited<ReturnType<typeof createExhibits>> | undefined;
    let alive = true;
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
    const raycaster = new THREE.Raycaster();
    const hitPointer = new THREE.Vector2();
    const centerContact = new THREE.Vector3(0.5, 4.8, 0.78);
    let hoverChanged = false;
    let pendingContact: "pointer" | "center" | null = null;
    let interactionUntil = 0;
    let shadowDirty = true;
    let lastShadow = -Infinity;
    let lastFrameProgress = NaN;
    let viewportWidth = 0, viewportHeight = 0, viewportDpr = 0;
    let quality = 0;
    let frameAverage = 16.7;
    let slowTime = 0, fastTime = 0;
    let budgetChanged = performance.now();
    let previousFullCadence = false;
    let assetsReady = false;

    const readScroll = () => {
      target = unit(window.scrollY / maxY) * JOURNEY_LIMIT;
      dirty = true;
    };
    const resize = () => {
      const w = innerWidth, h = innerHeight;
      maxY = Math.max(1, document.documentElement.scrollHeight - h);
      // Cap the actual pixel buffer, not the CSS viewport.
      const limit = w < 700 ? 1300 : 1900;
      const dpr = Math.min(devicePixelRatio, 1.5, limit / Math.max(w, h));
      if (w !== viewportWidth || h !== viewportHeight || dpr !== viewportDpr) {
        viewportWidth = w; viewportHeight = h; viewportDpr = dpr;
        renderer.setPixelRatio(dpr);
        renderer.setSize(w, h, false);
        // Keep gears sharp through the main glass; scale only the floor buffer.
        renderer.transmissionResolutionScale = 1;
        rail.fit(w / h);
        reflection.fit(w / h);
        exhibits?.fit(w / h);
        budgetChanged = performance.now();
      }
      readScroll();
    };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pointerX = (e.clientX / innerWidth - 0.5) * 2;
      pointerY = (e.clientY / innerHeight - 0.5) * 2;
      hoverChanged = true;
    };
    const clearPointer = () => { pointerX = 0; pointerY = 0; };
    const cancelPilot = () => { pilot = null; };
    const seek = (event: Event) => {
      const to = Math.min(JOURNEY_LIMIT, unit(Number((event as CustomEvent<number>).detail)));
      if (motion.matches) {
        window.scrollTo({ top: to / JOURNEY_LIMIT * maxY, behavior: "instant" });
        progress = target = to;
        dirty = true;
      } else {
        pilot = {
          start: performance.now(), from: window.scrollY / maxY * JOURNEY_LIMIT, to,
          duration: 1500 + Math.abs(to - progress) * 1600,
        };
      }
    };
    const touch = (event: PointerEvent) => {
      if (progress > 0.16 || (event.target as HTMLElement).closest("button,a,input,dialog")) return;
      pointerX = (event.clientX / innerWidth - 0.5) * 2;
      pointerY = (event.clientY / innerHeight - 0.5) * 2;
      pendingContact = "pointer";
      interactionUntil = performance.now() + 1900;
      dirty = true;
    };
    const accessibleTouch = () => { pendingContact = "center"; interactionUntil = performance.now() + 1900; dirty = true; };
    const manualWatch = (event: Event) => {
      const value = (event as CustomEvent<number | null>).detail;
      exhibits?.setWatchProgress(value, motion.matches);
      interactionUntil = performance.now() + 800;
      dirty = true;
    };
    const navigated = () => {
      readScroll();
      progress = target;
      pilot = null;
      dirty = true;
    };
    const tick = (now: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (pause.current || document.hidden) return;
      if (pilot) {
        const t = unit((now - pilot.start) / pilot.duration);
        const smooth = t * t * t * (t * (t * 6 - 15) + 10);
        target = pilot.from + (pilot.to - pilot.from) * smooth;
        window.scrollTo({ top: target / JOURNEY_LIMIT * maxY, behavior: "instant" });
        if (t === 1) pilot = null;
      }
      const alpha = 1 - Math.exp(-dt / 0.19);
      const moving = Math.abs(progress - target) > 0.000015 || !!pilot
        || (!motion.matches && (Math.abs(px - pointerX) + Math.abs(py - pointerY) > 0.001 || now < interactionUntil));
      progress = motion.matches ? target : progress + (target - progress) * alpha;
      if (!moving) progress = target;
      const pointerAlpha = 1 - Math.exp(-dt / 0.28);
      px += (pointerX - px) * pointerAlpha;
      py += (pointerY - py) * pointerAlpha;
      pointer[0] = motion.matches ? 0 : px;
      pointer[1] = motion.matches ? 0 : py;
      elapsed += motion.matches ? 0 : dt;
      const watchAnimating = !motion.matches && !!exhibits?.isAnimating();
      const fullCadence = moving || watchAnimating;
      const mechanismAnimating = !motion.matches && progress < 0.17;
      // Slow mechanical movement keeps a quiet 30 Hz cadence. A settled watch
      // requires no GPU work until the visitor moves, scrolls or touches it.
      if (!dirty && !fullCadence && ((!mechanismAnimating && !shadowDirty) || now - lastRender < 32)) return;
      const invalidated = dirty;
      dirty = false;
      const renderInterval = now - lastRender;
      if (assetsReady && fullCadence && previousFullCadence && renderInterval < 100 && now - budgetChanged > 2500) {
        frameAverage += (renderInterval - frameAverage) * 0.08;
        slowTime = frameAverage > 24 ? slowTime + renderInterval : 0;
        fastTime = frameAverage < 18.5 ? fastTime + renderInterval : 0;
        if ((slowTime > 1200 && quality < 2) || (fastTime > 7000 && quality > 0)) {
          quality += slowTime > 1200 ? 1 : -1;
          reflection.setQuality(quality);
          slowTime = fastTime = 0;
          budgetChanged = now;
        }
      } else {
        slowTime = fastTime = 0;
      }
      previousFullCadence = fullCadence;
      lastRender = now;
      rail.update(progress, pointer, motion.matches);
      const machineChanged = architecture.update(progress, elapsed);
      const watchChanged = exhibits?.update(progress, elapsed) ?? false;
      shadowDirty ||= machineChanged || watchChanged;
      if (shadowDirty && now - lastShadow >= (fullCadence ? 65 : 160) + quality * 35) {
        renderer.shadowMap.needsUpdate = true;
        shadowDirty = false;
        lastShadow = now;
      }
      if (progress < 0.16 && (hoverChanged || pendingContact)) {
        hitPointer.set(pointerX, -pointerY);
        raycaster.setFromCamera(hitPointer, camera);
        const hit = raycaster.intersectObjects(architecture.surfaces, false)[0];
        if (!motion.matches) architecture.hover(hit?.point ?? null);
        if (pendingContact) {
          architecture.interact(pendingContact === "center" ? centerContact : hit?.point ?? centerContact, motion.matches ? 0.15 : 1);
        }
        hoverChanged = false;
        pendingContact = null;
      }
      reflection.prepare(camera, now, machineChanged || watchChanged,
        invalidated || (watchChanged && !exhibits?.isAnimating()));
      renderer.render(scene, camera);
      if (lastFrameProgress !== progress) {
        frameCallback.current(progress);
        lastFrameProgress = progress;
      }
    };
    const loseContext = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(raf);
      statusCallback.current("fallback");
    };
    resize();
    progress = target;
    rail.update(progress, pointer, motion.matches);
    architecture.update(progress, 0);
    raf = requestAnimationFrame(tick);
    void createExhibits({ openingOnly: true }).then(async (loaded) => {
      if (!alive) { loaded.dispose(); return; }
      exhibits = loaded;
      exhibits.fit(innerWidth / innerHeight);
      exhibits.update(progress, elapsed);
      scene.add(exhibits.group);
      dirty = true;
      shadowDirty = true;
      // Warm all exhibit materials before the visitor reaches the first room.
      // Restore visibility synchronously so no render sees all rooms enabled.
      const visibility = exhibits.group.children.map(child => child.visible);
      exhibits.group.children.forEach(child => { child.visible = true; });
      const compiled = renderer.compileAsync(scene, camera);
      exhibits.group.children.forEach((child, i) => { child.visible = visibility[i]; });
      await compiled;
      if (alive) {
        assetsReady = true;
        budgetChanged = performance.now();
        dirty = true;
        statusCallback.current("ready");
      }
    }).catch(() => {
      if (alive) statusCallback.current("fallback");
    });
    const observer = new ResizeObserver(resize);
    const page = document.querySelector(".journey-page");
    if (page) observer.observe(page);
    window.addEventListener("scroll", readScroll, { passive: true });
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", touch, { passive: true });
    window.addEventListener("journey:touch", accessibleTouch);
    window.addEventListener("journey:watch", manualWatch);
    window.addEventListener("blur", clearPointer);
    window.addEventListener("wheel", cancelPilot, { passive: true });
    window.addEventListener("touchstart", cancelPilot, { passive: true });
    window.addEventListener("keydown", cancelPilot);
    window.addEventListener("journey:seek", seek);
    window.addEventListener("portfolio:navigated", navigated);
    element.addEventListener("webglcontextlost", loseContext);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("scroll", readScroll);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", touch);
      window.removeEventListener("journey:touch", accessibleTouch);
      window.removeEventListener("journey:watch", manualWatch);
      window.removeEventListener("blur", clearPointer);
      window.removeEventListener("wheel", cancelPilot);
      window.removeEventListener("touchstart", cancelPilot);
      window.removeEventListener("keydown", cancelPilot);
      window.removeEventListener("journey:seek", seek);
      window.removeEventListener("portfolio:navigated", navigated);
      element.removeEventListener("webglcontextlost", loseContext);
      exhibits?.dispose();
      architecture.dispose();
      reflection.dispose();
      lighting.dispose();
      renderer.dispose();
    };
  }, []);
  return <canvas ref={canvas} className="journey-canvas" aria-hidden="true" />;
}
