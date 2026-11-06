import type { ProjectId } from "../types";

export const FINALE_FROM = 0.825;
export const JOURNEY_LIMIT = 1;
export const JOURNEY_SCROLL_SVH = 2110;

export const journeyChapters = [
  { id: "intro", title: "Поверхность", at: 0, from: 0, to: 0.16 },
  { id: "timepiece", title: "Ход времени", at: 0.24, from: 0.16, to: 0.34 },
  { id: "faro", title: "FARO", at: 0.42, from: 0.34, to: 0.52 },
  { id: "egypt", title: "Египет", at: 0.60, from: 0.52, to: 0.70 },
  { id: "wordflow", title: "Wordflow", at: 0.78, from: 0.70, to: FINALE_FROM },
  { id: "finale", title: "Буква И", at: JOURNEY_LIMIT, from: FINALE_FROM, to: JOURNEY_LIMIT },
] as const;

export const GALLERY_SHUTTER_DELAY = 0.016;
export const FIRST_GALLERY_REVEAL = journeyChapters[2].from + GALLERY_SHUTTER_DELAY;

export function seekJourney(at: number) {
  window.dispatchEvent(new CustomEvent("journey:seek", { detail: at }));
}

export function chapterIndex(progress: number) {
  return journeyChapters.findIndex((c, i) => progress < c.to || i === journeyChapters.length - 1);
}

export function exhibitProgress(id: ProjectId) {
  return journeyChapters.find((c) => c.id === id)!.at;
}
