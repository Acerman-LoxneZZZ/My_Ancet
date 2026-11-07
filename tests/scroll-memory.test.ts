import { describe, expect, it } from "vitest";
import { getProject, projects } from "../src/content/portfolio";
import { galleryProjectId, journeyChapters } from "../src/experience/journey/chapters";
import {
  ScrollMemory,
  resolveGalleryReturn,
} from "../src/navigation/ScrollMemory";

// Plan task 8 / Review Focus 1: history-entry identity and direct case returns.
describe("ScrollMemory", () => {
  it("returns undefined for an entry that has never been saved", () => {
    const memory = new ScrollMemory();

    expect(memory.get("missing-entry")).toBeUndefined();
  });

  it("keeps separate positions for different history entries with the same URL", () => {
    const memory = new ScrollMemory();
    const firstHomeVisit = { url: "/", key: "home-entry-1" };
    const secondHomeVisit = { url: "/", key: "home-entry-2" };
    const first = {
      y: 2400,
      chapter: "timepiece",
      progress: 0.4,
      focusId: "world-timepiece-title",
    };
    const second = {
      y: 6400,
      chapter: "egypt",
      progress: 0.7,
      focusId: "world-egypt-title",
    };

    memory.save(firstHomeVisit.key, first);
    memory.save(secondHomeVisit.key, second);

    expect(firstHomeVisit.url).toBe(secondHomeVisit.url);
    expect(memory.get(firstHomeVisit.key)).toEqual(first);
    expect(memory.get(secondHomeVisit.key)).toEqual(second);
  });

  it("updates one history entry without overwriting another entry", () => {
    const memory = new ScrollMemory();
    memory.save("entry-1", { y: 1200 });
    memory.save("entry-2", { y: 6400, chapter: "egypt", progress: 0.7 });

    memory.save("entry-1", { y: 1800, chapter: "timepiece", progress: 0.2 });

    expect(memory.get("entry-1")).toEqual({
      y: 1800,
      chapter: "timepiece",
      progress: 0.2,
    });
    expect(memory.get("entry-2")).toEqual({
      y: 6400,
      chapter: "egypt",
      progress: 0.7,
    });
  });

  it("takes a defensive copy when saving a mutable snapshot", () => {
    const memory = new ScrollMemory();
    const snapshot = {
      y: 2400,
      chapter: "timepiece",
      progress: 0.4,
      focusId: "world-timepiece-title",
    };
    memory.save("entry-1", snapshot);

    snapshot.y = 9000;
    snapshot.chapter = "contact";
    snapshot.progress = 1;
    snapshot.focusId = "contact-title";

    expect(memory.get("entry-1")).toEqual({
      y: 2400,
      chapter: "timepiece",
      progress: 0.4,
      focusId: "world-timepiece-title",
    });
  });

  it("returns a defensive copy so a consumer cannot change a stored position", () => {
    const memory = new ScrollMemory();
    const original = {
      y: 4000,
      chapter: "faro",
      progress: 0.5,
      focusId: "world-faro-title",
    };
    memory.save("entry-1", original);
    const retrieved = memory.get("entry-1");
    expect(retrieved).toBeDefined();

    retrieved!.y = 0;
    retrieved!.progress = 0;
    retrieved!.focusId = "page-title";

    expect(memory.get("entry-1")).toEqual(original);
    expect(memory.get("entry-1")).not.toBe(retrieved);
  });

  it("clears all entries and allows new snapshots afterwards", () => {
    const memory = new ScrollMemory();
    memory.save("entry-1", { y: 2400 });
    memory.save("entry-2", { y: 6400 });

    memory.clear();
    memory.clear();

    expect(memory.get("entry-1")).toBeUndefined();
    expect(memory.get("entry-2")).toBeUndefined();
    memory.save("entry-1", { y: 100 });
    expect(memory.get("entry-1")).toEqual({ y: 100 });
  });
});

describe("resolveGalleryReturn", () => {
  it.each(["timepiece", "faro", "egypt", "proyavleno"] as const)(
    "returns a direct %s case to its own exhibit when no snapshot exists",
    (project) => {
      expect(resolveGalleryReturn(project)).toEqual({
        y: 0,
        chapter: project,
        progress: 0.72,
        focusId: `world-${project}-title`,
      });
    },
  );

  it("keeps the projects in chapter order and returns the archived Wordflow case to the fourth exhibit", () => {
    const exhibitChapters = journeyChapters.slice(1, -1).map(({ id }) => id);
    expect(exhibitChapters).toEqual(projects.map(({ id }) => id));
    expect(exhibitChapters[3]).toBe("proyavleno");
    expect(exhibitChapters).not.toContain("wordflow");

    const archived = getProject("wordflow");
    expect(archived?.showcase.src).toBe("/demos/wordflow/index.html");
    expect(resolveGalleryReturn(galleryProjectId(archived!.id))).toMatchObject({
      chapter: "proyavleno",
      focusId: "world-proyavleno-title",
    });
  });

  it("preserves a saved history position even if it belongs to another chapter", () => {
    const saved = Object.freeze({
      y: 6400,
      chapter: "egypt",
      progress: 0.7,
      focusId: "world-egypt-title",
    });

    expect(resolveGalleryReturn("faro", saved)).toEqual(saved);
    expect(saved).toEqual({
      y: 6400,
      chapter: "egypt",
      progress: 0.7,
      focusId: "world-egypt-title",
    });
  });

  it("does not mistake a saved top-of-page snapshot for missing history", () => {
    expect(resolveGalleryReturn("wordflow", { y: 0 })).toEqual({ y: 0 });
  });
});
