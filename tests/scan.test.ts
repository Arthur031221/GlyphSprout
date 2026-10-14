import { expect, it } from "vitest";
import { listCells, traceScannedCell } from "../src/core/scan";
import { trace } from "../src/core/trace";
import { defaultSettings } from "../src/core/types";

it("keeps usable cells exportable and accepts empty cells", () => {
  const gray = new Uint8Array(384 * 384).fill(255);
  expect(traceScannedCell("A", gray, 384, 384)).toMatchObject({
    contours: [],
    needsRepair: false,
  });
  for (let y = 100; y < 200; y++)
    for (let x = 120; x < 220; x++) gray[y * 384 + x] = 0;
  const result = traceScannedCell("B", gray, 384, 384);
  expect(result.needsRepair).toBe(false);
  expect(result.contours).toHaveLength(1);
  expect(result.inkPixels).toBe(10000);
});

it("isolates a noisy cell exceeding the project contour limit", () => {
  const gray = new Uint8Array(384 * 384).fill(255);
  for (let y = 16; y < 211; y += 3)
    for (let x = 16; x < 211; x += 3) gray[y * 384 + x] = 0;
  expect(trace(gray, 384, 384, defaultSettings()).contours).toHaveLength(4225);
  const result = traceScannedCell("A", gray, 384, 384);
  expect(result.needsRepair).toBe(true);
  expect(result.contours).toEqual([]);
  expect(result.inkPixels).toBe(4225);
});

it("isolates a cell exceeding the point limit with an allowed contour count", () => {
  const gray = new Uint8Array(384 * 384).fill(255);
  for (let y = 3; y < 384; y += 6)
    for (let x = 3; x < 384; x += 6)
      for (const offset of [0, -1, 1, -384, 384])
        gray[y * 384 + x + offset] = 0;
  const traced = trace(gray, 384, 384, defaultSettings());
  expect(traced.contours).toHaveLength(4096);
  expect(
    traced.contours.reduce((sum, contour) => sum + contour.length, 0),
  ).toBeGreaterThan(32760);
  expect(traceScannedCell("A", gray, 384, 384)).toMatchObject({
    contours: [],
    needsRepair: true,
  });
});

it("does not hide invalid raster failures as repairable glyphs", () => {
  expect(() => traceScannedCell("A", new Uint8Array(5), 384, 384)).toThrow(
    "invalidRaster",
  );
});

it("lists a few cells in full and counts the rest", () => {
  expect(listCells(["A", "B"])).toBe("A B");
  expect(listCells([])).toBe("");
  const many = Array.from({ length: 30 }, (_, i) =>
    String.fromCharCode(65 + i),
  );
  expect(listCells(many)).toBe(`${many.slice(0, 24).join(" ")} +6`);
});
