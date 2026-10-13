import { useRef } from "react";
import { blankGlyph, validateSettings } from "../core/project";
import { grayscale, trace } from "../core/trace";
import type { Glyph, GlyphSettings, Project } from "../core/types";
import { decodeCell } from "./browser";
import { errorKey, type MessageKey } from "./i18n";

export type Notice = {
  key: MessageKey;
  detail?: string;
  tone?: "info" | "error";
};

export function useGlyphEditor(
  projectRef: { current: Project | null },
  commit: (project: Project) => void,
  notice: (value: Notice) => void,
) {
  const requests = useRef(new Map<string, number>());

  function mutate(character: string, change: (glyph: Glyph) => Glyph) {
    const latest = projectRef.current;
    const glyph = latest?.glyphs[character];
    if (!latest || !glyph) return;
    requests.current.set(character, (requests.current.get(character) ?? 0) + 1);
    try {
      commit({
        ...latest,
        glyphs: { ...latest.glyphs, [character]: change(glyph) },
      });
    } catch (error) {
      notice({ key: errorKey(error, "settingsInvalid"), tone: "error" });
    }
  }

  async function settings(character: string, next: GlyphSettings) {
    const snapshot = projectRef.current;
    const glyph = snapshot?.glyphs[character];
    if (!snapshot || !glyph) return;
    const request = (requests.current.get(character) ?? 0) + 1;
    requests.current.set(character, request);
    try {
      const values = validateSettings(next);
      const inkChanged =
        values.threshold !== glyph.settings.threshold ||
        values.minArea !== glyph.settings.minArea ||
        JSON.stringify(values.crop) !== JSON.stringify(glyph.settings.crop);
      if (!inkChanged) {
        commit({
          ...snapshot,
          glyphs: {
            ...snapshot.glyphs,
            [character]: { ...glyph, settings: values, reviewed: false },
          },
        });
        return true;
      }
      const pixels = await decodeCell(glyph.source);
      const result = trace(
        grayscale(pixels.data),
        pixels.width,
        pixels.height,
        values,
      );
      const current = projectRef.current;
      if (
        requests.current.get(character) !== request ||
        current?.id !== snapshot.id ||
        current.glyphs[character] !== glyph
      )
        return;
      commit({
        ...current,
        glyphs: {
          ...current.glyphs,
          [character]: {
            ...glyph,
            contours: result.contours,
            settings: values,
            reviewed: false,
          },
        },
      });
      notice({
        key: "removed",
        detail: String(result.removedPixels),
        tone: "info",
      });
      return true;
    } catch (error) {
      notice({ key: errorKey(error, "settingsInvalid"), tone: "error" });
      return false;
    }
  }

  function drawing(character: string, source: string, pixels: ImageData) {
    const current = projectRef.current;
    if (!current?.characters.includes(character)) return;
    try {
      const glyph = blankGlyph(character, source);
      glyph.contours = trace(
        grayscale(pixels.data),
        pixels.width,
        pixels.height,
        glyph.settings,
      ).contours;
      glyph.origin = "draw";
      commit({ ...current, glyphs: { ...current.glyphs, [character]: glyph } });
    } catch (error) {
      notice({ key: errorKey(error), tone: "error" });
    }
  }

  return { mutate, settings, drawing };
}
