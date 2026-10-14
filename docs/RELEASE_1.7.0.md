# GlyphSprout 1.7.0

Aligning a scan used to mean dragging all four page corners onto the printed crosses, page after page. GlyphSprout now looks for those crosses when you add a scan and places the corners on them.

The search starts where a page-filling scan would show the crosses and covers a wide area around them, so it also works when the page doesn't fill the image, when the sheet is shifted, or when a photo is slightly rotated. A note above the corner fields tells you the corners were found automatically. If a cross is hidden or too faint, the corners start at the proportional guess as before. Check each corner and confirm the page, as always.

Images with a long side over 4096 pixels are now scaled down when you add them. Large phone photos no longer run into the canvas size limit of some mobile browsers.

Screen readers no longer announce the whole specimen after every keystroke. The README shows the demo before the install command.

The new note is available in the nine interface languages.

Try the [live workshop](https://Arthur031221.github.io/GlyphSprout/) or follow the [user guide](https://github.com/Arthur031221/GlyphSprout/blob/main/docs/USAGE.md). Detection only finds the printed crosses. It doesn't correct perspective, read handwriting or find cells.
