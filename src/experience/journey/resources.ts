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
  let pending = Promise.resolve();
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

  return {
    prepare(object: THREE.Object3D, onProgress?: (completed: number, total: number) => void): Promise<void> {
      if (disposed) return Promise.resolve();
      const task = pending.then(async () => {
        if (disposed) return;
        const textures = new Set<THREE.Texture>();
        object.traverse(child => {
          const material = (child as THREE.Mesh).material;
          if (!material) return;
          for (const entry of Array.isArray(material) ? material : [material]) {
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
        // The mirror uses linear output and different tone-mapping defines.
        // Preparing only the screen variant still stalls on the first reflection.
        await compile(object, reflectionTarget);
        if (!disposed) onProgress?.(++completed, total);
      });
      pending = task.catch(() => {});
      return task;
    },
    dispose() { disposed = true; uploaded.clear(); },
  };
}
