import { newProject } from "./project";
import { grayscale, trace } from "./trace";
import type { Glyph, Project } from "./types";
import { defaultSettings } from "./types";

export const SYNTHETIC_TEXT = "Hello, 世界 こんにちは 一日Aog8!";
const SYNTHETIC_PROJECT_ID = "synthetic";

// Each path is a deliberately drawn stroke in a normalized, square cell.
// These are synthetic code-drawn marks, not handwriting samples or scan data.
const strokes: Record<string, string[]> = {
  H: [
    "M0.22 0.16L0.22 0.84",
    "M0.78 0.16L0.78 0.84",
    "M0.23 0.49Q0.5 0.46 0.77 0.49",
  ],
  e: [
    "M0.23 0.57Q0.25 0.35 0.5 0.35Q0.74 0.35 0.76 0.55L0.25 0.58Q0.25 0.78 0.49 0.79Q0.66 0.8 0.76 0.7",
  ],
  ",": ["M0.53 0.73Q0.51 0.81 0.45 0.88"],
  l: ["M0.48 0.17Q0.43 0.31 0.45 0.5L0.47 0.76Q0.48 0.84 0.59 0.81"],
  o: [
    "M0.5 0.31C0.69 0.31 0.79 0.41 0.79 0.56C0.79 0.72 0.68 0.81 0.5 0.81C0.32 0.81 0.21 0.72 0.21 0.56C0.21 0.41 0.32 0.31 0.5 0.31Z",
  ],
  世: [
    "M0.15 0.4L0.86 0.4",
    "M0.26 0.24L0.26 0.82L0.85 0.82",
    "M0.48 0.17L0.48 0.64L0.7 0.64",
    "M0.71 0.2L0.71 0.64",
  ],
  界: [
    "M0.22 0.18L0.77 0.18L0.77 0.59L0.22 0.59Z",
    "M0.5 0.19L0.5 0.58",
    "M0.22 0.39L0.77 0.39",
    "M0.48 0.6L0.21 0.75",
    "M0.52 0.6L0.79 0.75",
    "M0.4 0.69Q0.4 0.84 0.31 0.91",
    "M0.63 0.69L0.63 0.9",
  ],
  こ: ["M0.3 0.3Q0.5 0.34 0.72 0.3", "M0.29 0.67Q0.27 0.8 0.46 0.8L0.73 0.8"],
  ん: [
    "M0.29 0.22Q0.34 0.36 0.3 0.49L0.24 0.67Q0.22 0.75 0.3 0.75Q0.37 0.74 0.43 0.63L0.56 0.45Q0.64 0.36 0.69 0.43Q0.73 0.48 0.66 0.59Q0.59 0.71 0.65 0.78Q0.71 0.85 0.8 0.76",
  ],
  に: [
    "M0.29 0.22Q0.25 0.5 0.29 0.79",
    "M0.48 0.31L0.75 0.31",
    "M0.47 0.68Q0.49 0.79 0.76 0.75",
  ],
  ち: [
    "M0.27 0.3L0.75 0.3",
    "M0.51 0.19Q0.48 0.48 0.4 0.6Q0.33 0.72 0.42 0.78Q0.51 0.84 0.65 0.78Q0.79 0.72 0.73 0.6",
  ],
  は: [
    "M0.27 0.19L0.27 0.82",
    "M0.51 0.22L0.51 0.73Q0.51 0.82 0.62 0.82Q0.73 0.82 0.73 0.73Q0.73 0.64 0.6 0.57Q0.47 0.5 0.37 0.55",
    "M0.5 0.37L0.76 0.37",
  ],
  一: ["M0.2 0.52Q0.5 0.48 0.8 0.52"],
  日: ["M0.29 0.18L0.71 0.18L0.71 0.82L0.29 0.82Z", "M0.3 0.5L0.7 0.5"],
  A: [
    "M0.2 0.82L0.48 0.18Q0.5 0.13 0.52 0.18L0.8 0.82",
    "M0.32 0.56L0.68 0.56",
  ],
  g: [
    "M0.7 0.35Q0.62 0.27 0.48 0.3Q0.23 0.31 0.23 0.54Q0.23 0.76 0.47 0.76Q0.67 0.76 0.7 0.56Q0.72 0.38 0.7 0.34L0.7 0.74Q0.7 0.9 0.55 0.94Q0.42 0.98 0.31 0.9",
  ],
  "8": [
    "M0.5 0.18C0.68 0.18 0.75 0.27 0.75 0.38C0.75 0.47 0.66 0.52 0.5 0.55C0.34 0.52 0.25 0.47 0.25 0.38C0.25 0.27 0.32 0.18 0.5 0.18Z",
    "M0.5 0.55C0.68 0.58 0.78 0.65 0.78 0.75C0.78 0.87 0.67 0.91 0.5 0.91C0.33 0.91 0.22 0.87 0.22 0.75C0.22 0.65 0.32 0.58 0.5 0.55Z",
  ],
  "!": ["M0.5 0.19L0.5 0.63", "M0.5 0.8L0.5 0.81"],
};

export function syntheticCellSvg(character: string): string {
  const paths = strokes[character];
  if (!paths) throw new Error("unsupportedCharacters");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="384" height="384" viewBox="0 0 1 1"><rect width="1" height="1" fill="white"/><g fill="none" stroke="#17212b" stroke-width="0.045" stroke-linecap="round" stroke-linejoin="round">${paths.map((path) => `<path d="${path}"/>`).join("")}</g></svg>`;
}

function rasterize(svg: string): Promise<{ source: string; gray: Uint8Array }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onerror = () => reject(new Error("decodeFailed"));
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 384;
      canvas.height = 384;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return reject(new Error("invalidRaster"));
      context.fillStyle = "white";
      context.fillRect(0, 0, 384, 384);
      context.drawImage(image, 0, 0, 384, 384);
      const pixels = context.getImageData(0, 0, 384, 384).data;
      resolve({
        source: canvas.toDataURL("image/png"),
        gray: grayscale(pixels),
      });
    };
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

export async function createSyntheticProject(): Promise<Project> {
  const project = newProject("Sprout Script", SYNTHETIC_TEXT);
  project.id = SYNTHETIC_PROJECT_ID;
  const glyphs: Record<string, Glyph> = {};
  for (const character of project.characters) {
    const raster = await rasterize(syntheticCellSvg(character));
    const settings = defaultSettings();
    const traced = trace(raster.gray, 384, 384, settings);
    glyphs[character] = {
      character,
      contours: traced.contours,
      source: raster.source,
      settings,
      reviewed: true,
      origin: "sample",
    };
  }
  return { ...project, glyphs, updatedAt: new Date().toISOString() };
}
