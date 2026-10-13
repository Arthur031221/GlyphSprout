import { useEffect, useRef, useState } from "react";
import { buildTtf } from "../core/font";
import type { Project } from "../core/types";
import { errorKey, type MessageKey } from "./i18n";

export function useFontPreview(project: Project | null) {
  const [family, setFamily] = useState("");
  const [error, setError] = useState<MessageKey | null>(null);
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const activeFace = useRef<FontFace | null>(null);

  useEffect(
    () => () => {
      if (activeFace.current) document.fonts.delete(activeFace.current);
    },
    [],
  );

  useEffect(() => {
    let canceled = false;
    setError(null);
    if (
      !project ||
      !Object.values(project.glyphs).some((glyph) => glyph.contours.length)
    ) {
      if (activeFace.current) document.fonts.delete(activeFace.current);
      activeFace.current = null;
      setFamily("");
      setBusy(false);
      return;
    }
    setBusy(true);
    const id = ++generation.current;
    const timer = setTimeout(async () => {
      try {
        const bytes = buildTtf(project, true);
        const face = new FontFace(`GlyphSprout-preview-${id}`, bytes);
        await face.load();
        if (canceled) return;
        document.fonts.add(face);
        if (activeFace.current) document.fonts.delete(activeFace.current);
        activeFace.current = face;
        setFamily(face.family);
      } catch (error) {
        if (!canceled) {
          if (activeFace.current) document.fonts.delete(activeFace.current);
          activeFace.current = null;
          setFamily("");
          setError(errorKey(error, "invalidFont"));
        }
      } finally {
        if (!canceled) setBusy(false);
      }
    }, 100);
    return () => {
      canceled = true;
      clearTimeout(timer);
    };
  }, [project]);

  return { family, error, busy };
}
