/**
 * Vitest project that runs the native storage modules on a real SQLite engine.
 *
 * - `@/...` → repository root (the real app code)
 * - `expo-sqlite` → the REAL expo-sqlite JS layer (`mocks/expo-sqlite.ts` re-exports its build),
 *   whose native module `./ExpoSQLite` is redirected to `native/expo-sqlite-native.ts` (node:sqlite)
 * - `expo-file-system`, AsyncStorage, `expo-sharing`, `expo-document-picker`, `react-native` → `mocks/`
 *
 * See README.md in this folder.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { TestProjectInlineConfiguration } from "vitest/config";

const harnessDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(harnessDir, "..", "..");
const mocks = path.join(harnessDir, "mocks");
const nativeSqlite = path.join(harnessDir, "native", "expo-sqlite-native.ts");

function realPath(directory: string): string {
  try {
    return fs.realpathSync(directory);
  } catch {
    return directory;
  }
}

function redirectExpoSqliteNative() {
  let expoSqliteBuild: string | null = null;
  return {
    name: "native-sqlite:expo-sqlite-native",
    enforce: "pre" as const,
    resolveId(source: string, importer: string | undefined): string | null {
      if (!importer || source !== "./ExpoSQLite") return null;
      expoSqliteBuild ??= realPath(path.join(root, "node_modules", "expo-sqlite", "build"));
      const importerDir = realPath(path.dirname(importer.split("?")[0]));
      return importerDir === expoSqliteBuild ? nativeSqlite : null;
    },
  };
}

export const nativeSqliteProject: TestProjectInlineConfiguration = {
  root,
  plugins: [redirectExpoSqliteNative()],
  define: {
    __DEV__: "false",
  },
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${root}/` },
      { find: /^expo-sqlite$/, replacement: path.join(mocks, "expo-sqlite.ts") },
      { find: /^expo-file-system$/, replacement: path.join(mocks, "expo-file-system.ts") },
      { find: /^@react-native-async-storage\/async-storage$/, replacement: path.join(mocks, "async-storage.ts") },
      { find: /^expo-sharing$/, replacement: path.join(mocks, "expo-sharing.ts") },
      { find: /^expo-document-picker$/, replacement: path.join(mocks, "expo-document-picker.ts") },
      { find: /^react-native$/, replacement: path.join(mocks, "react-native.ts") },
    ],
  },
  test: {
    name: "native-sqlite",
    include: ["tests/native-sqlite/**/*.test.ts"],
    environment: "node",
    setupFiles: [path.join(harnessDir, "setup.ts")],
    server: {
      deps: {
        // Transform expo-sqlite's ESM build through Vite so the native redirect applies.
        inline: [/expo-sqlite/],
      },
    },
    pool: "forks",
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
};
