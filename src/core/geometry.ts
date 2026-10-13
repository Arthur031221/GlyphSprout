import { signedArea } from "./trace";
import type { Point } from "./types";

export type Matrix3 = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

function multiply(a: Matrix3, b: Matrix3): Matrix3 {
  return Array.from({ length: 9 }, (_, i) => {
    const row = Math.floor(i / 3);
    const col = i % 3;
    return (
      a[row * 3] * b[col] +
      a[row * 3 + 1] * b[col + 3] +
      a[row * 3 + 2] * b[col + 6]
    );
  }) as Matrix3;
}

export function invert(m: Matrix3): Matrix3 {
  const [a, b, c, d, e, f, g, h, i] = m;
  const out: Matrix3 = [
    e * i - f * h,
    c * h - b * i,
    b * f - c * e,
    f * g - d * i,
    a * i - c * g,
    c * d - a * f,
    d * h - e * g,
    b * g - a * h,
    a * e - b * d,
  ];
  const det = a * out[0] + b * out[3] + c * out[6];
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12)
    throw new Error("invalidCorners");
  return out.map((n) => n / det) as Matrix3;
}

export function projectPoint(m: Matrix3, p: Point): Point {
  const w = m[6] * p.x + m[7] * p.y + m[8];
  if (!Number.isFinite(w) || Math.abs(w) < 1e-10)
    throw new Error("invalidCorners");
  return {
    x: (m[0] * p.x + m[1] * p.y + m[2]) / w,
    y: (m[3] * p.x + m[4] * p.y + m[5]) / w,
  };
}

function normalize(points: Point[]) {
  const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
  const distance = Math.sqrt(
    points.reduce((s, p) => s + (p.x - cx) ** 2 + (p.y - cy) ** 2, 0) /
      points.length,
  );
  if (distance < 1e-8) throw new Error("invalidCorners");
  const scale = Math.SQRT2 / distance;
  const matrix: Matrix3 = [
    scale,
    0,
    -cx * scale,
    0,
    scale,
    -cy * scale,
    0,
    0,
    1,
  ];
  return { matrix, points: points.map((p) => projectPoint(matrix, p)) };
}

export function validateCorners(
  points: Point[],
  width: number,
  height: number,
): void {
  if (
    points.length !== 4 ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error("invalidCorners");
  }
  if (
    points.some(
      (p) =>
        !Number.isFinite(p.x) ||
        !Number.isFinite(p.y) ||
        p.x < 0 ||
        p.y < 0 ||
        p.x > width ||
        p.y > height,
    )
  ) {
    throw new Error("invalidCorners");
  }
  const normalized = points.map((p) => ({ x: p.x / width, y: p.y / height }));
  for (let i = 0; i < 4; i++) {
    const a = normalized[i],
      b = normalized[(i + 1) % 4],
      c = normalized[(i + 2) % 4];
    if ((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x) < 0.002)
      throw new Error("invalidCorners");
  }
  if (signedArea(normalized) < 0.03) throw new Error("invalidCorners");
}

export function homography(from: Point[], to: Point[]): Matrix3 {
  if (from.length !== 4 || to.length !== 4) throw new Error("invalidCorners");
  const a = normalize(from),
    b = normalize(to);
  const rows: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = a.points[i],
      u = b.points[i].x,
      v = b.points[i].y;
    rows.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    rows.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  for (let col = 0; col < 8; col++) {
    let pivot = col;
    for (let row = col + 1; row < 8; row++)
      if (Math.abs(rows[row][col]) > Math.abs(rows[pivot][col])) pivot = row;
    if (Math.abs(rows[pivot][col]) < 1e-10) throw new Error("invalidCorners");
    [rows[col], rows[pivot]] = [rows[pivot], rows[col]];
    const factor = rows[col][col];
    rows[col] = rows[col].map((n) => n / factor);
    for (let row = 0; row < 8; row++) {
      if (row === col) continue;
      const f = rows[row][col];
      for (let k = col; k <= 8; k++) rows[row][k] -= f * rows[col][k];
    }
  }
  const normalized = [...rows.map((r) => r[8]), 1] as Matrix3;
  return multiply(invert(b.matrix), multiply(normalized, a.matrix));
}

export function sampleCell(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  mapping: Matrix3,
  rect: { x: number; y: number; width: number; height: number },
  size: number,
): Uint8ClampedArray {
  if (size < 16 || size > 768 || rgba.length !== width * height * 4)
    throw new Error("invalidRaster");
  const out = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const p = projectPoint(mapping, {
        x: rect.x + ((x + 0.5) * rect.width) / size,
        y: rect.y + ((y + 0.5) * rect.height) / size,
      });
      const sx = p.x - 0.5,
        sy = p.y - 0.5,
        x0 = Math.floor(sx),
        y0 = Math.floor(sy),
        fx = sx - x0,
        fy = sy - y0;
      const index = (y * size + x) * 4;
      if (x0 < 0 || y0 < 0 || x0 + 1 >= width || y0 + 1 >= height) {
        out.fill(255, index, index + 4);
        continue;
      }
      for (let c = 0; c < 4; c++) {
        const at = (ix: number, iy: number) => rgba[(iy * width + ix) * 4 + c];
        out[index + c] =
          at(x0, y0) * (1 - fx) * (1 - fy) +
          at(x0 + 1, y0) * fx * (1 - fy) +
          at(x0, y0 + 1) * (1 - fx) * fy +
          at(x0 + 1, y0 + 1) * fx * fy;
      }
    }
  return out;
}
