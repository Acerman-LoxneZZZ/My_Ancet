import { readFile, writeFile } from "node:fs/promises";
import { Group, Mesh } from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// The exporter uses FileReader to join binary chunks in the browser.
globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) {
    void blob.arrayBuffer().then(result => {
      this.result = result;
      this.onloadend();
    });
  }
};

const source = new URL("../public/assets/models/pocket-watch.glb", import.meta.url);
const input = await readFile(source);
const { scene } = await new GLTFLoader().parseAsync(
  input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength),
  "",
);
const watch = scene.getObjectByName("watch_root");
if (!watch) throw new Error("Original watch root is missing");
watch.updateWorldMatrix(true, true);

const exterior = [
  "case_body", "back_cover", "front_bezel", "front_glass", "dial_face",
  "hand_hour", "hand_minute", "hand_second", "crown", "crown_stem", "bow",
];
const surfaces = new Map();
for (const name of exterior) {
  const part = watch.getObjectByName(name);
  if (part?.parent !== watch) throw new Error(`Missing exterior part: ${name}`);
  part.traverse(object => {
    if (!(object instanceof Mesh)) return;
    const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
    // Keep the printing and seconds inset above the enamel where they meet.
    if (object.material.name === "Charcoal dial printing") geometry.translate(0, 0, 0.005);
    if (object.material.name === "Recessed seconds enamel") geometry.translate(0, 0, 0.0032);
    const material = object.material;
    if (!surfaces.has(material)) surfaces.set(material, []);
    surfaces.get(material).push(geometry);
  });
}

const assembled = new Group();
assembled.name = "Assembled pocket watch";
for (const [material, geometries] of surfaces) {
  const geometry = geometries.length === 1 ? geometries[0] : mergeGeometries(geometries);
  if (!geometry) throw new Error(`Cannot merge watch material: ${material.name}`);
  const mesh = new Mesh(geometry, material);
  mesh.name = material.name;
  assembled.add(mesh);
}

const output = process.argv[2];
if (!output) throw new Error("Provide a path for the intermediate assembled GLB");
const binary = await new GLTFExporter().parseAsync(assembled, { binary: true });
await writeFile(output, new Uint8Array(binary));
