import { fileURLToPath, URL } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

import { nativeSqliteProject } from "./tests/native-sqlite/vitest.project";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/**/*.test.{ts,tsx}"],
          exclude: [...configDefaults.exclude, "tests/native-sqlite/**"],
        },
      },
      // lib/brush-storage.native.ts and lib/complete-backup.native.ts on a real SQLite engine.
      nativeSqliteProject,
    ],
  },
});
