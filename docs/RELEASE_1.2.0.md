# GlyphSprout 1.2.0

GlyphSprout now preserves an unfinished drawing and its local undo history while you move between Workshop, Pages, and Characters. The Saved badge continues to describe the committed project. Drawing edits and scan alignment remain drafts until applied or converted, so they are excluded from project backups and font downloads. Font export is unavailable while drawing edits are dirty.

Actions that would replace a dirty drawing ask before discarding it. Canceling a drawing or source edit discards it by choice, while a successful Apply commits the edit directly. Drawing undo keeps the latest 20 steps. Restoring the original pixels clears the drawing draft. A browser warning appears on close or reload while drawing edits or staged scans remain.

Each staged scan can be removed separately. Other staged pages retain their corner registration and confirmation, and a replacement image can be added before conversion. A successful conversion stores the page and its glyph associations in the project. Converting a page that contains the edited glyph asks before discarding its drawing draft. Converting another page keeps the drawing available to apply afterward. The drawing remains available if conversion fails or is canceled, and is discarded only when its replacement is committed.

Specimen preview text is normalized to NFC. A decomposed accented sequence therefore displays as one composed character when the project supports it.

See [Usage](USAGE.md) for the updated drawing, scan, and backup workflow.
