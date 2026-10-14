import { fontGlyph } from "./font";
import { trace } from "./trace";
import {
  defaultSettings,
  MAX_CONTOURS_PER_GLYPH,
  MAX_POINTS_PER_GLYPH,
} from "./types";

export function traceScannedCell(
  character: string,
  gray: Uint8Array,
  width: number,
  height: number,
) {
  const settings = defaultSettings();
  const result = trace(gray, width, height, settings);
  const repair = () => ({ ...result, contours: [], needsRepair: true });
  if (
    result.contours.length > MAX_CONTOURS_PER_GLYPH ||
    result.contours.reduce((count, contour) => count + contour.length, 0) >
      MAX_POINTS_PER_GLYPH
  )
    return repair();
  try {
    if (result.contours.length)
      fontGlyph({
        character,
        source: "",
        contours: result.contours,
        settings,
        reviewed: false,
        origin: "scan",
      });
  } catch (error) {
    if (
      error instanceof Error &&
      ["collapsedContour", "invalidMetrics"].includes(error.message)
    )
      return repair();
    throw error;
  }
  return { ...result, needsRepair: false };
}
