# Installation

## Run from Git with Node.js

The local workshop requires Node.js 22.12 or newer and Git. Run:

    npx --yes git+https://github.com/Arthur031221/GlyphSprout.git

This starts a server at `http://127.0.0.1:4173`. Keep the terminal open while using the workshop. Press Ctrl+C to stop it. The command uses the project's Git repository. GlyphSprout is not published to the npm registry.

Choose another port or bind address with:

    npx --yes git+https://github.com/Arthur031221/GlyphSprout.git --port 4190 --host 127.0.0.1

Open the printed loopback address on the same machine. Font generation and saving require a secure browser context: HTTPS or a loopback address such as `localhost` or `127.0.0.1`. A plain HTTP LAN address does not work. To serve another device, put the static app behind an HTTPS reverse proxy with a certificate trusted by that device. Project storage belongs to each browser and is not shared.

## Run a checkout

Install Node.js 22.12 or newer and Git, clone the repository, then run:

    npm ci
    npm run build
    npm start

The server serves the generated `dist` directory. `npm run dev` starts Vite for development. It is not the packaged one-command server.

## Browser and offline use

Use a current browser with JavaScript, Web Workers, IndexedDB, and service worker support. The first visit needs a network connection. Wait until the application reports **Ready for offline use** before disconnecting. Offline support is limited to the cached application files. Browser storage may still be cleared by the browser or the user. Download project JSON backups to portable storage.
