import { validateCorners } from "./geometry";
import { analyzeText } from "./text";
import { signedArea } from "./trace";
import type {
  FontInfo,
  Glyph,
  GlyphSettings,
  Point,
  Project,
  ScanPage,
} from "./types";
import {
  defaultSettings,
  FONT_INFO_LIMITS,
  MAX_CONTOURS_PER_GLYPH,
  MAX_GLYPHS,
  MAX_POINTS_PER_GLYPH,
  MAX_SPACE_WIDTH,
  MIN_SPACE_WIDTH,
} from "./types";

export const MAX_PROJECT_BYTES = 96 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 16 * 1024 * 1024;

export function newProject(name: string, input: string): Project {
  const analysis = analyzeText(input);
  if (analysis.unsupported.length) throw new Error("unsupportedCharacters");
  if (analysis.overflow) throw new Error("tooManyCharacters");
  if (!analysis.characters.length) throw new Error("emptyText");
  const now = new Date().toISOString();
  return {
    schema: 1,
    id: crypto.randomUUID(),
    name: name.trim().slice(0, 64) || "My handwriting",
    text: analysis.text,
    characters: analysis.characters,
    glyphs: {},
    pages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function updateText(project: Project, input: string): Project {
  const next = newProject(project.name, input);
  if (JSON.stringify(next.characters) === JSON.stringify(project.characters))
    return { ...project, text: next.text, updatedAt: next.updatedAt };
  return {
    ...project,
    id: next.id,
    text: next.text,
    characters: next.characters,
    glyphs: Object.fromEntries(
      next.characters
        .filter((ch) => project.glyphs[ch])
        .map((ch) => {
          const { pageId: _, ...glyph } = project.glyphs[ch];
          return [ch, glyph];
        }),
    ),
    pages: [],
    updatedAt: next.updatedAt,
  };
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("invalidProject");
  return value as Record<string, unknown>;
}
function string(value: unknown, max = 10000): string {
  if (typeof value !== "string" || value.length > max)
    throw new Error("invalidProject");
  return value;
}
function number(value: unknown, min: number, max: number): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    throw new Error("invalidProject");
  return value;
}
function integer(value: unknown, min: number, max: number): number {
  const result = number(value, min, max);
  if (!Number.isInteger(result)) throw new Error("invalidProject");
  return result;
}
function image(value: unknown): string {
  const data = string(value, MAX_IMAGE_BYTES * 1.4);
  if (!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(data))
    throw new Error("invalidProject");
  const encoded = data.slice(data.indexOf(",") + 1);
  if (
    encoded.length % 4 ||
    encoded.length * 0.75 -
      (encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0) >
      MAX_IMAGE_BYTES
  )
    throw new Error("invalidProject");
  return data;
}
function point(value: unknown, max = 1): Point {
  const p = object(value);
  return { x: number(p.x, 0, max), y: number(p.y, 0, max) };
}
function date(value: unknown): string {
  const s = string(value, 40);
  if (!Number.isFinite(Date.parse(s))) throw new Error("invalidProject");
  return s;
}

export function spaceWidth(value: unknown): number {
  const width = number(value, MIN_SPACE_WIDTH, MAX_SPACE_WIDTH);
  if (!Number.isInteger(width)) throw new Error("invalidProject");
  return width;
}

export function fontInfo(value: unknown): FontInfo {
  const raw = object(value);
  const info: FontInfo = {};
  for (const key of Object.keys(FONT_INFO_LIMITS) as (keyof FontInfo)[]) {
    if (raw[key] === undefined) continue;
    const text = string(raw[key], FONT_INFO_LIMITS[key]);
    if (text !== text.trim() || /[\r\n\t]/.test(text))
      throw new Error("invalidProject");
    if (key === "licenseUrl" && text && !/^https?:\/\/\S+$/.test(text))
      throw new Error("invalidProject");
    if (text) info[key] = text;
  }
  return info;
}

export function cleanFontInfo(value: FontInfo): FontInfo {
  const info: FontInfo = {};
  for (const key of Object.keys(FONT_INFO_LIMITS) as (keyof FontInfo)[]) {
    const text = (value[key] ?? "").replace(/\s+/g, " ").trim();
    if (text) info[key] = text;
  }
  return fontInfo(info);
}

export function validateSettings(value: unknown): GlyphSettings {
  const s = object(value),
    c = object(s.crop);
  const crop = {
    left: number(c.left, 0, 0.95),
    top: number(c.top, 0, 0.95),
    right: number(c.right, 0.05, 1),
    bottom: number(c.bottom, 0.05, 1),
  };
  if (
    crop.right - crop.left < 0.05 - Number.EPSILON ||
    crop.bottom - crop.top < 0.05 - Number.EPSILON
  )
    throw new Error("invalidProject");
  return {
    threshold: number(s.threshold, 1, 235),
    minArea: number(s.minArea, 1, 64),
    // Projects saved before smoothing existed keep their pixel outlines.
    smoothing: s.smoothing === undefined ? 0 : integer(s.smoothing, 0, 3),
    scale: number(s.scale, 0.25, 2),
    offsetX: number(s.offsetX, -500, 500),
    offsetY: number(s.offsetY, -500, 500),
    sideBearing: number(s.sideBearing, 0, 300),
    advanceWidth: number(s.advanceWidth, 0, 3000),
    crop,
  };
}

export function validateProject(value: unknown): Project {
  const p = object(value);
  if (p.schema !== 1) throw new Error("projectVersion");
  const text = string(p.text, 16384),
    analysis = analyzeText(text);
  if (
    analysis.unsupported.length ||
    analysis.overflow ||
    !analysis.characters.length
  )
    throw new Error("invalidProject");
  if (
    !Array.isArray(p.characters) ||
    JSON.stringify(p.characters) !== JSON.stringify(analysis.characters)
  )
    throw new Error("invalidProject");
  const inputGlyphs = object(p.glyphs);
  if (Object.keys(inputGlyphs).length > MAX_GLYPHS)
    throw new Error("invalidProject");
  const glyphs: Record<string, Glyph> = {};
  for (const [ch, value] of Object.entries(inputGlyphs)) {
    if (!analysis.characters.includes(ch)) throw new Error("invalidProject");
    const g = object(value);
    if (
      g.character !== ch ||
      !["sample", "scan", "draw"].includes(String(g.origin)) ||
      typeof g.reviewed !== "boolean"
    )
      throw new Error("invalidProject");
    if (
      !Array.isArray(g.contours) ||
      g.contours.length > MAX_CONTOURS_PER_GLYPH
    )
      throw new Error("invalidProject");
    let count = 0;
    const contours = g.contours.map((contour) => {
      if (
        !Array.isArray(contour) ||
        contour.length < 3 ||
        contour.length > MAX_POINTS_PER_GLYPH
      )
        throw new Error("invalidProject");
      count += contour.length;
      const points = contour.map((p) => point(p));
      if (!signedArea(points)) throw new Error("invalidProject");
      return points;
    });
    if (count > MAX_POINTS_PER_GLYPH) throw new Error("invalidProject");
    glyphs[ch] = {
      character: ch,
      contours,
      source: image(g.source),
      settings: validateSettings(g.settings),
      origin: g.origin as Glyph["origin"],
      reviewed: g.reviewed,
      ...(g.pageId ? { pageId: string(g.pageId, 100) } : {}),
    };
  }
  if (!Array.isArray(p.pages) || p.pages.length > Math.ceil(MAX_GLYPHS / 35))
    throw new Error("invalidProject");
  const pages: ScanPage[] = p.pages.map((value) => {
    const page = object(value);
    if (!Array.isArray(page.corners) || page.corners.length !== 4)
      throw new Error("invalidProject");
    const width = number(page.width, 1, 16000),
      height = number(page.height, 1, 16000);
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width * height > 32_000_000
    )
      throw new Error("invalidProject");
    const pageIndex = number(
      page.pageIndex,
      0,
      Math.ceil(analysis.characters.length / 35) - 1,
    );
    if (!Number.isInteger(pageIndex)) throw new Error("invalidProject");
    const corners = page.corners.map((p) =>
      point(p, 16000),
    ) as ScanPage["corners"];
    if (corners.some((c) => c.x > width || c.y > height))
      throw new Error("invalidProject");
    validateCorners(corners, width, height);
    return {
      id: string(page.id, 100),
      pageIndex,
      image: image(page.image),
      corners,
      width,
      height,
    };
  });
  if (
    new Set(pages.map((p) => p.id)).size !== pages.length ||
    new Set(pages.map((p) => p.pageIndex)).size !== pages.length
  )
    throw new Error("invalidProject");
  if (
    Object.values(glyphs).some(
      (g) => g.pageId && !pages.some((p) => p.id === g.pageId),
    )
  )
    throw new Error("invalidProject");
  const project: Project = {
    schema: 1,
    id: string(p.id, 100),
    name: string(p.name, 64),
    text,
    characters: analysis.characters,
    glyphs,
    pages,
    ...(p.spaceWidth === undefined
      ? {}
      : { spaceWidth: spaceWidth(p.spaceWidth) }),
    ...(p.info === undefined || !Object.keys(fontInfo(p.info)).length
      ? {}
      : { info: fontInfo(p.info) }),
    createdAt: date(p.createdAt),
    updatedAt: date(p.updatedAt),
  };
  const sourceBytes =
    Object.values(glyphs).reduce(
      (total, glyph) => total + glyph.source.length,
      0,
    ) + pages.reduce((total, page) => total + page.image.length, 0);
  if (sourceBytes > MAX_PROJECT_BYTES) throw new Error("projectTooLarge");
  const metadata = {
    ...project,
    glyphs: Object.fromEntries(
      Object.entries(glyphs).map(([ch, glyph]) => [
        ch,
        { ...glyph, source: "" },
      ]),
    ),
    pages: pages.map((page) => ({ ...page, image: "" })),
  };
  if (
    sourceBytes +
      new TextEncoder().encode(JSON.stringify(metadata)).byteLength >
    MAX_PROJECT_BYTES
  )
    throw new Error("projectTooLarge");
  return project;
}

export function parseProject(json: string): Project {
  if (new TextEncoder().encode(json).byteLength > MAX_PROJECT_BYTES)
    throw new Error("projectTooLarge");
  try {
    return validateProject(JSON.parse(json));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error("invalidProject");
    throw error;
  }
}

export function serializeProject(project: Project): string {
  const json = JSON.stringify(validateProject(project));
  if (new TextEncoder().encode(json).byteLength > MAX_PROJECT_BYTES)
    throw new Error("projectTooLarge");
  return json;
}

export function blankGlyph(character: string, source: string): Glyph {
  return {
    character,
    source,
    contours: [],
    settings: defaultSettings(),
    reviewed: false,
    origin: "draw",
  };
}
