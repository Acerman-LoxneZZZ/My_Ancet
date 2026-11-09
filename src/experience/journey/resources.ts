import * as THREE from "three";

type PreparationRenderer = Pick<THREE.WebGLRenderer,
  "initTexture" | "compileAsync" | "getRenderTarget" | "setRenderTarget" | "getActiveCubeFace" | "getActiveMipmapLevel">;

const yieldForIdle = () => new Promise<void>(resolve => {
  if (typeof requestIdleCallback === "function") requestIdleCallback(() => resolve(), { timeout: 100 });
  else setTimeout(resolve, 0);
});

/** Prepare unchanged materials before they become visible, one GPU upload per idle slice. */
export function createJourneyResources(renderer: PreparationRenderer, scene: THREE.Scene,
  camera: THREE.Camera, reflectionTarget: THREE.WebGLRenderTarget, yieldWork = yieldForIdle) {
  const uploaded = new Set<THREE.Texture>();
  type Job = { object: THREE.Object3D; onProgress?: (completed: number, total: number) => void;
    priority: () => number; resolve: () => void; reject: (reason: unknown) => void };
  const queue: Job[] = [];
  const settled = Promise.resolve();
  let running = false;
  let disposed = false;

  const compile = async (object: THREE.Object3D, target: THREE.WebGLRenderTarget | null) => {
    const previous = renderer.getRenderTarget();
    const face = renderer.getActiveCubeFace(), mip = renderer.getActiveMipmapLevel();
    let compilation: Promise<unknown>;
    try {
      renderer.setRenderTarget(target);
      compilation = renderer.compileAsync(object, camera, scene);
    } finally {
      // Never leave the renderer pointed at the mirror across an asynchronous wait.
      renderer.setRenderTarget(previous, face, mip);
    }
    await compilation;
  };

  const prepare = async ({ object, onProgress }: Job) => {
    const textures = new Set<THREE.Texture>();
    const materials = new Set<THREE.Material>();
    object.traverse(child => {
      const material = (child as THREE.Mesh).material;
      if (!material) return;
      for (const entry of Array.isArray(material) ? material : [material]) {
        if (materials.has(entry)) continue;
        materials.add(entry);
        for (const value of Object.values(entry)) {
          if (value instanceof THREE.Texture && !value.isRenderTargetTexture && !uploaded.has(value)) textures.add(value);
        }
      }
    });
    const total = textures.size + 2;
    let completed = 0;
    onProgress?.(completed, total);
    for (const texture of textures) {
      await yieldWork();
      if (disposed) return;
      renderer.initTexture(texture);
      uploaded.add(texture);
      onProgress?.(++completed, total);
    }
    await yieldWork();
    if (disposed) return;
    await compile(object, null);
    if (disposed) return;
    onProgress?.(++completed, total);
    await yieldWork();
    if (disposed) return;
    // Keep both variants serial: Three.js polls each material's current program.
    await compile(object, reflectionTarget);
    if (!disposed) onProgress?.(++completed, total);
  };

  const drain = async () => {
    while (queue.length && !disposed) {
      // Re-evaluate distances after each job, including jumps/backtracking.
      let next = 0;
      let priority = queue[0].priority();
      for (let index = 1; index < queue.length; index++) {
        const candidate = queue[index].priority();
        if (candidate < priority) { priority = candidate; next = index; }
      }
      const job = queue.splice(next, 1)[0];
      try { await prepare(job); job.resolve(); }
      catch (error) { job.reject(error); }
    }
    running = false;
  };

  return {
    prepare(object: THREE.Object3D, onProgress?: (completed: number, total: number) => void,
      priority: () => number = () => 0): Promise<void> {
      if (disposed) return settled;
      const task = new Promise<void>((resolve, reject) => {
        queue.push({ object, onProgress, priority, resolve, reject });
      });
      if (!running) { running = true; queueMicrotask(() => { void drain(); }); }
      return task;
    },
    dispose() {
      disposed = true;
      uploaded.clear();
      for (const job of queue.splice(0)) job.resolve();
    },
  };
}
