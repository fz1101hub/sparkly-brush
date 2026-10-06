/**
 * Self-tests of the emulation itself (expo-sqlite / expo-file-system / AsyncStorage semantics).
 * These exercise the mocks directly, not the app.
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";

import {
  asyncStorage,
  faults,
  isSimulatedProcessDeath,
  paths,
  setPlatform,
  simulateRestart,
  loadStorage,
  trace,
  withRawDatabase,
} from "./harness";

async function sqlite() {
  return import("expo-sqlite");
}

describe("expo-sqlite emulation", () => {
  it("exposes a plain-path defaultDatabaseDirectory like iOS/Android native", async () => {
    const SQLite = await sqlite();
    expect(SQLite.defaultDatabaseDirectory).toBe(paths.sqliteDir);
    expect(SQLite.defaultDatabaseDirectory.startsWith("/")).toBe(true);
    expect(SQLite.defaultDatabaseDirectory).not.toMatch(/^file:/);
  });

  it("binds variadic / array / named params with expo semantics", async () => {
    const SQLite = await sqlite();
    const db = await SQLite.openDatabaseAsync("params.sqlite");
    await db.execAsync("CREATE TABLE t (a, b, c)");
    await db.runAsync("INSERT INTO t VALUES (?, ?, ?)", 1, "x", true);
    await db.runAsync("INSERT INTO t VALUES (?, ?, ?)", [2, null, false]);
    await db.runAsync("INSERT INTO t VALUES ($a, $b, $c)", { $a: 3, $b: "y", $c: new Uint8Array([1, 2]) });
    // Extra params are ignored (SQLITE_RANGE swallowed), missing named keys stay NULL.
    await db.runAsync("INSERT INTO t VALUES (?, ?, ?)", 4, "z", 0, "extra", "extra2");
    await db.runAsync("INSERT INTO t VALUES ($a, $b, $c)", { a: 5, $b: "bare-key-ignored" });
    const rows = await db.getAllAsync<{ a: number | null; b: unknown; c: unknown }>("SELECT * FROM t ORDER BY rowid");
    expect(rows[0]).toEqual({ a: 1, b: "x", c: 1 });
    expect(rows[1]).toEqual({ a: 2, b: null, c: 0 });
    expect(rows[2].c).toEqual(new Uint8Array([1, 2]));
    expect(rows[3]).toEqual({ a: 4, b: "z", c: 0 });
    expect(rows[4]).toEqual({ a: null, b: "bare-key-ignored", c: null });
    expect(await db.getFirstAsync("SELECT typeof(?) AS i, typeof(?) AS r", 7, 7.5)).toEqual({ i: "integer", r: "real" });
    const run = await db.runAsync("INSERT INTO t VALUES (?, ?, ?)", 6, 6, 6);
    expect(run).toMatchObject({ changes: 1, lastInsertRowId: 6 });
    const seen: number[] = [];
    for await (const row of db.getEachAsync<{ a: number }>("SELECT a FROM t WHERE a IS NOT NULL ORDER BY a")) seen.push(row.a);
    expect(seen).toEqual([1, 2, 3, 4, 6]);
    await db.closeAsync();
    await expect(db.getFirstAsync("SELECT 1")).rejects.toThrow(/Access to closed resource/);
  });

  it("runs withExclusiveTransactionAsync on a separate connection with BEGIN/COMMIT/ROLLBACK", async () => {
    const SQLite = await sqlite();
    const db = await SQLite.openDatabaseAsync("txn.sqlite");
    await db.execAsync("PRAGMA journal_mode = WAL; CREATE TABLE t (v INTEGER)");
    trace.enable();
    await expect(db.withExclusiveTransactionAsync(async (txn) => {
      await txn.runAsync("INSERT INTO t VALUES (1)");
      // The outer connection cannot write while the transaction connection holds the lock
      // (no busy timeout in expo-sqlite) and does not see the uncommitted row.
      await expect(db.runAsync("INSERT INTO t VALUES (2)")).rejects.toThrow(/database is locked/);
      expect(await db.getFirstAsync("SELECT COUNT(*) AS c FROM t")).toEqual({ c: 0 });
      throw new Error("abort");
    })).rejects.toThrow("abort");
    expect(await db.getFirstAsync("SELECT COUNT(*) AS c FROM t")).toEqual({ c: 0 });
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.runAsync("INSERT INTO t VALUES (3)");
    });
    expect(await db.getFirstAsync("SELECT COUNT(*) AS c FROM t")).toEqual({ c: 1 });
    const execs = trace.entries(/sqlite\.exec/).filter((entry) => entry.phase === "before").map((entry) => entry.target);
    expect(execs).toEqual(["BEGIN", "ROLLBACK", "BEGIN", "COMMIT"]);
    await db.closeAsync();
  });

  it("backupDatabaseAsync replaces the whole destination (tables, views, triggers) and keeps it usable", async () => {
    const SQLite = await sqlite();
    const source = await SQLite.openDatabaseAsync("src.sqlite", { useNewConnection: true });
    await source.execAsync(`PRAGMA journal_mode = WAL; CREATE TABLE a (x); INSERT INTO a VALUES (1), (2);
      CREATE VIEW va AS SELECT x FROM a; CREATE TRIGGER ta AFTER INSERT ON a BEGIN SELECT 1; END;`);
    const destination = await SQLite.openDatabaseAsync("dst.sqlite", { useNewConnection: true });
    await destination.execAsync("CREATE TABLE old (y); INSERT INTO old VALUES ('stale');");
    await SQLite.backupDatabaseAsync({ sourceDatabase: source, destDatabase: destination });
    const objects = await destination.getAllAsync<{ type: string; name: string }>("SELECT type, name FROM sqlite_schema ORDER BY name");
    expect(objects).toEqual([{ type: "table", name: "a" }, { type: "trigger", name: "ta" }, { type: "view", name: "va" }]);
    expect(await destination.getAllAsync("SELECT x FROM va")).toEqual([{ x: 1 }, { x: 2 }]);
    await destination.runAsync("INSERT INTO a VALUES (3)");
    expect(await destination.getFirstAsync("SELECT COUNT(*) AS c FROM a")).toEqual({ c: 3 });
    expect(await source.getFirstAsync("SELECT COUNT(*) AS c FROM a")).toEqual({ c: 2 });
    await expect(SQLite.backupDatabaseAsync({ sourceDatabase: source, destDatabase: source }))
      .rejects.toThrow(/source and destination must be distinct/);
    await source.closeAsync();
    await destination.closeAsync();
  });

  it("deleteDatabaseAsync refuses open DBs, throws when missing and removes only the main file", async () => {
    const SQLite = await sqlite();
    const db = await SQLite.openDatabaseAsync("gone.sqlite", { useNewConnection: true });
    await db.execAsync("PRAGMA journal_mode = WAL; CREATE TABLE t (v)");
    await expect(SQLite.deleteDatabaseAsync("gone.sqlite")).rejects.toThrow(/currently open/);
    await db.closeAsync();
    fs.writeFileSync(`${paths.database("gone.sqlite")}-wal`, "stale wal");
    await SQLite.deleteDatabaseAsync("gone.sqlite");
    expect(fs.existsSync(paths.database("gone.sqlite"))).toBe(false);
    expect(fs.existsSync(`${paths.database("gone.sqlite")}-wal`)).toBe(true);
    await expect(SQLite.deleteDatabaseAsync("gone.sqlite")).rejects.toThrow(/not found/);
  });
});

describe("expo-file-system emulation", () => {
  it("handles Paths, File metadata, handles and copy semantics (iOS)", async () => {
    const { Directory, File, Paths } = await import("expo-file-system");
    const SQLite = await sqlite();
    const file = new File(Paths.cache, "a b.bin");
    file.write(new Uint8Array([1, 2, 3, 4]));
    expect(file.uri).toBe(`${Paths.cache.uri}a%20b.bin`);
    expect(file.name).toBe("a b.bin");
    expect(file.size).toBe(4);
    expect(file.parentDirectory.uri).toBe(Paths.cache.uri);
    const handle = file.open();
    expect(handle.readBytes(3)).toEqual(new Uint8Array([1, 2, 3]));
    expect(handle.readBytes(10)).toEqual(new Uint8Array([4]));
    handle.close();
    const copy = new File(Paths.cache, "copy.bin");
    await file.copy(copy);
    await expect(file.copy(copy)).rejects.toThrow(/already exists/);
    expect(new Directory(Paths.cache).list().map((entry) => entry.name)).toEqual(["a b.bin", "copy.bin"]);
    // iOS accepts plain paths (URL(fileURLWithPath:)).
    const plain = new File(SQLite.defaultDatabaseDirectory, "x.sqlite");
    expect(plain.exists).toBe(false);
    expect(plain.uri).toMatch(/^file:\/\/\/.*\/Documents\/SQLite\/x\.sqlite$/);
    // Outside the app container: no permission → exists=false (iOS).
    fs.writeFileSync(paths.external("outside.bin"), "x");
    expect(new File(paths.toUri(paths.external("outside.bin"))).exists).toBe(false);
  });

  it("rejects scheme-less paths on Android like java.io.File(URI) does", async () => {
    setPlatform("android");
    const { File } = await import("expo-file-system");
    const SQLite = await sqlite();
    const plain = new File(SQLite.defaultDatabaseDirectory, "x.sqlite");
    expect(() => plain.exists).toThrow(/URI is not absolute/);
    expect(plain.size).toBeNull();
  });
});

describe("AsyncStorage + crash simulation", () => {
  it("persists across restarts, supports injected failures and kills", async () => {
    const first = await loadStorage();
    await first.AsyncStorage.setItem("k", "v1");
    const failure = faults.failNext("asyncStorage.setItem", { match: "k", error: "disk full" });
    await expect(first.AsyncStorage.setItem("k", "v2")).rejects.toThrow("disk full");
    expect(failure.fired).toBe(1);
    expect(asyncStorage.get("k")).toBe("v1");

    faults.killAt("asyncStorage.setItem", { match: "k", phase: "after" });
    const pending = first.AsyncStorage.setItem("k", "v3");
    await expect(pending).rejects.toSatisfy(isSimulatedProcessDeath);
    await expect(first.AsyncStorage.getItem("k")).rejects.toSatisfy(isSimulatedProcessDeath);

    const second = await simulateRestart();
    expect(await second.AsyncStorage.getItem("k")).toBe("v3");
    await second.AsyncStorage.setItem("empty", "");
    expect(await second.AsyncStorage.getItem("empty")).toBeNull();
  });

  it("rolls back an interrupted SQLite transaction when the process is killed", async () => {
    const app = await loadStorage();
    await app.storage.initializeHistoryStorage();
    faults.killAt("sqlite.run", { match: "INSERT OR IGNORE INTO reward_ledger" });
    await expect(app.storage.saveSessionWithLifetime({
      id: "killed",
      startedAt: new Date(2026, 0, 2, 8).getTime(),
      durationSeconds: 120,
      targetSeconds: 120,
      completed: true,
      source: "manual",
    })).rejects.toSatisfy(isSimulatedProcessDeath);
    const restarted = await simulateRestart();
    const bundle = await restarted.storage.loadHistoryBundle();
    expect(bundle.recentHistory).toEqual([]);
    expect(bundle.lifetimeProgress.attemptedSessions).toBe(0);
    withRawDatabase(paths.database(), (db) => {
      expect(db.prepare("SELECT COUNT(*) AS c FROM sessions").get()).toEqual({ c: 0 });
    });
  });
});
