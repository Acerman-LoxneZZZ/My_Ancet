# Проверка шоурила

Дата: 2 ноября 2026 года. **Финальный MP4 и постер экспортированы после проверки Studio; ffprobe подтвердил 1920×1080, 30 FPS, 660 кадров и 22 секунды.** Изображение всех шести сцен проверено по реальным PNG. Открытие итогового MP4 в интерфейсе сайта выполняет главный агент отдельно от этих CLI-проверок.

## Подготовка

Прочитаны установленные Remotion 4.0.534 skills: router, create, studio, render, markup; дополнительные refs: video-layout, 3d, compositions, multi-scene-video, connected-compositions, local-fonts, transitions. Прочитан `docs/research/remotion-execution.md`; сведения о его прежнем состоянии машины являются историей исследования, не текущим статусом реализации.

Npm metadata повторно проверена 2 ноября: `@remotion/three@4.0.534` требует `remotion=4.0.534`, Fiber ≥8 и Three ≥0.137; `@react-three/fiber@9.8.2` принимает React/DOM ≥19 <19.4 и Three ≥0.156. Они совместимы по peer ranges с установленными в сайте React/DOM 19.3.1 и Three 0.187.0. Это ещё не результат сборки видео.

Package/lock и установка принадлежат главному агенту. Переданные шаги:

1. В корне: `npx create-video@4.0.534 --yes --blank --no-tailwind remotion`.
2. Сохранить scaffold, включить подпроект в root npm workspaces, закрепить Remotion-пакеты на 4.0.534 и общие React/DOM/Three на версиях сайта; выполнить единую установку с root lockfile.
3. В `remotion/`: `npx remotion add @remotion/three @remotion/transitions @remotion/fonts --package-manager npm`. Из корня: `npm install --save-exact @react-three/fiber@9.8.2 --workspace ./remotion`.
4. В `remotion/`: `npx remotion studio src/index.ts --no-open --port=4315`; главный агент открывает фактический напечатанный URL и подтверждает загрузку scaffold. Только после этого начинается авторинг, preview остаётся открытым.
5. В `remotion/`: `npx remotion browser ensure` для поддерживаемого renderer browser.

Фактическая подготовка главного агента: create-video 4.0.534 скачал scaffold с пакетами 4.0.540; зависимости приведены к 4.0.534. Команда `remotion add` после попытки не отработала с hoisted workspace dependencies, поэтому точные пакеты установлены владельцем через npm workspace. Недоступный в 4.0.534 `Config.setDefaultPremountInSeconds` из scaffold удалён. Studio открыт штатным CUA по `http://localhost:4315/MyComp` до авторинга, видны controls/compositions без error overlay.

Используется `Config.setPublicDir('../public')`: `staticFile('assets/images/...')`, `staticFile('assets/models/...')` и локальные шрифты. Реальные экраны и GLB находятся в общей public-папке. React/Three разрешаются из единой workspace-установки; зависимости Remotion не импортируются входом сайта.

Источники: [ThreeCanvas](https://www.remotion.dev/docs/three-canvas), [CLI add](https://www.remotion.dev/docs/cli/add), [настройка public directory](https://www.remotion.dev/docs/config#setpublicdir).

## Контракт и монтаж

Шоурил: **1920×1080, 30 FPS, 660 кадров, 22 секунды**. Отдельные authored JSX-узлы и connected compositions: монолит 0–3 с, часы 3–7, FARO 7–11, Египет 11–15, Wordflow 15–19, знак 19–22. Переходные overlays не сокращают эти интервалы. Крупные реальные экраны сохраняют оригинальный UI, шрифты и цвета; объекты — точные модели или исходный египетский портал/карточки.

Адаптер использует фактический async export `createWorld` и `WorldInstance` из общих модулей. Resolver добавляет `assets/` к переданным миром `models/...` / `data/...`. `ThreeCanvas` владеет рендером, существующий мир предоставляет scene/camera/update/fit/dispose. На каждый frame передаются абсолютные progress/time, pointer=[0,0], фиксированное качество и finale; RAF, useFrame, GSAP ticker и накопительные вращения исключены. RoomEnvironment/PMREM принадлежат адаптеру; GLB/fonts удерживают capture до готовности первого синхронного draw, ошибки отменяют render. Профиль mobile с transmission=true и без частиц отключает дополнительное отражение пола; DPR фиксирован на 1. Этот путь создаёт детерминированную 3D-композицию; запись браузерного управления не подразумевается.

Часы и FARO показывают настоящие 3D-модели рядом с крупными реальными экранами. Египет сочетает реальный экран с крупной деталью точного gateway.png и исходной панорамой, без выдуманной геометрии храма. Wordflow показывает два оригинальных экрана, включая карточку и словари; синтетические данные подписаны.

## Направление и unslop

Прочитан установленный unslop/SKILL.md и refs signs/tokens/visuals/refs; просмотрен законченный dashboard-reference только ради сдержанной оболочки. Автор навыка — Damir Sokolovsky, [@heydamir](https://x.com/heydamir), CC BY 4.0. Код навыка/его story-video не копируется.

- Продукт: четыре настоящих сайта для оценки работы разработчика заказчиком.
- Характер: спокойный, точный, предметный.
- Среда: тёмная выставочная поверхность и реальные материалы проектов.
- Акценты: исходные интерфейсы и узнаваемые объекты; оболочка нейтральная.
- Подпись: один и тот же разрез монолита открывает и завершает монтаж.

Аудит нового монтажа: широкие uppercase-подписи, gradient text, цветные свечения оболочки, emoji, выдуманные метрики и декоративные объекты не добавлены. Исходный бренд/UI в screenshots сохранён, включая его цвета и типографику. Настроены сетка отступов, три роли нейтрального текста, короткие factual-подписи, Manrope 400 и Cormorant 400, крупные реальные экраны и абсолютное движение без бесконечного цикла. Утверждённый монолит сохранён как содержательная связка портфолио.

## Выполненная проверка кода

`npx tsc --noEmit` из `remotion/` завершился exit 0. Зарегистрированы `PortfolioShowreel` (660 кадров/30 FPS/1920×1080) и отдельные `Opening`, `Timepiece`, `Faro`, `Egypt`, `Wordflow`, `Finale`. Preview URL: `http://localhost:4315/PortfolioShowreel`.

Главный агент открыл фактическую композицию штатным CUA и проверил кадры 150 (исходный экран и GLB часов) и 270 (коралловое меню и GLB FARO), параметры 1920×1080 / 22 с / 30 FPS и отсутствие error overlay. После этого разрешён CLI export. Эти действия не заменены сообщением о том, что сервер просто запущен.

## Фактические проверки и результаты

- `view_image` проверены PNG четырёх проектов 150/270/390/510 и монолита/знака 0/45/630/659. Объекты и подписи целиком в кадре, исходные UI/цвета сохранены. У Египта исправлена незаполненная полоска за порталом, кадр 390 повторно проверен.
- После исправления PMREM прозрачность canvas восстанавливается перед draw; серого прямоугольника нет. После изменения пола монолита удалена непрозрачная прямоугольная плоскость. Финальный art polish (тёмное стекло и меньший блик) проверен в новых PNG 45/630 и включён в повторный итоговый экспорт.
- Полный render завершился exit 0. Первый успешный MP4 был заменён повторным после конкретного изменения материала монолита; итог соответствует актуальному общему коду миров. Постер создан штатным Remotion still из кадра 150.
- `ffprobe -count_frames` декодировал и посчитал **660** кадров; оба значения `nb_frames` и `nb_read_frames` равны 660. Проверка повторяемости: кадр 150 общей композиции и кадр 60 отдельной Timepiece визуально совпадают; из 2 073 600 пикселей различаются 63, максимальная разница канала 1/255, средняя 0,000013664. Побитовое совпадение PNG не заявляется.

| Поле ffprobe / файл | Фактическое значение |
| --- | --- |
| Codec | `h264`, profile `100` |
| Размер | 1920×1080 |
| Частота | `r_frame_rate=30/1`, `avg_frame_rate=30/1` |
| Длительность | `22.000000` с |
| Кадры | `nb_frames=660`, `nb_read_frames=660` |
| Pixel format | `yuvj420p`, full range `pc`, color space `bt470bg` — фактический результат при CLI `--pixel-format=yuv420p` |
| MP4 | `public/assets/video/portfolio-showreel.mp4`, 4 726 370 байт |
| Постер | `public/assets/images/showreel-poster.jpg`, кадр 150, 211 055 байт |
| Звук | Намеренно отсутствует (`--muted`) |

MP4 SHA-256: `A9EB652EA090D1244A8C7AB3E09E0CEF888EE20C5FE3CFE3B12C857AABB6D879`.

Poster SHA-256: `41D1C3A0F948E295EC127058AB282115A258AFD6E3694F6C007601712DFA6A02`.

Команды выполнены из `remotion/`:

```powershell
npx remotion render src/index.ts PortfolioShowreel out/project-keyframes --frames=150,270,390,510 --sequence --image-format=png --gl=angle --concurrency=1
npx remotion render src/index.ts PortfolioShowreel out/monolith-keyframes --frames=0,45,89,570,630,659 --sequence --image-format=png --gl=angle --concurrency=1
npx remotion still src/index.ts PortfolioShowreel ../public/assets/images/showreel-poster.jpg --frame=150 --image-format=jpeg --jpeg-quality=95 --gl=angle
npx remotion render src/index.ts PortfolioShowreel ../public/assets/video/portfolio-showreel.mp4 --codec=h264 --pixel-format=yuv420p --crf=18 --gl=angle --concurrency=2 --muted
npx remotion ffprobe -v error -select_streams v:0 -count_frames -show_entries stream=codec_name,profile,width,height,pix_fmt,r_frame_rate,avg_frame_rate,nb_frames,nb_read_frames:format=duration,size -of json ../public/assets/video/portfolio-showreel.mp4
npx remotion still src/index.ts Timepiece out/repeatability/timepiece-060.png --frame=60 --image-format=png --gl=angle
```

Файлы подтверждений: [шесть сцен и крайние кадры](../../remotion/out/), [полный вывод ffprobe](../../remotion/out/ffprobe.json), [метаданные композиции, props, параметры и хеши исходников](../../remotion/render-metadata.json), [MP4](../../public/assets/video/portfolio-showreel.mp4), [постер](../../public/assets/images/showreel-poster.jpg). `out/` — локальные результаты проверки, не вход сайта. Публикация не выполнялась.

Экспорт использует поддерживаемый Chrome Headless Shell Remotion и ANGLE. В первом render-логе встречалось предупреждение зависимости о deprecated `THREE.Clock`; ошибок загрузки, shader compilation или незавершённого delayRender не было. Отдельное открытие каждой из шести connected compositions в Studio не заявляется: непосредственно проверен общий Studio preview и все шесть сцен в PNG, Timepiece дополнительно отрендерен отдельно.

## Воспроизведение на сайте

Главный агент открыл финальный MP4 в диалоге портфолио: media metadata 1920×1080, duration 22, readyState 4, ошибок нет. После нажатия Play currentTime дошёл до 19.6042 с при paused=false. Escape закрыл диалог, paused стал true, фокус вернулся к «Смотреть шоурил». После экспорта исходники общих миров форматировались Prettier без изменения поз, материалов или времени; хеши source в render-metadata относятся к состоянию во время рендера, хеши MP4/poster остаются актуальными.
