import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { AssetManager } from "../AssetManager";
import { verifyWatchManifest, type WatchPart } from "../watchPose";
import { disposeTree } from "./shared";

export const modelAssets = new AssetManager<GLTF>({
  load: (url) =>
    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url),
  dispose: (gltf) => {
    disposeTree(gltf.scene, true);
  },
});

export const watchManifests = new AssetManager<WatchPart[]>({
  load: async (url) => {
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok)
      throw new Error(`Манифест часов: HTTP ${response.status}`);
    const data: unknown = await response.json();
    verifyWatchManifest(data);
    return data;
  },
  dispose: () => {},
});
