# Architecture

GlyphSprout is a browser application served from a local Node.js process. The Vite build bundles the interface and worker. The packaged command serves only the built `dist` files. Application work stays in the browser, with scan conversion delegated to a Web Worker.

## Workflow

1. Character analysis keeps distinct supported BMP characters and caps a project at 512.
2. The A4 SVG template assigns up to 35 characters to each page and prints four registration marks.
3. The user assigns a scan to a page and confirms its visible ID and four corners. A projective transform rectifies the page, then samples the registered cells.
4. Per-cell thresholding and speck filtering create a binary ink mask. Contour tracing preserves holes and detached components. A glyph retains its source cell so settings can retrace it.
5. Font metrics position each contour on a shared baseline. The font builder emits unhinted TTF. The WOFF2 path encodes the same generated font. The live preview loads the generated font itself.

The drawing canvas is an alternative source for a glyph. Scan and drawing inputs are independent per-character artwork. The project does not attempt OCR or automatic cell detection.

## Persistence and isolation

Project metadata, source images, and recovery revisions are kept in browser IndexedDB. The application stores the current and previous revision and detects when another tab has written a newer sequence. Users can import or download a portable project JSON file. The service worker caches the complete built app and reports readiness. It does not upload or synchronize application data.

If no stored revision can be validated, recovery reports failure and saves are refused. The raw database can be downloaded before an explicitly confirmed reset. Every write receives a fresh random token. Saves, archive downloads and resets compare the sequence and token so a stale tab cannot overwrite a different generation, even after browser storage is recreated. Resetting keeps an empty head marker and advances the sequence. A reset checks the version in the same write transaction so it cannot erase a newer save from another tab. Character layout changes receive a new project ID, which is also the printed sheet identifier.

## Main modules

- `src/core/text.ts`, `template.ts`, and `geometry.ts`: character validation, A4 page layout, registration, and rectification.
- `src/core/trace.ts`: thresholding, speck removal, and contour tracing.
- `src/core/smooth.ts`: corner cutting, point simplification and the crossing check that guards smoothed outlines.
- `src/core/font.ts`: outline metrics and TTF/WOFF2 generation.
- `src/core/project.ts` and `storage.ts`: project validation, import/export, assets, and recovery.
- `src/worker/`: worker protocol and scan processing.
- `src/ui/`: workshop, scan review, drawing, settings, and translations.
- `bin/`: local static server and command-line entry point.

GlyphSprout is not a published TypeScript SDK. The source modules describe the implementation, not a supported external API.
