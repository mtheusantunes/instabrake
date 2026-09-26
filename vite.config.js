import { defineConfig } from "vite";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  publicDir: false,
  build: {
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(rootDir, "modules/content-entry.js"),
      output: {
        dir: resolve(rootDir, "dist"),
        entryFileNames: "content.js",
        format: "iife",
        inlineDynamicImports: true,
      },
    },
  },
});
