# Источники ресурсов LOXNE

Дата: 2 ноября 2026 года. Портфолио сохраняет происхождение исходных работ и отделяет их от новой постановки. Новые ракурсы, свет, монолит и переходы не выдаются за исходные сайты или физические свойства объектов.

## Зафиксированные оригиналы

| Работа / checkout | Источник | Проверенный commit |
| --- | --- | --- |
| Ход времени / `.research/chasi` | [Acerman-LoxneZZZ/chasi](https://github.com/Acerman-LoxneZZZ/chasi) | `9d214bcf2b5477550ba014c23881cecca32b802e` |
| FARO / `.research/pizza` | [Acerman-LoxneZZZ/pizza](https://github.com/Acerman-LoxneZZZ/pizza) | `ca7e99fe59ec5f61ad49c812da8a4659f6c47fda` |
| Египет / `.research/egi` | [Acerman-LoxneZZZ/egi](https://github.com/Acerman-LoxneZZZ/egi) | `1a4725dc9285a8d45ffead5f4342a3e3d94df92d` |
| Wordflow / `.research/EnCard` | [Acerman-LoxneZZZ/EnCard](https://github.com/Acerman-LoxneZZZ/EnCard) | `43a41053321f6c96d7880c14bf353dd384380ced` |

Исходные checkout используются только для чтения. Полные репозитории, серверная конфигурация, рабочие базы и резервные копии не включаются в `public/` или продуктовую сборку. Наличие публичного репозитория не заменяет отдельные notices его сторонних материалов.

Подробные исследования: [часы и FARO](docs/research/timepiece-faro.md), [Египет и Wordflow](docs/research/egypt-wordflow.md), [карта переноса](docs/research/asset-transfer-map.md). Точные пути, размеры и SHA256 27 копий записаны в [assets/source/provenance.json](assets/source/provenance.json).

## Модели и редактируемые исходники

| Ресурс | Файл в портфолио | Размер / происхождение |
| --- | --- | --- |
| Часы, GLB | `public/assets/models/pocket-watch.glb` | 3 020 672 байта; точная копия исходной процедурной модели, 47 логических деталей |
| Таблица деталей | `public/assets/data/watch-parts.json` | 42 343 байта; названия, описания, rest transforms и диапазоны разборки |
| Часы, Blender | `assets/source/timepiece/pocket-watch.blend` | 6 347 266 байт; из `chasi/assets/blender/pocket-watch.blend` |
| Pizza, browser GLB | `public/assets/models/pizza-web.glb` | 3 552 568 байт; исходный подготовленный Meshopt/WebP ресурс FARO |
| Pizza, Blender | `assets/source/faro/pizza-source.blend` | 14 591 847 байт; из `pizza/assets/pizza-video/scene-3d/pizza-source.blend` |
| Монолит | `src/experience/worlds/MonolithWorld.ts` | Новая процедурная геометрия; не скачанная модель и не вымышленный BLEND |

BLEND остаются вне публичной папки. Настройки монолита описаны в [assets/source/monolith/README.md](assets/source/monolith/README.md). Часы демонстрируют конструкцию и разборку; физическая симуляция рабочего механизма и историческая точность не заявляются.

**Pizza** — [Rigsters](https://sketchfab.com/rigsters), [исходная модель](https://sketchfab.com/3d-models/pizza-40d50989fec1460f8838b608d999ccd0), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), получена исходным FARO через AllenAI Objaverse. Прежние изменения: удалена доска, геометрия центрирована/нормализована, diffuse восстановлена Real-ESRGAN с 40% смешением Lanczos, браузерная копия сжата Meshopt/WebP. Исходная карта 1024²; производная 4096² — увеличение, не новый 4K-скан. Новая постановка портфолио меняет свет, камеру и окружение, сохраняя подготовленную геометрию.

Полное исходное уведомление сохранено **без переписывания**: [FARO-ATTRIBUTION.md](public/assets/licenses/FARO-ATTRIBUTION.md). Оно относится также к производным рендерам модели, включая шоурил. Для надписей часов сохранён [DejaVu notice](public/assets/licenses/DejaVu.txt).

## Изображения

Все восемь снимков сохранены главным агентом непосредственно из работающих локальных оригиналов, до оформления новых обложек. Они не созданы генератором изображений и не перерисованы. Wordflow снят на синтетическом состоянии preview `wordflow.preview.synthetic.v1:`, шесть слов и одна коллекция.

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

`node scripts/prepare-assets.mjs` копирует только перечисленные файлы и записывает provenance; `node scripts/check-assets.mjs` сравнивает точные SHA256, проверяет 47 уникальных деталей, состав демо и запрещённые публичные пути. Для повторного чтения исходников нужны checkout из первой таблицы на указанных commits. Проверка не устанавливает общую лицензию на авторские репозитории и не заменяет необходимые notices.

Последняя проверка на этом этапе: typecheck и check-assets завершились успешно. Это проверка типов и файлов, не визуальная приёмка готовых сцен или финального видео.
