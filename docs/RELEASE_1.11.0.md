# GlyphSprout 1.11.0

The Workshop has a new **Kerning** panel. Pick two letters that sit next to each other, such as A and V, enter how much closer or further apart they should be, and the live specimen shows the change. Values run from -300 to 300 thousandths of the text size, a negative number brings the letters closer, and a project can hold up to 500 pairs.

The pairs are written into both the TTF and the WOFF2 as a plain `kern` table, so browsers, FreeType and most word processors apply them. They are saved in project backups, follow Undo and Redo, and are dropped when you remove one of their letters from the character list. The panel is available in the nine interface languages.

Try the [live workshop](https://Arthur031221.github.io/GlyphSprout/) or follow the [user guide](https://github.com/Arthur031221/GlyphSprout/blob/main/docs/USAGE.md).
