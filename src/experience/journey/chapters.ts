import type { ProjectId } from "../types";

// The first directed fragment is presented before extending the remaining worlds.
export const JOURNEY_LIMIT = 0.285;
export const JOURNEY_SCROLL_SVH = 600;

export const journeyChapters = [
  { id: "intro", title: "Поверхность", at: 0, from: 0, to: 0.16 },
  { id: "timepiece", title: "Ход времени", at: 0.24, from: 0.16, to: 0.34 },
  { id: "faro", title: "FARO", at: 0.42, from: 0.34, to: 0.52 },
  { id: "egypt", title: "Египет", at: 0.60, from: 0.52, to: 0.70 },
  { id: "wordflow", title: "Wordflow", at: 0.78, from: 0.70, to: 0.88 },
  { id: "contact", title: "Следующая история", at: 1, from: 0.88, to: 1 },
] as const;

export function seekJourney(at: number) {
  window.dispatchEvent(new CustomEvent("journey:seek", { detail: at }));
}

export function chapterIndex(progress: number) {
  return journeyChapters.findIndex((c, i) => progress < c.to || i === 5);
}

export function exhibitProgress(id: ProjectId) {
  return journeyChapters.find((c) => c.id === id)!.at;
}
