import { mapViewportChange, type ViewportMetrics } from "../experience/story";
import type { NavigationRequest } from "./TransitionController";
import type { ScrollSnapshot } from "./ScrollMemory";

export function resolveScrollDestination(
  kind: NavigationRequest["kind"],
  snapshot: ScrollSnapshot | undefined,
  hashTop: number | undefined,
  metrics: ViewportMetrics,
): { top: number; source: "snapshot" | "hash" | "top" } {
  // A hash describes the original link, while a POP snapshot describes the
  // visitor's actual position when that particular history entry was left.
  if (kind === "pop" && snapshot)
    return { top: mapViewportChange(snapshot, metrics), source: "snapshot" };
  if (hashTop !== undefined) return { top: hashTop, source: "hash" };
  if (snapshot)
    return { top: mapViewportChange(snapshot, metrics), source: "snapshot" };
  return { top: 0, source: "top" };
}
