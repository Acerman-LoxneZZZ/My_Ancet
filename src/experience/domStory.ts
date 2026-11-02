import { getChapterProgress } from "./story";
import type { ScrollSnapshot } from "../navigation/ScrollMemory";
export function chapterMetrics() {
  const chapters: Record<string, { start: number; end: number }> = {};
  document.querySelectorAll<HTMLElement>("[data-chapter]").forEach((el) => {
    const start = el.getBoundingClientRect().top + window.scrollY;
    chapters[el.dataset.chapter!] = {
      start,
      end: start + Math.max(1, el.offsetHeight - window.innerHeight),
    };
  });
  return {
    chapters,
    maxY: Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight,
    ),
  };
}
export function currentSnapshot(): ScrollSnapshot {
  const metrics = chapterMetrics();
  const y = window.scrollY;
  const entries = Object.entries(metrics.chapters);
  const active = [...entries]
    .reverse()
    .find(([, m]) => y >= m.start && y <= m.end);
  const focusId = document.activeElement?.id || undefined;
  // Outside an animation interval, clamping its progress would move a visitor
  // back to that interval's boundary. Preserve actual pixels in these gaps.
  return active
    ? {
        y,
        chapter: active[0],
        progress: getChapterProgress(y, active[1]),
        focusId,
      }
    : { y, focusId };
}
