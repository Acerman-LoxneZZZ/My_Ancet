import { BoxGeometry, Group, Mesh, MeshStandardMaterial, PerspectiveCamera, Scene, Texture, WebGLRenderTarget } from "three";
import { describe, expect, it, vi } from "vitest";
import { createJourneyResources } from "../src/experience/journey/resources";

function fixture() {
  const scene = new Scene(), camera = new PerspectiveCamera();
  const mirror = new WebGLRenderTarget(), original = new WebGLRenderTarget();
  let target: WebGLRenderTarget | null = original;
  const compiledTargets: (WebGLRenderTarget | null)[] = [];
  const renderer = {
    getRenderTarget: () => target,
    getActiveCubeFace: () => 2,
    getActiveMipmapLevel: () => 1,
    setRenderTarget: vi.fn((next: WebGLRenderTarget | null) => { target = next; }),
    initTexture: vi.fn(),
    compileAsync: vi.fn(async () => { compiledTargets.push(target); return scene; }),
  };
  const resources = createJourneyResources(renderer, scene, camera, mirror, async () => {});
  return { scene, camera, mirror, original, renderer, resources, compiledTargets };
}

describe("journey GPU preparation", () => {
  it("uploads shared maps once and prepares both screen and mirror shader variants", async () => {
    const f = fixture();
    const texture = new Texture();
    const material = new MeshStandardMaterial({ map: texture, roughnessMap: texture });
    const object = new Group();
    object.visible = false;
    object.add(new Mesh(new BoxGeometry(), material), new Mesh(new BoxGeometry(), material));
    const before = material.toJSON();
    const task = f.resources.prepare(object);
    expect(f.renderer.initTexture).not.toHaveBeenCalled();
    await task;
    expect(f.renderer.initTexture).toHaveBeenCalledExactlyOnceWith(texture);
    expect(f.compiledTargets).toEqual([null, f.mirror]);
    expect(f.renderer.compileAsync).toHaveBeenCalledWith(object, f.camera, f.scene);
    expect(f.renderer.getRenderTarget()).toBe(f.original);
    expect(f.renderer.setRenderTarget).toHaveBeenLastCalledWith(f.original, 2, 1);
    expect(object.visible).toBe(false);
    expect(material.toJSON()).toEqual(before);
    await f.resources.prepare(object);
    expect(f.renderer.initTexture).toHaveBeenCalledTimes(1);
    f.resources.dispose();
  });

  it("reports actual uploads and both completed shader variants", async () => {
    const f = fixture();
    const object = new Mesh(new BoxGeometry(), new MeshStandardMaterial({ map: new Texture() }));
    const progress = vi.fn();
    await f.resources.prepare(object, progress);
    expect(progress.mock.calls).toEqual([[0, 3], [1, 3], [2, 3], [3, 3]]);
    await f.resources.prepare(object, progress);
    expect(progress.mock.calls.slice(4)).toEqual([[0, 2], [1, 2], [2, 2]]);
    f.resources.dispose();
  });

  it("restores the render target while asynchronous compilation is still pending", async () => {
    const f = fixture();
    let finish!: (scene: Scene) => void;
    f.renderer.compileAsync.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const task = f.resources.prepare(f.scene);
    await vi.waitFor(() => expect(f.renderer.compileAsync).toHaveBeenCalledTimes(1));
    expect(f.renderer.getRenderTarget()).toBe(f.original);
    finish(f.scene);
    await task;
    expect(f.renderer.getRenderTarget()).toBe(f.original);
    f.resources.dispose();
  });

  it("abandons queued GPU work when the journey is disposed", async () => {
    const f = fixture();
    let resume!: () => void;
    const resources = createJourneyResources(f.renderer, f.scene, f.camera, f.mirror,
      () => new Promise(resolve => { resume = resolve; }));
    const object = new Mesh(new BoxGeometry(), new MeshStandardMaterial({ map: new Texture() }));
    const task = resources.prepare(object);
    const queued = resources.prepare(object);
    await vi.waitFor(() => expect(resume).toBeTypeOf("function"));
    resources.dispose();
    resume();
    await Promise.all([task, queued, resources.prepare(object)]);
    expect(f.renderer.initTexture).not.toHaveBeenCalled();
    expect(f.renderer.compileAsync).not.toHaveBeenCalled();
    f.resources.dispose();
  });

  it("restores renderer state after a failed compile and allows the next preparation", async () => {
    const f = fixture();
    f.renderer.compileAsync.mockImplementationOnce(() => { throw new Error("compile failed"); });
    await expect(f.resources.prepare(f.scene)).rejects.toThrow("compile failed");
    expect(f.renderer.getRenderTarget()).toBe(f.original);
    await expect(f.resources.prepare(f.scene)).resolves.toBeUndefined();
    expect(f.renderer.getRenderTarget()).toBe(f.original);
    f.resources.dispose();
  });
});
