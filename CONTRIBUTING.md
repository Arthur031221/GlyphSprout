# Contributing

Thanks for helping improve GlyphSprout. The project is a small browser workshop for editable Latin, Han, and kana font subsets. Keep changes aligned with that scope and make limits clear in interface copy.

## Set up

- Use Node.js 22.12 or newer and Git.
- Install the checkout's dependencies with `npm install`.
- Start the development server with `npm run dev`.
- Run `npm run lint` and `npm test` before opening a change. Font fixture validation also needs the optional Python dependencies in `requirements-fonts.txt`.

Keep browser processing local. Do not add application-data uploads, remote analytics, cloud sync, or unsupported platform promises. Preserve sample provenance and third-party notices when changing bundled assets or dependencies. Avoid checking in scans that show identifying details.

For a behavior change, describe the visible effect and any known limitation. For a bug report, include browser and operating-system versions, reproduction steps, and a minimal project or scan only when it is safe to share.

## Required checks

```sh
npm ci
npm run lint
npm test
npm run build
npx playwright install chromium firefox
npm run test:e2e
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-fonts.txt
npm run test:fonts
```

Format TypeScript, JavaScript, CSS and JSON with Biome. Format Python with Black. Keep behavior checks tied to the bug or feature. The native font tests use FontTools and FreeType so a broken export cannot pass merely because the app accepts its own output.
