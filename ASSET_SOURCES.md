# Источники ресурсов LOXNE

Дата: 2 ноября 2026 года. Портфолио сохраняет происхождение исходных работ и отделяет их от новой постановки. Новые ракурсы, свет, монолит и переходы не выдаются за исходные сайты или физические свойства объектов.

## Зафиксированные оригиналы

| Работа / checkout | Источник | Проверенный commit |
| --- | --- | --- |
| Ход времени / `.research/chasi` | [Acerman-LoxneZZZ/chasi](https://github.com/Acerman-LoxneZZZ/chasi) | `9d214bcf2b5477550ba014c23881cecca32b802e` |
| KARpOV / `.research/chasi-current` | [Acerman-LoxneZZZ/chasi](https://github.com/Acerman-LoxneZZZ/chasi) | `ab278ec1e4be465d1026cef6e0c4dbcdf74a914b` |
| FARO / `.research/pizza` | [Acerman-LoxneZZZ/pizza](https://github.com/Acerman-LoxneZZZ/pizza) | `ca7e99fe59ec5f61ad49c812da8a4659f6c47fda` |
| Египет / `.research/egi` | [Acerman-LoxneZZZ/egi](https://github.com/Acerman-LoxneZZZ/egi) | `1a4725dc9285a8d45ffead5f4342a3e3d94df92d` |
| Wordflow / `.research/EnCard` | [Acerman-LoxneZZZ/EnCard](https://github.com/Acerman-LoxneZZZ/EnCard) | `43a41053321f6c96d7880c14bf353dd384380ced` |
| ПРОЯВЛЕНО / `.research/DemoLan` | [Acerman-LoxneZZZ/DemoLan](https://github.com/Acerman-LoxneZZZ/DemoLan) | `c45cd37079ca724c7ac6fbeb57aec0571f9c58a4` |

Исходные checkout используются только для чтения. Полные репозитории, серверная конфигурация, рабочие базы и резервные копии не включаются в `public/` или продуктовую сборку. Наличие публичного репозитория не заменяет отдельные notices его сторонних материалов.

Подробные исследования: [часы и FARO](docs/research/timepiece-faro.md), [Египет и Wordflow](docs/research/egypt-wordflow.md), [карта переноса](docs/research/asset-transfer-map.md). Точные пути, размеры и SHA256 27 копий записаны в [assets/source/provenance.json](assets/source/provenance.json).

## Модели и редактируемые исходники

| Ресурс | Файл в портфолио | Размер / происхождение |
| --- | --- | --- |
| Часы, GLB | `public/assets/models/pocket-watch.glb` | 3 020 672 байта; точная копия исходной процедурной модели, 47 логических деталей |
| Часы для галереи | `public/assets/models/gallery-watch.glb` | 299 616 байт. Внешние детали из той же модели объединены по материалам в собранном положении |
| Таблица деталей | `public/assets/data/watch-parts.json` | 42 343 байта; названия, описания, rest transforms и диапазоны разборки |
| Часы, Blender | `assets/source/timepiece/pocket-watch.blend` | 6 347 266 байт; из `chasi/assets/blender/pocket-watch.blend` |
| Pizza, browser GLB | `public/assets/models/pizza-web.glb` | 3 552 568 байт; исходный подготовленный Meshopt/WebP ресурс FARO |
| Pizza для галереи | `public/assets/models/gallery-pizza.glb` | 979 968 байт. Та же геометрия Meshopt, цвет 1024², карты нормалей и шероховатости 512² |
| Pizza, Blender | `assets/source/faro/pizza-source.blend` | 14 591 847 байт; из `pizza/assets/pizza-video/scene-3d/pizza-source.blend` |
| Лента ПРОЯВЛЕНО | `public/assets/models/gallery-ribbon.glb` | 54 804 байта. Исходная процедурная геометрия с уменьшенным числом сегментов, без текстур |
| Монолит | `src/experience/worlds/MonolithWorld.ts` | Новая процедурная геометрия; не скачанная модель и не вымышленный BLEND |

BLEND остаются вне публичной папки. Настройки монолита описаны в [assets/source/monolith/README.md](assets/source/monolith/README.md). Часы демонстрируют конструкцию и разборку; физическая симуляция рабочего механизма и историческая точность не заявляются.

**Pizza** — [Rigsters](https://sketchfab.com/rigsters), [исходная модель](https://sketchfab.com/3d-models/pizza-40d50989fec1460f8838b608d999ccd0), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), получена исходным FARO через AllenAI Objaverse. Прежние изменения: удалена доска, геометрия центрирована/нормализована, diffuse восстановлена Real-ESRGAN с 40% смешением Lanczos, браузерная копия сжата Meshopt/WebP. Исходная карта 1024²; производная 4096² — увеличение, не новый 4K-скан. Новая постановка портфолио меняет свет, камеру и окружение, сохраняя подготовленную геометрию.

Полное исходное уведомление сохранено **без переписывания**: [FARO-ATTRIBUTION.md](public/assets/licenses/FARO-ATTRIBUTION.md). Оно относится также к производным рендерам модели, включая шоурил. Для надписей часов сохранён [DejaVu notice](public/assets/licenses/DejaVu.txt).

## Изображения

Первые восемь снимков сохранены из работающих локальных оригиналов до оформления обложек. Wordflow снят на синтетическом состоянии preview `wordflow.preview.synthetic.v1:`, шесть слов и одна коллекция.

Первый экран ПРОЯВЛЕНО и галерея концептов сняты в Chromium с локальной сборки DemoLan и сохранены как WebP. В живой витрине используется статическая сборка того же коммита со встроенными лицензиями шрифтов и формой в деморежиме.

| Файл в `public/assets/images/` | Размер |
| --- | --- |
| `timepiece-original.jpg`, `timepiece-exploded.jpg` | 1265×712 |
| `faro-original.jpg`, `faro-menu.jpg` | 1270×714 |
| `egypt-original.jpg`, `egypt-chapter.jpg` | 1272×716 |
| `wordflow-original.jpg`, `wordflow-dictionary.jpg` | 390×844 |
| `egypt-gateway.png` | 1788×880; точная исходная художественная AI-реконструкция |
| `egypt-landscape.png` | 1942×809; точная исходная художественная AI-реконструкция |

Портал и панорама взяты из egi; это не фотографии конкретного храма и не фотограмметрическая модель. Музейные изображения исходной экспозиции имеют Met Open Access / Public Domain attribution; [перечень источников оригинала](https://github.com/Acerman-LoxneZZZ/egi/blob/1a4725dc9285a8d45ffead5f4342a3e3d94df92d/public/assets/sources.json) сохраняет предметные ссылки. В портфолио Египет показан через реальные экраны и точный растровый портал в DOM/CSS.

Внутри исходного меню FARO видны AI-иллюстрации вымышленных блюд; их происхождение описано в FARO notice. Это не фотографии ресторана клиента. Дополнительные студийные/Unsplash материалы оригинала перечислены там же и не объявляются новыми работами портфолио.

`public/assets/images/monolith-fallback.svg` — новый статичный резервный рисунок монолита. Архивные `docs/design/01-hero-and-worlds.png` и `02-passage-and-finale.png` — Imagegen concept art; они не являются скриншотами приложения и не заменяют оригинальные обложки. Промпты сохранены в [docs/design/imagegen-prompts.md](docs/design/imagegen-prompts.md).

Происхождение и проверки сравнения: [review-v2/SOURCES.md](docs/design/review-v2/SOURCES.md), [VERIFICATION.md](docs/design/review-v2/VERIFICATION.md). Новые MP4/poster будут производными Remotion-композиции; их готовность следует проверять по [video QA](docs/qa/video.md), не по одному присутствию ссылки в UI.

## Шрифты и библиотеки

- `public/assets/fonts/`: локальные Latin/Cyrillic WOFF2 Manrope и Cormorant Garamond, исходные [Manrope OFL](public/assets/fonts/Manrope-LICENSE.txt) и [Cormorant OFL](public/assets/fonts/Cormorant-LICENSE.txt). Оболочка использует Manrope 400; снимки сохраняют шрифты оригиналов.
- Wordflow сохраняет встроенные Manrope / DM Serif Display с OFL и IPA-данные dohliam / ipa-dict с MIT notice внутри оригинального HTML. Literata / Golos в экранах FARO описаны в его полном notice.
- Сохранены [Three.js MIT](public/assets/licenses/Three-MIT.txt) и [Meshoptimizer MIT](public/assets/licenses/Meshoptimizer-MIT.txt). Условия GSAP: [официальная лицензия](https://gsap.com/community/standard-license/). Эта запись не заменяет лицензии установленных npm-пакетов.
- Unslop использован как метод аудита новой оболочки: **Damir Sokolovsky / [@heydamir](https://x.com/heydamir)**, [репозиторий](https://github.com/heydamir/unslop), CC BY 4.0. Адаптация порядка работы и границы применения записаны в [docs/qa/unslop.md](docs/qa/unslop.md).

## Wordflow: исходный UI и граница данных

`scripts/prepare-wordflow-demo.mjs` переносит только `index.html` и четыре whitelisted UI-файла из EnCard, добавляя `demo-state.js` из тестируемого шаблона. Исходные CSS, типографика и функциональные модули сохранены; Telegram loader удалён, inline-программы запускаются после установки storage adapter.

Новая демонстрация использует `loxne.wordflow.demo.v1:`, шесть слов (surface, craft, motion, depth, light, explore) и одну коллекцию. Она не переносит старый preview namespace и не читает личные профили/SQLite/backups. Сброс имеет проверки same-origin/parent и удаляет только учебные ключи. Тот же origin нужен для этого контракта; namespace отделяет состояние, а не представляет отдельный security-origin.

Telegram SDK, profile-client, серверные endpoints, D1 и service worker не скопированы. Внешние запросы блокируются CSP. Оригинальный код автора и искусственные учебные данные здесь различены явно; авторизация и облачная синхронизация не считаются проверенными. Детали и тесты: [Wordflow QA](docs/qa/wordflow-demo.md).

## Воспроизводимость

- «Замок». `public/demos/castle` подготовлен из [castle, fb79bf9](https://github.com/Acerman-LoxneZZZ/castle/tree/fb79bf9ee0a3d002d13a52a6c61724fa0b450077) командой `node scripts/prepare-castle-demo.mjs`. Оригинальный JS сохранён. Изображения оптимизированы в WebP, исходные фотокредиты и `assets/sources.json` сохранены; шрифт Ogg Medium загружается локально. Подробности: `public/demos/castle/SOURCE.json`.
- `castle-original.webp` и `castle-detail.webp` — снимки работающего демо Castle в Chromium, 1280×800; `egypt-gallery-home.webp` — снимок первого экрана Египта после адаптации на полную высоту окна, 1280×800. Старые оригинальные экраны сохранены без изменений.
- `scripts/templates/egypt-gallery.css` — адаптация высоты первого экрана Египта и удаление декоративного превью следующей главы. `prepare-gallery-demos.mjs` переносит её в демо после сборки.
- Каменные ворота Castle и латунный анкх Египта — процедурная объёмная геометрия `src/experience/journey/artifacts.ts`, без растровых силуэтов. Материалы используют карты отделки галереи.

- «ДАЛЬ». В `public/demos/dal` лежит статическая сборка `dist/` из [DalSait на коммите b19e02c](https://github.com/Acerman-LoxneZZZ/DalSait/tree/b19e02cea6e320c7016c9f7f42ecd33f3e8599ff). Источники фотографий сохранены в `assets/*.origin.txt`. Для локальных шрифтов применяются [Manrope OFL](public/assets/fonts/Manrope-LICENSE.txt) и [Cormorant Garamond OFL](public/assets/fonts/Cormorant-LICENSE.txt).
- «3D-репетитор». В `public/demos/tutor` лежит статическая сборка из [3d-repetitor на коммите 90dbc07](https://github.com/Acerman-LoxneZZZ/3d-repetitor/tree/90dbc0764bb7a6bd8e9a5f03adf6da6a2b1f0fc3). Ссылки адаптированы для вложенного адреса. В демо используется нейтральный заголовок «Математика». Сохранены режим предпросмотра, учебные материалы и [лицензия Manrope](public/demos/tutor/assets/fonts/OFL.txt).
- `dal-original.webp`, `dal-detail.webp`, `tutor-original.webp` и `tutor-detail.webp` сняты с этих сборок в Chrome.
- `egypt-gateway-gallery.webp` и `egypt-landscape-gallery.webp` — уменьшенные копии исходных PNG для экранов в 3D-зале. WebP сохраняет прозрачность портала.

Для модели часов в галерее `node scripts/prepare-gallery-watch.mjs <временный.glb>` собирает внешние детали в промежуточный GLB. Финальный файл создаёт `npm exec --yes --package=@gltf-transform/cli@4.5.0 -- gltf-transform meshopt <временный.glb> public/assets/models/gallery-watch.glb --level medium`.

`node scripts/prepare-gallery-demos.mjs` пересобирает витрины из checkout `.research/chasi-current` и `.research/egi` с установленными зависимостями. Аргумент `timepiece` обновляет только KARpOV. Сборки находятся в `public/demos/timepiece` и `public/demos/egypt`. Идентичные ресурсы переиспользуются. Модель KARpOV из нового коммита загружается при открытии витрины.

`public/assets/images/timepiece-karpov-hero.jpg` — первый экран KARpOV из `docs/screenshots/finale-story/1440-0.png` на коммите `ab278ec`, сохранённый в JPEG для экрана в галерее.

`node scripts/prepare-assets.mjs` копирует только перечисленные файлы и записывает provenance; `node scripts/check-assets.mjs` сравнивает точные SHA256, проверяет 47 уникальных деталей, состав демо и запрещённые публичные пути. Для повторного чтения исходников нужны checkout из первой таблицы на указанных commits. Проверка не устанавливает общую лицензию на авторские репозитории и не заменяет необходимые notices.

Последняя проверка на этом этапе: typecheck и check-assets завершились успешно. Это проверка типов и файлов, не визуальная приёмка готовых сцен или финального видео.
