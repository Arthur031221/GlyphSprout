import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".wasm": "application/wasm",
  ".ttf": "font/ttf",
  ".woff2": "font/woff2",
};

function inside(root, path) {
  const result = relative(root, path);
  return (
    result !== ".." && !result.startsWith(`..${sep}`) && !isAbsolute(result)
  );
}

export async function workshopServer(directory) {
  const root = await realpath(directory);
  return createServer(async (request, response) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Cache-Control", "no-cache");
    const fail = (status, message) => {
      response.writeHead(status, {
        "Content-Type": "text/plain; charset=utf-8",
      });
      response.end(request.method === "HEAD" ? undefined : message);
    };
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.setHeader("Allow", "GET, HEAD");
      fail(405, "Use GET or HEAD.");
      return;
    }
    let pathname;
    try {
      pathname = decodeURIComponent(
        new URL(request.url ?? "/", "http://localhost").pathname,
      );
      if (pathname.includes("\0")) throw new Error("Invalid path");
    } catch {
      fail(400, "Invalid URL.");
      return;
    }
    const requested = resolve(
      root,
      `.${pathname === "/" ? "/index.html" : pathname}`,
    );
    if (!inside(root, requested)) {
      fail(403, "Path outside the workshop.");
      return;
    }
    let file;
    let metadata;
    try {
      file = await realpath(requested);
      if (!inside(root, file)) {
        fail(403, "Path outside the workshop.");
        return;
      }
      metadata = await stat(file);
      if (!metadata.isFile()) {
        fail(404, "File not found.");
        return;
      }
    } catch {
      fail(404, "File not found.");
      return;
    }
    response.writeHead(200, {
      "Content-Type": contentTypes[extname(file)] ?? "application/octet-stream",
      "Content-Length": metadata.size,
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    const stream = createReadStream(file);
    stream.on("error", () => response.destroy());
    response.on("close", () => stream.destroy());
    stream.pipe(response);
  });
}
