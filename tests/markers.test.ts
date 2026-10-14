import { expect, it } from "vitest";
import { detectCorners } from "../src/core/markers";
import { cellRect, TEMPLATE } from "../src/core/template";

function page(
  width: number,
  height: number,
  { angle = 0, dx = 0, dy = 0, scale = 1, noise = 0, fit = false } = {},
) {
  // fit: the 1000 x 1414 layout sits centred at one scale, as on a Letter sheet.
  const sx = fit ? Math.min(width / 1000, height / 1414) : width / 1000;
  const sy = fit ? sx : height / 1414;
  const ox = fit ? (width - 1000 * sx) / 2 : 0;
  const oy = fit ? (height - 1414 * sy) / 2 : 0;
  const gray = new Uint8Array(width * height).fill(238);
  const to = (p: { x: number; y: number }) => {
    const u = (p.x - 500) * scale;
    const v = (p.y - 707) * scale;
    return {
      x: (500 + u * Math.cos(angle) - v * Math.sin(angle)) * sx + ox + dx,
      y: (707 + u * Math.sin(angle) + v * Math.cos(angle)) * sy + oy + dy,
    };
  };
  let seed = 7;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const dark = (x: number, y: number) => {
    // Page space, so the drawing rotates and shifts with the sheet.
    const w = (x - dx - ox) / sx;
    const h = (y - dy - oy) / sy;
    const u = (w - 500) / scale;
    const v = (h - 707) / scale;
    const px = 500 + u * Math.cos(-angle) - v * Math.sin(-angle);
    const py = 707 + u * Math.sin(-angle) + v * Math.cos(-angle);
    for (const m of TEMPLATE.markers) {
      const ox = Math.abs(px - m.x);
      const oy = Math.abs(py - m.y);
      const r = Math.hypot(ox, oy);
      if ((ox <= 12 && oy <= 1.5) || (oy <= 12 && ox <= 1.5)) return r > 6;
      if (r >= 4 && r <= 6) return true;
    }
    if (px > 108 && px < 400 && py > 55 && py < 70) return true;
    for (let slot = 0; slot < TEMPLATE.perPage; slot++) {
      const c = cellRect(slot);
      const edge =
        Math.min(Math.abs(px - c.x), Math.abs(px - c.x - c.width)) < 1 ||
        Math.min(Math.abs(py - c.y), Math.abs(py - c.y - c.height)) < 1;
      if (
        edge &&
        px > c.x - 2 &&
        px < c.x + c.width + 2 &&
        py > c.y - 2 &&
        py < c.y + c.height + 2
      )
        return true;
    }
    return false;
  };
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const base = dark(x, y) ? 30 : 238;
      gray[y * width + x] = Math.max(
        0,
        Math.min(255, base + (random() - 0.5) * noise),
      );
    }
  return { gray, truth: TEMPLATE.markers.map(to) };
}

function expectNear(
  found: { x: number; y: number }[] | null,
  truth: { x: number; y: number }[],
  tolerance: number,
) {
  expect(found).not.toBeNull();
  found?.forEach((p, i) => {
    expect(Math.hypot(p.x - truth[i].x, p.y - truth[i].y)).toBeLessThan(
      tolerance,
    );
  });
}

it("finds the registration crosses on an upright scan", () => {
  const { gray, truth } = page(1000, 1414);
  expectNear(detectCorners(gray, 1000, 1414), truth, 1.5);
});

it("follows a scan that is shifted, smaller and slightly rotated", () => {
  const { gray, truth } = page(1240, 1754, {
    angle: 0.03,
    dx: 25,
    dy: -18,
    scale: 0.93,
    noise: 40,
  });
  expectNear(detectCorners(gray, 1240, 1754), truth, 3);
});

it("finds crosses on a high resolution scan", () => {
  const { gray, truth } = page(1600, 2263, { angle: -0.02, noise: 30 });
  expectNear(detectCorners(gray, 1600, 2263), truth, 3);
});

it("gives up on blank, uniform and unrelated images", () => {
  expect(detectCorners(new Uint8Array(900 * 1200).fill(240), 900, 1200)).toBe(
    null,
  );
  const stripes = new Uint8Array(900 * 1200);
  for (let i = 0; i < stripes.length; i++)
    stripes[i] = Math.floor(i / 900) % 20 < 10 ? 20 : 235;
  expect(detectCorners(stripes, 900, 1200)).toBeNull();
  expect(detectCorners(new Uint8Array(10), 5, 2)).toBeNull();
});

it("rejects a page with a missing cross", () => {
  const { gray } = page(1000, 1414);
  for (let y = 1330; y < 1400; y++)
    for (let x = 20; x < 90; x++) gray[y * 1000 + x] = 238;
  expect(detectCorners(gray, 1000, 1414)).toBeNull();
});

it("finds the crosses on a US Letter sheet that is narrower than the page", () => {
  const { gray, truth } = page(1275, 1650, { fit: true, noise: 30 });
  expectNear(detectCorners(gray, 1275, 1650), truth, 3);
});

it("finds the crosses on a slightly rotated Letter scan", () => {
  const { gray, truth } = page(1275, 1650, { fit: true, angle: 0.02, dx: 10 });
  expectNear(detectCorners(gray, 1275, 1650), truth, 3);
});
