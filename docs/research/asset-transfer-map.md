# Карта переноса ассетов для плана реализации

Проверено 2 ноября 2026 года. Это предложение структуры после review плана: продуктовые ассеты ещё не скопированы, зависимости не установлены. Пути ниже относительно корня портфолио. `C` = `.research/chasi` (commit `9d214bcf2b5477550ba014c23881cecca32b802e`), `P` = `.research/pizza/assets/pizza-video` (commit `ca7e99fe59ec5f61ad49c812da8a4659f6c47fda`), `E` = `.research/egi` (commit `1a4725dc9285a8d45ffead5f4342a3e3d94df92d`). Все перечисленные исходные файлы существуют.

## Модели часов: исходники и runtime

| Исходник | Предлагаемое назначение | Назначение |
| --- | --- | --- |
| `C/assets/blender/pocket-watch.blend` | `assets/source/timepiece/assets/blender/pocket-watch.blend` | Редактируемый исходник, 6 347 266 байт |
| `C/assets/blender/build_watch.py` | `assets/source/timepiece/assets/blender/build_watch.py` | Генератор; сохранить неизменённый оригинал |
| `C/assets/blender/export_watch.py` | `assets/source/timepiece/assets/blender/export_watch.py` | Экспорт геометрии и связанного манифеста |
| `C/assets/blender/fonts/DejaVuSerif.ttf`, `DejaVuSans.ttf`, `LICENSE.txt` | `assets/source/timepiece/assets/blender/fonts/` с исходными именами | Воспроизводимость геометрических надписей |
| `C/public/models/pocket-watch.glb` | `assets/source/timepiece/public/models/pocket-watch.glb` **и** `public/assets/timepiece/pocket-watch.glb` | Неизменённый эталон и runtime, по 3 020 672 байта |
| `C/src/data/watch-parts.json` | `assets/source/timepiece/src/data/watch-parts.json` **и** `public/assets/timepiece/watch-parts.json` | Манифест строго той же версии, что GLB |
| `C/public/images/watch-fallback.webp` | `public/assets/timepiece/watch-fallback.webp` | Подлинный снимок модели для загрузки/ошибки |
| `C/docs/screenshots/desktop-0.png`, `desktop-50.png`, `desktop-100.png`, `mobile-0.png`, `mobile-100.png` | `assets/source/timepiece/screenshots/` с исходными именами | Реальные экраны исходного приложения; оптимизированные производные для кейса создать позже |
| `C/ASSET_SOURCES.md`, `C/docs/MODEL.md` | `assets/source/timepiece/provenance/ASSET_SOURCES.md`, `MODEL.md` | Происхождение и ограничения |
| `C/docs/evidence/model-validation.json` | `assets/source/timepiece/provenance/model-validation.original.json` | Прежние измерения, не выдавать за новую проверку |
| `C/docs/licenses/DejaVu.txt` | `public/assets/licenses/timepiece-DejaVu.txt` | Notice для геометрии надписей и исходных шрифтов |

Вложенная структура `timepiece/assets/blender/` намеренна: оба Python-скрипта вычисляют корень как `Path(__file__).resolve().parents[2]`. При таком размещении они работают внутри `assets/source/timepiece/` и не перезаписывают runtime портфолио. После нового экспорта переносить GLB и JSON **вместе**; `watch_root` и carrier-имена сохранять. До запуска экспортёра дополнительно проверить безопасные выходные пути и Blender-версию.

## FARO: исходники и runtime

| Исходник | Предлагаемое назначение | Назначение |
| --- | --- | --- |
| `P/scene-3d/pizza-source.blend` | `assets/source/faro/scene-3d/pizza-source.blend` | Редактируемый скан, 14 591 847 байт |
| `P/scene-3d/pizza.glb` | `assets/source/faro/scene-3d/pizza.glb` | Несжатый эталон, 10 502 924 байта; не загружать в браузере |
| `P/scene-3d/pizza-web.glb` | `assets/source/faro/scene-3d/pizza-web.glb` **и** `public/assets/faro/pizza-web.glb` | Runtime 3 552 568 байт; требует MeshoptDecoder |
| `P/scene-3d/render_presentation_still.py`, `render_portfolio.py` | `assets/source/faro/scene-3d/` с исходными именами | Рендер от соседнего `.blend`; не запускать автоматически при переносе |
| `P/vendor-build/optimize-assets.mjs`, `package.json`, `package-lock.json` | `assets/source/faro/vendor-build/` с исходными именами | Сохранить рецепт сжатия отдельно от зависимостей приложения |
| `P/scene-3d/model-info.json`, `ATTRIBUTION.md`, `photo-info.json`, `credits.html` | `assets/source/faro/scene-3d/` с исходными именами | Полное provenance, включая историю неактивных изображений |
| `P/scene-3d/media/pizza-studio.png` | `assets/source/faro/scene-3d/media/pizza-studio.png` | Неизменённый оригинал предметного рендера |
| `P/scene-3d/media/pizza-studio.webp`, `pizza-studio.webp.json` | `public/assets/faro/pizza-studio.webp`; sidecar → `assets/source/faro/scene-3d/media/` | Заставка и сведения о её происхождении |
| `P/scene-3d/media/FARO-teaser.mp4` | `assets/source/faro/scene-3d/media/FARO-teaser.mp4` | Монтажный исходник, 8 476 424 байта; браузерную производную оптимизировать отдельно |
| `P/scene-3d/media/menu-session/{name}.png` | `assets/source/faro/scene-3d/media/menu-session/{name}.png` | Шесть неизменённых оригиналов AI-иллюстраций |
| `P/scene-3d/media/menu-session/{name}.webp` | `public/assets/faro/menu/{name}.webp` | Для демонстрации меню; загружать в кейсе, не на первом экране |
| `P/scene-3d/media/menu-session/{name}.webp.json`, `prompts.json` | `assets/source/faro/scene-3d/media/menu-session/` | Авторство, происхождение, запросы генерации |
| `P/scene-3d/THREE-LICENSE.txt`, `MESHOPTIMIZER-LICENSE.txt` | `public/assets/licenses/` с исходными именами | Notices при переносе соответствующих библиотек/decoder |
| `P/scene-3d/ATTRIBUTION.md`, `model-info.json` | `public/assets/faro/ATTRIBUTION.md`, `model-info.json` | Доступные сведения об ассете; дополнить новыми изменениями портфолио |

`{name}` — ровно `pepperoni`, `prosciutto`, `margherita`, `four-cheese`, `mushroom`, `salsiccia`. Все шесть PNG/WebP и их JSON-sidecar существуют. WebP суммарно около 3,85 MB, поэтому не включать всю серию в стартовый preload.

Опциональные фотографии приготовления: `P/scene-3d/media/prep-dough.webp`, `prep-oven.webp` → `public/assets/faro/preparation/`; соответствующие `.webp.json` → `assets/source/faro/scene-3d/media/`. Копировать только если эти фотографии реально входят в кейс. При копировании сохранить активные записи `photo-info.json` и добавить посетительские кредиты Cohen Berg / Adhitya Sibikumar / Unsplash License.

`prepare_scan_blender.py` обращается к отсутствующему внешнему исходнику в `~/.cache/codex-pizza-video/model-candidates/rigsters-pizza.glb`. Не включать его в обещание полностью воспроизводимого импорта скана. Начальная редактируемая точка — существующий `.blend`; при первой проверке Blender установить, что все нужные изображения упакованы/доступны. `optimize-assets.mjs` использует соседний `../scene-3d/`, поэтому структуру сохранить; скрипт также пересоздаёт верхнеуровневые PNG→WebP и не должен запускаться вслепую поверх утверждённых производных.

## Локальные шрифты без дополнительного скачивания

Для основного интерфейса подходят готовые кириллический и латинский subsets Manrope из `E/public/assets/fonts/`. Копировать `manrope-cyrillic.woff2`, `manrope-latin.woff2`, `Manrope-LICENSE.txt` → `public/assets/fonts/` с исходными именами. В исходном CSS они объявлены как `font-weight:400`; не объявлять диапазон переменных весов без проверки таблиц шрифта. Для нужных более жирных начертаний отдельно подготовить корректный шрифт при реализации.

Если утверждённая типографика включает Cormorant: `cormorant-cyrillic.woff2`, `cormorant-latin.woff2` (400), `cormorant-cyrillic-medium.woff2`, `cormorant-latin-medium.woff2` (500), `Cormorant-LICENSE.txt` → `public/assets/fonts/`. Эти файлы действительно присутствуют. Не подключать второй serif только ради сохранения внешнего вида исходного сайта.

Если понадобится точная типографика встроенного FARO-интерфейса, альтернативно доступны `P/scene-3d/fonts/GolosText[wght].woff2`, `Literata[opsz,wght].woff2`, `Literata-Italic[opsz,wght].woff2`, `golostext-OFL.txt`, `literata-OFL.txt`; переносить всю выбранную пару «шрифт + notice» в `public/assets/fonts/faro/`. Для обычных скриншотов FARO отдельная загрузка этих шрифтов не нужна.

## Контракт данных TimepieceWorld

Фактически проверено чтением GLB: узел `watch_root` содержит **47 прямых carrier-потомков**, и все `nodeName` JSON точно совпадают с ними. Carrier содержит mesh-потомка, например `back_cover` → `back_cover_geometry`. Перемещать carrier, не отдельные material primitives; Raycaster-hit поднимать по иерархии до зарегистрированного carrier. У всех 47 записей `id === nodeName` и `selectable:true`.

Фактическая форма JSON — массив объектов следующего контракта (проектный интерфейс, не продуктовый файл):

```ts
type Vec3 = [number, number, number];
type Quat = [number, number, number, number]; // x, y, z, w
interface WatchPart {
  id: string;
  nodeName: string;
  title: string;
  description: string;
  materialLabel: string;
  category: 'case' | 'dial' | 'movement' | 'fastener';
  start: number; // диапазон общего explosion progress, 0..1
  end: number;
  restPosition: Vec3;
  explodedOffset: Vec3;
  restQuaternion: Quat;
  explodedQuaternion: Quat;
  restScale: Vec3;
  labelAnchor: Vec3; // локальная точка выбранного carrier
  selectable: boolean;
}
```

Для мира нужен `setProgress(value: number)` с clamp в 0..1, абсолютная оценка pose, `selectPart(id | null)`, чтение выбранной записи для HTML-подписи и `dispose()`. Общую сценическую ориентацию/масштаб задавать внешней группе; исходные TRS carrier не перезаписывать за пределами evaluator. Оси исходной модели: X вправо, Y вверх к головке, +Z к посетителю. При загрузке проверять уникальные `id/nodeName`, полный набор 47 carrier, конечность чисел, положительный scale, нормализованные quaternion и допустимые `start/end`. На несогласованный манифест отвечать fallback-состоянием, а не частично разобранной моделью.

Формула позиции: `restPosition + explodedOffset × smoothstep(clamp((progress-start)/(end-start)))`; quaternion — shortest-path slerp между `restQuaternion` и `explodedQuaternion`, scale — исходный. Нельзя накапливать смещения по кадрам. Для нулевого диапазона сохранить rest pose, как в исходном evaluator.

### Экспортированные имена всех 47 деталей

| № | `id` = `nodeName` | Подпись | Категория | start–end |
| --- | --- | --- | --- | --- |
| 1 | `case_body` | Корпус | case | 0–1 |
| 2 | `back_cover` | Задняя крышка | case | 0–0.24 |
| 3 | `bow` | Дужка | case | 0.72–1 |
| 4 | `crown` | Заводная головка | case | 0.62–0.94 |
| 5 | `crown_stem` | Заводной вал | movement | 0.66–0.94 |
| 6 | `front_bezel` | Ободок | case | 0–0.23 |
| 7 | `front_glass` | Защитное стекло | dial | 0.08–0.32 |
| 8 | `dial_face` | Циферблат | dial | 0.26–0.55 |
| 9 | `dial_support` | Опора циферблата | dial | 0.31–0.59 |
| 10 | `hand_hour` | Часовая стрелка | dial | 0.18–0.45 |
| 11 | `hand_minute` | Минутная стрелка | dial | 0.21–0.47 |
| 12 | `hand_second` | Секундная стрелка | dial | 0.24–0.48 |
| 13 | `movement_mainplate` | Основная платина | movement | 0–1 |
| 14 | `gear_center` | Центральное колесо | movement | 0.52–0.91 |
| 15 | `gear_intermediate` | Промежуточное колесо | movement | 0.52–0.91 |
| 16 | `gear_fourth` | Секундное колесо | movement | 0.52–0.91 |
| 17 | `gear_escape` | Спусковое колесо | movement | 0.52–0.91 |
| 18 | `gear_winding` | Заводное колесо | movement | 0.52–0.91 |
| 19 | `mainspring_barrel` | Заводной барабан | movement | 0.58–0.93 |
| 20 | `barrel_cover` | Крышка барабана | movement | 0.61–0.94 |
| 21 | `mainspring` | Заводная пружина | movement | 0.65–0.96 |
| 22 | `ratchet_wheel` | Храповое колесо | movement | 0.57–0.9 |
| 23 | `winding_click` | Собачка храповика | movement | 0.61–0.92 |
| 24 | `balance_assembly` | Баланс | movement | 0.54–0.92 |
| 25 | `movement_bridge_balance` | Мост баланса | movement | 0.42–0.75 |
| 26 | `pallet_fork` | Анкерная вилка | movement | 0.58–0.93 |
| 27 | `movement_bridge_pallet` | Мост анкера | movement | 0.46–0.76 |
| 28 | `movement_bridge_upper` | Верхний мост | movement | 0.4–0.73 |
| 29 | `movement_bridge_train` | Мост колёсной передачи | movement | 0.43–0.75 |
| 30 | `movement_bridge_center` | Центральный мост | movement | 0.44–0.76 |
| 31 | `motion_works` | Стрелочный механизм | movement | 0.48–0.85 |
| 32 | `hour_wheel` | Часовое колесо | movement | 0.51–0.87 |
| 33 | `jewel_setting_1` | Опора промежуточного колеса | fastener | 0.73–1 |
| 34 | `jewel_setting_2` | Опора секундного колеса | fastener | 0.73–1 |
| 35 | `jewel_setting_3` | Накладной камень баланса | fastener | 0.73–1 |
| 36 | `screw_bridge_01` | Винт крепления 01 | fastener | 0.725–1 |
| 37 | `screw_bridge_02` | Винт крепления 02 | fastener | 0.75–1 |
| 38 | `screw_bridge_03` | Винт крепления 03 | fastener | 0.7–1 |
| 39 | `screw_bridge_04` | Винт крепления 04 | fastener | 0.725–1 |
| 40 | `screw_bridge_05` | Винт крепления 05 | fastener | 0.75–1 |
| 41 | `screw_bridge_06` | Винт крепления 06 | fastener | 0.7–1 |
| 42 | `screw_bridge_07` | Винт крепления 07 | fastener | 0.725–1 |
| 43 | `screw_bridge_08` | Винт крепления 08 | fastener | 0.75–1 |
| 44 | `screw_bridge_09` | Винт крепления 09 | fastener | 0.7–1 |
| 45 | `screw_bridge_10` | Винт крепления 10 | fastener | 0.725–1 |
| 46 | `dial_fastener_01` | Стойка циферблата 01 | fastener | 0.61–0.96 |
| 47 | `dial_fastener_02` | Стойка циферблата 02 | fastener | 0.61–0.96 |

## Обязательные notices и происхождение

- Для модели FARO, её постеров и видеорендеров: Pizza by Rigsters, исходная [модель](https://sketchfab.com/3d-models/pizza-40d50989fec1460f8838b608d999ccd0), [автор](https://sketchfab.com/rigsters), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), перечисление исходных изменений и новых изменений портфолио. Разместить читаемый кредит в кейсе/общих атрибуциях, а не только в закрытом исходном каталоге.
- Сохранить существующие `ATTRIBUTION.md`, `model-info.json`, `photo-info.json`, все sidecar используемых изображений и `menu-session/prompts.json`. Не называть AI-меню фотографиями настоящих блюд; не называть upscale новым 4K-сканом.
- Для поставляемых шрифтов сохранить соответствующие полные OFL/DejaVu notices. DejaVu относится также к исходникам геометрических надписей часов.
- Для импортируемого decoder/bundled кода сохранить MIT notices Three.js/Meshoptimizer; для выбранных новых npm-версий собрать notices из фактически устанавливаемых пакетов, а не объявлять весь проект MIT. React/React DOM и GSAP также включить в итоговые notices по фактическим версиям/условиям.
- В будущий `assets/source/manifest.json` внести относительные исходный/новый пути, commit, SHA-256 исходного файла, вид ресурса, автора, лицензию, прежние изменения и новые изменения. Это новая запись provenance; старые JSON не переписывать для маскировки происхождения.

## Что не переносить

- `.git`, `.agents`, сторонние skills, прежние CI, `.tools`, кэши, node_modules, локальные настройки и весь корень чужого приложения.
- Несжатый `pizza.glb`, `.blend`, TTF для генератора, PNG-оригиналы меню, промежуточные кадры и vendor-build в `public/`.
- Старые отчёты QA как доказательство проверки портфолио; копировать только в provenance с явной пометкой original, если нужны.
- Исторические неактивные меню-фотографии, `media/menu-prosciutto.webp` и фотографии приготовления, если они не используются в выбранных кадрах.
- Готовые `pizza-scene.js`, глобальные GSAP-скрипты и стили всего FARO в основной runtime: они привязаны к исходному DOM и породят второй рендерер/таймер. Поведение мира реализовать в общей архитектуре; исходный сайт показывать подлинными экранами или отдельной явно открываемой демоверсией.
- Не переименовывать carrier-узлы часов, не заменять реальные экраны концепт-артом под видом существующей реализации.

## Проверка после разрешённого переноса

Сравнить хеши неизменённых копий, проверить связь GLB–JSON (47 из 47), загрузку сжатой пиццы с MeshoptDecoder, наличие всех использованных notices и отсутствие ссылок на `.research/` в runtime. Снятые ограничения: реальные пути и имена известны; открытые ограничения: packed images в `.blend`, новые производные/кадрирование и реальные браузерные проверки выполняются на стадии реализации.
