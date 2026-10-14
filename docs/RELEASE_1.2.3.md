# GlyphSprout 1.2.3

Scan alignment stays responsive while the corrected preview updates. The preview decodes each scan once in a browser worker and uses the latest corner positions when edits arrive during processing. It also works after the workshop has been cached for offline use.

Corner handles now provide touch targets at least 48 pixels wide as the scan scales down on a phone. Keyboard controls and numeric corner fields remain available. The outline baseline stays visible when glyphs are scaled or moved vertically.

All nine interface languages include the preview status message. The demo shows scan alignment and the updated corrected preview.

Run the released workshop with Node.js 22.12 or newer:

```sh
npx --yes git+https://github.com/Arthur031221/GlyphSprout.git#v1.2.3
```
