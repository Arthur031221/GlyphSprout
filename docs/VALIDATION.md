# Validation and sample provenance

## What the headline measures

The bundled Paper Bloom project has six letters: H, E, L, O, J and B. Its TTF is 3,284 bytes, or 3.3 kB using decimal units. This is one small sample, not a prediction for a 512 character font. Regenerate both formats from the committed project:

```sh
npm ci
npm run export:sample
fc-scan artifacts/paper-bloom/PaperBloom.ttf
```

The script writes TTF and WOFF2 files to `artifacts/paper-bloom`. WOFF2 size can differ when project timestamps change. The headline measures the TTF. [Recorded results](validation/paper-bloom.json).

## A real desktop application

I opened the generated TTF in LibreOffice Writer 24.2.7.2 on Linux and exported a document containing `HELLO JOB` to PDF. Poppler's `pdffonts` reported an embedded TrueType font named PaperBloom. `pdftotext` preserved the exact text. The [resulting PDF](validation/paper-bloom.pdf) contains the embedded font and can be checked directly:

```sh
pdffonts docs/validation/paper-bloom.pdf
pdftotext docs/validation/paper-bloom.pdf -
```

This verifies that export path in that application. It is not a general desktop compatibility claim.

## Independent font and source checks

The browser's production workshop exported both TTF and WOFF2. FontTools parsed the files and confirmed the character map and matching contours and metrics. FreeType rendered their six letters at 20, 50 and 100 pixels with matching bitmaps between formats.

The repeatable fixture suite uses six defined patterns: O, g, i, a Han horizontal stroke, a Han box with a middle stroke, and 8. FontTools checks tables, bounds, counters, spacing and the descender. FreeType rasterizes both formats at 100, 200 and 1,000 pixels and compares source pixel classifications. At 100 pixels, antialias values from 127 through 129 are excluded because they sit at the classification boundary.

A separate handwriting check compares both exported formats against the actual grayscale PNG crops, thresholded at the sample's setting. It renders at 288, 720 and 1,440 pixels, giving at least two raster pixels per source pixel. This avoids treating antialias coverage at a fractional pixel boundary as a geometry error. It makes no half gray exclusions. The two checks cover 72 glyph renders in total.

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-fonts.txt
npm run test:fonts
```

The command creates the fixture and sample exports before checking them. These tests verify outline preservation and export behavior. They do not measure handwriting recognition.

## Handwriting source and regeneration

The six Paper Bloom letters come from public domain NIST SD19 form f1002_33. [Wikimedia Commons records the scan and its public domain status](https://commons.wikimedia.org/wiki/File:NIST_SD-19_f1002_33.png). [NIST describes the dataset](https://www.nist.gov/srd/nist-special-database-19). Only letter crops are distributed, never the complete identifying form.

`scripts/prepare_samples.py` records the source SHA256 and crop rectangles. The six letters are placed into clean template cells. The example sheet is an assembled demonstration, not an untouched photograph of a filled GlyphSprout template.

```sh
.venv/bin/python scripts/prepare_samples.py
npx tsx scripts/prepare-samples.ts
```

The second command also rasterizes the committed SVG fixtures using Chromium. Install the browser first with `npx playwright install chromium`. The Han and kana sample uses original scripted geometric strokes. It is labelled synthetic in the interface and is not real handwriting.

## Media

The GIF records the real production workshop, an edit to a scanned source using the eraser and pen, the updated specimen, and a TTF download. With Chromium and ffmpeg installed, regenerate it using:

```sh
npm run build
npm run demo
```

The social card is rendered from `assets/social-card.html` and uses the actual generated sample font.

## Licenses

Dependency notices are in [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md). The built site includes the full WOFF2, Brotli and fonteditor-core licenses and Vite's generated bundled dependency notices.
