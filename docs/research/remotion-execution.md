# Remotion: проверенный путь исполнения на Windows

Дата: 2 ноября 2026 года. Дизайн одобрен; реализационный план ещё ожидает review. Здесь описан будущий workflow, а не выполненный экспорт. Зависимости не устанавливались, Studio и продуктовые серверы не запускались.

## Результат исследования

Настоящий 3D-шоурил можно создавать из общих модулей Three.js через отдельный адаптер `@remotion/three` / `ThreeCanvas`, а затем экспортировать штатным renderer Remotion. Это детерминированный рендер композиции, а не запись управления сайтом. Запись браузерного взаимодействия через CUA этим решением не обещается. Реальные экраны кейсов сохраняются отдельно через поддерживаемые скриншоты браузера.

Прочитаны реальные навыки установленного пакета **4.0.534**: `remotion-best-practices`, `remotion-create`, `remotion-studio`, `remotion-render`, `remotion-markup`, `remotion-docs`. Дополнительно прочитаны `video-layout.md`, `compositions.md`, `multi-scene-video.md`, `video-editing.md`, `connected-compositions.md`, `transitions.md`, `3d.md`, `ffmpeg.md`. Корень пакета: `C:/Users/loxne/.codex/plugins/cache/openai-curated-remote/remotion/4.0.534/skills/`.

У router часть относительных ссылок содержит устаревшее `REFERENCE.md`; соответствующие актуальные инструкции найдены в соседних каталогах как `SKILL.md`. Новая установка плагина не требуется.

## Фактическое состояние машины

| Компонент | Проверено | Что это означает |
| --- | --- | --- |
| ОС / Node | `win32`, `x64`, Node **24.20.0**, npm **11.19.0**, Git доступен | Базовые инструменты присутствуют |
| Remotion runtime | В рабочем проекте нет `node_modules` и каталога `remotion`; в bundled `node_modules` Remotion не найден | Навыки установлены, исполняемый проект пока не подготовлен |
| Chrome | `C:/Program Files/Google/Chrome/Application/chrome.exe`, **156.0.8078.76** | Подходит для обычного preview; не заменяет проверку renderer |
| Edge | `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`, **156.0.4314.58** | Дополнительный установленный браузер |
| GPU | WMI: **NVIDIA GeForce RTX 3060 Ti**, driver **32.0.15.9186** | Есть кандидат для ANGLE; работоспособность именно Remotion/WebGL не проверена |
| Системные FFmpeg / FFprobe | В PATH не найдены | Это не блокер: Remotion предоставляет свои CLI-обёртки |
| Playwright cache | Есть Chromium 1243, headless shell и `ffmpeg-1011/ffmpeg-win64.exe` | Наличие файлов не является разрешением использовать другой browser-control канал |
| Cached FFmpeg | Запущен только `-version`: `n7.0.1-playwright-build-1011`, урезанная сборка с VP8/WebM, без H.264 | **Не подходит для финального MP4** |

Bundled runtime обнаружен штатным `load_workspace_dependencies`: Node в `C:/Users/loxne/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`, пакеты рядом в `node_modules`. Полный поиск всех дисков не выполнялся; глобальное отсутствие Remotion нигде на машине не утверждается. Значение VRAM из Win32_VideoController не используется: это поле может обрезаться для современных карт.

## Поддерживаемые пакеты и версии

Npm registry подтвердил существование версии **4.0.534** для `remotion`, `@remotion/cli`, `@remotion/three`, `@remotion/renderer`, `@remotion/media`, `@remotion/transitions` и `create-video`. Все пакеты `@remotion/*` в проекте следует закрепить одной версией; файл навыка сам по себе не закрепляет npm-зависимости.

Минимальный набор видео: `remotion`, `@remotion/cli`, `@remotion/three`, `@react-three/fiber`, React/React DOM, Three и типы. `@remotion/media` нужен для FARO-клипа и других видео; `@remotion/transitions` — для монтажных переходов. Для обычного CLI-экспорта прямой импорт `@remotion/renderer` не нужен; если пишется Node-скрипт renderer, добавить его явно. Не добавлять облачный рендер, Player или отдельную платформу экспорта.

Проверенный по peer metadata кандидат: React/React DOM **19.3.1**, Fiber **9.8.2**, Three / `@types/three` **0.187.0**, Remotion **4.0.534**. Fiber 9.8.2 требует React `>=19 <19.4`, Three `>=0.156`; `@remotion/three` 4.0.534 принимает Fiber `>=8` и Three `>=0.137`. Это совместимость диапазонов, **не результат сборки**. Если сайт закрепит другую совместимую версию Three, видео использует ту же. В video bundle должен разрешаться один экземпляр React и Three: единая workspace-установка либо явные aliases при отдельном подпроекте; не оставлять случайные дубликаты при импорте общих модулей из `../src`.

Источники метаданных: [@remotion/three 4.0.534](https://registry.npmjs.org/@remotion%2fthree/4.0.534), [Fiber](https://registry.npmjs.org/@react-three%2ffiber/9.8.2), [Three](https://registry.npmjs.org/three/0.187.0). Перед установкой проверить существующий lockfile; приведённый кандидат не требует обновлять уже выбранные совместимые версии.

## Обязательный порядок подготовки

1. После review плана создать Remotion-подпроект в `remotion/`: корень репозитория содержит значимые файлы и не пуст. Не удалять `.git`, docs или пользовательский промпт ради scaffold. Версионированный вариант команды из create skill: `npx create-video@4.0.534 --yes --blank --no-tailwind remotion`. Сохранить scaffold и зафиксировать зависимости/lockfile.
2. Установить отсутствующие пакеты. Для добавлений Remotion использовать его `npx remotion add @remotion/three`, аналогично media/transitions; проверить итоговые версии. Этот шаг ещё не выполнялся.
3. **Сразу после работоспособного scaffold, до написания или изменения композиции**, запустить из подпроекта `npx remotion studio --no-open`. Открыть точный напечатанный URL в доступном in-app browser и проверить Studio. Не угадывать порт. Держать preview открытым во время авторинга. Требование взято из create/studio skills; финальный экспорт не заменяет эту проверку.
4. Подготовить совместимый Chrome Headless Shell через `npx remotion browser ensure`; эта команда может скачать браузер и выполняется только на разрешённой стадии реализации. Windows x64 поддерживается. По текущей документации Remotion 4.0.534 закрепляет Chrome **157.0.8080.0**, поэтому установленный desktop Chrome 156 не надо подставлять вслепую. [Chrome Headless Shell](https://www.remotion.dev/docs/miscellaneous/chrome-headless-shell), [browser ensure](https://www.remotion.dev/docs/cli/browser/ensure).
5. Создать композиции, проверить их прямое открытие и просмотр в Studio, затем пробные кадры и окончательный экспорт. Промпт пользователя уже явно поручает экспорт подходящих MP4/WebM для интеграции; дополнительное разрешение на сам экспорт не требуется.

Если in-app browser временно недоступен, следовать разрешённому preview-пути skill и сообщить фактическое ограничение. Не применять macOS Terminal troubleshooting к Windows. Polling `--webpack-poll 1000` нужен только после реального watcher-сбоя, а не заранее.

## Структура и монтаж

Предлагаемые файлы: `remotion/src/index.ts`, `Root.tsx`, `PortfolioShowreel.tsx`, `scenes/{Monolith,Timepiece,Faro,Egypt,Wordflow,Finale}.tsx`, `adapters/WorldScene.tsx`, `remotion/public/` для явного списка медиа и `remotion/out/` для промежуточных результатов. Итоговые MP4/poster копируются в сайт через явный asset manifest, а не вместе со всем подпроектом.

Основная регистрация — `PortfolioShowreel`, **1920×1080, 30 FPS, 660 кадров (22 секунды)**. Шесть глав: 90 + 120 + 120 + 120 + 120 + 90 кадров. Каждая существенная сцена имеет собственный JSX-узел и отдельную connected composition для редактирования. Метаданные и timing остаются inline. Все временные эффекты вычисляются от `useCurrentFrame()` / `useVideoConfig()`, без CSS animation/transition. Timed nodes с поддержкой premount получают `premountFor={fps}`.

Переходы можно сделать overlays на границах, сохранив 660 кадров. Если выбраны перекрывающиеся `TransitionSeries.Transition`, прибавить перекрытие к длительностям исходных сцен так, чтобы после вычитания переходов осталось ровно 660; иначе конец будет обрезан или останется пустым. Внешняя видео-композиция не импортируется в entry сайта. Для клипов использовать `<Video>` из `@remotion/media`, для локальных ресурсов — `staticFile()`.

## Контракт общих 3D-модулей

Общий модуль не владеет canvas, ticker, DOM, scroll или маршрутизатором. Предлагаемый контракт для плана:

| Операция / данные | Назначение |
| --- | --- |
| `loadAssets({resolveAsset, signal})` | Подготовить GLB, текстуры и окружение; вернуть контролируемые ресурсы |
| `createWorld(assets)` | Создать независимый `THREE.Group` и данные rest pose; не запускать animation loop |
| `sampleWorld({chapter, progress, timeSeconds, layout, quality, seed})` | Чисто вычислить позу объекта, камеру, свет и shader uniforms |
| `applyState(world, state)` | Синхронно применить абсолютное состояние; повтор того же input даёт тот же кадр |
| `dispose()` | Освободить собственные ресурсы; общие — после освобождения последнего владельца |

Сайт подаёт scroll-progress и использует свой единственный ticker. Remotion подаёт `frame / fps`, фиксированные quality/seed и отдельный монтажный progress. Частицы используют seeded исходные координаты и абсолютные формулы; инерцию pointer/site smoothing в видео заменяет заданная кривая. `Date.now`, текущий FPS, `Math.random`, накопление `rotation += delta` и самозапускающиеся shader clocks для видеорендера непригодны.

Адаптер обязан использовать `<ThreeCanvas width={width} height={height}>`, освещение и `<primitive object={world.group}>` либо декларативные группы. Frame берётся из `useCurrentFrame()`. Синхронные мутации общих модулей выполняются в `useLayoutEffect` до встроенного frame-render effect. В 4.0.534 исходник ThreeCanvas действительно отключает собственный frame loop при export и вызывает `advance()` для кадра. `useFrame()` запрещён навыком; отдельный RAF/GSAP ticker здесь не запускается. [ThreeCanvas](https://www.remotion.dev/docs/three-canvas), [исходник v4.0.534](https://github.com/remotion-dev/remotion/blob/v4.0.534/packages/three/src/ThreeCanvas.tsx).

Пока GLB/текстуры не готовы, `useDelayRender()` удерживает capture; успех вызывает `continueRender`, ошибка — `cancelRender`. В Studio эта блокировка не останавливает preview сама по себе, поэтому показывается понятное состояние загрузки и при необходимости используется buffering API. Не снимать frame 0 до применения позы/материалов. [Delay render](https://www.remotion.dev/docs/delay-render).

Для Three.js на desktop Remotion 4 рекомендует `--gl=angle`. При Node API требуется `chromiumOptions: {gl: 'angle'}`: CLI config на эти вызовы не распространяется. При недоступной GPU допустим проверенный `swangle`, потенциально значительно медленнее. В export качество фиксируется, adaptive DPR отключается. [3D setup](https://www.remotion.dev/docs/three), [GL options](https://www.remotion.dev/docs/gl-options).

## Проверка и экспорт после авторинга

Команды ниже — планируемые, пока не выполнены. Они выполняются из `remotion/` и предполагают стандартный scaffold entry `src/index.ts`:

```powershell
npx remotion render src/index.ts PortfolioShowreel out/keyframes --frames=0,89,90,209,210,329,330,449,450,569,570,659 --image-format=png --gl=angle --concurrency=1
npx remotion render src/index.ts PortfolioShowreel out/portfolio-showreel.mp4 --codec=h264 --pixel-format=yuv420p --crf=18 --gl=angle --concurrency=2 --muted
npx remotion ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames:format=duration -of json out/portfolio-showreel.mp4
```

Низкая concurrency — исходная настройка для проверки памяти, не обещание скорости. Перед финалом: посмотреть все шесть сцен в Studio; проверить 0-й и последний кадры; seek вперёд/назад; дважды отрендерить выбранный кадр после разных seek-последовательностей; сверить shader/textures/fonts; проверить стыки и отсутствие лишних кадров. Затем открыть MP4, проверить 1920×1080, 30 FPS, 660 кадров / 22 с, текст и разрешение движения. Только прошедший проверку файл копируется в `public/assets/video/` сайта. [Render CLI](https://www.remotion.dev/docs/cli/render), [FFprobe CLI](https://www.remotion.dev/docs/cli/ffprobe).

`renderFrames()` поддерживает сохранение кадров, но для обычного MP4 документация предпочитает `renderMedia()`/CLI render. `serveUrl` у renderer означает **bundle Remotion**, а не произвольный Vite URL сайта. Передать адрес портфолио и получить запись скролла этим API нельзя. [renderFrames](https://www.remotion.dev/docs/renderer/render-frames).

## Что ещё необходимо подготовить

- Рабочие общие модули миров и отдельный детерминированный адаптер, сохраняющий материалы и свет сайта.
- Локальные пути GLB, декодер Meshopt для FARO, текстуры, шрифты и их лицензии; никаких запросов к рабочим профилям Wordflow.
- Настоящие скриншоты UI исходных проектов после их запуска. Сгенерированные концепт-арты не заменяют такие доказательства.
- Проверку package resolution, первых PNG, GPU renderer, памяти и полного MP4 на этой машине. Обнаруженная RTX не подтверждает автоматически скорость или отсутствие renderer-сбоев.
- Ролики отдельных проектов при содержательной пользе; выборочные browser screenshots доступны как отдельные артефакты. Запись реальных пользовательских действий остаётся отдельной возможностью, которую можно заявлять лишь после проверки поддерживаемого инструмента записи.

Исследование не выполняло рендер, не проверяло Studio и не создавало продуктовый код. Указанный путь устраняет зависимость шоурила от неподтверждённого API записи CUA.
