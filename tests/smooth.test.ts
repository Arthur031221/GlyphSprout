import { expect, it } from "vitest";
import { fontGlyph } from "../src/core/font";
import { blankGlyph, validateSettings } from "../src/core/project";
import { hasCrossings, smoothContour } from "../src/core/smooth";
import { signedArea, trace, traceMask } from "../src/core/trace";
import { defaultSettings } from "../src/core/types";

const SIZE = 64;

function disc(radius: number): Uint8Array {
  const mask = new Uint8Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++)
      if ((x - 31.5) ** 2 + (y - 31.5) ** 2 <= radius ** 2)
        mask[y * SIZE + x] = 1;
  return mask;
}

function total(contours: { x: number; y: number }[][]): number {
  return contours.reduce((sum, c) => sum + c.length, 0);
}

it("leaves the pixel outline alone unless smoothing is requested", () => {
  const mask = disc(20);
  expect(traceMask(mask, SIZE, SIZE)).toEqual(traceMask(mask, SIZE, SIZE, 0));
});

it("turns pixel staircases into a close, crossing free outline", () => {
  const mask = disc(24);
  const raw = traceMask(mask, SIZE, SIZE, 0);
  for (const level of [1, 2, 3]) {
    const smooth = traceMask(mask, SIZE, SIZE, level);
    expect(hasCrossings(smooth)).toBe(false);
    expect(smooth).toHaveLength(1);
    const ratio = signedArea(smooth[0]) / signedArea(raw[0]);
    expect(ratio).toBeGreaterThan(0.97);
    expect(ratio).toBeLessThan(1.01);
  }
  expect(total(traceMask(mask, SIZE, SIZE, 3))).toBeLessThan(
    total(traceMask(mask, SIZE, SIZE, 2)),
  );
});

it("collapses a straight diagonal run into few points", () => {
  const mask = new Uint8Array(SIZE * SIZE);
  for (let i = 4; i < 56; i++) {
    mask[i * SIZE + i] = 1;
    mask[i * SIZE + i + 1] = 1;
    mask[i * SIZE + i + 2] = 1;
  }
  const raw = traceMask(mask, SIZE, SIZE, 0);
  const smooth = traceMask(mask, SIZE, SIZE, 3);
  expect(total(raw)).toBeGreaterThan(200);
  expect(total(smooth)).toBeLessThan(total(raw) / 4);
  expect(hasCrossings(smooth)).toBe(false);
});

it("keeps thin strokes and diagonal touching islands valid", () => {
  const mask = new Uint8Array(SIZE * SIZE);
  for (let x = 4; x < 60; x++) mask[30 * SIZE + x] = 1;
  mask[10 * SIZE + 10] = 1;
  mask[11 * SIZE + 11] = 1;
  mask[12 * SIZE + 12] = 1;
  mask[13 * SIZE + 11] = 1;
  for (const level of [1, 2, 3]) {
    const smooth = traceMask(mask, SIZE, SIZE, level);
    expect(hasCrossings(smooth)).toBe(false);
    for (const contour of smooth) expect(signedArea(contour)).not.toBe(0);
  }
});

it("falls back to the exact outline when smoothing would cross", () => {
  const mask = new Uint8Array(SIZE * SIZE);
  // A one pixel gap between two strokes is narrower than the corner cuts.
  for (let y = 4; y < 60; y++) {
    mask[y * SIZE + 20] = 1;
    mask[y * SIZE + 22] = 1;
  }
  const result = traceMask(mask, SIZE, SIZE, 3);
  expect(hasCrossings(result)).toBe(false);
});

it("rejects invalid smoothing contours and reports crossings", () => {
  const bowtie = [
    [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ],
  ];
  const square = [
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ],
  ];
  expect(hasCrossings(bowtie)).toBe(true);
  expect(hasCrossings(square)).toBe(false);
  expect(smoothContour(square[0], 0)).toBe(square[0]);
  expect(smoothContour(square[0], 2.4).length).toBeGreaterThan(3);
});

it("passes the smoothing level from glyph settings to the tracer", () => {
  const gray = new Uint8Array(SIZE * SIZE).fill(255);
  const mask = disc(20);
  for (let i = 0; i < mask.length; i++) if (mask[i]) gray[i] = 0;
  const base = { threshold: 165, minArea: 1 };
  const raw = trace(gray, SIZE, SIZE, base);
  const smooth = trace(gray, SIZE, SIZE, { ...base, smoothing: 2 });
  expect(smooth.inkPixels).toBe(raw.inkPixels);
  expect(smooth.contours).not.toEqual(raw.contours);
});

it("exports a smoothed glyph as one font outline", () => {
  const gray = new Uint8Array(SIZE * SIZE).fill(255);
  const mask = disc(24);
  for (let i = 0; i < mask.length; i++) if (mask[i]) gray[i] = 0;
  const glyph = blankGlyph("O", "");
  glyph.settings = { ...defaultSettings(), smoothing: 2 };
  glyph.contours = trace(gray, SIZE, SIZE, glyph.settings).contours;
  const exported = fontGlyph(glyph);
  expect(exported.contours).toHaveLength(1);
  expect(exported.contours?.[0].every((p) => p.onCurve)).toBe(true);
});

it("reads saved glyph settings without smoothing as pixel outlines", () => {
  const { smoothing, ...legacy } = defaultSettings();
  expect(smoothing).toBe(2);
  expect(validateSettings(legacy).smoothing).toBe(0);
  expect(validateSettings({ ...legacy, smoothing: 3 }).smoothing).toBe(3);
  expect(() => validateSettings({ ...legacy, smoothing: 1.5 })).toThrow();
  expect(() => validateSettings({ ...legacy, smoothing: 4 })).toThrow();
});
