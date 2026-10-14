import type { Contour, Point } from "./types";

export const MAX_SMOOTHING = 3;

// Corner cutting rounds pixel steps into diagonals, then simplification drops
// the points that no longer change the shape. Tolerances are in source pixels.
const LEVELS = [
  { cuts: 0, tolerance: 0 },
  { cuts: 2, tolerance: 0.15 },
  { cuts: 3, tolerance: 0.2 },
  { cuts: 3, tolerance: 0.4 },
];

function area(points: Point[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

function cutCorners(points: Point[]): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    out.push(
      { x: 0.75 * a.x + 0.25 * b.x, y: 0.75 * a.y + 0.25 * b.y },
      { x: 0.25 * a.x + 0.75 * b.x, y: 0.25 * a.y + 0.75 * b.y },
    );
  }
  return out;
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t = length
    ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length))
    : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

// Keeps the end points of open runs [from, to] and the points that stray further than the tolerance.
function simplifyRun(
  points: Point[],
  from: number,
  to: number,
  tolerance: number,
  keep: boolean[],
) {
  const stack: [number, number][] = [[from, to]];
  while (stack.length) {
    const [start, end] = stack.pop() as [number, number];
    let far = -1;
    let farDistance = tolerance;
    for (let i = start + 1; i < end; i++) {
      const d = distanceToSegment(points[i], points[start], points[end]);
      if (d > farDistance) {
        far = i;
        farDistance = d;
      }
    }
    if (far < 0) continue;
    keep[far] = true;
    stack.push([start, far], [far, end]);
  }
}

function simplifyLoop(points: Point[], tolerance: number): Point[] {
  if (points.length < 4) return points;
  let split = 0;
  let splitDistance = -1;
  for (let i = 1; i < points.length; i++) {
    const d = Math.hypot(points[i].x - points[0].x, points[i].y - points[0].y);
    if (d > splitDistance) {
      split = i;
      splitDistance = d;
    }
  }
  const keep = points.map(() => false);
  keep[0] = true;
  keep[split] = true;
  const ring = [...points, points[0]];
  simplifyRun(ring, 0, split, tolerance, keep);
  simplifyRun(ring, split, points.length, tolerance, keep);
  return points.filter((_, i) => keep[i]);
}

export function smoothContour(points: Point[], level: number): Point[] {
  const { cuts, tolerance } =
    LEVELS[Math.max(0, Math.min(MAX_SMOOTHING, Math.round(level)))];
  if (!cuts) return points;
  let result = points;
  for (let i = 0; i < cuts; i++) result = cutCorners(result);
  result = simplifyLoop(result, tolerance);
  if (result.length < 3 || Math.sign(area(result)) !== Math.sign(area(points)))
    return points;
  return result;
}

function orientation(a: Point, b: Point, c: Point): number {
  const value = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  return Math.abs(value) < 1e-9 ? 0 : Math.sign(value);
}

interface Segment {
  a: Point;
  b: Point;
  contour: number;
  index: number;
  count: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// True when two edges properly cross. Shared end points and touching are allowed.
export function hasCrossings(contours: Contour[]): boolean {
  const segments: Segment[] = [];
  contours.forEach((contour, ci) => {
    for (let i = 0; i < contour.length; i++) {
      const a = contour[i];
      const b = contour[(i + 1) % contour.length];
      segments.push({
        a,
        b,
        contour: ci,
        index: i,
        count: contour.length,
        minX: Math.min(a.x, b.x),
        maxX: Math.max(a.x, b.x),
        minY: Math.min(a.y, b.y),
        maxY: Math.max(a.y, b.y),
      });
    }
  });
  segments.sort((p, q) => p.minX - q.minX);
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    for (let j = i + 1; j < segments.length; j++) {
      const t = segments[j];
      if (t.minX > s.maxX) break;
      if (t.minY > s.maxY || t.maxY < s.minY) continue;
      if (s.contour === t.contour) {
        const gap = Math.abs(s.index - t.index);
        if (gap === 1 || gap === s.count - 1) continue;
      }
      const o1 = orientation(s.a, s.b, t.a);
      const o2 = orientation(s.a, s.b, t.b);
      const o3 = orientation(t.a, t.b, s.a);
      const o4 = orientation(t.a, t.b, s.b);
      if (o1 * o2 < 0 && o3 * o4 < 0) return true;
    }
  }
  return false;
}
