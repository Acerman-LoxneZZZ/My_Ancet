import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { build as viteBuild } from "vite";
import { addTimepieceLoadingScreen, timepiecePerformancePlugin } from "./timepiece-performance.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const publicRoot = join(root, "public");
const demos = await realpath(join(publicRoot, "demos"));
const tempRoot = await realpath(tmpdir());
const definitions = [
  {
    id: "timepiece",
    source: "chasi-current",
    shared: { "models/pocket-watch.glb": "/assets/models/pocket-watch.glb" },
  },
  {
    id: "egypt",
    source: "egi",
    shared: {
      "assets/gateway.png": "/assets/images/egypt-gateway.png",
      "assets/giza-world.png": "/assets/images/egypt-landscape.png",
    },
  },
];

const selected = process.argv[2];
const builds = selected ? definitions.filter(({ id }) => id === selected) : definitions;
if (builds.length === 0) throw new Error(`Unknown gallery demo: ${selected}`);
const staging = await mkdtemp(join(tempRoot, "loxne-gallery-"));

try {
  for (const { id, source, shared } of builds) {
    const original = join(root, ".research", source);
    const build = join(staging, id);
    const base = `/demos/${id}/`;
    if (id === 'timepiece') await viteBuild({
      root: original, base, plugins: [timepiecePerformancePlugin()],
      build: { outDir: build },
    });
    else execFileSync(process.execPath, [
      join(original, "node_modules", "vite", "bin", "vite.js"),
      "build", "--base", base, "--outDir", build,
    ], { cwd: original, stdio: "inherit" });

    const rewrites = new Map();
    for (const [file, url] of Object.entries(shared)) {
      const asset = join(build, file);
      const originalBytes = await readFile(asset);
      const sharedBytes = await readFile(join(publicRoot, url.slice(1)));
      if (!originalBytes.equals(sharedBytes)) continue;
      rewrites.set(base + file, url);
      await rm(asset);
    }

    if (id === "egypt") {
      const manifestPath = join(build, "assets", "manifest.json");
      const manifest = await readFile(manifestPath, "utf8");
      await writeFile(manifestPath, manifest.replaceAll('"/assets/', `"${base}assets/`));
      rewrites.set('"/assets/manifest.json"', `"${base}assets/manifest.json"`);
      await cp(join(root, 'scripts/templates/egypt-gallery.css'), join(build, 'gallery.css'));
      const entryPath = join(build, 'index.html');
      const entryHtml = await readFile(entryPath, 'utf8');
      await writeFile(entryPath, entryHtml.replace('</head>', `<link rel="stylesheet" href="${base}gallery.css">\n</head>`));
    } else {
      const entryPath = join(build, 'index.html');
      const [entry, portfolioEntry, bootStyles] = await Promise.all([
        readFile(entryPath, 'utf8'),
        readFile(join(root, 'index.html'), 'utf8'),
        readFile(join(root, 'src/styles/boot.css'), 'utf8'),
      ]);
      await writeFile(entryPath, addTimepieceLoadingScreen(entry, portfolioEntry, bootStyles));
      const licenses = join(build, "licenses");
      await mkdir(licenses);
      for (const [dependency, file] of [
        ["@fontsource-variable/manrope", "Manrope-OFL.txt"],
        ["@fontsource/cormorant-garamond", "Cormorant-OFL.txt"],
      ]) {
        await cp(join(original, "node_modules", dependency, "LICENSE"), join(licenses, file));
      }
      const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: original, encoding: 'utf8' }).trim();
      await writeFile(join(build, 'SOURCE.json'), JSON.stringify({
        repository: 'https://github.com/Acerman-LoxneZZZ/chasi', commit,
        adaptations: [
          'scripts/timepiece-performance.mjs',
          'scripts/templates/timepiece-frame-scheduler.ts',
        ],
        changes: 'Reuse the portfolio loading screen through watch scene readiness and hide the first station caption. Use the scroll ticker for watch frames, prewarm lower-scene shaders behind the initial loader, and tolerate rounded ticker times at 60 Hz.',
      }, null, 2) + '\n');
    }

    for (const entry of await readdir(build, { withFileTypes: true, recursive: true })) {
      if (!entry.isFile() || ![".html", ".css", ".js", ".json"].includes(extname(entry.name))) continue;
      const file = join(entry.parentPath, entry.name);
      const text = await readFile(file, "utf8");
      let rewritten = text;
      for (const [from, to] of rewrites) rewritten = rewritten.replaceAll(from, to);
      if (rewritten !== text) await writeFile(file, rewritten);
    }

    const destination = resolve(demos, id);
    if (dirname(destination) !== demos) throw new Error(`Unexpected demo path: ${destination}`);
    await rm(destination, { recursive: true, force: true });
    await cp(build, destination, { recursive: true });
  }
} finally {
  if (dirname(staging) === tempRoot) await rm(staging, { recursive: true, force: true });
}
