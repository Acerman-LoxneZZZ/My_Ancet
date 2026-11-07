import { afterEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  normalizePagesBasePath,
  preparePagesOutput,
  rewriteDemoUrls,
} from "../scripts/build-pages.mjs";

describe("GitHub Pages base path", () => {
  it("normalizes local directory names while keeping the repository's case", () => {
    expect(normalizePagesBasePath()).toBe("/My_Ancet/");
    for (const input of ["My_Ancet", "/My_Ancet", "/My_Ancet/", " /My_Ancet/ "]) {
      expect(normalizePagesBasePath(input)).toBe("/My_Ancet/");
    }
    expect(normalizePagesBasePath("group/my-site")).toBe("/group/my-site/");
    expect(normalizePagesBasePath("/")).toBe("/");
  });

  it.each([
    "", "   ", "https://example.test/site/", "//example.test/site/",
    "/../My_Ancet/", "/My_Ancet/../", "/./", "/a//b/",
    "/My Ancet/", "/My_Ancet?preview=1/", "/My_Ancet#top/",
    "/My\\Ancet/", "/%2e%2e/", "/site/%2f/",
  ])("rejects ambiguous or nonlocal base %j", (input) => {
    expect(() => normalizePagesBasePath(input)).toThrow("PAGES_BASE_PATH");
  });
});

describe("copied demo URLs", () => {
  it("rebases HTML, JSON, JS templates, CSS and every srcset candidate", () => {
    const source = [
      '<script type="module" src="/demos/timepiece/assets/index.js"></script>',
      '<img src="/assets/images/watch.webp" srcset="/assets/watch-640.webp 640w, /demos/watch-1200.webp 1200w">',
      "<link imagesrcset='/demos/a.webp 1x, /assets/b.webp 2x'>",
      '{"model":"/assets/models/pizza.glb"}',
      "const image = `/demos/timepiece/images/${finish}.webp`;",
      "const manifest = '/demos/egypt/assets/manifest.json';",
      '@font-face{src:url("/demos/tutor/assets/font.woff2")}',
      '.scene{background:url( /assets/images/landscape.webp)}',
    ].join("\n");
    const expected = [
      '<script type="module" src="/My_Ancet/demos/timepiece/assets/index.js"></script>',
      '<img src="/My_Ancet/assets/images/watch.webp" srcset="/My_Ancet/assets/watch-640.webp 640w, /My_Ancet/demos/watch-1200.webp 1200w">',
      "<link imagesrcset='/My_Ancet/demos/a.webp 1x, /My_Ancet/assets/b.webp 2x'>",
      '{"model":"/My_Ancet/assets/models/pizza.glb"}',
      "const image = `/My_Ancet/demos/timepiece/images/${finish}.webp`;",
      "const manifest = '/My_Ancet/demos/egypt/assets/manifest.json';",
      '@font-face{src:url("/My_Ancet/demos/tutor/assets/font.woff2")}',
      '.scene{background:url( /My_Ancet/assets/images/landscape.webp)}',
    ].join("\n");
    expect(rewriteDemoUrls(source)).toBe(expected);
  });

  it("preserves external, protocol-relative and relative URLs, IPA and regex", () => {
    const source = [
      '<img src="https://cdn.example.test/assets/image.webp">',
      '<script src="//cdn.example.test/demos/library.js"></script>',
      '<a href="../assets/license.txt">License</a>',
      '<img src="./images/photo.webp" srcset="./a.webp 1x, ../b.webp 2x">',
      "const external = 'https://example.test/image?next=\"/assets/original\"';",
      '.scene{background:url(https://cdn.example.test/assets/image.webp)}',
      'const pronunciation = "/ˈdʒɜːni/";',
      String.raw`const pattern = /\/assets\/[a-z]+/;`,
      'const route = "/work/timepiece";',
      'const anchor = "#contact";',
    ].join("\n");
    expect(rewriteDemoUrls(source)).toBe(source);
  });

  it("keeps external srcset candidates alongside rebased local candidates", () => {
    expect(rewriteDemoUrls(
      '<img srcset="https://cdn.test/assets/a.webp 1x, /demos/a.webp 2x, //cdn.test/b.webp 3x">',
      "/portfolio/",
    )).toBe(
      '<img srcset="https://cdn.test/assets/a.webp 1x, /portfolio/demos/a.webp 2x, //cdn.test/b.webp 3x">',
    );
  });

  it("can be rerun without accumulating the deployment prefix", () => {
    const once = rewriteDemoUrls(
      '<img src="/assets/a.webp" srcset="/assets/a.webp 1x, /demos/b.webp 2x">',
    );
    expect(rewriteDemoUrls(once)).toBe(once);
    expect(rewriteDemoUrls('"/My_Ancet/assets/a.webp"')).toBe('"/My_Ancet/assets/a.webp"');
    expect(rewriteDemoUrls('"/assets/a.webp"', "/")).toBe('"/assets/a.webp"');
  });
});

describe("Pages output preparation", () => {
  const temporaryDirectories: string[] = [];
  afterEach(async () => {
    await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
  });

  it("changes only demo text files and creates the exact SPA fallback", async () => {
    const output = await mkdtemp(join(tmpdir(), "pages-deploy-test-"));
    temporaryDirectories.push(output);
    await mkdir(join(output, "demos", "egypt", "assets"), { recursive: true });
    await mkdir(join(output, "assets"));
    const index = '<html><script src="/My_Ancet/assets/app.js"></script></html>\n';
    const binary = Buffer.from([0, 255, 128, 47, 97, 115, 115, 101, 116, 115, 47]);
    await Promise.all([
      writeFile(join(output, "index.html"), index),
      writeFile(join(output, "assets", "app.js"), 'const source="/assets/untouched";'),
      writeFile(join(output, "demos", "egypt", "index.html"), '<img src="/demos/egypt/assets/giza.webp">'),
      writeFile(join(output, "demos", "egypt", "assets", "manifest.json"), '{"image":"/assets/images/egypt.webp"}'),
      writeFile(join(output, "demos", "egypt", "assets", "model.glb"), binary),
      writeFile(join(output, "demos", "egypt", "assets", "notice.txt"), '"/assets/untouched"'),
    ]);

    const result = await preparePagesOutput(output);
    expect(result.rewrittenFiles).toHaveLength(2);
    expect(await readFile(join(output, "demos", "egypt", "index.html"), "utf8"))
      .toBe('<img src="/My_Ancet/demos/egypt/assets/giza.webp">');
    expect(await readFile(join(output, "demos", "egypt", "assets", "manifest.json"), "utf8"))
      .toBe('{"image":"/My_Ancet/assets/images/egypt.webp"}');
    expect(await readFile(join(output, "assets", "app.js"), "utf8"))
      .toBe('const source="/assets/untouched";');
    expect(await readFile(join(output, "demos", "egypt", "assets", "model.glb"))).toEqual(binary);
    expect(await readFile(join(output, "demos", "egypt", "assets", "notice.txt"), "utf8"))
      .toBe('"/assets/untouched"');
    expect(await readFile(join(output, "404.html"), "utf8")).toBe(index);
    expect(await readFile(join(output, "index.html"), "utf8")).toBe(index);
    expect(await readFile(join(output, ".nojekyll"), "utf8")).toBe("");
    expect((await preparePagesOutput(output)).rewrittenFiles).toEqual([]);
  });
});
