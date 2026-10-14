# GlyphSprout 1.6.0

Fonts made from scans used to follow the scan pixels exactly, so every curve and diagonal turned into small steps that showed at large sizes. GlyphSprout now smooths those steps when it traces a glyph.

**Outline smoothing** is a new setting for each glyph, from 0 to 3. New scans and drawn glyphs start at 2. It rounds the one pixel steps into straight segments and removes points that no longer change the shape, so outlines look cleaner and usually carry fewer points. Level 1 follows the pixels most closely, level 3 gives the fewest points, and 0 keeps the exact pixel outline. If smoothing would make two outlines cross, that glyph keeps its pixel outline.

Projects saved before 1.6.0 and the Paper Bloom sample stay at 0, so their exported fonts are unchanged. Change the setting on any glyph to smooth it, and use **Reset settings** to return to level 2.

All new text is available in the nine interface languages.

Try the [live workshop](https://Arthur031221.github.io/GlyphSprout/) or follow the [user guide](https://github.com/Arthur031221/GlyphSprout/blob/main/docs/USAGE.md). Smoothed outlines are straight segments, not fitted curves, and exports still have no kerning or connected script shaping.
