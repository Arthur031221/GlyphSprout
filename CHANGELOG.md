# Changelog

## 1.5.0

The Characters stage can add whole character sets in one click: uppercase letters, lowercase letters, digits, punctuation, hiragana and katakana. Only the missing characters are appended, and the result stays a draft until **Project ready**.

**Copy web font CSS** copies an `@font-face` rule for the WOFF2 and TTF files you download. **Preview zoom** resizes the live specimen.

The page now has a description, an icon, social preview tags and a web app manifest. New strings are translated in all nine interface languages. Updated the demo recording.

## 1.4.0

The glyph list shows review progress, and **Next to review** jumps to the next unchecked glyph. Arrow keys move between glyph tiles.

A Font spacing panel sets the word space for the whole font and can copy one glyph's Latin side bearing to every Latin glyph in a single undoable step. The word space is saved in project backups and written to the exported space glyph. Projects without it keep the previous width of 350.

**Download specimen image** saves the preview text as a PNG. New strings are translated in all nine interface languages. Updated the demo recording.

## 1.3.1

Marking a glyph reviewed waits for pending ink and crop adjustments and preserves undo history. Failed or canceled adjustments leave the review state unchanged.

A scan cell with outlines that exceed export limits keeps its source for repair. Conversion lists the affected characters and retains the other glyphs. The warning is translated in all nine interface languages.

Exported fonts have distinct internal names for separate projects and for family names that previously shared the same ASCII form. Updated the sample measurements, guides and demo recording.

## 1.3.0

Stopping scan conversion keeps uploaded pages and their alignment ready to retry. Discarding staged scans is a separate action.

Drawing and source editing support zoom, panning, keyboard scrolling and separate pen and eraser sizes in source pixels. Zoom preserves the native source dimensions. Updated all nine interface languages and the demo recording.

## 1.2.2

- Warn before closing or reloading while a save or glyph edit is pending, and when local saving has failed. Keep the warning until the project is saved.
- Keep scan corner drags with the pointer that started them. Ignore other pointers and the right mouse button, and stop a drag when capture is lost.

## 1.2.1

- Bind staged scans to their original character template. Undo and redo cannot convert confirmed sheets against a different character order or page count. Restore the original template or remove the scans to continue.

- Keep font name and character text drafts when moving between Characters, Pages, and Workshop. Show unapplied setup status and warn before leaving the page. Backups and font downloads use applied values until **Project ready** is submitted.
- Follow project undo and redo in clean setup fields while preserving dirty drafts. Normalize the raw setup input after a successful submission, and reset drafts when replacing a project, including with the same sample.
- Refresh the recording to show a setup draft surviving stage navigation before applying the font name and continuing with source editing and a TTF download.

## 1.2.0

- Keep unfinished drawing pixels and drawing history mounted while moving between workshop stages.
- Warn before discarding dirty drawing edits, and keep unapplied drawing and scan drafts out of project backups and font downloads.
- Warn before closing or reloading while drawing edits or scan alignment remain staged.
- Remove individual staged scans without discarding the other scans' registration and confirmation, then upload replacements as needed.
- Normalize specimen preview text to NFC so decomposed accented characters render as their supported composed character.
- Translate drawing and scan draft warnings and scan removal controls in all nine interface languages.
- Refresh the demo to show a source edit surviving stage navigation before applying it and downloading a TTF.

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
