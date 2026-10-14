[Traditional Chinese](README.zh-TW.md) | [Simplified Chinese](README.zh-CN.md) | [Japanese](README.ja.md) | [Korean](README.ko.md) | [Spanish](README.es.md) | [French](README.fr.md) | [German](README.de.md) | [Brazilian Portuguese](README.pt-BR.md)

# GlyphSprout

Make a small font for your project's words and names. Print a template, write each character, check the scanned outlines, and export a font you can type with.

**Six handwritten letters. A 3.4 kB font.**

The bundled Paper Bloom sample exports a 3,360 byte TTF checked with Fontconfig and FreeType. It has six letters. [Method and reproducible export](docs/VALIDATION.md).

[Open the live workshop](https://Arthur031221.github.io/GlyphSprout/) | [User guide](docs/USAGE.md) | [![MIT license](https://img.shields.io/badge/license-MIT-315d4e?style=flat-square)](LICENSE)

![Real workshop: erasing and correcting a scanned glyph, the live specimen and TTF download](assets/demo.gif)

```sh
npx --yes git+https://github.com/Arthur031221/GlyphSprout.git#v1.13.0
```

You'll need Node.js 22.12 or newer and Git. When the command prints its ready message, open `http://127.0.0.1:4173`.

| Start with | Make |
| --- | --- |
| Your own handwriting on a printed sheet | A small font with editable source pixels, outlines and spacing |

## Make your first font

1. Start a project and choose the characters you need, such as `Hello!`. Add whole sets like uppercase letters, digits, punctuation, accented letters, hiragana or katakana with one click.
2. Print the template at actual size on A4 or US Letter paper and write one character in each cell.
3. Add an evenly lit scan and confirm the page ID. GlyphSprout looks for the four registration crosses and snaps the corners to them. Check each corner and fix any that are off.
4. Click **Convert scans** and wait for it to finish.
5. Review each glyph. Adjust the source, threshold, outline smoothing, crop, size, offsets and spacing.
6. Type your text in the live specimen and download TTF or WOFF2.

Edit source keeps the current native pixels, so you can erase, draw and undo local strokes. The glyph's settings and page assignment stay as they were. Review any sources you changed. Draw a glyph starts blank and replaces the glyph, which resets its settings. Empty drawings are rejected. If you leave the source unchanged, project history isn't touched.

Zoom in to fix small details. Pen and eraser sizes use source pixels, so zooming doesn't change the stroke width. Pan the image with the Pan tool, scrollbars or arrow keys. If you stop scan conversion, the scans, corner positions and page confirmations stay put and you can retry. Choose **Discard staged scans** to remove them.

Mark reviewed waits for pending ink and crop adjustments. If a scan cell has too many points or contours to export, conversion keeps its source and names the character. Other cells still convert. Adjust the speck filter, crop or source, then review the repaired glyph.

Once one glyph looks right, **Use this threshold, speck filter and smoothing for all glyphs** traces every other glyph again with the same values. Review progress shows beside the glyph list. **Next to review** jumps to the next glyph you haven't checked, and the arrow keys move between glyphs. The spacing panel sets the word space for the whole font and can copy one glyph's Latin side bearing to every Latin letter. The **Kerning** panel pulls a pair such as A and V closer or pushes it apart, and the live specimen shows the change. **Download specimen image** saves your preview text as a PNG. **Copy web font CSS** puts an `@font-face` rule on your clipboard so you can use the downloaded files on a website. **Preview zoom** resizes the live specimen. The **Font information** panel records a designer, copyright notice and license in the exported font, and can fill in the SIL Open Font License with one click.

Font name and character text in Characters stay as drafts while you move between stages. Choose **Project ready** to apply them. Until then, backups and font downloads use the applied values. Reloading loses unapplied setup changes.

## A small subset with clear limits

Choose up to 512 supported BMP characters. Each A4 template has 35 cells, and a project can use up to 15 pages. Latin glyphs use proportional spacing by default. Han and kana use a fixed cell advance. The interface comes in nine languages, with light and dark themes and a narrow-screen layout.

Scans need the printed template, dark ink, flat paper, even lighting, and all four registration marks. Conversion evens out soft shadows and dim light across each cell, but glare and deep shadows still need a better photo. You assign and confirm pages by hand. GlyphSprout doesn't read handwriting or detect cells automatically.

Exports contain simple unhinted outlines. Outline smoothing rounds the pixel steps of new traces into straight diagonal segments. Choose 0 to keep the exact pixel outline. Kerning is set one pair at a time, up to 500 pairs, and exported as a plain `kern` table. There's no curve fitting, connected-script shaping, or full language coverage. The Han and kana sample uses original synthetic strokes and is labeled that way.

## Keep your work

Project data stays in your browser. The app has no project upload or remote analytics. Download a `.glyphsprout.json` backup before you close important work. IndexedDB keeps the latest and previous saved revisions, checks stored image hashes, and warns you if another tab has saved a newer revision.

Once the footer says **Ready for offline use**, the app works offline. The full app, worker and WOFF2 encoder are cached. Your first visit needs a connection. Clearing browser storage can remove both recovery data and the cache.

## Install the font you made

Use TTF to install the font on your desktop. These host instructions don't guarantee font support in every application. Restart applications as needed.

<details>
<summary>macOS</summary>

Double click the downloaded TTF in Finder, then choose **Install** in Font Book. [Apple's Font Book guide](https://support.apple.com/guide/font-book/install-and-validate-fonts-fntbk1000/mac).

</details>

<details>
<summary>Windows</summary>

Right click the downloaded TTF and choose **Install**. You can also manage installed fonts in Settings. [Microsoft's font guide](https://support.microsoft.com/en-us/windows/experience/personalization/manage-fonts-in-windows).

</details>

<details>
<summary>Linux with Fontconfig</summary>

Copy the TTF to your user's font directory and refresh its cache. If your system uses the usual XDG data directory:

```sh
mkdir -p ~/.local/share/fonts
cp Weekend.ttf ~/.local/share/fonts/
fc-cache -f ~/.local/share/fonts
```

Use your configured font directory if it differs. [Fontconfig configuration guide](https://fontconfig.pages.freedesktop.org/fontconfig/fontconfig-user.html).

</details>

<details>
<summary>Web pages</summary>

Download WOFF2 and load it with `@font-face`. The font contains only the characters you exported:

```css
@font-face {
  font-family: "Weekend";
  src: url("Weekend.woff2") format("woff2");
}
```

</details>

## Validation and provenance

Paper Bloom contains six letter crops from public domain [NIST SD19 form f1002_33](https://commons.wikimedia.org/wiki/File:NIST_SD-19_f1002_33.png). The complete identifying form isn't included. The [validation guide](docs/VALIDATION.md) records the [official dataset page](https://www.nist.gov/srd/nist-special-database-19), crop coordinates and pinned source checksum.

The 1.3.0 sample export was opened in LibreOffice and saved as a PDF with its font embedded and text preserved. Version 1.3.1 changes only the internal font names. Browser downloads in both formats were parsed with FontTools and rendered with FreeType. Reference fixtures cover counters, detached dots, a descender and Han strokes at three raster sizes. The guide has the method, exclusions and commands.

## Documentation and development

- [Installation and command options](docs/INSTALLATION.md)
- [Usage](docs/USAGE.md)
- [Configuration and limits](docs/CONFIGURATION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Validation](docs/VALIDATION.md)
- [Contributing](CONTRIBUTING.md)

GlyphSprout is available under the [MIT License](LICENSE). [Third party notices](THIRD_PARTY_NOTICES.md) lists included dependencies and sample provenance.

Assisted by Claude/Codex.
