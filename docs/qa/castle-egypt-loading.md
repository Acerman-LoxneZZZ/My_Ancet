# Castle, Egypt and the gallery entrance — 2026-11-07

Castle is the seventh room, immediately before the finale. The six existing stop values and physical scroll distances are retained. Progress extends to 1.122; the final turn retains its original 0.142 duration. Navigation, DOM captions and exhibit visibility use the extended range.

The last room is hidden only after the camera passes behind its display and the complete room bounds leave the camera frustum. Automated checks cover forward/backward travel, display and sculpture clearance, continuous entry velocity, and six aspect ratios. The last-room test now exercises Castle.

Castle's stone gateway and Egypt's brass ankh use actual extruded/instanced solids. They share the gallery's textures and resource lifecycle. Castle's towers and battlements use instancing; instances, owned geometry and materials are disposed when leaving the gallery. Existing rooms still prepare lazily ahead of the camera.

The static HTML entrance and React loader share `public/boot.css`, so the initial document already has the finished loading design. Progress represents completed preparation stages: module/scene construction, actual texture uploads, both screen/mirror shader variants, the initial destination's models/images and fonts, then the first rendered frame. No timer advances the percentage or imposes a minimum delay. Scroll restored during loading is prepared before the entrance opens. The exit takes 220 ms and immediately releases input.

Egypt's supplement sets its entrance to 100svh and suppresses the original decorative Nile preview. The adaptation is included by the reproducible demo preparation script. Both standalone and iframe checks confirm the next chapter starts below the viewport. Normal mobile scrolling reveals the chapter.

Browser checks in Chromium/IAB:

- Desktop 1280×800: Castle hero, gallery controls (Neuschwanstein → Eilean Donan), original credit links, gallery room and actual 3D sculpture, Egypt hero and ankh, both embedded demos, final camera passage.
- Portrait 360×800, 390×844, 430×932 and landscape 844×390: no horizontal document overflow, stacked 3D exhibits, usable modal/close controls, full-height Egypt entrance, chapter reading after scroll. Rotation preserves the Egypt stop within 0.00002 progress.
- All seven buttons use the corresponding project accent. Mobile modal headers no longer overlap the portfolio header; landscape modals use the available screen height.
- No browser warnings/errors during the exercised gallery/demos.

A temporary development probe was removed after measurement. Desktop: 432 travel frames plus 156 final-turn frames; 95th percentile interval ~16.8 ms, maximum 33.3 ms, no intervals >50 ms. Final-turn render submission maximum 6.8 ms. Mobile-size session: 552 samples, render submission maximum 24.6 ms; one 166.7 ms interval at an unchanged stop across modal/viewport transitions, remaining intervals ≤33.5 ms. Measurements use the local machine's GPU and cached driver state, include development overhead, and do not establish physical iPhone/Android performance. Native Safari and physical phones were not tested.

Final checks: Vitest suite, TypeScript/build and `check:assets`, including Castle's pinned source revision and local HTML/CSS references. Screenshots and measurement JSON are retained in the task's local visualization `performance` directory.
