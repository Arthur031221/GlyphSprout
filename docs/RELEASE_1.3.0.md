# GlyphSprout 1.3.0

Stopping scan conversion keeps the uploaded scans and their alignment. Corner positions, page assignments, confirmations and the selected page remain available for another attempt. Discarding staged scans is a separate action.

The source editor supports zoom from 100 to 800 percent, drag panning, scrollbars and arrow key navigation. Pen and eraser sizes are measured in source pixels and kept separately. Changing zoom preserves the native image and stroke width. Fit image returns to 100 percent.

Zooming and panning leave source pixels and drawing history intact. Applying source edits still preserves glyph settings and page assignment. Staged scans and unfinished drawings remain outside saved project recovery and downloads.

All nine interface languages include the new controls. The recorded demo shows magnified source corrections and scan alignment.

Run the released workshop with Node.js 22.12 or newer:

```sh
npx --yes git+https://github.com/Arthur031221/GlyphSprout.git#v1.3.0
```
