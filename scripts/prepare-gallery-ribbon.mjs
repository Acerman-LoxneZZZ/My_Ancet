import { writeFile } from "node:fs/promises";
import { BufferAttribute, BufferGeometry, Mesh } from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { buildRibbonMesh } from "../public/demos/proyavleno/src/ribbon-geometry.js";

// GLTFExporter uses the browser FileReader to assemble the binary chunks.
globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) {
    void blob.arrayBuffer().then(result => {
      this.result = result;
      this.onloadend();
    });
  }
};

const { positions, normals, indices } = buildRibbonMesh({ rows: 72, bevelSegments: 3, faceSegments: 3 });
const geometry = new BufferGeometry();
geometry.setAttribute("position", new BufferAttribute(positions, 3));
geometry.setAttribute("normal", new BufferAttribute(normals, 3));
geometry.setIndex(new BufferAttribute(indices, 1));
geometry.center().scale(1.54, 1.54, 1.54);
const ribbon = new Mesh(geometry);
ribbon.name = "Proyavleno_ribbon";
const binary = await new GLTFExporter().parseAsync(ribbon, { binary: true });
await writeFile(new URL("../public/assets/models/gallery-ribbon.glb", import.meta.url), new Uint8Array(binary));
