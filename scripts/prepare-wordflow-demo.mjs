import {
  mkdir,
  readFile,
  readdir,
  realpath,
  writeFile,
} from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptRoot, "..");
const originalAssets = [
  "public/wordflow-model.js",
  "public/wordflow-activity.js",
  "public/wordflow-library.js",
  "public/wordflow-library.css",
];
const outputFiles = ["index.html", "demo-state.js", ...originalAssets];
const optionalTelegram =
  /<script>\s*\/\* Telegram integration is optional: the standalone file still works offline\. \*\/[\s\S]*?<\/script>/g;

function isInside(parent, child) {
  const local = relative(parent, child);
  return (
    local === "" ||
    (!local.startsWith(".." + sep) && local !== ".." && !isAbsolute(local))
  );
}

async function existingFiles(directory, prefix = "") {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const paths = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink())
      throw new Error("Demo output may not contain symbolic links");
    const path = prefix + entry.name;
    if (entry.isDirectory())
      paths.push(
        ...(await existingFiles(join(directory, entry.name), path + "/")),
      );
    else paths.push(path);
  }
  return paths;
}

export async function buildWordflowDemo({ sourceRoot, outputRoot }) {
  if (!sourceRoot || !outputRoot)
    throw new Error("sourceRoot and outputRoot are required");
  const source = await realpath(resolve(sourceRoot));
  let destination = resolve(outputRoot);
  try {
    destination = await realpath(destination);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (isInside(source, destination) || isInside(destination, source)) {
    throw new Error(
      "Source and output must be separate, non-overlapping directories",
    );
  }
  const unexpected = (await existingFiles(destination)).filter(
    (path) => !outputFiles.includes(path),
  );
  if (unexpected.length)
    throw new Error(
      `Refusing to overwrite a non-demo directory: ${unexpected.join(", ")}`,
    );

  const sourceHtml = await readFile(join(source, "index.html"), "utf8");
  if (sourceHtml.match(optionalTelegram)?.length !== 1) {
    throw new Error(
      "Expected the original optional Telegram block exactly once; source is unchanged",
    );
  }
  const assets = await Promise.all(
    originalAssets.map(async (path) => [
      path,
      await readFile(join(source, path)),
    ]),
  );
  const template = await readFile(
    join(scriptRoot, "templates/wordflow-demo-state.mjs"),
    "utf8",
  );
  const policy =
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'";
  const html = sourceHtml
    .replace(
      optionalTelegram,
      "<!-- Optional hosted integration omitted in the isolated portfolio demo. -->",
    )
    .replace(
      /<script>([\s\S]*?)<\/script>/g,
      (_match, program) =>
        `<script type="text/wordflow-script">${program.replace(/\blocalStorage\b/g, "window.WordflowStorage")}</script>`,
    )
    .replace(
      "<head>",
      `<head><meta http-equiv="Content-Security-Policy" content="${policy}">`,
    )
    .replace("<title>", "<title>Локальное демо · ")
    .replace(
      "</body>",
      '<script type="module" src="./demo-state.js"></script></body>',
    );
  if (
    /\/api\/profile|profile-client\.js|telegram\.org\/js\/telegram-web-app\.js/.test(
      html,
    )
  ) {
    throw new Error("Unexpected hosted endpoint remains in the prepared HTML");
  }
  await mkdir(join(destination, "public"), { recursive: true });
  for (const [path, bytes] of assets)
    await writeFile(join(destination, path), bytes);
  await writeFile(join(destination, "index.html"), html);
  await writeFile(
    join(destination, "demo-state.js"),
    template + "\nbootWordflowDemo();\n",
  );
  return { outputRoot: destination, files: [...outputFiles] };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const result = await buildWordflowDemo({
    sourceRoot: resolve(repositoryRoot, process.argv[2] || ".research/EnCard"),
    outputRoot: resolve(
      repositoryRoot,
      process.argv[3] || "public/demos/wordflow",
    ),
  });
  console.log(
    `Prepared ${result.files.length} isolated Wordflow UI files in ${result.outputRoot}`,
  );
}
