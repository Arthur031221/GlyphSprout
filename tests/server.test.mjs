import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { workshopServer } from "../bin/server.mjs";

test("local server serves workshop files and keeps the package private", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "glyphsprout-server-"));
  const directory = join(temporary, "dist");
  await mkdir(directory);
  await writeFile(join(directory, "index.html"), "<p>Workshop</p>");
  await writeFile(join(directory, "worker.js"), "self.onmessage = () => {};");
  await writeFile(
    join(directory, "woff2.wasm"),
    new Uint8Array([0, 97, 115, 109]),
  );
  await writeFile(join(temporary, "private.json"), "private");
  await symlink(
    join(temporary, "private.json"),
    join(directory, "linked.json"),
  );
  const server = await workshopServer(directory);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const get = (path, method = "GET") =>
    new Promise((resolve, reject) => {
      const outgoing = request(
        { hostname: "127.0.0.1", port: address.port, path, method },
        (incoming) => {
          let body = "";
          incoming.setEncoding("utf8");
          incoming.on("data", (chunk) => {
            body += chunk;
          });
          incoming.on("end", () =>
            resolve({
              status: incoming.statusCode,
              headers: incoming.headers,
              body,
            }),
          );
        },
      );
      outgoing.on("error", reject);
      outgoing.end();
    });
  try {
    const index = await get("/?cache=1");
    assert.equal(index.status, 200);
    assert.equal(index.body, "<p>Workshop</p>");
    assert.equal(index.headers["x-content-type-options"], "nosniff");
    const head = await get("/", "HEAD");
    assert.equal(head.status, 200);
    assert.equal(head.body, "");
    assert.equal(head.headers["content-length"], "15");
    assert.equal(
      (await get("/worker.js")).headers["content-type"],
      "text/javascript; charset=utf-8",
    );
    assert.equal(
      (await get("/woff2.wasm")).headers["content-type"],
      "application/wasm",
    );
    assert.equal((await get("/missing.js")).status, 404);
    assert.equal((await get("/%E0%A4%A")).status, 400);
    assert.equal((await get("/%00")).status, 400);
    assert.equal((await get("/..%2fprivate.json")).status, 403);
    assert.equal((await get("/linked.json")).status, 403);
    const post = await get("/", "POST");
    assert.equal(post.status, 405);
    assert.equal(post.headers.allow, "GET, HEAD");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(temporary, { recursive: true, force: true });
  }
});
