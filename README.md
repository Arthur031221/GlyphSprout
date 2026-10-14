[Traditional Chinese](README.zh-TW.md) | [Simplified Chinese](README.zh-CN.md) | [Japanese](README.ja.md) | [Korean](README.ko.md) | [Spanish](README.es.md) | [French](README.fr.md) | [German](README.de.md) | [Brazilian Portuguese](README.pt-BR.md)

# GlyphSprout

Make a small font for your project's words and names. Print a template, write each character, check the scanned outlines, and export a font you can type with.

**Six handwritten letters. A 3.3 kB font.**

The bundled Paper Bloom sample exports a 3,284 byte TTF checked with Fontconfig and LibreOffice. Six letters in all. [Method and reproducible export](docs/VALIDATION.md).

[Open the live workshop](https://Arthur031221.github.io/GlyphSprout/) | [User guide](docs/USAGE.md) | [![MIT license](https://img.shields.io/badge/license-MIT-315d4e?style=flat-square)](LICENSE)

```sh
npx --yes git+https://github.com/Arthur031221/GlyphSprout.git#v1.2.1
```

You'll need Node.js 22.12 or newer and Git. Once the command prints its ready message, open `http://127.0.0.1:4173`.

| Start with | Make |
| --- | --- |
| Your own handwriting on a printed sheet | A small font with editable source pixels, outlines and spacing |

![Real workshop: erasing and correcting a scanned glyph, the live specimen and TTF download](assets/demo.gif)

## Make your first font

1. Start a project and choose the characters you need, such as `Hello!`.
2. Print its A4 template at actual size and write one character in each cell.
3. Add an evenly lit scan, confirm the page ID and align its four corners.
4. Click **Convert scans** and wait for conversion to finish.
5. Review each glyph. Adjust the source, threshold, crop, size, offsets and spacing.
6. Type your text in the live specimen and download TTF or WOFF2.

Edit source keeps the current native pixels so you can erase, draw and undo local strokes. The glyph's settings and page assignment stay intact. Review any changed sources. Draw a glyph starts blank and replaces the glyph, resetting its settings. Empty drawings are rejected. If you leave the source unchanged, project history stays untouched.

Font name and character text in Characters stay as drafts while you move between stages. Choose **Project ready** to apply them. Until then, backups and font downloads keep the applied values. Reloading loses unapplied setup changes.

## A small subset with clear limits

Choose up to 512 supported BMP characters. Each A4 template has 35 cells, and a project can use up to 15 pages. Latin glyphs use proportional spacing by default. Han and kana use a fixed cell advance. The interface has nine languages, light and dark themes, and a narrow-screen layout.

Scans need the printed template, dark ink, flat paper, even lighting, and all four registration marks. You assign and confirm pages manually. GlyphSprout doesn't read handwriting or detect cells automatically.

Exports contain simple unhinted outlines. They don't include kerning, curve simplification, connected-script shaping, or full language coverage. The Han and kana sample uses original synthetic strokes and is labeled that way.

## Keep your work

Project data stays in your browser. The app has no project upload or remote analytics. Download a `.glyphsprout.json` backup before closing important work. IndexedDB keeps the latest and previous saved revisions, checks stored image hashes, and warns if another tab has saved a newer revision.

You can use the app offline once the footer says **Ready for offline use**. The full app, worker and WOFF2 encoder are cached. Your first visit needs a connection. Clearing browser storage can remove both recovery data and the cache.

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

The exported sample was opened in LibreOffice and saved as a PDF with its font embedded and text preserved. Browser downloads in both formats were parsed with FontTools and rendered with FreeType. Reference fixtures cover counters, detached dots, a descender and Han strokes at three raster sizes. The guide includes the method, exclusions and commands.

## Documentation and development

- [Installation and command options](docs/INSTALLATION.md)
- [Usage](docs/USAGE.md)
- [Configuration and limits](docs/CONFIGURATION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Validation](docs/VALIDATION.md)
- [Contributing](CONTRIBUTING.md)

GlyphSprout is available under the [MIT License](LICENSE). [Third party notices](THIRD_PARTY_NOTICES.md) lists included dependencies and sample provenance.

Assisted by Claude/Codex.
