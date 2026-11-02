# Редактируемые исходники моделей

`timepiece/pocket-watch.blend` скопирован из `.research/chasi/assets/blender/pocket-watch.blend`, commit `9d214bcf2b5477550ba014c23881cecca32b802e`.

`faro/pizza-source.blend` скопирован из `.research/pizza/assets/pizza-video/scene-3d/pizza-source.blend`, commit `ca7e99fe59ec5f61ad49c812da8a4659f6c47fda`.

Это точные копии, не новые или переработанные модели. Они находятся вне `public/` и не должны попадать в браузерную сборку. Размеры и SHA256 записаны в `provenance.json`; тот же документ перечисляет копии ресурсов из дизайн-сравнения.

Часы — процедурная модель исходного проекта. Для надписей сохранён DejaVu notice: `public/assets/licenses/DejaVu.txt`.

Модель Pizza — Rigsters, CC BY 4.0. Полное неизменённое уведомление автора, источника и прежних изменений модели сохранено в `public/assets/licenses/FARO-ATTRIBUTION.md`. Оно распространяется и на производные рендеры. Копирование не меняет авторства и не превращает увеличенную текстуру в новый 4K-скан.

Воспроизвести копирование: `node scripts/prepare-assets.mjs`. Проверить соответствие исходникам и отсутствие `.blend`/баз/профилей в public: `node scripts/check-assets.mjs`.
