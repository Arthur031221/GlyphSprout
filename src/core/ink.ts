import { DEFAULT_SETTINGS } from "./types";

// Printed guide lines come out near 237 once the paper is flattened to white,
// so the threshold stops well short of them.
const HIGHEST_THRESHOLD = 215;
const MIN_INK_SHARE = 0.002;
const MIN_CONTRAST = 40;

// Picks the ink threshold for a flattened scan cell. Dark ink keeps the
// default. Pencil and pale pens sit above it and would read as an empty cell,
// so the threshold moves to halfway between the ink and the paper.
export function inkThreshold(gray: Uint8Array): number {
  const histogram = new Uint32Array(256);
  for (const value of gray) histogram[value]++;
  let total = 0;
  let sum = 0;
  for (let level = 0; level < 256; level++) {
    total += histogram[level];
    sum += level * histogram[level];
  }
  if (!total) return DEFAULT_SETTINGS.threshold;
  // Otsu split between ink and paper.
  let below = 0;
  let belowSum = 0;
  let best = -1;
  let split = 0;
  for (let level = 0; level < 255; level++) {
    below += histogram[level];
    belowSum += level * histogram[level];
    const above = total - below;
    if (!below || !above) continue;
    const difference = belowSum / below - (sum - belowSum) / above;
    const separation = below * above * difference * difference;
    if (separation > best) {
      best = separation;
      split = level;
    }
  }
  let inkCount = 0;
  let inkSum = 0;
  for (let level = 0; level <= split; level++) {
    inkCount += histogram[level];
    inkSum += level * histogram[level];
  }
  const paperCount = total - inkCount;
  if (!inkCount || !paperCount || inkCount / total < MIN_INK_SHARE)
    return DEFAULT_SETTINGS.threshold;
  const inkLevel = inkSum / inkCount;
  const paperLevel = (sum - inkSum) / paperCount;
  if (paperLevel - inkLevel < MIN_CONTRAST) return DEFAULT_SETTINGS.threshold;
  return Math.min(
    HIGHEST_THRESHOLD,
    Math.max(
      DEFAULT_SETTINGS.threshold,
      Math.round((inkLevel + paperLevel) / 2),
    ),
  );
}
