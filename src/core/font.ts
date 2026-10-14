import type { TTF } from "fonteditor-core";
import { createFont, woff2 } from "fonteditor-core";
import { type Alternate, gsubTable, withTable } from "./gsub";
import { hasCrossings } from "./smooth";
import { isCjk, isSupported } from "./text";
import { signedArea } from "./trace";
import type { Glyph, KernPair, Project } from "./types";
import { BASELINE, DEFAULT_SPACE_WIDTH, UNITS_PER_EM } from "./types";
import {
  isVariant,
  typedCharacters,
  variantBase,
  variantKey,
} from "./variants";

export function missingCharacters(project: Project): string[] {
  return typedCharacters(project.characters).filter(
    (ch) => !project.glyphs[ch]?.contours.length,
  );
}

/**
 * Lowercase letters that borrow the glyph of their uppercase letter, keyed by
 * the lowercase letter. Empty unless the project asks for it. A lowercase
 * letter the project has itself keeps its own glyph.
 */
export function lowercaseFallbacks(project: Project): Map<string, string> {
  const fallbacks = new Map<string, string>();
  if (!project.upperForLower) return fallbacks;
  const have = new Set(project.characters);
  for (const upper of project.characters) {
    if (!project.glyphs[upper]?.contours.length) continue;
    const lower = upper.toLowerCase();
    if (
      lower === upper ||
      Array.from(lower).length !== 1 ||
      have.has(lower) ||
      !isSupported(lower)
    )
      continue;
    fallbacks.set(lower, upper);
  }
  return fallbacks;
}

const PUNCTUATION_SOURCES: Record<string, string> = {
  "\u2018": "'",
  "\u2019": "'",
  "\u201a": "'",
  "\u201b": "'",
  "\u201c": '"',
  "\u201d": '"',
  "\u201e": '"',
  "\u2010": "-",
  "\u2011": "-",
  "\u2012": "-",
  "\u2013": "-",
  "\u2014": "-",
  "\u2015": "-",
  "\u2212": "-",
};

const ELLIPSIS = "\u2026";

// Word processors and the web type these as spaces that don't break lines.
const SPACE_CODEPOINTS = [
  0xa0, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200a,
  0x202f,
];

/**
 * Curly quotes and dashes that borrow the glyph of a plain character, keyed by
 * the typographic one. Phones and word processors type curly quotes, en and em
 * dashes and an ellipsis, so a font with only the plain marks would show them
 * as missing. A mark the project has itself keeps its own glyph. The ellipsis
 * is built from three periods when the font is exported.
 */
export function punctuationFallbacks(project: Project): Map<string, string> {
  const fallbacks = new Map<string, string>();
  const have = new Set(project.characters);
  const usable = (ch: string) => project.glyphs[ch]?.contours.length;
  for (const [typographic, plain] of Object.entries(PUNCTUATION_SOURCES))
    if (usable(plain) && !have.has(typographic))
      fallbacks.set(typographic, plain);
  if (usable(".") && !have.has(ELLIPSIS)) fallbacks.set(ELLIPSIS, ".");
  return fallbacks;
}

/** Every character the font types with another character's glyph, keyed by the borrowing character. */
export function glyphFallbacks(project: Project): Map<string, string> {
  return new Map([
    ...lowercaseFallbacks(project),
    ...punctuationFallbacks(project),
  ]);
}

/** Three copies of the period's outline in a row, for an ellipsis the project has no glyph for. */
function ellipsisGlyph(period: TTF.Glyph): TTF.Glyph {
  const step = period.advanceWidth;
  const contours = [0, 1, 2].flatMap((i) =>
    period.contours.map((c) => c.map((p) => ({ ...p, x: p.x + i * step }))),
  );
  return {
    ...period,
    contours,
    xMax: period.xMax + 2 * step,
    advanceWidth: 3 * step,
    name: "ellipsis",
    unicode: [0x2026],
  };
}

export function fontGlyph(glyph: Glyph): TTF.Glyph {
  if (!glyph.contours.length) throw new Error("emptyGlyph");
  const settings = glyph.settings;
  const transform = {
    x: (value: number) =>
      Math.round(
        ((value - 0.5) * settings.scale + 0.5) * UNITS_PER_EM +
          settings.offsetX,
      ),
    y: (value: number) =>
      Math.round(
        (BASELINE - value) * settings.scale * UNITS_PER_EM + settings.offsetY,
      ),
  };
  // A shared coordinate grid must stay distinct after TrueType integer rounding.
  // Smoothed outlines sit between pixels, so they get a crossing check below.
  for (const axis of settings.smoothing ? [] : (["x", "y"] as const)) {
    const values = [
      ...new Set(glyph.contours.flatMap((c) => c.map((p) => p[axis]))),
    ].sort((a, b) => a - b);
    const quantized = values.map(transform[axis]);
    if (quantized.some((value, i) => i > 0 && value === quantized[i - 1]))
      throw new Error("collapsedContour");
  }
  let contours = glyph.contours.map((contour) =>
    contour.map((p) => ({
      x: transform.x(p.x),
      y: transform.y(p.y),
      onCurve: true,
    })),
  );
  if (settings.smoothing)
    contours = contours.map((c) =>
      c.filter((p, i) => {
        const prev = c[(i + c.length - 1) % c.length];
        return p.x !== prev.x || p.y !== prev.y;
      }),
    );
  if (
    contours.some(
      (c, i) =>
        c.length < 3 || signedArea(c) * signedArea(glyph.contours[i]) >= 0,
    ) ||
    (settings.smoothing && hasCrossings(contours))
  ) {
    throw new Error("collapsedContour");
  }
  let xMin = Math.min(...contours.flatMap((c) => c.map((p) => p.x)));
  let xMax = Math.max(...contours.flatMap((c) => c.map((p) => p.x)));
  const yMin = Math.min(...contours.flatMap((c) => c.map((p) => p.y)));
  const yMax = Math.max(...contours.flatMap((c) => c.map((p) => p.y)));
  if (!isCjk(glyph.character)) {
    const shift = Math.round(settings.sideBearing + settings.offsetX) - xMin;
    contours = contours.map((c) => c.map((p) => ({ ...p, x: p.x + shift })));
    xMin += shift;
    xMax += shift;
  }
  const advanceWidth = Math.round(
    settings.advanceWidth ||
      (isCjk(glyph.character) ? 1000 : xMax - xMin + settings.sideBearing * 2),
  );
  if (
    Math.min(xMin, yMin) < -2000 ||
    Math.max(xMax, yMax) > 3000 ||
    advanceWidth < 1 ||
    advanceWidth > 4000
  ) {
    throw new Error("invalidMetrics");
  }
  return {
    contours,
    xMin,
    xMax,
    yMin,
    yMax,
    advanceWidth,
    leftSideBearing: xMin,
    name: `uni${(glyph.character.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")}`,
    unicode: [glyph.character.codePointAt(0) ?? 0],
  };
}

// Path and viewBox for a small preview of the exported outline; null when the
// glyph is empty or its outline can't be built.
export function glyphThumbnail(
  glyph: Glyph | undefined,
): { path: string; box: string } | null {
  if (!glyph?.contours.length) return null;
  try {
    const shape = fontGlyph(glyph);
    const path = shape.contours
      .map(
        (contour) =>
          `${contour
            .map((p, i) => `${i ? "L" : "M"}${p.x} ${900 - p.y}`)
            .join(" ")}Z`,
      )
      .join(" ");
    // Fit the ink, not the whole em box, so small glyphs stay readable. The
    // minimum side keeps a period or a hyphen from filling the tile.
    const inkWidth = shape.xMax - shape.xMin;
    const inkHeight = shape.yMax - shape.yMin;
    const pad = Math.max(inkWidth, inkHeight, 200) * 0.08;
    const width = Math.max(inkWidth, 200) + pad * 2;
    const height = Math.max(inkHeight, 200) + pad * 2;
    const left = shape.xMin - (width - inkWidth) / 2;
    const top = 900 - shape.yMax - (height - inkHeight) / 2;
    return {
      path,
      box: [left, top, width, height].map((n) => +n.toFixed(1)).join(" "),
    };
  } catch {
    return null;
  }
}

// Format 0 `kern` table with one horizontal subtable. Browsers, FreeType and
// word processors apply it without any layout tables, so a font that has no
// GPOS still kerns. Glyph indices follow the order set in buildTtf.
export function kernTable(
  pairs: readonly KernPair[],
  glyphIndex: ReadonlyMap<string, number>,
): number[] {
  const rows = pairs
    .flatMap((pair) => {
      const left = glyphIndex.get(pair.left);
      const right = glyphIndex.get(pair.right);
      return left === undefined || right === undefined
        ? []
        : [{ left, right, value: pair.value }];
    })
    .sort((a, b) => a.left - b.left || a.right - b.right);
  if (!rows.length) return [];
  const bytes: number[] = [];
  const u16 = (value: number) => bytes.push((value >> 8) & 255, value & 255);
  const entrySelector = Math.floor(Math.log2(rows.length));
  const searchRange = 6 * 2 ** entrySelector;
  u16(0);
  u16(1);
  u16(0);
  u16(14 + rows.length * 6);
  u16(1);
  u16(rows.length);
  u16(searchRange);
  u16(entrySelector);
  u16(rows.length * 6 - searchRange);
  for (const row of rows) {
    u16(row.left);
    u16(row.right);
    u16(row.value & 0xffff);
  }
  return bytes;
}

function arrayBuffer(
  output: ArrayBuffer | ArrayLike<number> | string,
): ArrayBuffer {
  if (typeof output === "string") throw new Error("invalidFont");
  if (output instanceof ArrayBuffer) return output;
  return Uint8Array.from(output).buffer;
}

function identitySuffix(projectId: string, name: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(
    JSON.stringify([projectId, name]),
  )) {
    hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, "0");
}

export function buildTtf(project: Project, allowPartial = false): ArrayBuffer {
  const missing = missingCharacters(project);
  if (missing.length && !allowPartial) throw new Error("missingGlyphs");
  const borrowed = new Map<string, number[]>();
  for (const [borrower, source] of glyphFallbacks(project))
    if (borrower !== ELLIPSIS)
      borrowed.set(source, [
        ...(borrowed.get(source) ?? []),
        borrower.codePointAt(0) ?? 0,
      ]);
  // A second version is only used when the first version of its letter exists.
  const keys = project.characters.filter(
    (ch) =>
      project.glyphs[ch]?.contours.length &&
      (!isVariant(ch) || project.glyphs[variantBase(ch)]?.contours.length),
  );
  const glyphs = keys.map((ch) => {
    const glyph = fontGlyph(project.glyphs[ch]);
    if (isVariant(ch)) {
      glyph.name = `${glyph.name}.alt`;
      glyph.unicode = [];
      return glyph;
    }
    const extra = borrowed.get(ch);
    if (extra) glyph.unicode = [...(glyph.unicode ?? []), ...extra];
    return glyph;
  });
  const period = glyphs.find((g) => g.unicode?.includes(0x2e));
  if (period && glyphFallbacks(project).has(ELLIPSIS))
    glyphs.push(ellipsisGlyph(period));
  if (!glyphs.length) throw new Error("emptyFont");
  const font = createFont();
  const data = font.get();
  const notdef = data.glyf[0];
  notdef.name = ".notdef";
  notdef.unicode = [];
  const space: TTF.Glyph = {
    contours: [],
    xMin: 0,
    xMax: 0,
    yMin: 0,
    yMax: 0,
    advanceWidth: project.spaceWidth ?? DEFAULT_SPACE_WIDTH,
    leftSideBearing: 0,
    name: "space",
    unicode: [32, ...SPACE_CODEPOINTS],
  };
  data.glyf = [notdef, space, ...glyphs];
  const glyphIndex = new Map(
    glyphs.flatMap((g, i) =>
      (g.unicode ?? []).map((cp) => [String.fromCodePoint(cp), i + 2] as const),
    ),
  );
  // A second version keeps the kerning of its first version.
  for (const [i, key] of keys.entries())
    if (isVariant(key)) glyphIndex.set(key, i + 2);
  const kern = kernTable(
    (project.kerning ?? []).flatMap((pair) =>
      [pair.left, variantKey(pair.left)].flatMap((left) =>
        [pair.right, variantKey(pair.right)].map((right) => ({
          left,
          right,
          value: pair.value,
        })),
      ),
    ),
    glyphIndex,
  );
  if (kern.length) (data as { kern?: number[] }).kern = kern;
  const now = Date.parse(project.updatedAt);
  data.head.unitsPerEm = UNITS_PER_EM;
  data.head.created = Date.parse(project.createdAt);
  data.head.modified = Number.isFinite(now) ? now : Date.now();
  const ascent = Math.max(900, ...glyphs.map((g) => g.yMax + 30));
  const descent = Math.min(-250, ...glyphs.map((g) => g.yMin - 30));
  Object.assign(data.hhea, { ascent, descent, lineGap: 0 });
  Object.assign(data["OS/2"], {
    sTypoAscender: ascent,
    sTypoDescender: descent,
    sTypoLineGap: 0,
    usWinAscent: ascent,
    usWinDescent: -descent,
    fsType: 0,
    fsSelection: 0x40,
    usWeightClass: 400,
    sxHeight: Math.round(UNITS_PER_EM * 0.48),
    sCapHeight: Math.round(UNITS_PER_EM * 0.7),
  });
  const name = project.name.trim().slice(0, 64) || "My handwriting";
  const asciiName =
    name
      .normalize("NFKD")
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(0, 40) || "GlyphSproutFont";
  const postScriptName = `${asciiName}-${identitySuffix(project.id, name)}`;
  Object.assign(data.name, {
    fontFamily: name,
    fontSubFamily: "Regular",
    fullName: name,
    postScriptName,
    uniqueSubFamily: `${project.id}:${name}:Regular`,
    version: "Version 1.000",
    ...(project.info?.copyright && { copyright: project.info.copyright }),
    ...(project.info?.designer && { designer: project.info.designer }),
    ...(project.info?.license && { licence: project.info.license }),
    ...(project.info?.licenseUrl && { urlOfLicence: project.info.licenseUrl }),
  });
  font.set(data);
  const ttf = arrayBuffer(
    font.write({
      type: "ttf",
      hinting: false,
      kerning: true,
      writeZeroContoursGlyfData: true,
    }),
  );
  const alternates: Alternate[] = [];
  for (const [i, key] of keys.entries()) {
    const base = isVariant(key) ? keys.indexOf(variantBase(key)) : -1;
    if (base >= 0) alternates.push({ base: base + 2, alt: i + 2 });
  }
  if (!alternates.length) return ttf;
  const firstVersions = glyphs
    .map((_, i) => i + 2)
    .filter((_, i) => !isVariant(keys[i] ?? ""));
  return withTable(ttf, "GSUB", gsubTable(alternates, firstVersions));
}

let woffPromise: Promise<unknown> | undefined;
export async function exportFont(
  project: Project,
  format: "ttf" | "woff2",
  allowPartial = false,
): Promise<ArrayBuffer> {
  const ttf = buildTtf(project, allowPartial);
  if (format === "ttf") return ttf;
  woffPromise ??= woff2.init(`${import.meta.env.BASE_URL}woff2.wasm`);
  try {
    await woffPromise;
  } catch (error) {
    woffPromise = undefined;
    throw error;
  }
  return arrayBuffer(woff2.encode(ttf));
}

export function fontFilename(name: string, extension: string): string {
  return `${
    name
      .trim()
      .replace(/[^\p{L}\p{N} _-]/gu, "")
      .slice(0, 64) || "My handwriting"
  }.${extension}`;
}

export function webFontCss(name: string): string {
  const file = fontFilename(name, "woff2");
  const family = file.slice(0, -".woff2".length);
  const base = encodeURI(family);
  return [
    "@font-face {",
    `  font-family: "${family}";`,
    `  src: url("${base}.woff2") format("woff2"),`,
    `    url("${base}.ttf") format("truetype");`,
    "  font-display: swap;",
    "}",
    "",
    "body {",
    `  font-family: "${family}", sans-serif;`,
    "}",
    "",
  ].join("\n");
}
