# Usage

## Make a small font of your own

1. Open the local workshop and choose the characters your project needs.
2. Print the generated A4 template at actual size. Write one character in each cell.
3. Add a flat, evenly lit PNG or JPEG scan. Confirm its printed page ID and the four page corners.
4. Review each traced glyph. Adjust its threshold, speck filter, crop, size, offsets, and spacing, or draw and erase directly on the source.
5. Type a specimen in the live preview and download a TTF or WOFF2 font.

Each A4 sheet has 35 cells. A project supports at most 512 supported BMP characters and 15 template pages. Drag a page corner with one finger or the left mouse button. A second finger leaves that drag and the other corners unchanged. You can also use the corner coordinates or arrow keys for fine adjustments. Confirming the visible page ID, page assignment, and interior alignment enables **Convert scans**. Click it to start conversion in a browser worker.

The font name and character text in Characters are drafts until you choose **Project ready**. They remain in the form while you move between Characters, Pages, and Workshop. A status and notice identify unapplied setup changes, and the workshop warns before the page is closed or reloaded. Backups and font downloads use the applied project values until setup is submitted. Fields you have not edited follow Undo and Redo. Any text you are still editing stays in place. A successful submission normalizes the raw input. Replacing a project resets the drafts, including when you load the same sample again. Unapplied setup changes are not saved or recovered after a page reload.

Staged scans belong to the character template used when they were added. If Undo or Redo changes that template, conversion and alignment controls are disabled. The scans, confirmation and corner positions remain intact. Restore their template with Undo or Redo to continue, or remove the staged scans and upload sheets for the current template. Renaming a font keeps its template compatible.

## Edit and review glyphs

The source editor opens the current native pixel image for the selected glyph. Use the pen and eraser to make local changes, and use drawing undo to step back through strokes. Applying a source edit keeps the glyph's threshold, crop, size, offsets, spacing, and page ID. An empty source is rejected. A changed source becomes unreviewed so you can check its outline. Applying an unchanged source leaves project history untouched. If the glyph has changed or its settings are still being processed, the source editor rejects the edit and preserves that work. Cancel the source edit and reopen it once the pending settings finish.

**Draw a glyph** starts with a blank image. Using a drawing replaces the glyph and resets its settings. Drawing undo and project undo are separate. Use **Mark reviewed** after checking the source and generated outline.

An unfinished drawing stays in Workshop while you move between Workshop, Pages, and Characters. Its pixels and drawing undo history remain available when you return. The **Saved** badge refers to the committed project. Unapplied drawing edits are not included in project backups or font downloads, and font export stays disabled until you apply or cancel them. Leaving a dirty drawing for another glyph, a new drawing, review, clear, or project Undo/Redo asks whether to discard it. Choosing **Cancel drawing** or **Cancel source edit** discards it directly. Applying a source edit commits it without a discard prompt. Drawing undo keeps the latest 20 steps. Restoring the original pixels clears the draft warning.

The workshop warns before closing or reloading whenever drawing edits or scan alignment are staged. A staged scan is also excluded from project backups and font downloads until conversion. Remove an individual staged scan from its queue row. The other scans keep their registration and confirmation, and you can upload a replacement after removing one. Once conversion succeeds, the saved project includes the converted page and links scanned glyphs to that page. Converting a page that contains the edited glyph asks before discarding its drawing draft. Converting another page keeps the drawing available to apply afterward. The drawing remains available if conversion fails or is canceled, and is discarded only when its replacement is committed.

Specimen text is normalized to Unicode NFC for preview, so decomposed accents display as their composed character when that character is supported by the project.

The preview uses the generated font. An incomplete project is not exported by default. To download only finished glyphs, select **Export completed subset**. The exported file is identified as a subset of the chosen characters. Export waits for pending glyph and settings edits and uses the latest project snapshot. A settings change is rejected before saving if its transformed outline is invalid or outside safe font bounds.

Changing project history, the character list, or review state clears canceled values from the settings form. Resetting or rejecting settings, drawing, clearing a glyph, and project Undo or Redo cancel older unfinished crop work. That crop cannot replace a newer result or delay a font export. Successful scan conversion cancels earlier crop work. Export does not wait for a removed or replaced character's crop to finish.

## Templates and scans

Changing the chosen characters or their order requires fresh printed sheets. Changes limited to whitespace, duplicate characters, or Unicode normalization preserve the template IDs and existing scans when the ordered characters remain the same. Renaming the font also preserves the IDs and scan assignments.

## Save and recover

Download a `.glyphsprout.json` project file for a portable backup. A backup waits for pending settings to finish and includes their latest values. Projects are also saved locally in IndexedDB with a current and previous revision. If the newest revision cannot be read, the workshop can fall back to the previous one. If another tab saves first, the workshop warns about the conflict so you can download your copy or reload.

On restore, the specimen uses the project's text. If both revisions are unreadable, automatic saving stops and the stored data stays intact. **Download stored data** saves a raw recovery archive, including original assets and revisions. This archive is for manual inspection or repair and cannot be opened as a project. Open a normal project backup to keep working, or use **Reset local storage** after keeping the archive. Resetting requires confirmation and removes this browser's saved revisions. Reset is disabled while the archive is being prepared. Wait for the browser to finish saving the file before resetting.

The workshop warns before closing or reloading while a project save or glyph edit is pending, and when local saving has failed. Browser warnings are controlled by the browser and cannot protect work from a crash or forced close. Download a project backup if you need to keep changes before leaving.

Browser storage is not a backup service and can be cleared. Keep project JSON outside the browser. Project data stays in this browser. The app does not upload it or use remote analytics.

## Install an exported font

GlyphSprout creates ordinary unhinted TTF and WOFF2 files. Operating-system font installation steps vary by host and version. On many desktop systems, open the downloaded TTF in the system font viewer and choose its install action. Applications may need to restart before the font appears. WOFF2 is commonly loaded by a website with `@font-face`. Check the target application's font-format support. These steps are general guidance, not a compatibility guarantee.

GlyphSprout does not provide kerning, curve simplification, hinting, OCR, a full language font, or connected-script shaping. Review the font in the application where you plan to use it.
