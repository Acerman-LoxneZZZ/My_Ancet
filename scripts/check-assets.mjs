import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reviewRoot = "docs/design/review-v2/assets";
const images = [
  "timepiece-original.jpg",
  "timepiece-exploded.jpg",
  "faro-original.jpg",
  "faro-menu.jpg",
  "egypt-original.jpg",
  "egypt-chapter.jpg",
  "wordflow-original.jpg",
  "wordflow-dictionary.jpg",
  "egypt-gateway.png",
  "egypt-landscape.png",
];
const fonts = [
  "cormorant-cyrillic-medium.woff2",
  "cormorant-cyrillic.woff2",
  "cormorant-latin-medium.woff2",
  "cormorant-latin.woff2",
  "manrope-cyrillic.woff2",
  "manrope-latin.woff2",
  "Cormorant-LICENSE.txt",
  "Manrope-LICENSE.txt",
];
const licenses = [
  "DejaVu.txt",
  "FARO-ATTRIBUTION.md",
  "Meshoptimizer-MIT.txt",
  "Three-MIT.txt",
];

export const assetCopies = [
  ...["pocket-watch.glb", "pizza-web.glb"].map((name) => ({
    source: `${reviewRoot}/${name}`,
    target: `public/assets/models/${name}`,
  })),
  {
    source: `${reviewRoot}/watch-parts.json`,
    target: "public/assets/data/watch-parts.json",
  },
  ...images.map((name) => ({
    source: `${reviewRoot}/${name}`,
    target: `public/assets/images/${name}`,
  })),
  ...fonts.map((name) => ({
    source: `${reviewRoot}/fonts/${name}`,
    target: `public/assets/fonts/${name}`,
  })),
  ...licenses.map((name) => ({
    source: `${reviewRoot}/licenses/${name}`,
    target: `public/assets/licenses/${name}`,
  })),
  {
    source: ".research/chasi/assets/blender/pocket-watch.blend",
    target: "assets/source/timepiece/pocket-watch.blend",
  },
  {
    source: ".research/pizza/assets/pizza-video/scene-3d/pizza-source.blend",
    target: "assets/source/faro/pizza-source.blend",
  },
];

async function walk(directory) {
  const paths = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink())
      throw new Error(
        `Symbolic link is not permitted in public assets: ${path}`,
      );
    if (entry.isDirectory()) paths.push(...(await walk(path)));
    else paths.push(path);
  }
  return paths;
}

export async function checkAssets({ root = repositoryRoot } = {}) {
  const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
  const checked = [];
  for (const { source, target } of assetCopies) {
    const [original, copy] = await Promise.all([
      readFile(resolve(root, source)),
      readFile(resolve(root, target)),
    ]);
    if (hash(original) !== hash(copy))
      throw new Error(`Asset differs from its source: ${target}`);
    checked.push({ path: target, bytes: copy.byteLength, sha256: hash(copy) });
  }
  const forbidden =
    /(^|\/)(?:\.research|\.openai|backups|server)(?:\/|$)|\.(?:(?:sqlite(?:3)?|db)(?:-(?:wal|shm))?|blend\d*)$|(?:^|\/)(?:profile(?:-client|-sync)?\.(?:js|mjs)|(?:profiles?|profile-config|telegram-profile-config)\.json|telegram-auth\.js|hosting\.json|wrangler\.(?:jsonc?|toml)|\.env(?:\..*)?)$/i;
  for (const path of await walk(resolve(root, "public"))) {
    const local = relative(resolve(root, "public"), path).replaceAll("\\", "/");
    if (forbidden.test(local))
      throw new Error(`Forbidden private/source file in public: ${local}`);
  }
  const castleRoot = resolve(root, 'public/demos/castle');
  const castle = JSON.parse(await readFile(join(castleRoot, 'SOURCE.json'), 'utf8'));
  if (castle.commit !== 'fb79bf9ee0a3d002d13a52a6c61724fa0b450077') throw new Error('Unexpected Castle source revision');
  for (const file of await walk(castleRoot)) {
    if (!/\.(?:html|css)$/.test(file)) continue;
    const text = await readFile(file, 'utf8');
    const refs = [...text.matchAll(/(?:src|href)=["']([^"']+)["']|url\(["']?([^"')]+)["']?\)/g)];
    for (const match of refs) {
      const ref = (match[1] ?? match[2]).split(/[?#]/)[0];
      if (!ref || /^(?:https?:|data:|\/)/.test(ref)) continue;
      const path = resolve(dirname(file), ref);
      if (!path.startsWith(castleRoot + (process.platform === 'win32' ? '\\' : '/'))) throw new Error(`Castle asset escapes its demo: ${ref}`);
      await readFile(path);
    }
  }
  const demoRoot = resolve(root, "public/demos/wordflow");
  const expectedDemo = [
    "demo-state.js",
    "index.html",
    "public/wordflow-activity.js",
    "public/wordflow-library.css",
    "public/wordflow-library.js",
    "public/wordflow-model.js",
  ].sort();
  const actualDemo = (await walk(demoRoot))
    .map((path) => relative(demoRoot, path).replaceAll("\\", "/"))
    .sort();
  if (JSON.stringify(actualDemo) !== JSON.stringify(expectedDemo))
    throw new Error("Wordflow demo contains missing or unapproved files");
  for (const path of expectedDemo) {
    const text = await readFile(join(demoRoot, path), "utf8");
    if (
      /\/api\/profile|profile-client\.js|telegram\.org\/js\/telegram-web-app\.js/.test(
        text,
      )
    ) {
      throw new Error(`Hosted profile connection found in demo: ${path}`);
    }
  }
  const parts = JSON.parse(
    await readFile(
      resolve(root, "public/assets/data/watch-parts.json"),
      "utf8",
    ),
  );
  if (
    parts.length !== 47 ||
    new Set(parts.map((part) => part.nodeName)).size !== 47
  )
    throw new Error("Expected 47 distinct watch carriers");
  return { checked, demoFiles: actualDemo.length, watchParts: parts.length };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const result = await checkAssets();
  console.log(
    `Verified ${result.checked.length} exact asset/source copies, ${result.demoFiles} isolated demo files and ${result.watchParts} watch parts. Public scan contains no forbidden source/profile files.`,
  );
}
