import { expect, it } from "vitest";
import { flattenLighting } from "../src/core/flatten";
import { trace } from "../src/core/trace";
import { defaultSettings } from "../src/core/types";

const SIZE = 384;

function cell(paper: (x: number, y: number) => number): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const stroke =
        (x > 150 && x < 180 && y > 60 && y < 320) ||
        (y > 180 && y < 207 && x > 90 && x < 290);
      const level = Math.round((stroke ? 45 : 238) * paper(x, y));
      rgba.set([level, level, level, 255], (y * SIZE + x) * 4);
    }
  return rgba;
}

function ink(rgba: Uint8ClampedArray) {
  const gray = new Uint8Array(SIZE * SIZE);
  for (let i = 0; i < gray.length; i++) gray[i] = rgba[i * 4];
  return trace(gray, SIZE, SIZE, defaultSettings());
}

it("traces the same strokes under an even or a shaded page", () => {
  const even = ink(
    flattenLighting(
      cell(() => 1),
      SIZE,
    ),
  );
  for (const shade of [
    (x: number) => 1 - 0.5 * (x / SIZE),
    (_x: number, y: number) => 1 - 0.45 * (y / SIZE),
    () => 0.55,
  ]) {
    const raw = ink(cell(shade));
    const flat = ink(flattenLighting(cell(shade), SIZE));
    expect(flat.contours).toHaveLength(even.contours.length);
    expect(Math.abs(flat.inkPixels - even.inkPixels)).toBeLessThan(
      even.inkPixels * 0.06,
    );
    expect(raw.inkPixels).toBeGreaterThan(even.inkPixels * 1.3);
  }
});

it("leaves an evenly lit bright cell and its alpha almost unchanged", () => {
  const rgba = cell(() => 1);
  rgba[3] = 128;
  const flat = flattenLighting(rgba, SIZE);
  expect(flat[3]).toBe(128);
  expect(Math.abs(ink(flat).inkPixels - ink(rgba).inkPixels)).toBeLessThan(
    ink(rgba).inkPixels * 0.03,
  );
});

it("keeps a solid dark block and never brightens past white", () => {
  const rgba = new Uint8ClampedArray(SIZE * SIZE * 4);
  for (let i = 0; i < SIZE * SIZE; i++) {
    const x = i % SIZE;
    const y = Math.floor(i / SIZE);
    const level = x > 100 && x < 260 && y > 100 && y < 260 ? 10 : 250;
    rgba.set([level, level, level, 255], i * 4);
  }
  const flat = flattenLighting(rgba, SIZE);
  expect(flat[(180 * SIZE + 180) * 4]).toBeLessThan(40);
  expect(flat[0]).toBe(255);
});

it("rejects a raster whose length does not match", () => {
  expect(() => flattenLighting(new Uint8ClampedArray(40), SIZE)).toThrow(
    "invalidRaster",
  );
});
