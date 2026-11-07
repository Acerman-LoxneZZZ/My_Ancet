import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = join(root, ".research/pizza/assets/pizza-video");
const scene = join(source, "scene-3d");
const output = join(root, "public/demos/faro");

async function copy(from, path) {
  const destination = join(output, path);
  await mkdir(dirname(destination), { recursive: true });
  await cp(join(from, path), destination);
}

const pages = ["style.css", "site.js", "site-config.js", "credits.html", "ATTRIBUTION.md",
  "model-info.json", "photo-info.json", "THREE-LICENSE.txt", "MESHOPTIMIZER-LICENSE.txt"];
const assets = [];
for (const directory of ["fonts", "media", "media/menu-session"]) {
  const entries = await readdir(join(scene, directory), { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && /\.(?:woff2|txt|webp|json)$/.test(entry.name)) {
      assets.push(join(directory, entry.name));
    }
  }
}
await Promise.all([...pages, ...assets].map(path => copy(scene, path)));
await Promise.all(["gsap.min.js", "ScrollTrigger.min.js", "NOTICE.md"].map(name =>
  copy(source, join("vendor", name))));

const model = await readFile(join(scene, "pizza-web.glb"));
const galleryModel = await readFile(join(root, "public/assets/models/pizza-web.glb"));
if (!model.equals(galleryModel)) throw new Error("FARO's model differs from the gallery asset");
const bundle = await readFile(join(scene, "pizza-scene.js"), "utf8");
if (!bundle.includes('"pizza-web.glb"')) throw new Error("FARO model URL is missing from the bundle");
await writeFile(join(output, "pizza-scene.js"),
  bundle.replace('"pizza-web.glb"', '"/assets/models/pizza-web.glb"'));

const html = await readFile(join(scene, "index.html"), "utf8");
await writeFile(join(output, "index.html"), html
  .replaceAll('src="../vendor/', 'src="vendor/')
  .replace('fetchpriority="high" aria-hidden="true"', 'loading="lazy" aria-hidden="true"')
  .replace("</head>", `  <style>
    body:not(.scene-unavailable) .scene-poster { display: none; }
    #pizza-canvas, #loader { transition: none; }
  </style>
  <noscript><style>body .scene-poster { display: block !important; }</style></noscript>
</head>`));
