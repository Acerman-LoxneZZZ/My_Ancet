export type ChapterRange = { start: number; end: number };
export type ViewportMetrics = {
  chapters: Record<string, ChapterRange>;
  maxY: number;
};

type StorySnapshot = { y: number; chapter?: string; progress?: number };

/** Progress values must never send NaN or Infinity into a camera transform. */
export function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

export function getChapterProgress(
  scrollY: number,
  chapter: ChapterRange,
): number {
  if (
    !Number.isFinite(scrollY) ||
    !Number.isFinite(chapter.start) ||
    !Number.isFinite(chapter.end) ||
    chapter.end < chapter.start
  ) {
    return 0;
  }

  if (chapter.end === chapter.start) {
    return scrollY >= chapter.start ? 1 : 0;
  }

  return clamp01((scrollY - chapter.start) / (chapter.end - chapter.start));
}

export function mapViewportChange(
  snapshot: StorySnapshot,
  metrics: ViewportMetrics,
): number {
  const maxY = Number.isFinite(metrics.maxY) ? Math.max(0, metrics.maxY) : 0;
  const clampScroll = (value: number): number =>
    Number.isFinite(value) ? Math.min(maxY, Math.max(0, value)) : 0;
  const chapter = snapshot.chapter
    ? metrics.chapters[snapshot.chapter]
    : undefined;

  if (
    chapter &&
    Number.isFinite(chapter.start) &&
    Number.isFinite(chapter.end) &&
    chapter.end >= chapter.start &&
    typeof snapshot.progress === "number" &&
    Number.isFinite(snapshot.progress)
  ) {
    return clampScroll(
      chapter.start +
        (chapter.end - chapter.start) * clamp01(snapshot.progress),
    );
  }

  return clampScroll(snapshot.y);
}
