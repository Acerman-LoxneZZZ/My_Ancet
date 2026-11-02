import type { Quality } from "./types";
export function chooseQuality({
  width,
  dpr,
  saveData,
  reducedMotion,
}: {
  width: number;
  dpr: number;
  saveData: boolean;
  reducedMotion: boolean;
}): Quality {
  const density = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  if (saveData || reducedMotion)
    return {
      tier: "low",
      dpr: Math.min(1, density),
      particles: 0,
      transmission: false,
    };
  if (width < 800)
    return {
      tier: "mobile",
      dpr: Math.min(1.25, density),
      particles: 40,
      transmission: false,
    };
  return {
    tier: "desktop",
    dpr: Math.min(1.5, density),
    particles: 120,
    transmission: true,
  };
}
export function lowerQuality(q: Quality): Quality {
  if (q.tier === "desktop")
    return {
      tier: "mobile",
      dpr: Math.min(q.dpr, 1.25),
      particles: 40,
      transmission: false,
    };
  return {
    tier: "low",
    dpr: Math.min(q.dpr, 1),
    particles: 0,
    transmission: false,
  };
}
