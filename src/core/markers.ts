import { TEMPLATE } from "./template";
import type { Point } from "./types";

export const DETECT_MAX_SIDE = 1600;
const WINDOW = 0.28;
const WORK_SIDE = 1000;
const SCALES = [0.55, 0.7, 0.85, 1, 1.25, 1.5];
const ARM_MIN = 0.45;
const ACCEPT = 0.35;

/** Paper level: the 75th percentile, since most of a page is blank. */
function paperLevel(gray: Uint8Array) {
  const histogram = new Uint32Array(256);
  for (const value of gray) histogram[value]++;
  let paper = 0;
  let count = 0;
  while (paper < 255 && count + histogram[paper] < gray.length * 0.75)
    count += histogram[paper++];
  return paper;
}

/** Marks pixels well below the paper level. */
function darkMask(gray: Uint8Array) {
  const paper = paperLevel(gray);
  const mask = new Uint8Array(gray.length);
  if (paper < 100) return mask;
  const level = paper * 0.6;
  for (let i = 0; i < gray.length; i++) mask[i] = gray[i] < level ? 1 : 0;
  return mask;
}

/** Ink amount from 0 to 1, so a stroke blurred by shrinking still counts. */
function inkAmount(gray: Uint8Array) {
  const paper = paperLevel(gray);
  const ink = new Float32Array(gray.length);
  if (paper < 100) return ink;
  for (let i = 0; i < gray.length; i++)
    ink[i] = Math.min(1, Math.max(0, (paper - gray[i]) / (paper * 0.8)));
  return ink;
}

function integral(mask: ArrayLike<number>, width: number, height: number) {
  const stride = width + 1;
  const table = new Float64Array(stride * (height + 1));
  for (let y = 0; y < height; y++) {
    let row = 0;
    for (let x = 0; x < width; x++) {
      row += mask[y * width + x];
      table[(y + 1) * stride + x + 1] = table[y * stride + x + 1] + row;
    }
  }
  return (x0: number, y0: number, x1: number, y1: number) => {
    const ax = Math.max(0, Math.round(x0));
    const ay = Math.max(0, Math.round(y0));
    const bx = Math.min(width, Math.round(x1));
    const by = Math.min(height, Math.round(y1));
    if (bx <= ax || by <= ay) return 0;
    return (
      table[by * stride + bx] -
      table[ay * stride + bx] -
      table[by * stride + ax] +
      table[ay * stride + ax]
    );
  };
}

/**
 * Finds the four printed registration crosses in a grayscale page image.
 * Starts from where an upright, page-filling scan would show them and looks
 * for the cross shape nearby. Returns null unless all four are found.
 */
export function detectCorners(
  gray: Uint8Array,
  width: number,
  height: number,
): [Point, Point, Point, Point] | null {
  if (gray.length !== width * height || width < 100 || height < 100)
    return null;
  const fullMask = darkMask(gray);
  const factor = Math.max(1, Math.max(width, height) / WORK_SIDE);
  const work = shrink(gray, width, height, factor);
  const sum = integral(inkAmount(work.gray), work.width, work.height);
  const found: Point[] = [];
  for (const marker of TEMPLATE.markers) {
    const guessX = (marker.x / TEMPLATE.width) * work.width;
    const guessY = (marker.y / TEMPLATE.height) * work.height;
    let best: { score: number; x: number; y: number; scale: number } | null =
      null;
    for (const scale of SCALES) {
      const half = Math.max(4, (12 / TEMPLATE.width) * work.width * scale);
      const inner = half * 0.45;
      const reachX = WINDOW * work.width;
      const reachY = WINDOW * work.height;
      for (let y = Math.ceil(guessY - reachY); y <= guessY + reachY; y++) {
        for (let x = Math.ceil(guessX - reachX); x <= guessX + reachX; x++) {
          const quick = half * 0.25;
          if (density(sum, x - half, y - quick, x - inner, y + quick) < 0.25)
            continue;
          const left = arm(sum, x - half, y, x - inner, y, half, false);
          if (left < ARM_MIN) continue;
          const right = arm(sum, x + inner, y, x + half, y, half, false);
          if (right < ARM_MIN) continue;
          const up = arm(sum, x, y - half, x, y - inner, half, true);
          if (up < ARM_MIN) continue;
          const down = arm(sum, x, y + inner, x, y + half, half, true);
          if (down < ARM_MIN) continue;
          // The printed cross has a white hole in its middle and bare paper past its tips.
          const hole = half * 0.2;
          const centre = density(sum, x - hole, y - hole, x + hole, y + hole);
          const tip = half * 0.25;
          const reach = half * 1.45;
          const tips =
            (density(sum, x - reach, y - tip, x - half, y + tip) +
              density(sum, x + half, y - tip, x + reach, y + tip) +
              density(sum, x - tip, y - reach, x + tip, y - half) +
              density(sum, x - tip, y + half, x + tip, y + reach)) /
            4;
          const score =
            Math.min(left, right, up, down) - centre * 0.6 - tips * 0.6;
          if (!best || score > best.score) best = { score, x, y, scale };
        }
      }
    }
    if (!best || best.score < ACCEPT) return null;
    const half = (12 / TEMPLATE.width) * work.width * best.scale * factor;
    found.push(
      refine(
        fullMask,
        { x: best.x * factor, y: best.y * factor },
        half,
        width,
        height,
      ),
    );
  }
  return found as [Point, Point, Point, Point];
}

/** Box-averages the image so the search cost doesn't grow with scan size. */
function shrink(
  gray: Uint8Array,
  width: number,
  height: number,
  factor: number,
) {
  if (factor <= 1) return { gray, width, height };
  const w = Math.floor(width / factor);
  const h = Math.floor(height / factor);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor(y * factor);
    const y1 = Math.max(y0 + 1, Math.floor((y + 1) * factor));
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x * factor);
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * factor));
      let total = 0;
      for (let py = y0; py < y1; py++)
        for (let px = x0; px < x1; px++) total += gray[py * width + px];
      out[y * w + x] = total / ((y1 - y0) * (x1 - x0));
    }
  }
  return { gray: out, width: w, height: h };
}

type Sum = (x0: number, y0: number, x1: number, y1: number) => number;

function density(sum: Sum, x0: number, y0: number, x1: number, y1: number) {
  return sum(x0, y0, x1, y1) / ((x1 - x0) * (y1 - y0));
}

/**
 * How well a strip of ink runs from one point to another: the middle should be
 * about as full as a 3 unit stroke on a 12 unit arm, and the sides bare.
 */
function arm(
  sum: Sum,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  half: number,
  vertical: boolean,
) {
  const mid = half * 0.25;
  const side = half * 0.7;
  const box = (from: number, to: number) =>
    vertical
      ? density(sum, x0 + from, y0, x0 + to, y1)
      : density(sum, x0, y0 + from, x1, y1 + to);
  const middle = Math.min(1, box(-mid, mid) * 2);
  const flanks = (box(-side, -mid) + box(mid, side)) / 2;
  return middle - flanks * 1.5;
}

/** Moves the coarse hit to the centroid of the dark pixels in the cross arms. */
function refine(
  mask: Uint8Array,
  at: Point,
  half: number,
  width: number,
  height: number,
): Point {
  const band = Math.max(2, half * 0.45);
  let cx = at.x;
  let cy = at.y;
  for (let pass = 0; pass < 2; pass++) {
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    for (let py = Math.floor(cy - half * 1.3); py <= cy + half * 1.3; py++) {
      for (let px = Math.floor(cx - half * 1.3); px <= cx + half * 1.3; px++) {
        if (px < 0 || py < 0 || px >= width || py >= height) continue;
        if (!mask[py * width + px]) continue;
        if (Math.abs(px - cx) > band && Math.abs(py - cy) > band) continue;
        sumX += px + 0.5;
        sumY += py + 0.5;
        count++;
      }
    }
    if (!count) break;
    cx = sumX / count;
    cy = sumY / count;
  }
  return { x: cx, y: cy };
}
