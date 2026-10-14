import { CheckCircle, Circle } from "@phosphor-icons/react";
import { memo } from "react";
import { glyphThumbnail } from "../core/font";
import type { Glyph } from "../core/types";

interface Props {
  character: string;
  glyph: Glyph | undefined;
  active: boolean;
  label: string;
  onSelect: (character: string) => void;
}

// Shows the traced outline so the grid reads as the user's own letters. Glyphs
// whose outline can't be built fall back to the typed character.
export const GlyphTile = memo(function GlyphTile({
  character,
  glyph,
  active,
  label,
  onSelect,
}: Props) {
  const ready = !!glyph?.contours.length;
  const thumb = glyphThumbnail(glyph);
  return (
    <button
      type="button"
      className={`glyph-tile ${active ? "active" : ""} ${ready ? "done" : "missing"}`}
      aria-label={label}
      aria-pressed={active}
      onClick={() => onSelect(character)}
    >
      {thumb ? (
        <>
          <svg className="glyph-thumb" viewBox={thumb.box} aria-hidden="true">
            <path d={thumb.path} />
          </svg>
          <span className="glyph-tile-char" aria-hidden="true">
            {character}
          </span>
        </>
      ) : (
        <span>{character}</span>
      )}
      <small>
        {glyph?.reviewed ? (
          <CheckCircle size={14} weight="fill" />
        ) : ready ? (
          <Circle size={12} />
        ) : (
          ""
        )}
      </small>
    </button>
  );
});
