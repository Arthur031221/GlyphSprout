import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createFont, woff2 } from "fonteditor-core";
import { buildTtf, fontGlyph } from "../src/core/font";
import { newProject } from "../src/core/project";
import { traceMask } from "../src/core/trace";
import { defaultSettings } from "../src/core/types";

const destination = process.argv[2] ?? "artifacts/font-validation";
await mkdir(destination, { recursive: true });
const project = newProject("GlyphSprout validation", "Ogi一日8");
const size = 100;
const inside = (
  x: number,
  y: number,
  l: number,
  t: number,
  r: number,
  b: number,
) => x >= l && x < r && y >= t && y < b;
const patterns: Record<string, (x: number, y: number) => boolean> = {
  O: (x, y) => inside(x, y, 15, 10, 75, 70) && !inside(x, y, 25, 20, 65, 60),
  g: (x, y) =>
    (inside(x, y, 20, 30, 70, 75) && !inside(x, y, 30, 40, 60, 65)) ||
    inside(x, y, 60, 60, 70, 95) ||
    inside(x, y, 30, 85, 70, 95),
  i: (x, y) => inside(x, y, 40, 10, 50, 20) || inside(x, y, 40, 35, 50, 78),
  一: (x, y) => inside(x, y, 10, 48, 90, 52),
  日: (x, y) =>
    (inside(x, y, 20, 15, 80, 80) && !inside(x, y, 30, 25, 70, 70)) ||
    inside(x, y, 30, 45, 70, 50),
  "8": (x, y) =>
    inside(x, y, 20, 10, 75, 78) &&
    !inside(x, y, 30, 20, 65, 38) &&
    !inside(x, y, 30, 48, 65, 68),
};
const expected: Record<string, unknown> = {};
for (const ch of project.characters) {
  const mask = Uint8Array.from({ length: size * size }, (_, i) =>
    patterns[ch](i % size, Math.floor(i / size)) ? 1 : 0,
  );
  project.glyphs[ch] = {
    character: ch,
    source: "",
    contours: traceMask(mask, size, size),
    settings: { ...defaultSettings(), smoothing: 0 },
    reviewed: true,
    origin: "sample",
  };
  const glyph = fontGlyph(project.glyphs[ch]);
  expected[ch] = {
    bounds: [glyph.xMin, glyph.yMin, glyph.xMax, glyph.yMax],
    advance: glyph.advanceWidth,
    contours: glyph.contours.length,
    mask: Array.from(mask),
  };
}
const ttf = buildTtf(project);
await writeFile(join(destination, "fixtures.ttf"), new Uint8Array(ttf));
await woff2.init();
const encoded = woff2.encode(ttf);
await writeFile(join(destination, "fixtures.woff2"), encoded);
const parsed = createFont(ttf, { type: "ttf" }).get();
await writeFile(
  join(destination, "expected.json"),
  JSON.stringify({
    characters: project.characters,
    size,
    expected,
    exporterGlyphCount: parsed.glyf.length,
  }),
);
console.log(
  `Exported ${project.characters.length} fixture characters as TTF and WOFF2`,
);
