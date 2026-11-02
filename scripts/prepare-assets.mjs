import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { assetCopies } from "./check-assets.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const copies = [];
for (const { source, target } of assetCopies) {
  const bytes = await readFile(resolve(root, source));
  const destination = resolve(root, target);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, bytes);
  copies.push({
    source,
    target,
    bytes: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
await writeFile(
  resolve(root, "assets/source/provenance.json"),
  JSON.stringify(
    {
      recordedAt: "2026-11-02",
      sourceCommits: {
        chasi: "9d214bcf2b5477550ba014c23881cecca32b802e",
        pizza: "ca7e99fe59ec5f61ad49c812da8a4659f6c47fda",
        egi: "1a4725dc9285a8d45ffead5f4342a3e3d94df92d",
        EnCard: "43a41053321f6c96d7880c14bf353dd384380ced",
      },
      modifications:
        "Byte-for-byte copies. No image resizing, color correction, geometry or texture modification.",
      copies,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Copied ${copies.length} allowlisted assets and recorded SHA256 provenance.`,
);
