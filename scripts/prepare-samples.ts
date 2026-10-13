import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { newProject, serializeProject } from "../src/core/project";
import { SYNTHETIC_TEXT, syntheticCellSvg } from "../src/core/synthetic";
import { cellRect, templateSvg } from "../src/core/template";
import { trace } from "../src/core/trace";
import { defaultSettings } from "../src/core/types";

const sources: Record<string, { source: string; gray: number[] }> = JSON.parse(
  await readFile("artifacts/sample-sources/letters.json", "utf8"),
);
const project = newProject("Paper Bloom", "HELLO JOB");
project.id = "nist-sd19";
project.createdAt = project.updatedAt = "2026-10-14T00:00:00.000Z";
for (const character of project.characters) {
  const { source, gray } = sources[character];
  const settings = defaultSettings();
  project.glyphs[character] = {
    character,
    source,
    settings,
    contours: trace(Uint8Array.from(gray), 144, 144, settings).contours,
    reviewed: true,
    origin: "sample",
  };
}
await writeFile(
  "public/samples/paper-sample.glyphsprout.json",
  serializeProject(project),
);
const paper = templateSvg(
  project.characters,
  project.name,
  project.id,
  0,
).replace(
  "</svg>",
  `${project.characters
    .map((character, i) => {
      const r = cellRect(i);
      return `<image x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" href="${sources[character].source}"/>`;
    })
    .join("")}</svg>`,
);
const synthetic = newProject("SproutScript", SYNTHETIC_TEXT);
const syntheticSheet = templateSvg(
  synthetic.characters,
  synthetic.name,
  "synthetic",
  0,
).replace(
  "</svg>",
  `${synthetic.characters
    .map((character, i) => {
      const r = cellRect(i);
      const inner = syntheticCellSvg(character)
        .replace(/^<svg[^>]*>/, "")
        .replace(/<\/svg>$/, "");
      return `<svg x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" viewBox="0 0 1 1">${inner}</svg>`;
    })
    .join("")}</svg>`,
);
await writeFile("public/samples/paper-sheet.svg", paper);
await writeFile("public/samples/synthetic-sheet.svg", syntheticSheet);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1000, height: 1414 },
    deviceScaleFactor: 1,
  });
  for (const [name, svg] of [
    ["paper", paper],
    ["sample", syntheticSheet],
  ]) {
    await page.goto(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    );
    await page.screenshot({ path: `tests/e2e/fixtures/${name}.png` });
  }
} finally {
  await browser.close();
}
console.log(
  "Built paper and scripted examples with real browser rasterization.",
);
