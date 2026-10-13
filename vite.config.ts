import { defineConfig } from "vite";
import { offlinePlugin } from "./scripts/offline-plugin.ts";
export default defineConfig({
  base: "./",
  plugins: [offlinePlugin()],
  worker: { format: "es" },
  build: {
    license: { fileName: "licenses/bundled-dependencies.md" },
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "font-engine", test: /node_modules\/fonteditor-core\// },
            {
              name: "react",
              test: /node_modules\/(react|react-dom|scheduler)\//,
            },
          ],
        },
      },
    },
  },
});
