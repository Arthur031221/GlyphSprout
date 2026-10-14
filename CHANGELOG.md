# Changelog

## 1.1.0

- Edit existing scan or drawing pixels with the pen, eraser and drawing undo while preserving glyph settings and template assignments.
- Ignore secondary touches and restore keyboard focus when opening and closing the drawing editor.
- Preserve newer glyph work when source edits conflict with a pending crop or changed glyph.
- Wait for pending glyph edits before downloading a project backup.
- Keep template IDs and scan assignments when whitespace, duplicate characters or Unicode normalization leave the ordered character list unchanged.
- Restore the project text in the specimen after reopening saved work.
- Keep template actions visible on narrow screens in all nine interface languages.
- Use readable primary button colors in the System dark theme.
- Refresh the workshop recording and document source editing and backup behavior.

## 1.0.1

- Flush pending glyph edits before export and build the font from the latest project snapshot.
- Keep project controls disabled while the font is being exported.
- Preserve review state and edit history when settings have not changed.
- Cancel unfinished crop edits when settings are reset or rejected, drawings are used, glyphs are cleared, or project history or review state changes.
- Discard canceled settings drafts and preserve newer typed values when an older request finishes or fails.
- Release export waits for canceled image decoding.
- Cancel obsolete crop work after committed character changes or scan conversion.
- Preserve pending crop edits when a replacement fails project validation.
- Reject invalid transformed outlines before saving a settings change.
- Reject blank drawings without replacing the current glyph.
- Restore scan corner dragging with mouse and touch.
- Increase muted text contrast in the light theme and show keyboard focus on scan upload controls.
