import { expect, it } from "vitest";
import { glyphThumbnail } from "../src/core/font";
import { defaultSettings, type Glyph } from "../src/core/types";

function glyph(contours: Glyph["contours"]): Glyph {
  return {
    character: "I",
    contours,
    source: "",
    settings: { ...defaultSettings(), smoothing: 0 },
    reviewed: false,
    origin: "draw",
  };
}

it("builds a path and view box for a traced glyph", () => {
  const thumb = glyphThumbnail(
    glyph([
      [
        { x: 0.4, y: 0.2 },
        { x: 0.4, y: 0.8 },
        { x: 0.6, y: 0.8 },
        { x: 0.6, y: 0.2 },
      ],
    ]),
  );
  expect(thumb?.path).toMatch(/^M-?\d+ -?\d+( L-?\d+ -?\d+)+Z$/);
  const [, , width, height] = (thumb?.box ?? "").split(" ").map(Number);
  expect(width).toBeGreaterThanOrEqual(200);
  expect(height).toBeGreaterThan(width);
  expect(height).toBeLessThan(1000);
});

it("returns null for an empty glyph, a missing glyph and an outline that can't be built", () => {
  expect(glyphThumbnail(undefined)).toBeNull();
  expect(glyphThumbnail(glyph([]))).toBeNull();
  expect(
    glyphThumbnail(
      glyph([
        [
          { x: 0.5, y: 0.5 },
          { x: 0.5, y: 0.5 },
          { x: 0.5, y: 0.5 },
        ],
      ]),
    ),
  ).toBeNull();
});
