import { useRef, useState } from "react";
import { fontGlyph } from "../core/font";
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
  const releasePending = useRef(new Map<string, () => void>());
  const pending = useRef(new Set<Promise<boolean | undefined>>());
  const [busy, setBusy] = useState(false);
  const [cancellation, setCancellation] = useState(0);

  function invalidate(character: string) {
    const request = (requests.current.get(character) ?? 0) + 1;
    requests.current.set(character, request);
    releasePending.current.get(character)?.();
    releasePending.current.delete(character);
    return request;
  }

  function cancel(character?: string) {
    const characters =
      character === undefined ? requests.current.keys() : [character];
    for (const key of characters) invalidate(key);
    setCancellation((value) => value + 1);
  }

  function mutate(character: string, change: (glyph: Glyph) => Glyph) {
    const latest = projectRef.current;
    const glyph = latest?.glyphs[character];
    if (!latest || !glyph) return;
    cancel(character);
    try {
      commit({
        ...latest,
        glyphs: { ...latest.glyphs, [character]: change(glyph) },
      });
    } catch (error) {
      notice({ key: errorKey(error, "settingsInvalid"), tone: "error" });
    }
  }

  function settings(character: string, next: GlyphSettings) {
    const snapshot = projectRef.current;
    const glyph = snapshot?.glyphs[character];
    if (!snapshot || !glyph) return Promise.resolve(undefined);
    const request = invalidate(character);
    let values: GlyphSettings;
    try {
      values = validateSettings(next);
    } catch {
      notice({ key: "settingsInvalid", tone: "error" });
      return Promise.resolve(false);
    }
    if (JSON.stringify(values) === JSON.stringify(glyph.settings))
      return Promise.resolve(true);
    let release = () => {};
    const canceled = new Promise<undefined>((resolve) => {
      release = () => resolve(undefined);
    });
    releasePending.current.set(character, release);
    const task = Promise.race([
      applySettings(snapshot, glyph, values, request),
      canceled,
    ]);
    pending.current.add(task);
    setBusy(true);
    void task.finally(() => {
      pending.current.delete(task);
      if (releasePending.current.get(character) === release)
        releasePending.current.delete(character);
      setBusy(pending.current.size > 0);
    });
    return task;
  }

  async function applySettings(
    snapshot: Project,
    glyph: Glyph,
    values: GlyphSettings,
    request: number,
  ) {
    const character = glyph.character;
    try {
      const inkChanged =
        values.threshold !== glyph.settings.threshold ||
        values.minArea !== glyph.settings.minArea ||
        JSON.stringify(values.crop) !== JSON.stringify(glyph.settings.crop);
      let result: ReturnType<typeof trace> | undefined;
      if (inkChanged) {
        const pixels = await decodeCell(glyph.source);
        result = trace(
          grayscale(pixels.data),
          pixels.width,
          pixels.height,
          values,
        );
      }
      const current = projectRef.current;
      if (
        requests.current.get(character) !== request ||
        current?.id !== snapshot.id ||
        current.glyphs[character] !== glyph
      )
        return;
      const updated = {
        ...glyph,
        contours: result?.contours ?? glyph.contours,
        settings: values,
        reviewed: false,
      };
      if (updated.contours.length) fontGlyph(updated);
      commit({
        ...current,
        glyphs: {
          ...current.glyphs,
          [character]: updated,
        },
      });
      if (result)
        notice({
          key: "removed",
          detail: String(result.removedPixels),
          tone: "info",
        });
      return true;
    } catch (error) {
      if (
        requests.current.get(character) !== request ||
        projectRef.current?.id !== snapshot.id ||
        projectRef.current.glyphs[character] !== glyph
      )
        return;
      notice({ key: errorKey(error, "settingsInvalid"), tone: "error" });
      return false;
    }
  }

  async function flush() {
    let applied = true;
    while (pending.current.size) {
      const results = await Promise.all([...pending.current]);
      if (results.includes(false)) applied = false;
    }
    return applied;
  }

  function drawing(character: string, source: string, pixels: ImageData) {
    cancel(character);
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
      if (!glyph.contours.length) throw new Error("emptyGlyph");
      fontGlyph(glyph);
      commit({ ...current, glyphs: { ...current.glyphs, [character]: glyph } });
      return true;
    } catch (error) {
      notice({ key: errorKey(error), tone: "error" });
      return false;
    }
  }

  return { mutate, settings, drawing, flush, busy, cancel, cancellation };
}
