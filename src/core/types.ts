export interface Point {
  x: number;
  y: number;
}

export type Contour = Point[];
export interface Crop {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface GlyphSettings {
  threshold: number;
  minArea: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  sideBearing: number;
  advanceWidth: number;
  crop: Crop;
}

export interface Glyph {
  character: string;
  contours: Contour[];
  source: string;
  settings: GlyphSettings;
  reviewed: boolean;
  origin: "scan" | "sample" | "draw";
  pageId?: string;
}

export interface ScanPage {
  id: string;
  pageIndex: number;
  image: string;
  corners: [Point, Point, Point, Point];
  width: number;
  height: number;
}

export interface Project {
  schema: 1;
  id: string;
  name: string;
  text: string;
  characters: string[];
  glyphs: Record<string, Glyph>;
  pages: ScanPage[];
  spaceWidth?: number;
  createdAt: string;
  updatedAt: string;
}

export const MAX_GLYPHS = 512;
export const MAX_CONTOURS_PER_GLYPH = 4096;
export const MAX_POINTS_PER_GLYPH = 32760;
export const DEFAULT_SPACE_WIDTH = 350;
export const MIN_SPACE_WIDTH = 100;
export const MAX_SPACE_WIDTH = 1000;
export const BASELINE = 0.78;
export const UNITS_PER_EM = 1000;
export const DEFAULT_SETTINGS: GlyphSettings = {
  threshold: 165,
  minArea: 1,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  sideBearing: 45,
  advanceWidth: 0,
  crop: { left: 0, top: 0, right: 1, bottom: 1 },
};

export function defaultSettings(): GlyphSettings {
  return { ...DEFAULT_SETTINGS, crop: { ...DEFAULT_SETTINGS.crop } };
}
