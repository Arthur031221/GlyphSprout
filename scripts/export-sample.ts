import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { woff2 } from "fonteditor-core";
import { buildTtf } from "../src/core/font";
import { parseProject } from "../src/core/project";

const destination = resolve(process.argv[2] ?? "artifacts/paper-bloom");
const project = parseProject(
  await readFile("public/samples/paper-sample.glyphsprout.json", "utf8"),
);
const ttf = buildTtf(project);
await woff2.init();
const encoded = new Uint8Array(woff2.encode(ttf));
await mkdir(destination, { recursive: true });
await writeFile(resolve(destination, "PaperBloom.ttf"), new Uint8Array(ttf));
await writeFile(resolve(destination, "PaperBloom.woff2"), encoded);
console.log(
  `Paper Bloom: ${project.characters.length} letters, ${ttf.byteLength} byte TTF, ${encoded.byteLength} byte WOFF2`,
);
