import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createArchitecture } from "../experience/journey/architecture";
import { createExhibits } from "../experience/journey/exhibits";
import { createJourneyCamera } from "../experience/journey/camera";
import { createJourneyReflection } from "../experience/journey/reflection";
import { JOURNEY_LIMIT } from "../experience/journey/chapters";

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
    renderer.toneMappingExposure = 1.25;
    renderer.setClearColor(0x060a0d, 1);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060a0d);
    scene.fog = new THREE.FogExp2(0x060a0d, 0.026);
    const camera = new THREE.PerspectiveCamera(50, 1, 0.08, 90);
    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(room, 0.07, 0.1, 100);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.7;
    room.dispose();
    pmrem.dispose();
    // Broad softbox lighting travels with the camera; exhibits have their own accents.
    scene.add(new THREE.HemisphereLight(0xadc6d8, 0x18100b, 1.5));
    const key = new THREE.DirectionalLight(0xe4f1ff, 3.5);
    const warm = new THREE.DirectionalLight(0xe8b46f, 1.8);
    const keyTarget = new THREE.Object3D();
    const warmTarget = new THREE.Object3D();
    key.target = keyTarget;
    warm.target = warmTarget;
    scene.add(key, warm, keyTarget, warmTarget);
    const architecture = createArchitecture();
    scene.add(architecture.group);
    const reflection = createJourneyReflection();
    scene.add(reflection.floor);
    const exhibitKey = new THREE.PointLight(0xffefdc, 95, 22, 2);
    const exhibitFill = new THREE.PointLight(0xdceaff, 40, 20, 2);
    const exhibitRim = new THREE.PointLight(0xc49b5c, 48, 20, 2);
    scene.add(exhibitKey, exhibitFill, exhibitRim);
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
    const centerContact = new THREE.Vector3(0, 3, 0.5);
    let hoverChanged = false;
    let pendingContact: "pointer" | "center" | null = null;
    let interactionUntil = 0;

    const readScroll = () => {
      target = unit(window.scrollY / maxY) * JOURNEY_LIMIT;
      dirty = true;
    };
    const resize = () => {
      const w = innerWidth, h = innerHeight;
      maxY = Math.max(1, document.documentElement.scrollHeight - h);
      // Cap the actual pixel buffer, not the CSS viewport.
      const limit = w < 700 ? 1300 : 1900;
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5, limit / Math.max(w, h)));
      renderer.setSize(w, h, false);
      rail.fit(w / h);
      reflection.fit(w / h);
      exhibits?.fit(w / h);
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
      // Render at full cadence during travel and at 30 Hz for still exhibits.
      if (!dirty && !moving && (motion.matches || now - lastRender < 32)) return;
      dirty = false;
      lastRender = now;
      rail.update(progress, pointer, motion.matches);
      architecture.update(progress, elapsed);
      exhibits?.update(progress, elapsed);
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
      key.position.set(camera.position.x - 6, 11, camera.position.z + 3);
      keyTarget.position.set(0, 2, camera.position.z - 8);
      warm.position.set(8, 5, camera.position.z - 10);
      warmTarget.position.set(0, 2, camera.position.z - 14);
      const lightZ = camera.position.z - 12;
      exhibitKey.position.set(-3, 7, lightZ + 5);
      exhibitFill.position.set(5, 5, lightZ + 4);
      exhibitRim.position.set(-5, 4, lightZ - 3);
      renderer.render(scene, camera);
      frameCallback.current(progress);
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
      // Warm all exhibit materials before the visitor reaches the first room.
      // Restore visibility synchronously so no render sees all rooms enabled.
      const visibility = exhibits.group.children.map(child => child.visible);
      exhibits.group.children.forEach(child => { child.visible = true; });
      const compiled = renderer.compileAsync(scene, camera);
      exhibits.group.children.forEach((child, i) => { child.visible = visibility[i]; });
      await compiled;
      if (alive) statusCallback.current("ready");
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
      environment.dispose();
      renderer.dispose();
    };
  }, []);
  return <canvas ref={canvas} className="journey-canvas" aria-hidden="true" />;
}
