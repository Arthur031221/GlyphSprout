import { expect, it } from "vitest";
import { validateSettings } from "../src/core/project";
import { changeWeight, trace } from "../src/core/trace";
import { defaultSettings } from "../src/core/types";

const SIZE = 40;

function bar(): Uint8Array {
  const gray = new Uint8Array(SIZE * SIZE).fill(255);
  for (let y = 5; y < 35; y++)
    for (let x = 18; x < 22; x++) gray[y * SIZE + x] = 0;
  return gray;
}

function count(mask: Uint8Array) {
  return mask.reduce((sum, value) => sum + value, 0);
}

function span(mask: Uint8Array, row: number) {
  let first = -1;
  let last = -1;
  for (let x = 0; x < SIZE; x++)
    if (mask[row * SIZE + x]) {
      if (first < 0) first = x;
      last = x;
    }
  return first < 0 ? 0 : last - first + 1;
}

it("grows and shrinks a stroke by whole pixels on each side", () => {
  const mask = bar().map((value) => (value < 165 ? 1 : 0));
  expect(span(mask, 20)).toBe(4);
  expect(span(changeWeight(mask, SIZE, SIZE, 1), 20)).toBe(6);
  expect(span(changeWeight(mask, SIZE, SIZE, 2), 20)).toBe(8);
  expect(span(changeWeight(mask, SIZE, SIZE, -1), 20)).toBe(2);
  expect(count(changeWeight(mask, SIZE, SIZE, -2))).toBe(0);
});

it("leaves the mask alone at weight zero and does not edit its input", () => {
  const mask = bar().map((value) => (value < 165 ? 1 : 0));
  const copy = mask.slice();
  expect(changeWeight(mask, SIZE, SIZE, 0)).toBe(mask);
  changeWeight(mask, SIZE, SIZE, 3);
  expect(mask).toEqual(copy);
});

it("passes the weight setting to the tracer and keeps the crop", () => {
  const gray = bar();
  const base = { threshold: 165, minArea: 1 };
  const plain = trace(gray, SIZE, SIZE, base);
  expect(trace(gray, SIZE, SIZE, { ...base, weight: 0 })).toEqual(plain);
  const bold = trace(gray, SIZE, SIZE, { ...base, weight: 2 });
  const thin = trace(gray, SIZE, SIZE, { ...base, weight: -1 });
  expect(bold.inkPixels).toBeGreaterThan(plain.inkPixels);
  expect(thin.inkPixels).toBeLessThan(plain.inkPixels);
  expect(thin.contours).toHaveLength(1);
  const cropped = trace(gray, SIZE, SIZE, {
    ...base,
    weight: 3,
    crop: { left: 0.5, top: 0, right: 1, bottom: 1 },
  });
  for (const contour of cropped.contours)
    for (const point of contour) expect(point.x).toBeGreaterThanOrEqual(0.5);
});

it("reads saved glyph settings without a weight as zero", () => {
  const { weight, ...legacy } = defaultSettings();
  expect(weight).toBe(0);
  expect(validateSettings(legacy).weight).toBe(0);
  expect(validateSettings({ ...legacy, weight: -3 }).weight).toBe(-3);
  expect(validateSettings({ ...legacy, weight: 3 }).weight).toBe(3);
  expect(() => validateSettings({ ...legacy, weight: 4 })).toThrow();
  expect(() => validateSettings({ ...legacy, weight: 0.5 })).toThrow();
});
