# Usage

## A first font

    1. Open the local workshop and choose the characters you plan to use.
    2. Print the generated A4 template at actual size and write one character per cell.
    3. Add a flat, evenly lit PNG or JPEG scan and confirm its page ID and four corners. Drag the corner handles with a mouse or touch, or adjust their coordinates with the keyboard.
    4. Review each traced glyph. Tune its threshold, speck filter, crop, scale, offsets, and spacing, or draw it by hand.
    5. Type a specimen in the live preview, then download TTF or WOFF2.

Each A4 sheet has 35 cells. A project can contain at most 512 supported BMP characters and 15 template pages. Scan conversion runs in a browser worker after you explicitly confirm the visible page ID, page assignment, and interior alignment.

Changing the character list creates a new printed sheet ID. Print fresh sheets after changing the characters or their order. Renaming the font leaves its existing sheet ID and scan assignments intact.

## Edit and review

Glyphs are separate shapes. Ink inside a cell is traced as black outline, including counters and detached dots. Review the source and outline together. Adjust ink threshold and speck filtering per glyph. Crop edges, size, offsets, Latin side bearing, and advance width tune the result. Drawing, erasing, undo, and redo are available as an alternative to scanning.

The preview uses the actual generated font. An incomplete project is not exported by default. To download only finished glyphs, select **Export completed subset**. The resulting file is explicitly a subset of the chosen characters. Export waits for pending glyph edits and uses the latest project snapshot. Project controls stay disabled until the export finishes. A settings change is rejected before saving if the resulting transformed outline is invalid or outside safe font bounds.

Using an empty drawing is rejected and leaves the current glyph intact. A successful drawing replaces that glyph and resets its settings. Applying unchanged settings leaves its review state and edit history alone.

Resetting or rejecting settings, using a drawing, clearing a glyph, and project Undo or Redo cancel older unfinished crop work. That crop cannot replace the result of the newer action or delay a font export.

Changing project history, the character list or review state also clears canceled values from the settings form. Successful scan conversion cancels earlier crop work. Export does not wait for a removed or replaced character's crop to finish. If an older crop request finishes or fails while you are typing a newer settings change, your newer values stay in the form.

## Save and recover

Download a `.glyphsprout.json` project file for a portable backup. Projects are also saved locally in IndexedDB with a current and previous revision. On recovery, an unreadable newest revision can fall back to the previous one. If another tab saves first, the workshop warns about the conflict so you can download your copy or reload.

If both revisions are unreadable, automatic saving stops and the stored data stays intact. **Download stored data** saves a raw recovery archive, including the original assets and revisions. This archive is for manual inspection or repair and cannot be opened as a project. Open a normal project backup to keep working, or use **Reset local storage** after keeping the archive. Resetting requires confirmation and removes this browser's saved revisions. Reset is disabled while the archive is being prepared. Wait for the browser to finish saving the file before resetting.

Browser storage is not a backup service and can be cleared. Keep project JSON outside the browser. No application data is uploaded and no remote analytics are used.

## Install an exported font

GlyphSprout creates ordinary unhinted TTF and WOFF2 files. Operating-system font installation steps vary by host and version. On many desktop systems, open the downloaded TTF in the system font viewer and choose its install action. Applications may need to restart before the font appears. WOFF2 is commonly loaded by a website with `@font-face`. Check the target application's own font-format support. These steps are general guidance, not a compatibility guarantee.

GlyphSprout does not provide kerning, curve simplification, hinting, OCR, a full language font, or connected-script shaping. Review the font in the application where you plan to use it.
