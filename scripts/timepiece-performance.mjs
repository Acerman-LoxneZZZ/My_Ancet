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
  if (filename.endsWith('/app/App.tsx')) {
    source = replace(source, '<div className="station-copy"', '{chapter > 0 && <div className="station-copy"');
    source = replace(source, '</div></div>\n          <div className="story-stage">', '</div></div>}\n          <div className="story-stage">');
    source = replace(source, '            {chapter === 0 && <a className="station-link" href="#selection">Выбрать исполнение <Icon name="arrow" size={18} /></a>}\n', '');
  } else if (filename.endsWith('/components/Experience.tsx')) {
    source = replace(source, "  const failed = status === 'error'", `  useLayoutEffect(() => {
    const loader = document.getElementById('timepiece-loader')!
    const progress = loader.querySelector<HTMLElement>('.loader-percent')!
    const loading = status === 'loading'
    const percent = status === 'ready' ? 100 : Math.min(loadingPercent ?? 0, 99)

    progress.querySelector('span')!.textContent = String(percent).padStart(2, '0')
    progress.setAttribute('aria-valuenow', String(percent))
    loader.querySelector('.loader-caption small')!.textContent = loadingPercent === 100 ? 'Готовим 3D-сцену' : 'Загружаем модель'
    loader.style.setProperty('--load', String(percent / 100))
    loader.classList.toggle('is-complete', !loading)
    loader.setAttribute('aria-hidden', String(!loading))
    document.getElementById('root')!.toggleAttribute('inert', loading)
  }, [status, loadingPercent])

  const failed = status === 'error'`);
    source = replace(source, `    {status === 'loading' && <div className="loading-state" role="status">
      <div className="loading-dial" aria-hidden="true"><span /></div>
      <p>Открываем KARpOV<span className="loading-percent">{loadingPercent === null ? '…' : \` \${loadingPercent}%\`}</span></p>
      <span>Знакомство с коллекцией №01</span>
    </div>}
`, '');
  } else if (filename.endsWith('/scene/WatchScene.ts')) {
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

export function addTimepieceLoadingScreen(entry, portfolioEntry, bootStyles) {
  const portfolioLoader = portfolioEntry.replaceAll('\r\n', '\n').match(/<main class="journey-loader"[\s\S]*?<\/main>/)?.[0];
  if (!portfolioLoader) throw new Error('Missing portfolio loading screen');
  let loader = replace(portfolioLoader, '<main', '<div id="timepiece-loader"');
  loader = replace(loader, '</main>', '</div>');
  loader = replace(loader, ' aria-label="Загрузка галереи"', '');
  loader = replace(loader, 'Миры под поверхностью', 'Карманные часы №01');
  loader = replace(loader, 'Открываем галерею', 'Загружаем модель');
  loader = replace(loader, 'class="loader-percent"', 'class="loader-percent" role="progressbar" aria-label="Загрузка часов" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"');

  const styles = `${bootStyles.replaceAll('\r\n', '\n').trimEnd()}
html:has(#timepiece-loader:not(.is-complete)){overflow:hidden}
#timepiece-loader{font-family:"Manrope Variable",Manrope,Arial,sans-serif}`;
  const withStyles = replace(entry.replaceAll('\r\n', '\n'), '</head>', `<style>\n${styles}\n    </style>\n    <noscript><style>#timepiece-loader{display:none}html{overflow:auto!important}</style></noscript>\n  </head>`);
  return replace(withStyles, '<div id="root"></div>', `${loader}\n    <div id="root" inert></div>`);
}

export function timepiecePerformancePlugin() {
  return {
    name: 'timepiece-gallery-performance', enforce: 'pre',
    resolveId(id) { if (id === schedulerId) return schedulerPath; },
    transform(code, id) {
      const filename = id.replaceAll('\\', '/');
      if (!/\/src\/(app\/App\.tsx|components\/Experience\.tsx|scene\/(WatchScene|DetailSceneManager)\.ts)$/.test(filename)) return;
      return { code: adaptTimepieceSource(code.replaceAll('\r\n', '\n'), filename), map: null };
    },
  };
}
