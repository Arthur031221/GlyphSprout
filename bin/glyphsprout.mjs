#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { workshopServer } from "./server.mjs";

const args = process.argv.slice(2);
let port = 4173;
let host = "127.0.0.1";
let help = false;
try {
  for (let index = 0; index < args.length; index++) {
    const option = args[index];
    if (option === "--help" || option === "-h") help = true;
    else if (option === "--port") {
      const value = args[++index];
      if (!value || !/^\d+$/.test(value))
        throw new Error("--port needs a number.");
      port = Number(value);
      if (port < 1 || port > 65535)
        throw new Error("--port must be between 1 and 65535.");
    } else if (option === "--host") {
      host = args[++index];
      if (!host) throw new Error("--host needs an address.");
    } else throw new Error(`Unknown option: ${option}`);
  }
  if (help) {
    console.log(
      "GlyphSprout: a local handwriting font workshop.\n\nUsage: glyphsprout [--port 4173] [--host 127.0.0.1]",
    );
  } else {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), "../dist");
    const server = await workshopServer(root);
    server.on("error", (error) => {
      console.error(`Cannot start GlyphSprout: ${error.message}`);
      process.exitCode = 1;
    });
    server.listen(port, host, () => {
      const displayHost = host.includes(":") ? `[${host}]` : host;
      console.log(`GlyphSprout is ready at http://${displayHost}:${port}`);
      console.log("Press Ctrl+C to close the workshop.");
    });
    const stop = () => {
      server.close();
      server.closeAllConnections();
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
