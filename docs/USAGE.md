# Usage

## Make a small font of your own

1. Open the local workshop and choose the characters your project needs.
2. Print the generated template at actual size. Choose A4 or US Letter with **Paper size** on the Pages stage. The choice is remembered in this browser, and browsers set to a United States, Canadian, Mexican, Philippine, Chilean or Colombian region start on US Letter. Write one character in each cell.
3. Add a flat, evenly lit PNG or JPEG scan. Confirm its printed page ID and the four page corners.
4. Click **Convert scans** and wait for conversion to finish.
5. Review each traced glyph. Adjust its threshold, speck filter, outline smoothing, crop, size, offsets, and spacing, or draw and erase directly on the source.
6. Type a specimen in the live preview and download a TTF or WOFF2 font.

Each sheet has 35 cells. The US Letter layout is the A4 layout scaled to 94 percent and centered, so the registration crosses stay on the paper and cells are slightly smaller. Scans of either size are read the same way. A project supports at most 512 supported BMP characters and 15 template pages. When you add a scan, GlyphSprout searches near the expected positions for the four printed registration crosses and places the corners on them. A note above the corner fields says so. This works for scans and photos where the page doesn't fill the image, and for photos up to a few degrees off square. If a cross is hidden or unclear, the corners start at the proportional guess instead. Check every corner before you confirm. Images with a long side over 4096 pixels are scaled down when they are added, so large phone photos load on mobile browsers. Drag a page corner with one finger or the left mouse button. A second finger leaves that drag and the other corners unchanged. You can also use the corner coordinates or arrow keys for fine adjustments. Confirming the visible page ID, page assignment, and interior alignment enables **Convert scans**. Click it to start conversion in a browser worker.

The font name and character text in Characters are drafts until you choose **Project ready**. They remain in the form while you move between Characters, Pages, and Workshop. A status and notice identify unapplied setup changes, and the workshop warns before the page is closed or reloaded. Backups and font downloads use the applied project values until setup is submitted. Fields you have not edited follow Undo and Redo. Any text you are still editing stays in place. A successful submission normalizes the raw input. Replacing a project resets the drafts, including when you load the same sample again. Unapplied setup changes are not saved or recovered after a page reload.

Staged scans belong to the character template used when they were added. If Undo or Redo changes that template, conversion and alignment controls are disabled. The scans, confirmation and corner positions remain intact. Restore their template with Undo or Redo to continue, or remove the staged scans and upload sheets for the current template. Renaming a font keeps its template compatible.

The corrected page preview updates as you adjust the four corners. Large scans are decoded once in a browser worker, so dragging does not repeatedly read the image on the main thread. Corner handles accept touches within 24 pixels of their centers and also support the arrow keys and numeric fields. An updating or error message appears below the preview.

The Characters stage has quick-add buttons for uppercase letters, lowercase letters, digits, punctuation, accented lowercase letters, accented uppercase letters, hiragana and katakana. The accented sets hold the precomposed Latin letters used in Spanish, French, German, Portuguese and several other languages, such as e with an acute accent, n with a tilde, u with a diaeresis and the German sharp s. Each button appends only the characters your text is missing, so pressing it twice changes nothing, and it is disabled once the set is complete. The additions stay a draft until you choose **Project ready**. Adding every set at once stays within the 512 glyph limit.

## Edit and review glyphs

The source editor opens the current native pixel image for the selected glyph. Use the pen and eraser to make local changes, and use drawing undo to step back through strokes. Applying a source edit keeps the glyph's threshold, smoothing, crop, size, offsets, spacing, and page ID. An empty source is rejected. A changed source becomes unreviewed so you can check its outline. Applying an unchanged source leaves project history untouched. If the glyph has changed or its settings are still being processed, the source editor rejects the edit and preserves that work. Cancel the source edit and reopen it once the pending settings finish.

**Outline smoothing** runs from 0 to 3. New traces start at 2. Each level rounds the one pixel steps along curves and diagonals into straight segments and drops points that no longer change the shape. Level 1 follows the pixels most closely, level 3 gives the fewest points, and 0 keeps the exact pixel outline. Smoothing is a polyline, not a curve fit, and it can slightly thin a stroke that is only one or two pixels wide. If smoothing would make two outlines cross, GlyphSprout keeps that glyph's exact pixel outline instead. Projects saved before this setting existed, and the bundled Paper Bloom sample, stay at 0 until you change it. **Reset settings** returns a glyph to level 2.

Zoom from 100 to 800 percent to correct details. Pen and eraser sizes are separate and measured in source pixels. Their widths stay stable when zoom changes. The canvas keeps the native image dimensions and aspect ratio. Choose **Pan** and drag to move a magnified image, use the scrollbars, or focus the drawing viewport and press arrow keys. **Fit image** returns to 100 percent. Zooming and panning do not change source pixels or drawing history.

The glyph list shows how many ready glyphs you have reviewed. **Next to review** selects the next glyph that has an outline and no review mark, wrapping to the start of the list. With focus on a glyph tile, the arrow keys move to the neighbouring tile and select it. Left and right move one tile, up and down move one row.

The Font spacing panel holds two settings for the whole font. **Word space** is the width of the space character in font units, from 100 to 1000, and defaults to 350. It is saved with the project and follows Undo and Redo. **Use this side bearing for all Latin letters** copies the selected glyph's Latin side bearing to every other Latin glyph as one undoable step. It leaves Han and kana glyphs and review marks alone.

The Font information panel stores a designer, a copyright notice, a license text and a license URL. Each is optional, single line text of at most 100, 200, 400 and 200 characters, and the URL must start with http:// or https://. The values are written to the name table of the TTF and WOFF2 files you download, so installed copies show them in font managers. **Use the SIL Open Font License** fills the license text and URL with the standard short notice and the project address. It does not add the full license text or choose a license for you, so check the terms before you publish. The information is saved with the project, follows Undo and Redo, and is left out of the font when every field is empty.

**Draw a glyph** starts with a blank image. Using a drawing replaces the glyph and resets its settings. Drawing undo and project undo are separate. Use **Mark reviewed** after checking the source and generated outline.

An unfinished drawing stays in Workshop while you move between Workshop, Pages, and Characters. Its pixels and drawing undo history remain available when you return. The **Saved** badge refers to the committed project. Unapplied drawing edits are not included in project backups or font downloads, and font export stays disabled until you apply or cancel them. Leaving a dirty drawing for another glyph, a new drawing, review, clear, or project Undo/Redo asks whether to discard it. Choosing **Cancel drawing** or **Cancel source edit** discards it directly. Applying a source edit commits it without a discard prompt. Drawing undo keeps the latest 20 steps. Restoring the original pixels clears the draft warning.

The workshop warns before closing or reloading whenever drawing edits or scan alignment are staged. A staged scan is also excluded from project backups and font downloads until conversion. Remove an individual staged scan from its queue row. The other scans keep their registration and confirmation, and you can upload a replacement after removing one. Once conversion succeeds, the saved project includes the converted page and links scanned glyphs to that page. Converting a page that contains the edited glyph asks before discarding its drawing draft. Converting another page keeps the drawing available to apply afterward. The drawing remains available if conversion fails or is canceled, and is discarded only when its replacement is committed.

**Download specimen image** renders the preview text as a 1600 pixel wide PNG named after the font. Characters without a glyph are left out so the image only shows your handwriting, and long text is wrapped at spaces. Up to 24 lines are drawn.

Specimen text is normalized to Unicode NFC for preview, so decomposed accents display as their composed character when that character is supported by the project.

The preview uses the generated font. An incomplete project is not exported by default. To download only finished glyphs, select **Export completed subset**. The exported file is identified as a subset of the chosen characters. Export waits for pending glyph and settings edits and uses the latest project snapshot. A settings change is rejected before saving if its transformed outline is invalid or outside safe font bounds.

Changing project history, the character list, or review state clears canceled values from the settings form. Resetting or rejecting settings, drawing, clearing a glyph, and project Undo or Redo cancel older unfinished crop work. That crop cannot replace a newer result or delay a font export. Successful scan conversion cancels earlier crop work. Export does not wait for a removed or replaced character's crop to finish.

## Templates and scans

Choose **Stop conversion** to interrupt processing while keeping uploaded scans, corner positions, page assignments and confirmations for a retry. The current project stays intact. **Discard staged scans** removes the queue. Completed conversion clears the queue after applying the result. Staged scans are still excluded from recovery and project downloads.

Changing the chosen characters or their order requires fresh printed sheets. Changes limited to whitespace, duplicate characters, or Unicode normalization preserve the template IDs and existing scans when the ordered characters remain the same. Renaming the font also preserves the IDs and scan assignments.

## Save and recover

Download a `.glyphsprout.json` project file for a portable backup. A backup waits for pending settings to finish and includes their latest values. Projects are also saved locally in IndexedDB with a current and previous revision. If the newest revision cannot be read, the workshop can fall back to the previous one. If another tab saves first, the workshop warns about the conflict so you can download your copy or reload.

On restore, the specimen uses the project's text. If both revisions are unreadable, automatic saving stops and the stored data stays intact. **Download stored data** saves a raw recovery archive, including original assets and revisions. This archive is for manual inspection or repair and cannot be opened as a project. Open a normal project backup to keep working, or use **Reset local storage** after keeping the archive. Resetting requires confirmation and removes this browser's saved revisions. Reset is disabled while the archive is being prepared. Wait for the browser to finish saving the file before resetting.

The workshop warns before closing or reloading while a project save or glyph edit is pending, and when local saving has failed. Browser warnings are controlled by the browser and cannot protect work from a crash or forced close. Download a project backup if you need to keep changes before leaving.

Browser storage is not a backup service and can be cleared. Keep project JSON outside the browser. Project data stays in this browser. The app does not upload it or use remote analytics.

## Use the font on a website

Download the WOFF2 and TTF files, then choose **Copy web font CSS** in the Font file panel. It copies an `@font-face` rule that points to both files by the names GlyphSprout gives them, followed by a `body` rule that uses the font. Save the CSS next to the downloaded files, or edit the `url()` paths to match where you host them. If the browser blocks clipboard access, allow it for this page and try again.

**Preview zoom** next to the specimen text changes the size of the live preview from 24 to 160 pixels. It does not change the exported font or the specimen image.

## Install an exported font

GlyphSprout creates ordinary unhinted TTF and WOFF2 files. Operating-system font installation steps vary by host and version. On many desktop systems, open the downloaded TTF in the system font viewer and choose its install action. Applications may need to restart before the font appears. WOFF2 is commonly loaded by a website with `@font-face`. Check the target application's font-format support. These steps are general guidance, not a compatibility guarantee.

GlyphSprout does not provide kerning, curve fitting, hinting, OCR, a full language font, or connected-script shaping. Review the font in the application where you plan to use it.
