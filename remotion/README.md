# LOXNE — шоурил

Композиция `PortfolioShowreel`: 22 секунды, 1920×1080, 30 FPS. Шесть сцен: монолит, часы, FARO, Египет, Wordflow, финальный знак. Сохраняются реальные экраны и модели проектов.

Из корня репозитория:

```powershell
npm.cmd run remotion:studio
npm.cmd run video:render
```

Studio: http://localhost:4315/PortfolioShowreel. Результат: `../public/assets/video/portfolio-showreel.mp4`. Ресурсы берутся из общего `../public/`.

Монтаж: `src/PortfolioShowreel.tsx`; регистрации и длительности: `src/Root.tsx`; сцены: `src/scenes/`; адаптер абсолютного кадра к Three: `src/adapters/WorldShot.tsx`.

Параметры, версии и SHA256 файлов: [render-metadata.json](render-metadata.json). Фактический просмотр и ffprobe: [video.md](../docs/qa/video.md). Локальные промежуточные PNG находятся в ignored `out/`.

Remotion — отдельная зависимость со своими условиями: [лицензия Remotion](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md). Источники моделей и экранов: [ASSET_SOURCES.md](../ASSET_SOURCES.md).
