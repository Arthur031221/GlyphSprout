import { grayscale } from "./trace";

const GRID = 8;
const PAPER_PERCENTILE = 0.9;
const DARKEST_PAPER = 96;

function paperLevels(
  gray: Uint8Array,
  size: number,
  grid: number,
): Float64Array {
  const blocks = new Float64Array(grid * grid);
  for (let by = 0; by < grid; by++)
    for (let bx = 0; bx < grid; bx++) {
      const histogram = new Uint32Array(256);
      const x0 = Math.floor((bx * size) / grid);
      const x1 = Math.floor(((bx + 1) * size) / grid);
      const y0 = Math.floor((by * size) / grid);
      const y1 = Math.floor(((by + 1) * size) / grid);
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++) histogram[gray[y * size + x]]++;
      const target = (x1 - x0) * (y1 - y0) * PAPER_PERCENTILE;
      let seen = 0;
      let level = 0;
      while (level < 255 && seen + histogram[level] < target)
        seen += histogram[level++];
      blocks[by * grid + bx] = level;
    }
  // A block that is mostly ink borrows the paper level of its neighbours.
  const paper = new Float64Array(grid * grid);
  for (let by = 0; by < grid; by++)
    for (let bx = 0; bx < grid; bx++) {
      let best = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const x = bx + dx;
          const y = by + dy;
          if (x >= 0 && y >= 0 && x < grid && y < grid)
            best = Math.max(best, blocks[y * grid + x]);
        }
      paper[by * grid + bx] = Math.max(best, DARKEST_PAPER);
    }
  return paper;
}

// Divides out slow brightness changes such as a shadow, a vignette or a
// uniformly dim photo, so one ink threshold fits the whole cell. Paper that is
// already even and bright is left almost unchanged.
export function flattenLighting(
  rgba: Uint8ClampedArray,
  size: number,
): Uint8ClampedArray {
  if (rgba.length !== size * size * 4 || size < GRID * 2)
    throw new Error("invalidRaster");
  const gray = grayscale(rgba);
  const paper = paperLevels(gray, size, GRID);
  const out = new Uint8ClampedArray(rgba.length);
  const step = size / GRID;
  const clamp = (v: number) => Math.min(GRID - 1, Math.max(0, v));
  for (let y = 0; y < size; y++) {
    const fy = (y + 0.5) / step - 0.5;
    const y0 = clamp(Math.floor(fy));
    const y1 = clamp(y0 + 1);
    const ty = Math.min(1, Math.max(0, fy - y0));
    for (let x = 0; x < size; x++) {
      const fx = (x + 0.5) / step - 0.5;
      const x0 = clamp(Math.floor(fx));
      const x1 = clamp(x0 + 1);
      const tx = Math.min(1, Math.max(0, fx - x0));
      const top = paper[y0 * GRID + x0] * (1 - tx) + paper[y0 * GRID + x1] * tx;
      const bottom =
        paper[y1 * GRID + x0] * (1 - tx) + paper[y1 * GRID + x1] * tx;
      const scale = 255 / (top * (1 - ty) + bottom * ty);
      const k = (y * size + x) * 4;
      out[k] = rgba[k] * scale;
      out[k + 1] = rgba[k + 1] * scale;
      out[k + 2] = rgba[k + 2] * scale;
      out[k + 3] = rgba[k + 3];
    }
  }
  return out;
}
