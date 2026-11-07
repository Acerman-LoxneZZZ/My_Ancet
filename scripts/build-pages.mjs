import { copyFile, readFile, readdir, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

export const DEFAULT_PAGES_BASE_PATH = "/My_Ancet/";
const demoTextExtensions = new Set([".html", ".js", ".css", ".json"]);

/** Accept a local directory path; URLs, traversal and encoded separators are invalid. */
export function normalizePagesBasePath(value = DEFAULT_PAGES_BASE_PATH) {
  if (typeof value !== "string") {
    throw new TypeError("PAGES_BASE_PATH must be a local path string.");
  }
  const path = value.trim();
  if (path === "/") return "/";
  const segments = path.replace(/^\//, "").replace(/\/$/, "").split("/");
  if (
    !path ||
    segments.some(
      (segment) =>
        !/^[A-Za-z0-9._~-]+$/.test(segment) ||
        segment === "." ||
        segment === "..",
    )
  ) {
    throw new Error(
      "PAGES_BASE_PATH must contain directory names, for example /My_Ancet/.",
    );
  }
  return `/${segments.join("/")}/`;
}

/** Public demo bundles are copied by Vite, so their root URLs need a separate pass. */
export function rewriteDemoUrls(source, basePath = DEFAULT_PAGES_BASE_PATH) {
  const base = normalizePagesBasePath(basePath);
  if (base === "/") return source;

  // A srcset contains multiple URLs inside one quoted attribute value.
  const withSrcsets = source.replace(
    /\b((?:image)?srcset)(\s*=\s*)(["'])([\s\S]*?)\3/gi,
    (_match, attribute, equals, quote, candidates) => {
      const rewritten = candidates.replace(
        /(^\s*|,\s*)\/(assets|demos)\//g,
        (_url, separator, directory) => `${separator}${base}${directory}/`,
      );
      return `${attribute}${equals}${quote}${rewritten}${quote}`;
    },
  );

  // Consume complete external URL literals first, including quotes in their query.
  const withQuotedUrls = withSrcsets.replace(
    /(["'`])(?:https?:)?\/\/(?:\\[\s\S]|(?!\1)[^\\])*?\1|(["'`])\/(assets|demos)\//g,
    (match, externalQuote, quote, directory) =>
      externalQuote ? match : `${quote}${base}${directory}/`,
  );

  // CSS also permits url(/assets/...) without any quote characters.
  return withQuotedUrls.replace(
    /(\burl\(\s*)\/(assets|demos)\//gi,
    (_match, opening, directory) => `${opening}${base}${directory}/`,
  );
}

export async function preparePagesOutput(
  outputDirectory,
  basePath = DEFAULT_PAGES_BASE_PATH,
) {
  const base = normalizePagesBasePath(basePath);
  const rewrittenFiles = [];
  async function visit(directory) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
      } else if (
        entry.isFile() &&
        demoTextExtensions.has(extname(entry.name).toLowerCase())
      ) {
        const original = await readFile(path, "utf8");
        const rewritten = rewriteDemoUrls(original, base);
        if (rewritten !== original) {
          await writeFile(path, rewritten, "utf8");
          rewrittenFiles.push(path);
        }
      }
    }
  }

  await visit(join(outputDirectory, "demos"));
  // Pages serves this document for deep SPA routes, keeping the requested URL.
  await copyFile(join(outputDirectory, "index.html"), join(outputDirectory, "404.html"));
  await writeFile(join(outputDirectory, ".nojekyll"), "");
  return { base, rewrittenFiles };
}

export async function buildPages(basePath = process.env.PAGES_BASE_PATH) {
  const base = normalizePagesBasePath(basePath);
  const root = fileURLToPath(new URL("../", import.meta.url));
  await build({ root, base, build: { outDir: "dist" } });
  return preparePagesOutput(join(root, "dist"), base);
}

const invokedPath = process.argv[1] && resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) {
  const result = await buildPages();
  console.log(
    `Prepared GitHub Pages at ${result.base}; updated ${result.rewrittenFiles.length} demo files.`,
  );
}
