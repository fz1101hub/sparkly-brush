import { beforeEach, describe, expect, it, vi } from "vitest";

const SOURCE_URI = "file:///downloads/family.brushlings";
const CACHE_URI = "file:///cache/";
const state = vi.hoisted(() => ({
  files: new Map<string, number>(),
  metadata: new Map<string, string>(),
  deleted: [] as string[],
  copyFails: false,
  importedOpenFails: false,
  exportOpenFails: false,
  closeFails: false,
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => undefined),
    removeItem: vi.fn(async () => undefined),
    multiRemove: vi.fn(async () => undefined),
  },
}));
vi.mock("expo-file-system", () => ({
  Paths: { cache: { uri: "file:///cache/" } },
  Directory: class {},
  File: class MockFile {
    readonly uri: string;
    readonly name: string;
    readonly parentDirectory: { uri: string };
    constructor(parent: string | { uri: string }, name?: string) {
      const base = typeof parent === "string" ? parent : parent.uri;
      this.uri = name ? `${base.replace(/\/$/, "")}/${name}` : base;
      this.name = this.uri.split("/").pop() ?? "";
      this.parentDirectory = { uri: this.uri.slice(0, -this.name.length) };
    }
    get exists() {
      return state.files.has(this.uri);
    }
    get size() {
      return state.files.get(this.uri) ?? 0;
    }
    open() {
      return { readBytes: () => new Uint8Array(100), close: () => undefined };
    }
    async copy(destination: MockFile) {
      // Simulate a partial cache file before ENOSPC; size is virtual, not allocated.
      state.files.set(destination.uri, this.size);
      if (state.copyFails) throw new Error("ENOSPC while copying backup");
    }
    delete() {
      state.files.delete(this.uri);
      state.deleted.push(this.uri);
    }
  },
}));
vi.mock("@/lib/sqlite-backup-preflight", () => ({
  SQLITE_BACKUP_HEADER_BYTES: 100,
  validateSQLiteBackupHeader: vi.fn(() => ({ pageSize: 4096 })),
}));

const database = vi.hoisted(() => ({
  execAsync: vi.fn(async () => undefined),
  closeAsync: vi.fn(async () => {
    if (state.closeFails) throw new Error("SQLite close failed");
  }),
  getAllAsync: vi.fn(async (sql: string) =>
    sql.includes("PRAGMA table_info(sessions)")
      ? [{ name: "time_confidence" }, { name: "reward_policy" }]
      : [],
  ),
  getEachAsync: vi.fn(() => ({
    async *[Symbol.asyncIterator]() {
      /* empty database */
    },
  })),
  getFirstAsync: vi.fn(async (sql: string, ...args: unknown[]) => {
    if (sql.includes("COUNT(*) AS count FROM sessions")) return { count: 0 };
    if (sql.includes("FROM metadata WHERE key = ?")) {
      const value = state.metadata.get(String(args[0]));
      return value === undefined ? null : { value };
    }
    return null;
  }),
  runAsync: vi.fn(async (sql: string, ...args: unknown[]) => {
    if (sql.includes("INSERT INTO metadata")) {
      state.metadata.set(
        String(args[0]),
        args.length > 1 ? String(args[1]) : "true",
      );
    }
    return { changes: 1 };
  }),
  withExclusiveTransactionAsync: vi.fn(
    async (operation: (db: unknown) => Promise<void>) => {
      await operation(database);
    },
  ),
}));
const sqlite = vi.hoisted(() => ({
  defaultDatabaseDirectory: "/data/user/0/com.app.sparklybrush/databases",
  openDatabaseAsync: vi.fn(async (name: string) => {
    if (name === "sparkly-brush.sqlite") return database;
    const uri = `${CACHE_URI}${name}`;
    state.files.set(uri, 4096);
    if (name.startsWith("sparkly-import-") && state.importedOpenFails) {
      throw new Error("SQLite refused copied backup");
    }
    if (name.endsWith(".brushlings") && state.exportOpenFails) {
      throw new Error("SQLite refused exported backup");
    }
    return database;
  }),
  backupDatabaseAsync: vi.fn(async () => undefined),
  deleteDatabaseAsync: vi.fn(async () => undefined),
}));
vi.mock("expo-sqlite", () => sqlite);

import {
  createCompleteBackupDatabase,
  inspectCompleteBackupDatabase,
  restoreCompleteBackupDatabase,
} from "@/lib/brush-storage.native";

describe("native backup temporary file cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.files.clear();
    state.metadata.clear();
    state.deleted.length = 0;
    state.files.set(SOURCE_URI, 4096);
    state.copyFails = false;
    state.importedOpenFails = false;
    state.exportOpenFails = false;
    state.closeFails = false;
  });

  it("elimina la copia parziale se il filesystem si riempie, senza toccare il file originale", async () => {
    state.copyFails = true;
    await expect(inspectCompleteBackupDatabase(SOURCE_URI)).rejects.toThrow(
      "ENOSPC",
    );
    expect(state.files.has(SOURCE_URI)).toBe(true);
    expect(state.deleted).toHaveLength(1);
    expect(state.deleted[0]).toMatch(
      /^file:\/\/\/cache\/sparkly-import-.*\.sqlite$/,
    );
    expect([...state.files.keys()]).toEqual([SOURCE_URI]);
    expect(sqlite.openDatabaseAsync).not.toHaveBeenCalled();
  });

  it("elimina la copia se SQLite rifiuta l'apertura, senza toccare il file originale", async () => {
    state.importedOpenFails = true;
    await expect(inspectCompleteBackupDatabase(SOURCE_URI)).rejects.toThrow(
      "SQLite refused",
    );
    expect([...state.files.keys()]).toEqual([SOURCE_URI]);
    expect(state.deleted).toHaveLength(1);
    expect(state.deleted[0]).toMatch(
      /^file:\/\/\/cache\/sparkly-import-.*\.sqlite$/,
    );
  });

  it("elimina l'export parziale se l'apertura SQLite crea un file e poi fallisce", async () => {
    state.exportOpenFails = true;
    await expect(
      createCompleteBackupDatabase("{}", "sparkly-test.brushlings"),
    ).rejects.toThrow("SQLite refused exported backup");
    expect(state.files.has(`${CACHE_URI}sparkly-test.brushlings`)).toBe(false);
    expect(state.deleted).toContain(`${CACHE_URI}sparkly-test.brushlings`);
    expect(state.files.has(SOURCE_URI)).toBe(true);
  });

  it("elimina la copia importata se la validazione e la chiusura SQLite falliscono", async () => {
    state.closeFails = true;
    await expect(inspectCompleteBackupDatabase(SOURCE_URI)).rejects.toThrow(
      "SQLite close failed",
    );
    expect(state.deleted).toHaveLength(1);
    expect(state.deleted[0]).toMatch(
      /^file:\/\/\/cache\/sparkly-import-.*\.sqlite$/,
    );
    expect([...state.files.keys()]).toEqual([SOURCE_URI]);
  });

  it("elimina l'export anche se SQLite non riesce a chiudere il file creato", async () => {
    state.closeFails = true;
    await expect(
      createCompleteBackupDatabase("{}", "sparkly-close-fails.brushlings"),
    ).rejects.toThrow("SQLite close failed");
    expect(state.files.has(`${CACHE_URI}sparkly-close-fails.brushlings`)).toBe(
      false,
    );
    expect(state.deleted).toContain(
      `${CACHE_URI}sparkly-close-fails.brushlings`,
    );
    expect(state.files.has(SOURCE_URI)).toBe(true);
  });

  it("non elimina il file consegnato al restore se SQLite non riesce a chiuderlo", async () => {
    state.closeFails = true;
    await expect(
      restoreCompleteBackupDatabase(SOURCE_URI, "restore-test"),
    ).rejects.toThrow("SQLite close failed");
    expect(state.files.has(SOURCE_URI)).toBe(true);
    expect(state.deleted).toEqual([]);
  });
});
