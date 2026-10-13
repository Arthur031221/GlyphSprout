import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import type { Plugin } from "vite";

export function offlinePlugin(): Plugin {
  let directory = "dist";
  return {
    name: "glyphsprout-offline",
    apply: "build",
    configResolved(config) {
      directory = config.build.outDir;
    },
    async closeBundle() {
      const files = (
        await readdir(directory, { recursive: true, withFileTypes: true })
      )
        .filter((file) => file.isFile() && file.name !== "sw.js")
        .map((file) =>
          relative(directory, join(file.parentPath, file.name)).replaceAll(
            "\\",
            "/",
          ),
        )
        .sort();
      const hash = createHash("sha256");
      for (const file of files) {
        hash.update(file);
        hash.update(await readFile(join(directory, file)));
      }
      const source = await readFile("public/sw.js", "utf8");
      await writeFile(
        join(directory, "sw.js"),
        source
          .replace("__MANIFEST__", JSON.stringify(files))
          .replace("__VERSION__", hash.digest("hex").slice(0, 16)),
      );
    },
  };
}
