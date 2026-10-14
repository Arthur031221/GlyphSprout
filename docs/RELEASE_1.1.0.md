# GlyphSprout 1.1.0

Make a small font from the handwriting your project uses. The workshop now lets you refine scanned source pixels directly, then review the resulting glyph in the live specimen before downloading a font.

[Open the live workshop](https://Arthur031221.github.io/GlyphSprout/) | [Read the user guide](https://github.com/Arthur031221/GlyphSprout/blob/main/docs/USAGE.md)

## Source editing

Edit source opens the current native pixels for a scanned glyph. Use the pen, eraser, and local undo to make a correction while keeping its threshold, crop, size, offsets, spacing, and template page ID. Empty ink is rejected. Changed source is marked unreviewed, while an unchanged edit leaves project history unchanged. Draw a glyph still starts blank, replaces the selected glyph, and resets its settings.

The editor ignores secondary touches, stops a stroke when pointer capture is lost, and restores keyboard focus after applying or cancelling.

## Project and template handling

Project backups wait for pending settings and include their latest values. Restoring a project sets the specimen to that project's text. Changes to whitespace, duplicate characters, or Unicode normalization preserve template IDs and scans when the ordered character list is unchanged. A character or order change still requires fresh sheets.

Template actions fit narrow screens across all nine interface languages. Primary actions remain readable when the System theme uses dark mode.

## Install

Requires Node.js 22.12 or newer and Git:

```sh
npx --yes git+https://github.com/Arthur031221/GlyphSprout.git#v1.1.0
```

The bundled Paper Bloom sample remains a six-letter example. Its TTF is 3,284 bytes, or 3.3 kB in decimal units. See [validation and provenance](https://github.com/Arthur031221/GlyphSprout/blob/main/docs/VALIDATION.md) for the measurement and sample source.
