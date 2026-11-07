import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFile, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const sourceRoot = join(root, ".research/castle");
const source = join(sourceRoot, "dist");
const output = join(root, "public/demos/castle");
const revision = "fb79bf9ee0a3d002d13a52a6c61724fa0b450077";
const actualRevision = execFileSync("git", ["-C", sourceRoot, "rev-parse", "HEAD"], { encoding: "utf8", windowsHide: true }).trim();
if (actualRevision !== revision) throw new Error(`Castle source must be pinned to ${revision}`);

await mkdir(join(output, "assets/fonts"), { recursive: true });
const htmlSource = await readFile(join(source, "index.html"), "utf8");
const imageNames = [...new Set([...htmlSource.matchAll(/assets\/([^"\s]+\.(?:png|jpg))/g)].map(match => match[1]))];
if (imageNames.some(name => !/^[a-z0-9-]+\.(?:png|jpg)$/.test(name))) throw new Error("Unexpected Castle image path");
const assets = imageNames.map(name => ({
  source: name,
  runtime: name.replace(/\.(?:png|jpg)$/, ".webp"),
}));

// Preserve hero and alpha-layer dimensions. Gallery photographs only need to
// cover their displayed card/background sizes, not their 3–5K source pixels.
execFileSync("python", ["-c", String.raw`
from pathlib import Path
from PIL import Image, ImageOps
import json, sys
source = Path(sys.argv[1]); output = Path(sys.argv[2]); names = json.loads(sys.argv[3])
for name in names:
    image = ImageOps.exif_transpose(Image.open(source / name))
    if not name.startswith('castle-') and name != 'portal-arch.png':
        limit = 2560 if 'background' in name else 1600
        image.thumbnail((limit, limit), Image.Resampling.LANCZOS)
    if image.mode not in ('RGB', 'RGBA'):
        image = image.convert('RGBA' if 'transparency' in image.info else 'RGB')
    path = output / Path(name).with_suffix('.webp')
    image.save(path, 'WEBP', quality=92, method=6, exact=True)
    print(f'{name} -> {path.name}: {image.width}x{image.height}, {path.stat().st_size} bytes')
`, join(source, "assets"), join(output, "assets"), JSON.stringify(imageNames)], { stdio: "inherit", windowsHide: true });

// An already compressed photograph should not become larger just to change
// formats. Keep its original JPEG when that is the smaller runtime asset.
for (const asset of assets) {
  if (!asset.source.endsWith(".jpg")) continue;
  const original = await readFile(join(source, "assets", asset.source));
  const encoded = await readFile(join(output, "assets", asset.runtime));
  if (encoded.byteLength < original.byteLength) continue;
  await unlink(join(output, "assets", asset.runtime));
  asset.runtime = asset.source;
  await writeFile(join(output, "assets", asset.runtime), original);
}

const fontUrl = "https://dcym8fthxf5uu.cloudfront.net/fonts/247a073c-29f5-4a89-aa3a-741020f346fc/OggText-Medium.woff2";
const fontResponse = await fetch(fontUrl);
if (!fontResponse.ok) throw new Error(`Castle font request failed: ${fontResponse.status}`);
const font = Buffer.from(await fontResponse.arrayBuffer());
if (font.subarray(0, 4).toString() !== "wOF2") throw new Error("Castle font is not WOFF2");
const fontHash = createHash("sha256").update(font).digest("hex");
if (fontHash !== "b57d1cbbd6d456d35e421161bfbb614f1903dded2b4c27de26d75ebf5a448702") throw new Error("Castle's original font changed");
await writeFile(join(output, "assets/fonts/OggText-Medium.woff2"), font);

let html = htmlSource;
for (const asset of assets) html = html.replaceAll(`assets/${asset.source}`, `assets/${asset.runtime}`);
html = html
  .replace('<link rel="preload" href="assets/castle-cutout.webp" as="image">',
    '<link rel="preload" href="assets/castle-cutout.webp" as="image" media="(max-aspect-ratio:4/3)"><link rel="preload" href="assets/castle-wide-cutout.webp" as="image" media="(min-aspect-ratio:4/3)">')
  .replace('<link rel="stylesheet" href="styles.css">',
    '<link rel="preload" href="assets/fonts/OggText-Medium.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="styles.css">')
  .replace('<meta name="theme-color"', '<meta http-equiv="Content-Security-Policy" content="form-action \'none\'; connect-src \'none\'"><meta name="theme-color"')
  .replace(/<img\b[^>]*>/g, tag => {
    const hero = /assets\/castle-(?:hd|cutout)\.webp/.test(tag);
    if (!/\bdecoding=/.test(tag)) tag = tag.replace(/>$/, ' decoding="async">');
    if (!hero && !/\bloading=/.test(tag)) tag = tag.replace(/>$/, ' loading="lazy">');
    if (/assets\/castle-hd\.webp/.test(tag)) tag = tag.replace(/>$/, ' fetchpriority="high">');
    return tag;
  });
await writeFile(join(output, "index.html"), html);
const css = await readFile(join(source, "styles.css"), "utf8");
if (!css.includes(fontUrl)) throw new Error("Castle's original font declaration changed");
await writeFile(join(output, "styles.css"), css.replace(fontUrl, "assets/fonts/OggText-Medium.woff2"));
await copyFile(join(source, "script.js"), join(output, "script.js"));
await copyFile(join(source, "assets/favicon.svg"), join(output, "assets/favicon.svg"));
await copyFile(join(source, "assets/sources.json"), join(output, "assets/sources.json"));
await writeFile(join(output, "SOURCE.json"), JSON.stringify({
  repository: "https://github.com/Acerman-LoxneZZZ/castle",
  commit: revision,
  sourceDirectory: "dist",
  modifications: [
    "Local copy of the original Ogg Medium webfont; font family and styles unchanged.",
    "Runtime images encoded as WebP at quality 92; original JPEGs kept where smaller. Hero and cutout dimensions retained.",
    "Gallery photos resized to a maximum edge of 1600 px; full-screen backgrounds to 2560 px.",
    "Deferred non-hero images, responsive cutout preloads and asynchronous decoding.",
    "CSP disables form submission and programmatic external connections; no original forms or backend exist.",
  ],
  font: { originalUrl: fontUrl, sha256: fontHash },
  images: assets,
  attribution: "Original photography credit links and assets/sources.json are retained unchanged.",
}, null, 2) + "\n");
console.log(`Castle demo prepared from ${revision}: ${assets.length} images, local font, no runtime dependencies.`);
