# GlyphSprout 1.3.1

Marking a glyph reviewed now waits for pending ink and crop adjustments. Those adjustments remain in the project and its undo history. Failed or canceled adjustments leave the review state unchanged.

A noisy scan cell no longer rejects the entire conversion when its outlines exceed export limits. Its source stays available for repair, the warning lists the affected characters, and the other cells still convert. Adjust the speck filter, crop or source in Workshop, then review the repaired glyph. All nine interface languages include the warning.

Separate projects and family names with the same ASCII form now receive distinct internal font names. This includes non Latin family names. Displayed family names stay intact, and rebuilding the same project preserves its identity.

The sample measurements, translated guides, social card and [demo recording](https://github.com/Arthur031221/GlyphSprout/blob/main/assets/demo.gif) have been refreshed.

Try the [live workshop](https://Arthur031221.github.io/GlyphSprout/) or follow the [user guide](https://github.com/Arthur031221/GlyphSprout/blob/main/docs/USAGE.md). Exported fonts remain simple unhinted outlines without kerning or connected script shaping.
