[Traditional Chinese](README.zh-TW.md) | [Simplified Chinese](README.zh-CN.md) | [Japanese](README.ja.md) | [Korean](README.ko.md) | [Spanish](README.es.md) | [French](README.fr.md) | [German](README.de.md) | [Brazilian Portuguese](README.pt-BR.md)

# GlyphSprout

Turn handwriting templates into editable Latin, Han and kana font subsets.

**Six handwritten letters. A 3.3 kB font.**

The bundled Paper Bloom sample exports a 3,284 byte TTF checked with Fontconfig and LibreOffice. That size is for six letters. [Method and reproducible export](docs/VALIDATION.md).

[Open the live workshop](https://Arthur031221.github.io/GlyphSprout/) | [User guide](docs/USAGE.md) | [![MIT license](https://img.shields.io/badge/license-MIT-315d4e?style=flat-square)](LICENSE)

```sh
npx --yes git+https://github.com/Arthur031221/GlyphSprout.git
```

You'll need Node.js 22.12 or newer and Git. Open `http://127.0.0.1:4173` after the command prints its ready message.

| Before | After |
| --- | --- |
| Six handwriting crops | A font you can type with, with editable outlines and spacing |

![Real workshop: handwriting preview, a glyph size edit and TTF download](assets/demo.gif)

I built this for the characters a small project actually uses.

## Your first font

Your first visit loads Paper Bloom with six real handwriting letters. You can edit a letter or download the font right away. To make your own:

```text
1. Start a new project named Weekend and choose the text Hello!.
2. Print the A4 template at actual size and write one character per cell.
3. Add a flat PNG or JPEG scan and assign its printed page number.
4. Adjust the four corners, confirm alignment, convert and review the glyphs.
5. Type Hello! in the specimen and download TTF or WOFF2.
```

The workshop has source and outline views, threshold and speck filtering, cropping, scale, offsets and spacing controls. You can draw or erase a glyph, too. Before saving, it rejects blank drawings and transformed outlines that collapse or exceed safe font bounds. Leaving settings unchanged keeps review state and edit history. Export waits for pending edits and uses the latest project snapshot. Corner handles work with mouse and touch. The live specimen uses the generated font itself. Drawing undo and project undo are separate.

## A small subset, with clear limits

Choose up to 512 supported BMP characters, with 35 cells per A4 sheet and at most 15 sheets. Latin glyphs use proportional spacing by default. Han and kana use a fixed cell advance. The interface has nine languages, light and dark themes, and a layout for narrow screens.

Scans need the printed template, dark ink, flat paper, even lighting and all four registration marks. You assign and confirm pages manually. The tool doesn't read handwritten text or identify cells automatically.

Exports contain simple unhinted outlines. There's no kerning, curve smoothing, connected script shaping or full language coverage. The Han and kana example uses original synthetic strokes and is labelled accordingly.

## Keep your work

Project data stays in your browser. The app has no project upload or remote analytics. Download a `.glyphsprout.json` backup before closing important work. IndexedDB keeps the latest and previous saved revisions, checks stored image hashes, and warns when another tab has saved a newer revision.

You can use the app offline after the footer says **Ready for offline use**. The complete app, worker and WOFF2 encoder are cached. The first visit needs a connection. Clearing browser storage can remove both recovery data and the cache.

## Install the font you made

Use TTF for desktop font installation. These host instructions don't promise that every application supports the font. Restart applications when needed.

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

Copy the TTF to your user's font directory and refresh its cache. On systems using the usual XDG data directory:

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

Paper Bloom contains six letter crops from public domain [NIST SD19 form f1002_33](https://commons.wikimedia.org/wiki/File:NIST_SD-19_f1002_33.png). The complete identifying form is excluded. The [validation guide](docs/VALIDATION.md) documents the [official dataset page](https://www.nist.gov/srd/nist-special-database-19), crop coordinates and pinned source checksum.

The exported sample was opened in LibreOffice and saved as a PDF with its font embedded and text preserved. Browser downloads in both formats were parsed with FontTools and rendered with FreeType. Reference fixtures cover counters, detached dots, a descender and Han strokes at three raster sizes. See the guide for the method, exclusions and commands.

## Documentation and development

- [Installation and command options](docs/INSTALLATION.md)
- [Usage](docs/USAGE.md)
- [Configuration and limits](docs/CONFIGURATION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Validation](docs/VALIDATION.md)
- [Contributing](CONTRIBUTING.md)

GlyphSprout is available under the [MIT License](LICENSE). [Third party notices](THIRD_PARTY_NOTICES.md) lists included dependencies and sample provenance.

Assisted by Claude/Codex.
