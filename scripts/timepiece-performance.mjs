import { fileURLToPath } from 'node:url';

const schedulerId = 'virtual:timepiece-frame-scheduler';
const schedulerSource = new URL('./templates/timepiece-frame-scheduler.ts', import.meta.url);
const schedulerPath = fileURLToPath(schedulerSource).replaceAll('\\', '/');

function replace(source, from, to, expected = 1) {
  const count = source.split(from).length - 1;
  if (count !== expected) throw new Error(`Timepiece source changed: expected ${expected} occurrences of ${JSON.stringify(from)}, got ${count}`);
  return source.replaceAll(from, to);
}

/** Build-time adaptations keep the pinned research checkout unchanged. */
export function adaptTimepieceSource(source, filename) {
  if (filename.endsWith('/scene/WatchScene.ts')) {
    source = `import { gsap } from 'gsap'\nimport { createWatchFrameScheduler } from '${schedulerId}'\nimport { prepareDetailScenes } from './DetailSceneManager'\n` + source;
    source = replace(source, '  private frame = 0', '  private frame = 0\n  private frameScheduler = createWatchFrameScheduler(gsap.ticker, () => this.render())');
    source = replace(source, 'requestAnimationFrame(this.render)', 'this.frameScheduler.request()');
    source = replace(source, 'cancelAnimationFrame(this.frame)', 'this.frameScheduler.cancel()', 4);
    source = replace(source, '      this.renderer.compile(this.scene, this.camera)', `      await prepareDetailScenes()
      if (this.disposed) return
      await this.renderer.compileAsync(this.scene, this.camera)`);
  } else if (filename.endsWith('/scene/DetailSceneManager.ts')) {
    source = replace(source, '  private refreshFrame = 0', `  private refreshFrame = 0
  private preparedModels = new WeakSet<DetailModel>()
  private preparingModels = new Map<DetailModel, Promise<void>>()
  private preparing: Promise<void> | null = null

  /** Finish the second context and its shaders behind the initial loader. */
  prewarm() {
    return this.preparing ??= (async () => {
      this.prepareRenderer()
      if (this.models) for (const model of Object.values(this.models)) await this.prepareModel(model)
    })()
  }

  private prepareModel(model: DetailModel): Promise<void> {
    if (this.preparedModels.has(model)) return Promise.resolve()
    const existing = this.preparingModels.get(model)
    if (existing) return existing
    const renderer = this.renderer
    if (!renderer || this.disposed) return Promise.resolve()
    const task = (async () => {
      await new Promise<void>(resolve => window.setTimeout(resolve, 0))
      if (this.disposed || this.renderer !== renderer) return
      await renderer.compileAsync(model.root, this.camera, this.scene)
      if (this.disposed || this.renderer !== renderer) return
      this.preparedModels.add(model)
      this.selectActive()
    })().catch(() => {
      // Leave the existing poster/render fallback available on a driver failure.
      if (!this.disposed && this.renderer === renderer) { this.preparedModels.add(model); this.selectActive() }
    }).finally(() => { if (this.preparingModels.get(model) === task) this.preparingModels.delete(model) })
    this.preparingModels.set(model, task)
    return task
  }`);
    source = replace(source, '    if (this.canvas.parentElement !== best.surface) {', `    if (!this.preparedModels.has(model)) { void this.prepareModel(model); return }
    if (this.canvas.parentElement !== best.surface) {`);
    source = replace(source, 'time - this.lastPaint < this.frameInterval', 'time - this.lastPaint + .001 < this.frameInterval');
    source = replace(source, '  private releaseRenderer() {\n    this.stopTicking()', `  private releaseRenderer() {
    this.preparedModels = new WeakSet<DetailModel>()
    this.preparingModels.clear()
    this.preparing = null
    this.stopTicking()`);
    source += `\nexport async function prepareDetailScenes() { await sharedManager?.prewarm() }\n`;
  }
  return source;
}

export function timepiecePerformancePlugin() {
  return {
    name: 'timepiece-gallery-performance', enforce: 'pre',
    resolveId(id) { if (id === schedulerId) return schedulerPath; },
    transform(code, id) {
      if (!/\/src\/scene\/(WatchScene|DetailSceneManager)\.ts$/.test(id.replaceAll('\\', '/'))) return;
      return { code: adaptTimepieceSource(code.replaceAll('\r\n', '\n'), id.replaceAll('\\', '/')), map: null };
    },
  };
}
