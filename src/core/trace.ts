import type { Contour, Crop, Point } from "./types";

export interface TraceOptions {
  threshold: number;
  minArea: number;
  crop?: Crop;
}

export interface TraceResult {
  contours: Contour[];
  inkPixels: number;
  removedPixels: number;
  components: number;
}

export function signedArea(points: Point[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

export function grayscale(rgba: Uint8ClampedArray | Uint8Array): Uint8Array {
  if (rgba.length % 4) throw new Error("invalidRaster");
  const result = new Uint8Array(rgba.length / 4);
  for (let i = 0; i < result.length; i++) {
    const k = i * 4;
    const alpha = rgba[k + 3] / 255;
    const value =
      rgba[k] * 0.2126 + rgba[k + 1] * 0.7152 + rgba[k + 2] * 0.0722;
    result[i] = Math.round(value * alpha + 255 * (1 - alpha));
  }
  return result;
}

function removeSpecks(
  mask: Uint8Array,
  width: number,
  height: number,
  minArea: number,
) {
  const visited = new Uint8Array(mask.length);
  const queue = new Int32Array(mask.length);
  let components = 0;
  let removedPixels = 0;
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || visited[start]) continue;
    let tail = 1;
    queue[0] = start;
    visited[start] = 1;
    for (let head = 0; head < tail; head++) {
      const p = queue[head];
      const x = p % width;
      const y = Math.floor(p / width);
      const neighbors = [
        x > 0 ? p - 1 : -1,
        x + 1 < width ? p + 1 : -1,
        y > 0 ? p - width : -1,
        y + 1 < height ? p + width : -1,
      ];
      for (const q of neighbors) {
        if (q >= 0 && mask[q] && !visited[q]) {
          visited[q] = 1;
          queue[tail++] = q;
        }
      }
    }
    if (tail < minArea) {
      for (let i = 0; i < tail; i++) mask[queue[i]] = 0;
      removedPixels += tail;
    } else components++;
  }
  return { components, removedPixels };
}

interface Edge {
  from: number;
  to: number;
  direction: number;
  used: boolean;
}

// Foreground is 4-connected. Right turns keep diagonal pixel islands separate.
export function traceMask(
  mask: Uint8Array,
  width: number,
  height: number,
): Contour[] {
  if (
    mask.length !== width * height ||
    width < 1 ||
    height < 1 ||
    width > 1024 ||
    height > 1024
  ) {
    throw new Error("invalidRaster");
  }
  const stride = width + 1;
  const edges: Edge[] = [];
  const outgoing = new Map<number, number[]>();
  function add(from: number, to: number, direction: number) {
    const index = edges.length;
    edges.push({ from, to, direction, used: false });
    const list = outgoing.get(from) ?? [];
    list.push(index);
    outgoing.set(from, list);
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      if (!mask[p]) continue;
      const a = y * stride + x;
      if (y === 0 || !mask[p - width]) add(a, a + 1, 0);
      if (x === width - 1 || !mask[p + 1]) add(a + 1, a + stride + 1, 1);
      if (y === height - 1 || !mask[p + width])
        add(a + stride + 1, a + stride, 2);
      if (x === 0 || !mask[p - 1]) add(a + stride, a, 3);
    }
  }
  const contours: Contour[] = [];
  for (let first = 0; first < edges.length; first++) {
    if (edges[first].used) continue;
    let index = first;
    const loop: Point[] = [];
    do {
      const edge = edges[index];
      if (edge.used) throw new Error("invalidContour");
      edge.used = true;
      loop.push({ x: edge.from % stride, y: Math.floor(edge.from / stride) });
      if (edge.to === edges[first].from) break;
      const candidates = (outgoing.get(edge.to) ?? []).filter(
        (n) => !edges[n].used,
      );
      const priority = [1, 0, 3, 2];
      candidates.sort(
        (a, b) =>
          priority.indexOf((edges[a].direction - edge.direction + 4) % 4) -
          priority.indexOf((edges[b].direction - edge.direction + 4) % 4),
      );
      if (!candidates.length) throw new Error("invalidContour");
      index = candidates[0];
    } while (index !== first);
    const reduced = loop.filter((p, i) => {
      const prev = loop[(i + loop.length - 1) % loop.length];
      const next = loop[(i + 1) % loop.length];
      return (
        (p.x - prev.x) * (next.y - p.y) !== (p.y - prev.y) * (next.x - p.x)
      );
    });
    if (reduced.length < 4 || signedArea(reduced) === 0)
      throw new Error("invalidContour");
    contours.push(reduced.map((p) => ({ x: p.x / width, y: p.y / height })));
  }
  return contours;
}

export function trace(
  gray: Uint8Array,
  width: number,
  height: number,
  options: TraceOptions,
): TraceResult {
  if (
    gray.length !== width * height ||
    !Number.isInteger(width) ||
    !Number.isInteger(height)
  ) {
    throw new Error("invalidRaster");
  }
  const crop = options.crop ?? { left: 0, top: 0, right: 1, bottom: 1 };
  const mask = new Uint8Array(gray.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (
        x / width >= crop.left &&
        x / width < crop.right &&
        y / height >= crop.top &&
        y / height < crop.bottom
      ) {
        mask[y * width + x] = gray[y * width + x] < options.threshold ? 1 : 0;
      }
    }
  }
  const stats = removeSpecks(mask, width, height, options.minArea);
  return {
    ...stats,
    inkPixels: mask.reduce((a, b) => a + b, 0),
    contours: traceMask(mask, width, height),
  };
}
