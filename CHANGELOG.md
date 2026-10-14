# Changelog

## 1.29.0

The interface now opens in your browser's language on the first visit. GlyphSprout has had nine interface languages for a long time, but everyone started in English and had to find the language menu. A browser set to Japanese, Korean, Spanish, French, German or Portuguese now opens in that language. Chinese is split by script or region, with Traditional for Hant, Taiwan, Hong Kong and Macau and Simplified otherwise. A browser language the app doesn't have still opens in English, and a language you choose in the menu always wins on later visits.

Unit tests cover the language mapping and the order of the browser's list. Browser tests open the app with a Hong Kong Chinese browser, switch to English and reload, and open it with Italian.

## 1.28.0

Dashes, the ellipsis and non-breaking spaces now type with the glyphs you already wrote. Text from a phone, a web page or a word processor is full of en and em dashes, the minus sign, the single ellipsis character and spaces that don't break lines. A font that only had a hyphen, periods and a word space showed the dashes and the ellipsis in red in the live preview and dropped all of them from the TTF and WOFF2 files, so the reader's system substituted another font in the middle of a sentence. The hyphen glyph now covers the hyphen variants, the figure dash, the en and em dashes, the horizontal bar and the minus sign. The ellipsis is built from three copies of your period outline and keeps the period's own spacing. Non-breaking, narrow non-breaking and the fixed width spaces from en space to hair space use the word space of the font. A dash or ellipsis you add to the project keeps its own glyph, and nothing changes when the hyphen or period glyph is missing. Nothing is saved in the project, so existing backups gain the behavior without a format change. The extra space code points grow the Paper Bloom sample TTF from 3,360 to 3,448 bytes, and the validation notes and checks use the new size.

Unit tests read the exported cmap for every dash and space code point and check the three period ellipsis contours and advance, and that an ellipsis the project has stays its own. A browser test checks that dashes, an ellipsis and a non-breaking space stop showing in red while a curly quote without an apostrophe glyph still does.

## 1.27.0

Curly quotes and apostrophes now type with the glyphs of the straight ones. Phones and word processors turn a typed `'` or `"` into a curly mark, and a font that only had the straight marks showed every curly one in red in the live preview and left it out of the TTF and WOFF2 files. The font now maps the curly single quotes and the low and reversed single quote to your apostrophe glyph, and the curly double quotes and the low double quote to your double quote glyph. A curly mark you add to the project keeps its own glyph, and nothing changes when the straight glyph is missing. Kerning pairs set for a straight quote also apply to the curly ones. Nothing is saved in the project, so existing backups gain the behavior without a format change, and the **Add these characters** offer no longer lists curly marks that are already covered.

Unit tests read the exported cmap for all seven code points, the kept own glyph and the empty glyph case. A browser test opens a project with an apostrophe glyph and checks that curly marks stop showing in red while a double quote still does.

## 1.26.0

The drawing editor has a new button, **Use and draw next**. It keeps the drawing and opens a blank canvas for the next character in the project that has no glyph yet, wrapping around to the start of the list. Before this, drawing a font in the browser meant selecting each glyph, pressing Draw a glyph and pressing Use drawing, once per character. The button is hidden when no character is missing a glyph and while you edit an existing source.

Each drawing is its own history step, so one Undo takes back one glyph. Browser tests draw three characters in a row, check that characters that already have a glyph are skipped and that the last one has no such button, and check the Traditional Chinese label. The new label is translated in all nine interface languages, and the README and user guide describe it.

## 1.25.0

The Font spacing panel has a new checkbox, **Type lowercase letters with my uppercase glyphs**. A capitals only handwriting font could not type lowercase text at all: every lowercase letter showed in red in the live preview and was missing from the exported font, so you had to print and write a second alphabet. With the box ticked, each lowercase letter that isn't in your character list is exported with the glyph of its uppercase letter. Latin, Greek and Cyrillic letters are covered. A lowercase letter you add yourself keeps its own glyph, and the live preview, the specimen image and the TTF and WOFF2 downloads all follow the setting. Kerning pairs set for two uppercase letters also apply to their lowercase forms.

The option is saved in project backups and follows Undo and Redo. A backup with a value that isn't true is refused. Unit tests read the exported cmap for all three scripts, the kept lowercase glyph, empty glyphs and the backup round trip. A browser test checks the red letters and the add offer, the width of the lowercase text against the uppercase text, the backup and Undo, and the Traditional Chinese label. The label and help text are translated in all nine interface languages, and the README paragraph on the spacing panel and the usage guide describe it.

## 1.24.1

The Workshop's glyph list now has its own heading, **Glyphs**. It reused the word for a character count, so the Traditional and Simplified Chinese interfaces showed a bare counting word where a title belongs. The new heading is translated in all nine interface languages.

The glyph settings buttons (Reset settings, the match-all button and Edit source) now sit together in one wrapping row under the sliders. Before this, Reset settings took a single grid cell, the match-all button stretched across the panel and Edit source sat alone below them.

Browser tests check the heading in English and Traditional Chinese, that the three buttons share one row at desktop width and that they stay inside the panel on a phone. Both fail on the previous release.

## 1.24.0

The Pages stage has a new **Download all pages (PDF)** button. It saves every template sheet in one PDF at the chosen paper size, A4 or US Letter. Before this you could print from a browser window, which phones often block, or save each sheet as an SVG that few programs print at the right size. The PDF holds each sheet as a 300 dpi picture, and no extra dependency was added.

A unit test checks the PDF structure, page size and cross reference table. Browser tests download the file for A4 and US Letter and check the page count, size and button translation. The two new labels are translated in all nine interface languages, and the README step for printing and the usage guide describe the button.

## 1.23.1

The live preview of an empty project no longer cuts its message off. On a phone, the "Load a sample or start with the characters you want to write" text was drawn with the line height of a full size specimen, so it was spread over tall lines and the last words were clipped. The message now uses its own small size and normal line height at every screen width, and the Preview zoom slider only changes real specimen text.

A browser test starts a new project at phone and desktop widths and checks that the message fits its box in a few lines. It fails on the previous release at phone width.

## 1.23.0

When scan conversion finishes, cells that held no ink are now named in the notice. Before this, the notice said only that the scans were converted, and a letter you forgot to write, a faint pen or a wrong page assignment left empty glyphs that you found one by one in the glyph list. The notice now reads "Scans converted. These cells had no ink, so they have no glyph yet." followed by the characters, cut to 24 with a count of the rest. Cells that need a simpler outline still report first, as before.

A unit test covers the character list and a browser test converts a sheet with one written cell out of three. The new message is translated in all nine interface languages, and the README step for converting scans mentions it in every language.

## 1.22.0

A project backup can now be dropped anywhere on the page to open it. While a `.glyphsprout.json` file is over the window, a dashed outline and a short message say it will be opened, and dropping it goes through the same check and the same replace confirmation as **Open project**. A broken file is refused with the usual message and the current project stays as it was. Before this, the only way to open a backup was the file chooser. The outline panel's contour count now reads "contours: 1" instead of "1 contours".

Browser tests cover a drop that is declined, a drop that is accepted, a broken file, the overlay message and its translation. The new message is translated in all nine interface languages, and the README paragraph on keeping your work mentions the drop in every language.

## 1.21.0

When the text typed into the live preview contains characters the project doesn't have, the preview now lists them under the text box and offers **Add these characters**. Before this, those letters showed in red and you had to go to Characters, work out what was missing and type it in. One click adds them after the existing characters, so the glyphs you already made keep their order and place, then opens Pages so you can print cells for the new characters. The same confirmation as in Characters appears first, because changing the characters clears scan page assignments. The text in the preview box is left as you typed it, and the button stays disabled while the Characters stage has an unapplied draft.

Unit tests cover the list of missing characters and the order after adding. Browser tests cover the offer, the confirmation, declining it, and the translated labels. The two new labels are translated in all nine interface languages, and the README step for the live preview mentions the button in every language.

## 1.20.0

Scans can now be added in two more ways. On the Pages stage you can drop JPEG or PNG images onto the scan section, which is outlined while a file is over it, and dropped files that are not JPEG or PNG are refused with a message. On phones and tablets a **Take a photo** button opens the camera directly, so a printed sheet can be photographed without leaving the page. Before this, the only way in was the file chooser, which on a phone buries the camera behind extra taps. Mouse screens show a short drop hint in place of the camera button.

Browser tests cover a real drop, the refusal of a non-image, the highlight, and the camera button on touch and mouse screens. The new labels are translated in all nine interface languages, and the README step for adding a scan mentions both in every language.

## 1.19.0

The outline view in the glyph editor now draws two dashed vertical guides, one at the glyph's left edge and one at its advance width, with a short note under the outline that says so. Before this, only the baseline was drawn, so the space on each side of a letter was something you had to judge from the live preview. The right guide follows the advance width setting, the Latin side bearing and the automatic width, so the gap between the outline and each line is the spacing the exported font will use.

A browser test checks that both guides are present, that the right guide moves when the advance width changes, and that the note is translated. The new note is translated in all nine interface languages, and the README step for reviewing glyphs mentions the guides in every language.

## 1.18.0

Every number setting in the glyph editor now has a slider beside it: ink threshold, minimum speck area, outline smoothing, stroke weight, size, both offsets and Latin side bearing. Before this, you typed a number and had to leave the field before anything changed, so tuning meant guessing a value and waiting. A slider applies when you release it, and the arrow keys apply on each press, so the outline and the live preview follow your hand. Pressing Enter in a number field now applies it too. Each applied change is still one undoable step. Advance width keeps only its number field because 0 means automatic.

A browser test drives a slider with the keyboard, checks that it stays in step with the number field and that Enter applies, and confirms the saved project values. Existing tests now match the number fields by their exact names. The new accessible name suffix is translated in all nine interface languages.

## 1.17.0

The glyph list in the Workshop now shows each glyph's own traced outline instead of the typed character. Before this, every tile looked the same in the system font, so you had to open each glyph to find one that was tiny, cut off or in the wrong place. The outline is scaled to fit the tile and the character stays in the tile's corner. Glyphs that are missing, or whose outline can't be built, still show the typed character. The tiles keep their accessible names, so screen readers and the arrow keys work as before.

Unit tests cover the outline path and the empty and invalid cases, and browser tests check the tiles for the sample and after clearing a glyph. No new interface text was needed.

## 1.16.0

The Characters stage now accepts Greek, Cyrillic and Korean Hangul. Before this, those letters were rejected as unsupported, so the Korean interface could not be used to make a Korean font and Greek or Russian text could not be set up at all. The quick-add row has three new buttons: **Greek** (49 letters), **Cyrillic** (the 66 letters of the Russian alphabet, including the letter io) and **Hangul letters** (the 51 basic jamo). Whole Hangul syllables can be typed or pasted directly. Adding every set at once still fits the 512 glyph limit.

Greek and Cyrillic glyphs use proportional spacing like Latin letters, and Hangul uses a fixed cell like Han and kana. Combining marks and the unassigned code points inside these blocks are still rejected. Unit tests cover the accepted ranges, the spacing rule and a TTF export with a Greek, a Cyrillic and a Hangul glyph, and a browser test covers the buttons. The new labels are translated in all nine interface languages.

## 1.15.0

Each glyph has a new **Stroke weight** setting from -3 to 3. It grows or shrinks the ink by whole source pixels before the outline is traced, so a font made with a thin pen can be made bolder and a heavy marker font can be lightened without redrawing. 0 keeps the traced width, and saved projects without the setting open at 0. The button that copies tracing values to every glyph now copies the weight too.

Ctrl+Z (Cmd+Z on a Mac) undoes the last project change and Ctrl+Shift+Z or Ctrl+Y redoes it. The shortcut stays out of the way while you type in a field or draw, so the browser's own undo still works there.

Unit tests cover growing, shrinking, the crop edge and old project files. Browser tests cover the setting, its range check, copying it to all glyphs and the shortcuts. The new label and button text are translated in all nine interface languages.

## 1.14.0

The live preview panel at the top of the page now has a **Download font (TTF)** button. Before this, the font download sat in the Font file panel at the bottom of the Workshop, so someone who opened the sample or finished a project had to scroll past the glyph editor to find the one thing they came for. The button saves the same TTF as the Font file panel. While any glyph is still missing, or a drawing is unsaved, it stays disabled and says why. Partial subsets and WOFF2 files remain in the Font file panel.

A browser test checks that the button is on the first screen, downloads a valid TrueType file and is disabled with an explanation once a glyph is cleared. The label is translated in all nine interface languages.

## 1.13.0

Converting a scan now evens out the lighting in each cell before it traces the ink. Before this, one fixed ink threshold was applied to the photo as it came, so a soft shadow, a darker corner or a dim phone photo could turn paper into solid ink and ruin the glyph. The paper level is now estimated across each cell and divided out, so evenly lit pages convert as before and shaded ones trace the strokes you drew.

The stored source image of a converted glyph is the evened version, so the threshold slider and Edit source behave the same as on a clean scan. Strong glare and deep shadows that hide the ink still need a better photo. Tests cover shaded, dim and solid-ink cells and a full conversion of a dim page in the browser.

## 1.12.0

The Workshop has a new button, **Use this threshold, speck filter and smoothing for all glyphs**. Tune the ink threshold, minimum speck area and outline smoothing on one glyph, press it, and every other glyph is traced again from its source pixels with the same values. Before this, a page scanned under dim light meant editing the same setting glyph by glyph.

It is one undoable step. Crop, size, offsets and spacing stay as they were, and changed glyphs become unreviewed. A glyph that can't be traced with the new values keeps its old outline and is named in a message. A browser test covers the copy and Undo, and the label is translated in all nine interface languages.

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
