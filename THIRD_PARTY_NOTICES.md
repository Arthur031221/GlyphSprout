# Third-party notices

GlyphSprout is distributed under the MIT License in `LICENSE`. The application bundles or uses these third-party components:

| Component | Version | License | Use |
| --- | --- | --- | --- |
| React | 19.3.0 | MIT | User interface |
| React DOM | 19.3.0 | MIT | Browser rendering |
| Scheduler | 0.28.0 | MIT | React scheduling dependency |
| Phosphor Icons for React | 2.1.10 | MIT | Interface icons |
| fonteditor-core | 2.6.3 | MIT | TrueType font generation and WOFF2 encoding |
| @xmldom/xmldom | 0.8.15 | MIT | fonteditor-core dependency |
| Brotli | bundled with the WOFF2 implementation | MIT | WOFF2 compression support |
| WOFF2 reference implementation | bundled with the WOFF2 implementation | MIT | WOFF2 compression support |

The full notices shipped with the WOFF2 implementation are in `public/licenses/brotli-LICENSE.txt`, `public/licenses/woff2-LICENSE.txt`, and `public/licenses/fonteditor-core-LICENSE.txt`. The upstream license files are included with their corresponding packages. Development-only tooling has additional dependencies. See `package-lock.json` for the pinned dependency tree.

The Paper Bloom sample contains six cropped handwritten letters from the public-domain NIST Special Database 19 form f1002_33. Source and crop regeneration details are in the README and `docs/VALIDATION.md`. No full identifying form is distributed. The Han and kana sample is original synthetic geometry, not handwriting.
