import type { ProjectId } from "../types";

export const FINALE_FROM = 0.858;
export const JOURNEY_LIMIT = 1;
export const JOURNEY_SCROLL_SVH = 2800;

export const journeyChapters = [
  { id: "intro", title: "Поверхность", at: 0, from: 0, to: 0.16 },
  { id: "timepiece", title: "Ход времени", at: 0.214, from: 0.16, to: 0.282 },
  { id: "faro", title: "FARO", at: 0.337, from: 0.282, to: 0.405 },
  { id: "egypt", title: "Египет", at: 0.459, from: 0.405, to: 0.527 },
  { id: "proyavleno", title: "ПРОЯВЛЕНО", at: 0.582, from: 0.527, to: 0.650 },
  { id: "dal", title: "ДАЛЬ", at: 0.704, from: 0.650, to: 0.772 },
  { id: "tutor", title: "3D-репетитор", at: 0.826, from: 0.772, to: FINALE_FROM },
  { id: "finale", title: "Игорь", at: JOURNEY_LIMIT, from: FINALE_FROM, to: JOURNEY_LIMIT },
] as const;
export const exhibitChapters = journeyChapters.slice(1, -1);

const GALLERY_SHUTTER_DELAY = 0.011;
export function galleryShutterStart(chapter: typeof journeyChapters[number]) {
  return chapter.from + (chapter.id === "proyavleno" ? -0.01 : GALLERY_SHUTTER_DELAY);
}

export function seekJourney(at: number) {
  window.dispatchEvent(new CustomEvent("journey:seek", { detail: at }));
}

export function chapterIndex(progress: number) {
  return journeyChapters.findIndex((c, i) => progress < c.to || i === journeyChapters.length - 1);
}

export function exhibitProgress(id: ProjectId) {
  return journeyChapters.find((c) => c.id === galleryProjectId(id))!.at;
}

export function galleryProjectId(id: ProjectId) {
  return id === "wordflow" ? "proyavleno" : id;
}
