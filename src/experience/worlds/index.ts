import type { WorldId, WorldInstance, WorldOptions } from "../types";
import { FaroWorld } from "./FaroWorld";
import { MonolithWorld } from "./MonolithWorld";
import { TimepieceWorld } from "./TimepieceWorld";

export async function createWorld(
  id: WorldId,
  options: WorldOptions,
): Promise<WorldInstance> {
  switch (id) {
    case "monolith":
      return new MonolithWorld(options.quality);
    case "timepiece":
      return TimepieceWorld.create(options);
    case "faro":
      return FaroWorld.create(options);
    default:
      throw new Error(`Неизвестный мир: ${String(id)}`);
  }
}
