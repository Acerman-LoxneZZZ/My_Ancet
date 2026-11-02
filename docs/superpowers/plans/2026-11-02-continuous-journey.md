# Continuous journey revision

**Goal:** Replace the section-based homepage with a continuous spatial journey through the glass mark and the four actual projects.

**Direction:** A dark architectural exhibition: cold glass edges, warm mechanisms, a reflective floor and quiet typography. The camera moves through a shared space. Original models and screenshots remain the exhibits. Lusion is a reference for spatial storytelling, not a source of copied assets.

**Implementation:** `journey/architecture.ts` owns the environment; `journey/exhibits.ts` owns the original project assets; `journey/camera.ts` owns the continuous camera rail. `JourneyCanvas.tsx` owns one renderer, scroll damping and lifecycle. `Home.tsx` and `journey.css` own the minimal overlay and accessible chapter navigation. Case pages retain their interactive original models.

- [x] Build the environment and original exhibits in parallel.
- [x] Replace normal homepage sections with a fixed full-screen stage and continuous native-scroll track.
- [x] Add time-based damping, slow exhibition stops and smooth transit between them.
- [x] Keep actual project links, a compact index and return-to-exhibit navigation.
- [x] Produce the local bundle for the existing preview.

**User constraint:** “не проверяй”. No tests, typecheck-only runs, benchmarks or browser QA for this revision. Earlier v1 acceptance notes do not validate this revision. Compilation is only part of producing the local application bundle.

**Later clarification:** The attached adventure prompt limits the first public iteration to the entrance, local surface interaction, opening, passage and interactive watch. The remaining worlds are retained as draft code, with their original case links available in the index. The user reconfirmed “Обновить страницу без проверок и записи”. Expansion follows their visual acceptance of this first fragment.
