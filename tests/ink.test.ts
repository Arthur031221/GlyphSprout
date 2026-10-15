import { expect, it } from "vitest";
import { inkThreshold } from "../src/core/ink";
import { traceScannedCell } from "../src/core/scan";

const SIZE = 192;
const GUIDE = 237;

// An H with soft edges and the printed guide lines, already flattened.
function cell(ink: number, noise = 0): Uint8Array {
  const gray = new Uint8Array(SIZE * SIZE).fill(255);
  let seed = 7;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const bar = (center: number, y0: number, y1: number) =>
        y >= y0 && y <= y1
          ? Math.max(0, Math.min(1, (6 - Math.abs(x - center)) / 2))
          : 0;
      let cover = Math.max(bar(60, 40, 150), bar(130, 40, 150));
      if (y > 90 && y < 98 && x > 60 && x < 130)
        cover = Math.max(cover, Math.min(1, (5 - Math.abs(y - 94)) / 2));
      let value = 255 * (1 - cover) + ink * cover;
      if (cover === 0 && (y === 20 || y === 170 || x === 20)) value = GUIDE;
      value += (random() - 0.5) * noise;
      gray[y * SIZE + x] = Math.max(0, Math.min(255, Math.round(value)));
    }
  return gray;
}

it("keeps the default threshold for dark ink", () => {
  expect(inkThreshold(cell(20))).toBe(165);
  expect(inkThreshold(cell(40))).toBe(165);
  const result = traceScannedCell("H", cell(20), SIZE, SIZE);
  expect(result.settings.threshold).toBe(165);
  expect(result.contours).toHaveLength(1);
});

it("traces pencil and pale pen ink that sits above the default threshold", () => {
  for (const ink of [150, 170, 190]) {
    const gray = cell(ink, 8);
    const result = traceScannedCell("H", gray, SIZE, SIZE);
    expect(result.settings.threshold).toBeGreaterThan(165);
    expect(result.settings.threshold).toBeLessThanOrEqual(215);
    expect(result.contours).toHaveLength(1);
    const xs = result.contours[0].map((point) => point.x);
    // The H is 76 pixels wide in a 192 pixel cell.
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(76 / SIZE, 1);
  }
});

it("does not trace the printed guide lines or paper noise", () => {
  const guides = new Uint8Array(SIZE * SIZE).fill(255);
  for (let i = 0; i < SIZE; i++) {
    guides[20 * SIZE + i] = GUIDE;
    guides[i * SIZE + 20] = GUIDE;
  }
  const grain = guides.map((value, i) => value - ((i * 2654435761) % 11));
  for (const gray of [guides, grain]) {
    expect(inkThreshold(gray)).toBe(165);
    expect(traceScannedCell("H", gray, SIZE, SIZE).contours).toHaveLength(0);
  }
});

it("leaves an empty cell at the default threshold", () => {
  expect(inkThreshold(new Uint8Array(SIZE * SIZE).fill(255))).toBe(165);
  expect(inkThreshold(new Uint8Array(0))).toBe(165);
});
