# Changelog

## 1.11.0

A new **Kerning** panel in the Workshop adjusts the space between two letters that sit next to each other, such as A and V. Choose the pair, enter a number from -300 to 300 thousandths of the text size, and the live specimen shows it at once. A negative number brings the letters closer and a positive number pushes them apart. Before this, every letter pair used the same spacing, which looks loose around shapes like A, V, T and L.

Pairs are exported as a plain `kern` table in both the TTF and the WOFF2, and the validation run now checks them with FontTools and FreeType. They are saved in project backups, follow Undo and Redo, are limited to 500 per project, and are dropped when you remove one of their letters. The panel is translated in all nine interface languages.

## 1.10.0

The Characters stage has two new quick-add buttons, **Accented lowercase** and **Accented uppercase**. They add the precomposed Latin letters that Spanish, French, German, Portuguese and many other languages need, such as e with an acute accent, n with a tilde, u with a diaeresis, c with a cedilla and the German sharp s, in one click. Before this you had to type or paste each accented letter yourself.

Like the other sets, each button appends only the characters your text is missing and stays a draft until **Project ready**. Adding every set at once still fits the 512 glyph limit. Tests cover the new sets and the button flow, and the button labels are translated in all nine interface languages. Updated the demo recording.

## 1.9.0

The Pages stage has a **Paper size** choice of A4 or US Letter. Before this, the template was A4 only, so printing it at actual size on Letter paper cut off the bottom registration crosses. The Letter template is the same layout scaled to 94 percent and centered, so every cell and cross stays on the sheet, and the print window, the downloaded SVG and the footer line all follow the choice.

The choice is remembered in this browser. Browsers set to a United States, Canadian, Mexican, Philippine, Chilean or Colombian region start on US Letter and all others on A4. A4 output is unchanged, and scans of either size are read the same way. Tests cover the Letter layout and corner detection on Letter scans. The label is translated in all nine interface languages. Updated the demo recording.

## 1.8.0

A new **Font information** panel records a designer, a copyright notice, a license text and a license URL in the exported TTF and WOFF2 name table, so a font you share carries its own credit and terms. **Use the SIL Open Font License** fills the license text and URL in one click. Empty fields are left out, and projects without the information export exactly as before.

The information is saved in project backups, follows Undo and Redo, and is checked when a backup is opened. The panel is translated in all nine interface languages.

## 1.7.0

Adding a scan now finds the four registration crosses and places the page corners on them, so most pages need a check instead of four drags. The search tolerates pages that don't fill the image, small shifts and slight rotation. When a cross can't be found, the corners start where a page-filling scan would show them, as before, and the note is not shown. You still confirm every page.

Images with a long side over 4096 pixels are scaled down when they are added, which lets large phone photos load on browsers with a canvas size limit. The specimen text is no longer announced by screen readers on every keystroke. The README now shows the demo before the install command. The new note is translated in all nine interface languages.

## 1.6.0

New traces no longer export as raw pixel staircases. **Outline smoothing** turns the one pixel steps along curves and diagonals into straight segments and drops the points that no longer matter, so large sizes look clean and glyphs carry fewer points. Each glyph has its own level from 0 to 3, new scans start at 2, and 0 keeps the exact pixel outline. If smoothing would make two outlines cross, the glyph keeps its pixel outline.

Projects saved before this version and the bundled Paper Bloom sample stay at 0, so their fonts do not change. The setting is translated in all nine interface languages.

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
