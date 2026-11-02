# LOXNE Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Создать локальное русскоязычное 3D-портфолио с раскрывающимся монолитом, четырьмя мирами на основе крупных реальных экранов и оригинальных объектов/карточек, полноценными кейсами и 22-секундным шоурилом.

**Architecture:** React отвечает за семантический HTML и маршруты; один Three.js renderer — за сцену. GSAP связывает нативную прокрутку, абсолютные состояния миров и переходы страниц. Изолированные модули миров повторно используются для детерминированных кадров Remotion; его зависимости не включаются в bundle сайта.

**Tech Stack:** React, TypeScript, Vite, Three.js, GSAP ticker/переходы, React Router; Vitest для сложного поведения; Remotion для видео. Реализован нативный scroll с DOM-метриками, без ScrollTrigger и Lenis. CSS без дополнительного UI-фреймворка.

**Spec:** [2026-11-02-portfolio-design.md](../specs/2026-11-02-portfolio-design.md). Прочитать вместе с исходным `PROMPT_PORTFOLIO_AGENT.txt`.

## Global Constraints

- «Результат — локальное приложение с предпросмотром, исходниками, проверенными кейсами и шоурилом. Публикация и изменение исходных репозиториев не входят в работу».
- «Временное имя — LOXNE. Из персональных ссылок подтверждён только GitHub».
- Внешняя сцена: фон `#080B10`, поверхность `#111720`, серебро `#CBD2D9`, основной текст `#F1F0EA`, холодный акцент `#9BC9FF`. Реальные экраны сохраняют собственную палитру и шрифты. FARO: точный `--tomato: #e66744`, `--paper: #f1ede2`, `--ink: #191b16` из `.research/pizza/assets/pizza-video/scene-3d/style.css`; упомянутый `#e96b48` не подтверждён исходником. `#F4A04B` допустим только как внешний свет, не как замена кораллу меню.
- Все четыре обложки строятся из крупного фактического UI и оригинального объекта/карточек. Сохраняются исходные шрифты, меню, цвета, пропорции и портал; сценический свет и композиция дополняют их. Экраны не сокращаются до мелких декоративных текстур.
- «Ссылки и кнопки имеют область касания от 44×44 px».
- «Прокрутка браузера остаётся нативной»; один renderer и один управляющий ticker; Remotion не входит в runtime сайта.
- «Начальные профили: desktop DPR до 1,5; mobile до 1,25; low до 1,0. Число частиц 100–180 / 40–60 / 0».
- «Шоурил Remotion — 22 секунды, 1920×1080, 30 FPS, без обязательного звука».
- «Concept art не выдаётся за работающую графику». Нижние иллюстрации четырёх миров в `docs/design/01-hero-and-worlds.png` superseded; атмосфера и постановка монолита сохраняются. Текущие сравнения — `docs/design/review-v2/`, это review обложек, не готовый сайт и не одобрение всех новых макетов.
- `.research/`, рабочие базы и runtime-данные исходных приложений не переносятся в `dist`. Wordflow использует оригинальный интерфейс с отдельными синтетическими данными, а не заново придуманные карточки или алгоритм обучения.
- Версии фиксируются после проверки совместимости при разрешённой установке; один исполнитель меняет package/lock. Чужие версии из README не считаются подтверждённой рабочей комбинацией.
- Исходники редактируются только в текущем checkout. Существующий пользовательский промпт сохраняется без изменений.

## Review Focus

1. Прямой вход в кейс без сохранённой галереи: возврат должен попасть в соответствующий мир и его заголовок, а не в пустую позицию (задача 8).
2. Быстрые разные клики и Back во время шторки: последний запрос побеждает, UI разблокируется даже при ошибке (задача 8).
3. Медленная модель приходит после ухода со страницы: она не прикрепляется к чужому миру и не оставляет GPU-ресурсы (задача 3).
4. Смена ориентации или reduced motion во время пролёта: содержание остаётся доступным, глава сохраняется, таймлайны не дублируются (задачи 9 и 11).
5. Повторный запуск WebGL после потери контекста: один canvas, прежняя глава, постер до готовности и доступные ссылки при повторном отказе (задачи 3 и 11).
6. Узнаваемость всех четырёх работ: крупные реальные экраны, точные исходные модели/портал, шрифты и цвета, настоящее меню FARO; Wordflow сохраняет оригинальный UI и изолирует демо-данные (задачи 2, 5–7 и 11).

---

## Состояние и исполнители

Направление монолита сохраняется; правка пользователя требует узнаваемой подачи оригинальных интерфейсов. После review пользователь поручил **«делай мою страничку»**, разрешив реализацию. Дополнительное условие — тесты до продуктового кода — соблюдено: общий начальный RED сохранён в `docs/qa/tests-before-implementation.txt`, commit `f011b1f`. Метод — субагенты в текущем чате — уже выбран пользователем.

**Текущая стадия:** основные страницы, scene-модули, изолированный Wordflow и Remotion-композиция написаны; идёт интеграция и проверка. Typecheck и check-assets прошли. Главный агент подтвердил Wordflow при ширине 390 px (flip, «Знаю» → 1/6, отмена → 0/6, словари, reset → 0/6) и меню 360×640 / Escape. Материалы 3D и шторка ещё исправляются; полный browser/performance/reduced-motion QA и финальное видео не объявлены завершёнными. Детальные checkbox ниже не отмечаются по одному лишь наличию файлов: многие объединяют реализацию и ещё не пройденную приёмку.

**Фактические уточнения архитектуры:** один GSAP ticker и native scroll в `src/app/SceneHost.tsx` заменили предложенный ScrollTrigger; DOM-метрики — `experience/domStory.ts`, абсолютные позы — методы `update` миров и `watchPose.ts`, отдельные `Experience.ts`/`CameraDirector.ts` не создавались. Миры называются `MonolithWorld`, `TimepieceWorld`, `FaroWorld`. Египет — точный исходный растровый портал и реальные экраны в `ProjectCover`/CSS, без вымышленного храма. Wordflow — исходный UI в iframe и проверенный adapter из `scripts/templates/wordflow-demo-state.mjs`; `WordflowDemo` находится внутри `CasePage.tsx`. Контент собран в `content/portfolio.ts`, notices — в `Credits.tsx`, стили — в `styles/site.css`. Имена файлов в первоначальных пунктах ниже — исходная раскладка плана; актуальная карта редактирования находится в README и разделе 9 спецификации.

В доступных каталогах skills/plugins не найдены `superpowers:subagent-driven-development` и `superpowers:executing-plans`, на которые ссылается шаблон навыка. Не объявлять их вызванными. Практический workflow выполняется доступными встроенными инструментами collaboration: ограниченные задания, закреплённые файлы, проверка результата, интеграция и независимый итоговый review. Установка неизвестного набора навыков не является зависимостью сайта.

Главный агент владеет package/lock, общими типами, canvas, навигацией и интеграцией. После задачи 3 отдельные исполнители могут параллельно работать над часами/FARO, Египтом/Wordflow и HTML-кейсами. Не более трёх дочерних агентов одновременно. Изменения общих интерфейсов согласуются с владельцем; исходные репозитории только читаются. Принятый этап фиксируется отдельным коммитом, без захвата чужой незавершённой работы. Независимый reviewer проверяет законченный модуль до включения зависимой работы; заключительный reviewer проверяет всё приложение.

## Карта файлов и общие контракты

| Группа файлов | Назначение и владелец |
| --- | --- |
| `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig*.json`, `index.html`, `.gitignore` | Сборка, команды, раннее содержание, исключения; главный агент |
| `src/content/{types,portfolio,credits}.ts` | Единый редактируемый контент; главный агент, затем контентный исполнитель |
| `src/app/{App,SceneHost}.tsx`, `src/main.tsx` | Маршруты и единственный canvas; главный агент |
| `src/experience/{types,story,CameraDirector,Experience,AssetManager,QualityManager}.ts` | Контракты и жизненный цикл; главный агент |
| `src/experience/worlds/`, `src/experience/materials/` | Три пластины и четыре мира; файлы поделены по задачам 4–6 |
| `src/navigation/`, `src/pages/`, `src/components/`, `src/styles/` | Переходы, страницы, демонстрации и оформление |
| `src/components/ProjectCover.tsx`, `src/styles/covers.css` | Крупные реальные экраны и общий контейнер обложек; главный агент определяет контракт, исполнители миров задают композицию |
| `scripts/prepare-wordflow-demo.mjs`, `public/demos/wordflow/`, `src/demos/wordflow-fixture.ts` | Контролируемая копия оригинального UI, синтетический набор и изоляция хранения; исполнитель кейсов |
| `assets/source/`, `public/assets/`, `public/assets/licenses/` | Редактируемые исходники, браузерные ассеты и notices |
| `src/dev/qa.ts`, `tests/`, `docs/qa/` | Воспроизводимые ошибки/замеры только в dev, тесты и доказательства |
| `remotion/src/`, `remotion/remotion.config.ts` | Отдельные композиции и экспорт; видеоисполнитель |
| `README.md`, `ASSET_SOURCES.md` | Запуск, редактирование, атрибуции, ограничения |

Контракты фиксируются в задаче 1, до параллельной реализации:

```ts
type ProjectId = 'timepiece' | 'faro' | 'egypt' | 'wordflow';
type ChapterId = 'intro' | 'passage' | ProjectId | 'about' | 'contact';
type WorldId = 'monolith' | ProjectId;
type Layout = 'wide' | 'narrow';
type Quality = { tier: 'desktop' | 'mobile' | 'low'; dpr: number; particles: number; transmission: boolean };
type ExperienceState = { chapter: ChapterId; progress: number; layout: Layout; reducedMotion: boolean };
type FrameState = { time: number; delta: number; pointer: [number, number]; state: ExperienceState };
type AssetLease<T> = { value: T; release(): void };
interface World {
  root: THREE.Group;
  load(signal: AbortSignal): Promise<void>;
  setProgress(progress: number): void;
  update(frame: FrameState): boolean; // whether another render is needed
  setQuality(quality: Quality): void;
  dispose(): void;
}
type WorldContext = { assets: AssetManager; quality: Quality; invalidate(): void };
type WorldFactory = (context: WorldContext) => World;
type SceneMode = { kind: 'story' } | { kind: 'case'; project: ProjectId; progress: number; selectedPart?: string };
type CameraPose = { position: [number, number, number]; target: [number, number, number]; fov: number };
type ScrollSnapshot = { y: number; chapter?: ChapterId; progress?: number; focusId?: string };
```

`THREE`, `AssetManager` — импорты типов из указанных модулей, не глобальные переменные. Миры не импортируют React, router, DOM или GSAP; они получают состояние снаружи. Времена — секунды, progress — [0,1], world transforms — абсолютные. `dispose()` безопасен при повторном вызове. Асинхронный `load()` после отмены не меняет активную сцену.

### Task 1: Рабочая HTML-основа, конфигурация и контракты

**Files:** создать конфигурацию сборки из карты выше; `src/{main.tsx,app/App.tsx,content/types.ts,content/portfolio.ts,content/credits.ts,experience/types.ts}`; `src/pages/{Home,CasePage,Credits,NotFound}.tsx`; `src/components/{Header,Footer}.tsx`; `src/styles/{tokens,base,layout}.css`.

**Interfaces:** производит типы выше; `portfolio: { author; projects: Project[]; projectOrder: ProjectId[] }`; `getProject(id: string): Project | undefined`. `Project` содержит `id,title,kicker,status,role,summary,challenge,techniques,repository,demo?,cover,media[],credits[]`; ссылка `demo` имеет явные `label,url,kind`. `cover` указывает реальный экран, исходный объект/карточки, визуальную идентичность и provenance; формат фиксирует владелец общих типов до параллельной работы.

- [ ] Проверить актуальную совместимость React/Vite/Three/GSAP/Router и Node 24 по официальной документации; закрепить версии и создать npm scripts `dev`, `typecheck`, `test`, `build`, `preview`.
- [ ] Установить только зависимости сайта и Vitest одним процессом; включить `.research/`, node_modules, dist, локальные QA-логи и секреты в `.gitignore`.
- [ ] Создать строгие общие типы и контент по актуальной спецификации; `docs/design/case-content.md` использовать для подтверждённых фактов, а прежние описания обложек/нового Wordflow-демо сверять с текущей правкой. Личный CTA пока ведёт на GitHub.
- [ ] Создать семь маршрутов: главная, четыре кейса, credits, 404. Первое смысловое содержание и ссылки видны до запуска Three; `index.html` содержит доступный стартовый экран и noscript-ссылки на работы.
- [ ] Запустить `npm run typecheck`, `npm run build` — оба exit 0; `npm run dev -- --host 127.0.0.1` — HTTP 200 на напечатанном Local URL. Открыть страницу штатным браузером и проверить русский текст/ссылки.
- [ ] Зафиксировать только завершённые файлы: `feat: add portfolio shell and content contracts`.

### Task 2: Проверенные браузерные ресурсы и атрибуции

**Files:** создать `assets/source/{timepiece,faro}/`, `assets/source/manifest.json`, `public/assets/{timepiece,faro,egypt,fonts,images,licenses}/`, `ASSET_SOURCES.md`, `scripts/check-assets.mjs`, `src/content/assets.ts`.

**Interfaces:** `assetManifest: Record<AssetId,{url,kind,bytes,source,license}>`; `AssetId = 'watch' | 'pizza' | 'watchParts' | 'egyptGateway' | 'egyptLandscape'`. Полная карта исходных путей — `docs/research/asset-transfer-map.md`.

- [ ] Скопировать точные `pocket-watch.glb`, `watch-parts.json`, `pizza-web.glb` и египетские `gateway.png` / `giza-world.png` по явному allowlist карты; египетские копии разместить в `public/assets/egypt/`. Добавить выбранные реальные экраны из проверенного сравнения в `public/assets/images/projects/`, не переносить папку review целиком. BLEND, исходный pizza.glb и генераторы сохранить в `assets/source/`, вне `public/`; структура `timepiece/assets/blender` сохраняет безопасные пути `parents[2]`. Создать manifest с исходным commit, SHA-256, автором, лицензией и изменениями каждого ресурса. Не заменять портал, пиццу или часы похожими моделями/генерациями.
- [ ] Перенести проверенные файлы шрифтов, нужные для живого HTML: Manrope для оболочки; Cormorant Garamond + Manrope для часов/Египта, Literata + Golos для FARO, Manrope + DM Serif Display для Wordflow. Пиксельный скриншот уже содержит исходную типографику. Исходные Manrope subsets объявлены как weight 400: не заявлять неподтверждённый variable range. Каждый дополнительный вес/семейство проверять по фактическому файлу и лицензии.
- [ ] Перенести точные notices: Rigsters/CC BY 4.0 и изменения модели; DejaVu; OFL/уведомления всех реально копируемых шрифтов; лицензии переносимых библиотек/изображений. Создать читабельный `/credits` из тех же данных.
- [ ] Создать `check-assets.mjs`: прочитать GLB JSON и manifest; проверять существование и сигнатуры файлов, 47 уникальных узлов данных часов и их присутствие в GLB, отсутствие sqlite/env/.openai в public. При несоответствии exit 1 с точным файлом.
- [ ] Запустить `node scripts/check-assets.mjs` — exit 0; сверить хеши копий с источниками. Проверить, что источники `.research` не изменены.
- [ ] Зафиксировать `chore: add verified project assets and credits`.

### Task 3: Жизненный цикл сцены, загрузка и адаптация качества

**Files:** создать `src/experience/{Experience,AssetManager,QualityManager}.ts`, `src/app/SceneHost.tsx`, `src/experience/resources.ts`, `src/dev/qa.ts`; тесты `tests/{asset-manager,quality,experience-lifecycle}.test.ts`.

**Interfaces:** `new AssetManager({resolveAsset:(id:AssetId)=>string,loadGLTF:(url:string,signal:AbortSignal)=>Promise<GLTF>})`; `acquireGLTF(id:AssetId, signal:AbortSignal): Promise<AssetLease<GLTF>>`, `dispose(): void`; `QualityManager.sample(frameMs:number): Quality`; `Experience.mount(canvas:HTMLCanvasElement): Promise<void>`, `setState(state:ExperienceState): void`, `setMode(mode:SceneMode): void`, `retry(): Promise<void>`, `dispose(): void`. Injectable renderer factory в Experience позволяет тестировать lifecycle без GPU; её результат имеет render/dispose и info. Мир клонирует иерархию GLTF перед изменением TRS, а общие geometry/material удерживает lease.

- [ ] Написать тесты: два lease одного ассета → release первого не освобождает второго; отменённый load не прикрепляет результат; после последнего release ресурсы освобождены ровно один раз; отказ loader позволяет повторный запрос. Проверить `leases=0`, `attached=0` после позднего ответа отменённого запроса.

  Ключевые assertions теста `shared_asset_survives_one_release`: `a.release(); expect(disposeSpy).not.toHaveBeenCalled(); b.release(); expect(disposeSpy).toHaveBeenCalledTimes(1)`. Для `aborted_load_cannot_attach`: `abort.abort(); await expect(pendingLease).rejects.toMatchObject({name:'AbortError'}); expect(attachSpy).not.toHaveBeenCalled()` после разрешения отложенного fake loader.
- [ ] Написать lifecycle-тест: mount → contextlost → retry → dispose дважды даёт не более одного canvas-owner и ноль активных callbacks; state до/после восстановления совпадает.
- [ ] Запустить `npm test -- --run tests/asset-manager.test.ts tests/experience-lifecycle.test.ts` — ожидается FAIL отсутствующих реализаций; затем реализовать модули, явный GLTF/Meshopt cleanup и poster/error/retry состояния.
- [ ] Подключить один GSAP ticker; контролировать dirty state, document visibility и render по потребности. Установить начальные DPR 1.5/1.25/1.0, частицы 140/50/0; применять понижение при устойчивом превышении бюджета кадров, с hysteresis, без колебаний каждый кадр.
- [ ] Добавить quality-тест: 180 медленных кадров переводят desktop в более дешёвый tier; один медленный кадр tier не меняет; DPR никогда не превышает лимит. Запустить три тестовых файла — PASS.
- [ ] В dev-only `qa.ts` дать переключатели отказа WebGL, одной ошибки watch/pizza и задержки загрузки; показывать состояние и показатели в диагностическом DOM. В production блок не монтируется. Проверить доступность HTML и retry в браузере.
- [ ] Зафиксировать `feat: add resilient scene lifecycle and asset loading`.

### Task 4: Монолит, первый кадр и проход сквозь поверхность

**Files:** создать `src/experience/worlds/Monolith.ts`, `src/experience/materials/{glass,studioLight}.ts`, `src/experience/{story,CameraDirector}.ts`, `src/components/Hero.tsx`, `src/styles/hero.css`; `tests/story.test.ts`; `assets/source/monolith/README.md` с параметрами/происхождением геометрии.

**Interfaces:** `createMonolith(context): World`; `sampleStory(chapter, progress, layout, reducedMotion): { world: WorldId; worldProgress: number; camera: CameraPose }`; `CameraDirector.apply(pose): void`. Граница narrow — 700 px. `chapter` для раскрытия — `passage`, его p=0…0.65 раскрывает пластины, p=0.65…1 проводит камеру внутрь.

- [ ] Написать тесты `sampleStory`: значения за диапазоном clamped; NaN → 0; p=0.6 → p=0.2 → p=0.6 даёт ту же позу; все числа конечны; конец passage и начало timepiece совпадают по camera; reduced motion возвращает устойчивый законченный кадр. Запустить — FAIL до реализации.

  Тест `reverse_seek_is_absolute`: `const expected = sampleStory('passage',0.6,'wide',false); sampleStory('passage',0.2,'wide',false); expect(sampleStory('passage',0.6,'wide',false)).toEqual(expected)`. Тест `passage_joins_timepiece`: `expect(sampleStory('passage',1,'wide',false).camera).toEqual(sampleStory('timepiece',0,'wide',false).camera)`.
- [ ] Построить три скошенные пластины с физической толщиной и фасками, металлическими торцами, ограниченным внутренним устройством и дешёвым отражением пола. Сохранить геометрию как редактируемый код; если найден Blender CLI, проверять `--version` до использования и не полагаться на неподключённый MCP.
- [ ] Реализовать абсолютное раскрытие и camera path, лёгкую инерцию света от pointer и затухающую локальную волну от raycast нажатия; при reduced motion отключить дополнительное движение.
- [ ] Собрать hero по одобренному кадру: LOXNE, подзаголовок, горизонт, меню и skip link. На 390 px заголовок над монолитом. Первый кадр должен работать самостоятельно без остальных миров.
- [ ] Запустить `npm test -- --run tests/story.test.ts` — PASS. В браузере проверить покой, клик, начало/середину/конец прохода и обратную прокрутку; сохранить реальные ключевые кадры в `docs/qa/`. Исправить силуэт, пересечения текста и пересвет до дальнейшей интеграции.
- [ ] Зафиксировать `feat: build monolith and surface passage`.

### Task 5: Миры часов и FARO

**Files:** создать `src/experience/worlds/{Timepiece,Faro}.ts`, `src/experience/timepiece/{types,partPose,parts}.ts`, `src/components/{TimepieceControls,ProjectCover}.tsx`, `src/styles/covers.css`; `tests/timepiece-pose.test.ts`. Контракт ProjectCover согласовать с главным агентом; другие исполнители используют его без одновременной правки общих файлов.

**Interfaces:** `createTimepiece(context): TimepieceWorld`, `createFaro(context): World`; `TimepieceWorld extends World` с `selectPart(id: string | null): void`; `evaluatePartPose(part, progress, out): PartPose`. Точный формат исходных 47 узлов берётся из asset map; nodeName не меняется.

- [ ] Написать тесты абсолютной разборки: p=0 возвращает rest, p=1 — rest+offset, обратный ход не накапливает сдвиги, quaternion нормализован, 47 деталей валидны. Запустить тест — FAIL, затем реализовать/адаптировать чистое вычисление с сохранением provenance.

  Тест `back_cover_returns_to_rest`: `expect(evaluatePartPose(backCover,0,pose).position).toEqual(backCover.restPosition)` после вызова на p=1; `expect(Math.hypot(...pose.quaternion)).toBeCloseTo(1,6)`. Тест `manifest_has_47_unique_carriers`: `expect(new Set(parts.map(p=>p.nodeName)).size).toBe(47)`.
- [ ] Собрать обложки из крупных реальных экранов оригиналов и точных моделей по принятому результату review-v2. У часов сохранить тёмно-синий `#0e1620`, латунь `#c49b5c`, Cormorant/Manrope, подписи и управление; у FARO — Literata/Golos, кремовый фон/текст, коралл `#e66744` и настоящее меню. Текст и контролы оболочки остаются HTML; на mobile экран не превращается в нечитаемую миниатюру.
- [ ] Загрузить часы через AssetManager; сохранить исходные материалы, читаемую латунь, сталь, циферблат и боковой ракурс. Перестроить движение в 3–4 визуальные группы; mobile раскрывается преимущественно по вертикали. Сохранять отдельный выбор узла и HTML-подпись в кейсе. Камера после показа механизма возвращает внимание к узнаваемому экрану.
- [ ] Загрузить FARO через MeshoptDecoder, дополнить исходную пиццу тёмной керамикой и тёплым внешним светом. `#F4A04B` относится только к освещению вне экрана; UI сохраняет исходные цвета. Камера делает короткий облёт около 60° и останавливается рядом с крупным настоящим меню; кадр средний/низкий, без экстремального макро скана. Не переносить весь исходный renderer.
- [ ] Запустить pose-тест — PASS и asset check — exit 0. В браузере сравнить обе обложки с оригиналами, проверить модели, материалы, читаемость экранов, повторное появление после ухода и 390 px. FARO должен занимать самостоятельный полноценный эпизод с настоящим меню.
- [ ] Зафиксировать `feat: stage timepiece and FARO worlds`.

### Task 6: Миры Египта и Wordflow

**Files:** создать `src/experience/worlds/{Egypt,Wordflow}.ts`, `src/experience/geometry/{portal,interfacePlates}.ts`.

**Interfaces:** `createEgypt(context): World`, `createWordflow(context): World`; тот же World/WorldContext без DOM-зависимости. Общий ProjectCover соединяет крупные реальные экраны с геометрией; интерактивный Wordflow — оригинальный HTML из задачи 7, не новая canvas-карточка.

- [ ] Построить египетскую обложку вокруг крупного оригинального первого экрана, точных `gateway.png` и `giza-world.png`: сохранить резьбу, проём, Cormorant/Manrope, музейное меню и песочную палитру `#342518` / `#e9d0b1` / `#dcb878`. Дополнительные боковые грани, глубина и свет находятся за исходным фасадом и внутри того же проёма; не заменять его обобщённым новым храмом. Частицы берутся из Quality, повторяющаяся геометрия использует instancing.
- [ ] Построить Wordflow вокруг большого реального экрана и исходных карточек, цветов `#0d1018` / `#c4b6f5` / `#91d9ba`, Manrope/DM Serif Display. Тонкие пластины обрамляют экран и собираются в спокойную композицию; форма телефона допустима только как рамка оригинального UI. В narrow-layout приоритет у оригинального адаптивного HTML из задачи 7, не у нового оформления карточек.
- [ ] Проверить оба мира рядом с оригиналами: экран/портал/карточки узнаваемы в начале, середине и конце, reverse scroll и reduced motion не скрывают фактическую работу. Проверить масштаб, читаемость и отсутствие слипшихся граней/текстурных артефактов. `npm run typecheck` — exit 0.
- [ ] Зафиксировать `feat: stage Egypt and Wordflow worlds`.

### Task 7: Полные кейсы и изолированное демо Wordflow

**Files:** доработать `src/pages/{CasePage,Credits}.tsx`, `src/content/portfolio.ts`; создать `src/components/{CaseMedia,WordflowDemo,Showreel}.tsx`, `src/demos/wordflow-fixture.ts`, `scripts/prepare-wordflow-demo.mjs`, `public/demos/wordflow/`, `src/styles/{case,demos}.css`; `tests/wordflow-isolation.test.ts`.

**Interfaces:** `WordflowDemo` размещает контролируемую копию оригинального UI, например в same-origin iframe с отдельным путём и ограниченной связью с оболочкой. Он не принимает profile id и не импортирует профильный сетевой клиент. Синтетический набор из шести слов готовится в поддерживаемом исходным приложением формате; переворот, ответы, прогресс и словари выполняет оригинальная логика. Подготовка копии должна воспроизводимо сохранять исходные HTML/CSS/JS и перечислять только изменения запуска, фикстуры, отключения интеграций и изоляции хранения. `CaseMedia` получает manifest медиа; `Showreel` — poster/src, без autoplay.

- [ ] Подготовить allowlist копии Wordflow из оригинальных HTML и используемых model/activity/library JS/CSS. Исключить Telegram SDK, профильный клиент, рабочие базы и обращения к реальным профилям. Оригинальный checkout оставить без изменений; перечень адаптаций и исходные хеши включить в provenance. Не подменять интерфейс новым reducer или придуманной очередью обучения.
- [ ] Изолировать все фактически используемые storage-ключи копии, например префиксом `loxne-portfolio:wordflow-demo:v1:`; отдельный URL на том же origin сам по себе storage не изолирует. Проверить чтения и записи исходного кода: одной подстановки `WordflowStorage` недостаточно, если остаются прямые обращения к localStorage. Загрузить шесть синтетических слов через существующий формат приложения. Сброс очищает только демо-пространство и восстанавливает эту фикстуру; не показывать фиктивное успешное облачное сохранение.
- [ ] Проверить изоляцию тестами подготовленной копии: реальные профильные endpoint/SDK не подключены, все используемые ключи принадлежат демо, reset не затрагивает соседние ключи, исходные файлы и визуальные ресурсы не переписаны. Тесты защищают границу данных и воспроизводимую адаптацию, а не новый алгоритм карточек.
- [ ] Наполнить четыре кейса: задача, фактическая роль/статус, главный приём, крупная обложка с реальным экраном и оригинальным объектом/карточками, реальные экраны, технические решения, ссылки и следующий кейс. У часов — slider и выбор детали в единственном основном canvas; у Wordflow — оригинальное автономное HTML-демо; FARO ссылается на проверенное внешнее демо; Египет показывает исходный сайт и явно подписанную новую сценическую глубину.
- [ ] Использовать проверенные реальные экраны и исходные URL из `docs/design/review-v2/SOURCES.md`: `127.0.0.1:4311`, `127.0.0.1:4312/scene-3d/`, `127.0.0.1:4313`, `127.0.0.1:4314`. При необходимости повторного capture сначала подтвердить, что соответствующее приложение снова работает; сохранять скриншоты штатным браузерным инструментом. Wordflow в исследовательском preview — оригинальный UI с синтетическими данными, не проверка Telegram/backend. Помечать новую презентационную композицию отдельно от оригинального экрана.
- [ ] Проверить `npm test -- --run tests/wordflow-isolation.test.ts` — PASS. В браузере сверить вид с оригинальным UI и выполнить переворот → три вида ответа → прогресс → словарь → reset; поведение очереди сверять с исходником, не обещать неподтверждённые функции. Открыть каждый кейс напрямую и все реальные ссылки. Не ставить кнопку демо без действительного назначения.
- [ ] Зафиксировать `feat: add complete cases and isolated Wordflow demo`.

### Task 8: Изогнутая шторка, history и восстановление фокуса

**Files:** создать `src/navigation/{TransitionController,ScrollMemory}.ts`, `src/navigation/{NavigationProvider,PortfolioLink,TransitionSurface}.tsx`, `src/styles/transitions.css`; тесты `tests/{transition,scroll-memory}.test.ts`; подключить в App.

**Interfaces:** `NavigationRequest = {key,path,kind:'push'|'replace'|'pop',scroll:'top'|'restore'|{project:ProjectId}}`; `createTransitionController({cover,swap,uncover,onError}): {request(req):void; dispose():void; state:TransitionState}`; `cover/uncover():Promise<void>`, `swap(req):Promise<void>`. `ScrollMemory.save(key,snapshot)`, `get(key):ScrollSnapshot|undefined`; `resolveGalleryReturn(project,saved):ScrollSnapshot` выбирает сохранённое место или заголовок проекта.

- [ ] Написать тесты: во время cover запрос timepiece → faro → egypt приводит к последнему ожидающему egypt; одинаковый клик не повторяет swap; rejected cover/swap/uncover возвращает idle и снимает блокировку; POP не создаёт PUSH. Fake promises позволяют проверить промежуточное covered-состояние без ожиданий времени. Запустить — FAIL.
- [ ] Написать scroll memory тест: записи history с одинаковым URL и разными ключами сохраняют разные y; при отсутствии сохранения `resolveGalleryReturn('faro', undefined)` выбирает главу faro, спокойный progress и focusId её заголовка. Запустить — FAIL.

  Тест `direct_case_returns_to_its_exhibit`: `expect(resolveGalleryReturn('faro',undefined)).toMatchObject({chapter:'faro',progress:0.72,focusId:'world-faro-title'})`. Для очереди `latest_request_wins`: после разрешения cover ожидать `expect(swappedPaths.at(-1)).toBe('/work/egypt'); expect(controller.state).toBe('idle')`; после rejected swap — также idle и `expect(onError).toHaveBeenCalledTimes(1)`.
- [ ] Реализовать controller с токеном актуальности и одним queued request; длительность около 1 с. Разделить адрес router и отображаемую страницу до covered, чтобы POP не показывал новый контент раньше шторки; окончательное разблокирование в finally.
- [ ] Реализовать curved CSS/SVG-мембрану, название следующего кейса, согласованный уход/появление HTML, фокус и scroll restoration. Внутренние ссылки сохраняют href и стандартные модификаторы; prefetch только по hover/focus/близости главы и разрешённому качеству сети.
- [ ] Запустить оба тестовых файла — PASS. В браузере проверить все четыре входа, next case, прямой вход → возврат, Back/Forward, rapid click и reduced motion; после каждой ошибки ссылки работают.
- [ ] Зафиксировать `feat: add curved route transitions and gallery restoration`.

### Task 9: Общая режиссура, финальный знак и второстепенные эффекты

**Files:** доработать `src/pages/Home.tsx`, `src/experience/{story,CameraDirector,Experience}.ts`, `src/experience/worlds/Monolith.ts`; создать `src/experience/ScrollDirector.ts`, `src/components/{About,Contact,ProximityName,MorphText}.tsx`, `src/styles/{story,effects}.css`; `tests/scroll-layout.test.ts`.

**Interfaces:** `ScrollDirector.refresh(layout:Layout):void`, `getSnapshot():ScrollSnapshot`, `restore(snapshot:ScrollSnapshot):void`, `dispose():void`; `mapViewportChange(snapshot:ScrollSnapshot, metrics:{chapters:Partial<Record<ChapterId,{start:number;end:number}>>;maxY:number}):number` возвращает новый y, сохраняя главу/progress. SceneHost хранит один canvas и переключает story/case mode вместо создания второго renderer.

- [ ] Сначала написать test: resize с 1440×900 на 390×844 при середине FARO сохраняет chapter=faro и progress с точностью 1e-3; повторный refresh не добавляет trigger. Запустить — FAIL, затем реализовать mapping и cleanup.

  Тест `resize_preserves_faro_progress`: при `metrics={chapters:{faro:{start:3000,end:5000}},maxY:9000}` `expect(mapViewportChange({y:6000,chapter:'faro',progress:0.5},metrics)).toBe(4000)`. При отсутствующей главе clamp сохранённого y в 0…maxY. Browser-проверка подтверждает `Math.abs(restoredProgress-0.5)<0.001`.
- [ ] Собрать порядок intro → passage → timepiece → faro → egypt → wordflow → about → contact. Стартовая длина desktop 13,3 viewport, mobile 11; durations и camera stops редактируются в story.ts. Из DOM-метрик вычислять только активную главу/локальный progress.
- [ ] Реализовать финальный отъезд и сборку трёх частей в знак; миры уменьшаются до внутренних фрагментов. Добавить автора/процесс, контакт с GitHub и Showreel по явной кнопке.
- [ ] Добавить proximity только имени, morph только в блоке автора, liquid-metal только CTA. Сохранять статичную доступную строку и reduced motion. Не добавлять архив/Image Trail без содержательной потребности.
- [ ] Проверить обратимость всего маршрута, skip intro, постоянное меню, правильную подгрузку соседа и отсутствие фонового движения во время чтения. `npm test -- --run tests/scroll-layout.test.ts tests/story.test.ts` — PASS.
- [ ] Зафиксировать `feat: connect the full portfolio journey`.

### Task 10: Remotion, реальные превью и шоурил

**Files:** создать `remotion/src/index.ts`, `remotion/src/{Root,Showreel,WorldShot,CaseShot}.tsx`, `remotion/src/timing.ts`, `remotion/remotion.config.ts`; root npm workspace и `remotion/package.json`; добавить `remotion:studio`, `video:render` в root package; выходы `public/assets/video/`, poster в `public/assets/images/`; `docs/qa/video.md`.

**Interfaces:** `WorldShot({world:WorldId,progress:number,camera:CameraPose}):ReactElement`; `Showreel` — 660 frames, 30 FPS, 1920×1080. Детерминированный progress и time вычисляются из текущего кадра, не GSAP/RAF. Миры получают тот же контракт из задачи 3; видеоадаптер не вызывает Experience.mount.

- [ ] Прочитать актуальные Remotion router/create/studio/render и официальные рекомендации из `docs/research/remotion-execution.md`. Создать scaffold поддерживаемой командой `npx create-video@4.0.534 --yes --blank --no-tailwind remotion`; не запускать генератор в корне. Владелец package объединяет его с root npm workspace и одним lockfile; React/Three должны разрешаться в единственном экземпляре. Все remotion/@remotion пакеты закрепить на 4.0.534, bridge выбрать совместимый с уже проверенными версиями сайта.
- [ ] Установить отсутствующие зависимости и **сразу открыть работающую Studio до авторинга основной композиции**, как требует установленный навык. Использовать точный напечатанный URL. Затем `npx remotion browser ensure` из remotion/ готовит поддерживаемый browser для export; не подставлять произвольный desktop Chrome без проверки.
- [ ] Реализовать WorldShot через ThreeCanvas/общие procedural worlds: ожидание GLB через useDelayRender/continueRender и cancelRender при ошибке; pose синхронно применяется в useLayoutEffect до capture, dispose после shot. Все frame transforms абсолютны, частицы seeded; никаких useFrame, GSAP ticker, Date.now или накопления rotation. Renderer получает bundle Remotion, а не URL Vite.
- [ ] Собрать 22-секундный монтаж: 0–3 монолит, 3–7 часы, 7–11 FARO, 11–15 Египет, 15–19 Wordflow, 19–22 знак. В каждом проектном эпизоде крупный реальный интерфейс сочетается с оригинальным объектом/карточками, сохраняя текущую композицию обложек и исходную идентичность. Сохранить происхождение кадров; не выдавать детерминированный 3D-рендер за браузерную запись. Отдельные короткие project-превью 4–6 с использовать в кейсах по необходимости.
- [ ] Проверить Studio: начало, стыки, середина каждого мира, финал; повторно перейти к одному кадру после разных seek-последовательностей — pose/материалы совпадают, frame 0 готов. Затем выполнить `npx remotion render src/index.ts PortfolioShowreel out/portfolio-showreel.mp4 --codec=h264 --pixel-format=yuv420p --crf=18 --gl=angle --concurrency=2 --muted` из remotion/. Проверить через `npx remotion ffprobe`: 1920×1080, 30 FPS, 660 кадров/22 с. Не использовать найденный в Playwright ffmpeg без H.264 для финального экспорта.
- [ ] Встроить video controls, preload=none/metadata и poster; mobile не загружает видео до взаимодействия/видимости. Шоурил работает без звука; reduced motion не запускает autoplay. Проверить финальный MP4 в браузере.
- [ ] Зафиксировать `feat: add Remotion showreel and project previews`.

### Task 11: Адаптация, ошибки, производительность и визуальная доводка

**Files:** корректировать только обнаруженные проблемы в сценах/CSS/навигации; создать `docs/qa/{browser-matrix,performance,known-limits}.md` и фактические screenshots/короткие видео-подтверждения в `docs/qa/`.

**Interfaces:** существующие dev-only QA-переключатели задачи 3; read-only DOM-показатели активной главы, tier/DPR, frame intervals, canvas count, renderer.info. Не создавать технические панели в product flow.

- [ ] Выполнить размеры 360,390,768,1440,1920, дополнительно 1440×600 и 390×900; текст 200%. Проверить каждый мир, кейс, меню, контакт и длинные заголовки, горизонтальное переполнение и цели 44 px. Сохранить репрезентативные реальные кадры.
- [ ] Сопоставить каждую обложку с оригиналом и принятым результатом review-v2: экран крупный и читаемый, модель/портал точные, шрифты и цвета сохранены, FARO показывает реальное меню, Wordflow — исходные карточки/интерфейс. Свет и блики не перекрашивают экран и не закрывают текст. Синтетические данные Wordflow явно обозначены, облачная работоспособность не подразумевается.
- [ ] Выполнить три browser regression-сценария Review Focus: быстрые разные клики + Back во время шторки; задержанный GLB + уход; прямой кейс + возврат без snapshot. Проверить фокус, отсутствие freeze и правильный конечный маршрут.
- [ ] В середине прохода изменить reduced motion и размеры: один canvas/набор triggers, сохранённая глава, статичный законченный кадр и доступный HTML. Проверить смену обратно.
- [ ] Через dev QA выполнить WebGL unavailable, contextlost, повторную ошибку retry, затем успешное восстановление: постер остаётся до готовности, текст/ссылки доступны, глава восстановлена, canvas=1.
- [ ] Измерить после прогрева 30-секундные участки desktop и narrow viewport; сохранить median/p95 frame interval, tier/DPR и renderer.info. Пять циклов gallery → 4 cases → gallery не должны монотонно накапливать ресурсы. При снижении FPS корректировать transmission/texture/DPR по наблюдению, а не объявлять цель достигнутой без замеров.
- [ ] Исправить конкретные визуальные дефекты: пересвет, плоский металл, слишком мелкий объект, пересечение текста, слабая фактура FARO, резкий camera seam. Повторять только затронутые проверки. Отдельно отметить отсутствие проверки реального телефона, если доступен лишь desktop браузер.
- [ ] Зафиксировать `fix: refine responsive scenes and verified edge cases`.

### Task 12: Production build, независимый review и передача

**Files:** завершить `README.md`, `ASSET_SOURCES.md`, `docs/qa/known-limits.md`; финальный build в `dist/`, остальные изменения только по найденным дефектам.

**Interfaces:** README указывает `npm install`, `npm run dev`, `npm run build`, `npm run preview`, команды Studio/render; редактирование автора/кейсов в portfolio.ts, движения в story.ts, качества в QualityManager.ts; пути GLB/BLEND/Remotion.

- [ ] Выполнить `npm run typecheck`, `npm test -- --run`, `node scripts/check-assets.mjs`, `npm run build` — все exit 0. Проверить отсутствие `.research`, sqlite, `.blend` и исходных приватных конфигураций в dist; Remotion runtime не попадает в browser chunks.
- [ ] Поручить свежему reviewer проверить интеграцию относительно спецификации, факты/атрибуции, маршрут/ошибки и соответствие заявленных проверок evidence. Исправить actionable findings и повторить только затронутые проверки плюс build при изменениях продукта.
- [ ] Запустить production preview в удерживаемой сессии на 127.0.0.1; проверить HTTP 200, прямой URL кейса и один полный переход. Открыть точный напечатанный URL пользователю; не публиковать сайт.
- [ ] Зафиксировать финальные исходники, инструкции и результаты: `docs: finalize portfolio handoff and validation`.
- [ ] Передать точный работающий URL, ключевые скриншоты, MP4, команды, места редактирования, источники и ограничения. Явно различить browser QA, unit tests, замеры desktop и реальные устройства; не называть готовым при обязательном незавершённом пункте.

## Порядок и параллельные участки

После review пользователь разрешил продуктовую реализацию. Зависимости плана сохраняются: 1 → 2 → 3 → 4 задают основу и планку изображения. После 3 задачи 5/6 могут выполняться в отдельных файлах, но художественная интеграция требует проверки 4 и сравнения с оригиналами. Задача 7 идёт параллельно с 4–6 после готовности контента/ассетов. Задача 8 выполняется владельцем App/navigation без конфликта с world-модулями. Затем 9 объединяет результаты. Задача 10 использует общие сцены 9; ограниченная адаптация 11 может идти параллельно, без изменения world-контрактов. Задача 12 закрывает проект только после фактической проверки; согласие на реализацию её не заменяет.

## Самопроверка плана

Покрытие спецификации: образ/типографика/проход — 4; реальные экраны, оригинальные объекты и четыре мира — 2,5–6; кейсы/контакты/семантика и исходный UI Wordflow с изолированными данными — 1,7; переходы/история — 8; ресурсы/ошибки/адаптация — 2,3,9,11; эффекты — 9; видео — 10; проверка и передача — 11–12. Шесть Review Focus привязаны к тестам/браузерным сценариям. Типы World/FrameState/SceneMode/ScrollSnapshot едины; зависимости Remotion изолированы. Текущее сравнение не объявлено готовым портфолио или всеобщим одобрением новых макетов; ранее предложенный новый reducer Wordflow и переоформление оригинального FARO исключены. Этот перечень покрытия не заменяет независимый review плана.

## Итог исполнения, 2 ноября

Продуктовая реализация задач 1–10 выполнена с описанными выше архитектурными уточнениями. Для задачи 11 сохранены реальные кадры, замер активного рендера, 141 автоматический тест и браузерные результаты в `docs/qa/acceptance.md`. Задача 12: build, источники, инструкции, MP4 и production preview 4316 готовы. Подробные checkbox исходного плана являются исходным checklist: составные пункты, где не выполнена каждая названная проверка (физический телефон, text zoom, системное переключение reduced motion, принудительная потеря контекста), намеренно не помечены целиком. Это ограничения проверки, перечисленные явно в итоговом отчёте; не скрытая незавершённая продуктовая функция.

Сводка реализации: Task1 HTML/routes/content — готово; Task2 original assets/demo isolation — готово; Task3 lifecycle/quality — готово и регрессионно проверено; Task4 monolith — готово; Task5 watch/FARO — готово; Task6 Egypt/Wordflow presentation — готово; Task7 cases/demo — готово; Task8 navigation — готово; Task9 integration — готово; Task10 22s Remotion — готово. Точные файлы и способы редактирования перечислены в README. Публикация не выполнялась.
