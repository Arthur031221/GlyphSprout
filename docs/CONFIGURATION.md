# Configuration

## Local server

The packaged command serves the built app on `http://127.0.0.1:4173` by default. Set a different port with `--port` or an address with `--host`:

    npx --yes git+https://github.com/Arthur031221/GlyphSprout.git --port 4190 --host 127.0.0.1

Press Ctrl+C to close the server. The command serves local static files. It does not configure cloud hosting or synchronization.

## Project and scan limits

- Up to 512 distinct supported BMP characters per project.
- A small set of Latin, Greek, Cyrillic, Han, kana, and Hangul characters. Unsupported characters are reported during setup.
- 35 cells per A4 or US Letter page, with up to 15 pages.
- PNG or JPEG scan images up to 16 MiB each and 32 megapixels after decoding.
- Projects up to 96 MiB.
- Second versions: one per letter, counted in the 512 character limit. Han, kana and Hangul characters can't have one.
- Kerning: up to 500 pairs of letters from the project, each an adjustment from -300 to 300 font units (thousandths of the text size) other than 0.
- Font information: designer up to 100 characters, copyright notice 200, license text 400 and license URL 200, each on one line.

Use flat paper, dark ink, and even light. Keep all four registration marks visible. For every image, assign the printed page and confirm its visible page ID and alignment before conversion.

## Glyph controls

Each glyph has its own threshold, minimum speck area, stroke weight from -3 to 3 pixels, outline smoothing from 0 to 3, crop, scale, horizontal and vertical offsets, side bearing where applicable, and advance width. Crop values run from 0 to 1. Size is a multiplier, while offsets and spacing use font units. The **0 automatic** advance width uses the workshop's default spacing calculation.

## Appearance and language

The first visit opens in the first of your browser's languages that GlyphSprout has, and in English when none matches. Chinese follows the script or region: Traditional for Hant, Taiwan, Hong Kong and Macau, Simplified otherwise, and any Portuguese opens the Brazilian Portuguese interface. Once you pick a language it stays chosen. Choose light, dark, or system theme and one of nine interface languages: English, Traditional Chinese, Simplified Chinese, Japanese, Korean, Spanish, French, German, or Brazilian Portuguese. These settings affect the interface, not the character coverage of the exported font.

## Local storage and offline cache

The browser stores project recovery data in IndexedDB. Browser storage may be cleared, so use downloadable JSON backups. Offline use is available only after the complete app cache reports ready. A first visit needs a network connection. Offline cache does not imply cloud storage or synchronization.
