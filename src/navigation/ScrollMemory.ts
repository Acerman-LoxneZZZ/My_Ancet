import type { ProjectId } from "../experience/types";

export type ScrollSnapshot = {
  y: number;
  chapter?: string;
  progress?: number;
  focusId?: string;
};

/** A URL can occur multiple times in history, each with its own scroll position. */
export class ScrollMemory {
  private readonly entries = new Map<string, ScrollSnapshot>();

  save(historyKey: string, snapshot: ScrollSnapshot): void {
    this.entries.set(historyKey, { ...snapshot });
  }

  get(historyKey: string): ScrollSnapshot | undefined {
    const snapshot = this.entries.get(historyKey);
    return snapshot ? { ...snapshot } : undefined;
  }

  clear(): void {
    this.entries.clear();
  }
}

export function resolveGalleryReturn(
  project: ProjectId,
  saved?: ScrollSnapshot,
): ScrollSnapshot {
  if (saved) return { ...saved };

  return {
    y: 0,
    chapter: project,
    progress: 0.72,
    focusId: `world-${project}-title`,
  };
}
