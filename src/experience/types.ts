import type * as THREE from "three";
export type ProjectId = "timepiece" | "faro" | "egypt" | "proyavleno" | "dal" | "tutor" | "castle" | "wordflow";
export type WorldId = "monolith" | "timepiece" | "faro";
export type Quality = {
  tier: "desktop" | "mobile" | "low";
  dpr: number;
  particles: number;
  transmission: boolean;
};
export type FrameState = {
  progress: number;
  time: number;
  pointer: [number, number];
  reducedMotion: boolean;
  finale: boolean;
  selected?: string;
  impulse: number;
  manual?: boolean;
};
export interface WorldInstance {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  update(state: FrameState): void;
  fit(width: number, height: number): void;
  setQuality(quality: Quality): void;
  dispose(): void;
}
export type WorldOptions = {
  resolveAsset: (path: string) => string;
  quality: Quality;
};
