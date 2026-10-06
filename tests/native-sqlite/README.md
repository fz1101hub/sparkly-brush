# Native storage on real SQLite

The Vitest project `native-sqlite` runs the **real** `lib/brush-storage.native.ts` and
`lib/complete-backup.native.ts` — the code that ships on iOS and Android — on a **real SQLite
engine** (`node:sqlite`) instead of SQL-string fakes. The rest of the suite resolves
`@/lib/brush-storage` to the web implementation (AsyncStorage), so this project is the only
automated check of the native persistence, backup and restore paths.

It runs as part of `pnpm test`; to run it alone:

```sh
pnpm exec vitest run --project native-sqlite
NATIVE_SQLITE_KEEP_TMP=1 pnpm exec vitest run --project native-sqlite   # keep the sandboxes
```

Requires Node.js ≥ 22.16 (`node:sqlite` with `backup()`); `setup.ts` fails fast otherwise.
The project configuration is in `vitest.project.ts`.

## What is real and what is emulated

| Module id | Provided by |
|---|---|
| `expo-sqlite` | `mocks/expo-sqlite.ts` re-exports the **real** expo-sqlite JS layer from `node_modules/expo-sqlite/build` (`SQLiteDatabase`, `withExclusiveTransactionAsync`, `getEachAsync`, `normalizeParams`, `createDatabasePath`…). Only its native module `./ExpoSQLite` is swapped, by a Vite plugin, for `native/expo-sqlite-native.ts` over `node:sqlite`. |
| `expo-file-system` | `mocks/expo-file-system.ts`: `File`/`Directory`/`Paths`/`FileHandle` over `node:fs`, with the iOS and Android path semantics described below. |
| `@react-native-async-storage/async-storage` | `mocks/async-storage.ts` (in memory, survives simulated restarts). |
| `expo-sharing`, `expo-document-picker`, `react-native` | small mocks in `mocks/`. |
| `@/…` | the repository (real app code). |

Before each test (`setup.ts`): a fresh temporary sandbox with an emulated app container
`install-1/` (iOS layout `Documents/`, `Documents/SQLite/`, `Library/Caches/`; Android layout
`files/`, `files/SQLite/`, `cache/`), empty AsyncStorage, no faults, platform `ios`. All file
access is confined to the sandbox; anything else throws `HarnessError`.

## Writing a test

```ts
import { expect, it } from "vitest";
import { faults, isSimulatedProcessDeath, loadStorage, openRawDatabase, simulateRestart } from "./harness";

it("example", async () => {
  const app = await loadStorage(); // fresh module instances (vi.resetModules + import)
  await app.storage.initializeHistoryStorage();
  await app.storage.saveSessionWithLifetime({ id: "s1", startedAt: Date.now(), durationSeconds: 120,
    targetSeconds: 120, completed: true, source: "manual" });

  faults.killAt("sqlite.run", { match: "INSERT OR IGNORE INTO sessions" }); // crash mid-transaction
  await expect(app.storage.saveSessionWithLifetime(/* … */)).rejects.toSatisfy(isSimulatedProcessDeath);

  await simulateRestart(); // same files + AsyncStorage, new process
  const db = openRawDatabase(); // raw node:sqlite connection on sparkly-brush.sqlite
  expect(db.prepare("SELECT COUNT(*) AS c FROM sessions").get()).toEqual({ c: 1 });
});
```

Always import app modules through `loadStorage()` / `simulateRestart()` / `freshInstall()`, never
statically: `brush-storage.native.ts` keeps module state (`databasePromise`, write queues). Pure
helpers (`@/lib/backup`, `@/lib/lifetime-progress`, …) may be imported statically.

## Helper API (`harness.ts`)

| Helper | Meaning |
|---|---|
| `loadStorage()` | Boot the app: `{ storage, completeBackup, restoreJournal, manualSessions, AsyncStorage }` from fresh module instances. If an app was already booted in this test it is killed first (= restart). |
| `simulateRestart()` | Process kill + boot. Open SQLite connections and file handles are closed (uncommitted transactions roll back), old module instances are poisoned (any native call → `SimulatedProcessDeath`), files and AsyncStorage are kept. |
| `killApp()` | Kill without booting. |
| `freshInstall()` | Kill, new empty app container `install-N/`, empty AsyncStorage. `paths.external(...)` survives (the Files app or another device). |
| `setPlatform("ios" \| "android")` | Before `loadStorage()`. Switches container layout, `Platform.OS`, error formats and the Android plain-path `File` behaviour. |
| `setAsyncHop("macrotask" \| "microtask" \| "none")` | Each emulated native async call first yields (default `setImmediate`), like a bridge hop. |
| `paths.*` | `appRoot`, `documents`, `cache`, `sqliteDir`, `database(name)`, `external(...)`, `toUri`, `fromUri`, `listApp()`. |
| `openRawDatabase(nameOrPath)` / `withRawDatabase(p, fn)` | Raw `node:sqlite` connection with the app's engine settings (foreign keys off, double-quoted strings on, no busy timeout). Use it to inspect, or to craft hostile backup files. Closed automatically at kill or test end. |
| `sqliteHeader(path)` | Page size, header bytes 18/19 (1 = rollback journal, 2 = WAL), file size. |
| `asyncStorage.get/set/remove/snapshot/clear` | Direct access to the persisted AsyncStorage map. |
| `faults.inject(spec)` | Generic rule `{ api, match?, database?, skip?, times?, phase?: "before" \| "after", action?: "throw" \| "kill" \| "pause" \| fn, error? }`. |
| `faults.failNext` / `faults.killAt` / `faults.pauseAt` / `faults.onCall` | Shorthands. `pauseAt` returns a handle with `waitForPause()` / `release()` to force interleavings. |
| `trace.enable()` / `entries(/re/)` / `format()` | Ordered log of every emulated native call (SQL text, files, keys, errors). |
| `sharing.setAvailable(b)`, `sharing.calls`, `sharing.lastSavedCopy()` | `shareAsync` copies the shared file to `paths.external("shared")`. |
| `documentPicker.pick(hostPath, { name })`, `documentPicker.cancel()` | Next `getDocumentAsync` result; the file is copied like iOS to `<cache>/DocumentPicker/<UUID>.<ext>`. Empty queue = user cancelled. |

Fault and trace `api` names: `sqlite.open|close|exec|prepare|run|step|getAll|backup|delete`,
`fs.exists|size|delete|copy|move|open|read|write|create|list|rename|handle.read|handle.write|handle.close`,
`asyncStorage.getItem|setItem|removeItem|mergeItem|multiGet|multiSet|multiRemove|getAllKeys|clear`,
`sharing.share`, `documentPicker.pick`. `match` is tested against the SQL text, the file path or
URI, or the key(s); `database` against the SQLite file path (e.g. `"sparkly-brush-restore-rollback.sqlite"`).
`sqlite.run` is the first step of every `runAsync`/`getFirstAsync`/`getAllAsync`/`getEachAsync` statement.

## Emulated native behaviour

expo-sqlite (JS layer real; native behaviour mirrored from expo-sqlite 57 `ios/SQLiteModule.swift`,
`android/.../SQLiteModule.kt` and `NativeDatabaseBinding.cpp`):

- `defaultDatabaseDirectory` is a **plain path** (`<container>/Documents/SQLite` on iOS, `files/SQLite` on Android), like native.
- `openDatabaseAsync(name, options?, directory?)` uses the real `createDatabasePath`; connections without `useNewConnection` are cached per path and options and reference-counted.
- `execAsync` (multi-statement, partial effects before an error), `runAsync`/`getFirstAsync`/`getAllAsync`/`getEachAsync` with variadic, array and `$named` parameters (real `normalizeParams`, raw-index binding, out-of-range parameters ignored, booleans → 0/1, integral numbers bound as INTEGER, BLOB ↔ `Uint8Array`).
- `withExclusiveTransactionAsync` is the real implementation: a **separate connection** with `BEGIN`/`COMMIT`/`ROLLBACK`. There is no busy timeout, so writes on the outer connection during the transaction fail with `database is locked`.
- `backupDatabaseAsync` replaces the destination content completely (tables, indexes, views, triggers, WAL header flag); `deleteDatabaseAsync` refuses open databases, throws when the file is missing and removes only the main file, like both native implementations.
- Engine settings of the vendored SQLite build: foreign keys **off** (so `ON DELETE CASCADE` is not enforced, as on device), double-quoted string literals **on**, WAL, `wal_checkpoint`, `VACUUM`.

expo-file-system: `new File(uriOrDirectory, ...names)` with `Paths.join` semantics, metadata,
`open()` handles, `copy` (fails if the destination exists), `move`, `delete` (throws if missing),
`Directory` listing and creation, `Paths.cache`, `Paths.document`.

- iOS: scheme-less absolute paths are accepted (`URL(fileURLWithPath:)`); files outside the app container do not exist.
- Android: scheme-less paths construct fine, but `exists`/`uri`/`delete`/`copy`/`open` throw `IllegalArgumentException: URI is not absolute`, as `java.io.File(URI)` does in expo-file-system's `JavaFile`.

## Known differences from a device

1. node:sqlite cannot run `sqlite3_backup` on an existing destination connection, so pages are written through a second connection to the destination file; the result is identical, but lock-contention errors collapse to `database is locked`. `backupDatabaseSync` is not supported.
2. Native async calls are serialized after one event-loop hop instead of running on a concurrent queue; use `faults.pauseAt` to force orderings.
3. A kill closes connections cleanly (uncommitted transactions roll back, committed WAL data survives); there is no power-loss or torn-write simulation.
4. Error messages follow the Expo formats, but codes and texts are approximations; the app does not branch on them.
5. SQLite version and compile options differ from the vendored build; change listeners, sessions, extensions and libSQL are not emulated.
6. expo-file-system is a reimplementation (permissions reduced to "app container rw, bundle r"; sorted directory listings; no downloads, watchers or `content://`).
7. AsyncStorage is in memory and always atomic; partial `multiSet` failures need `faults`.
8. Document picker and share sheet have no UI; `shareAsync` resolves immediately.

## Regression tests

- `interrupted-restore.test.ts` — a restore killed mid-transaction rolls back at the next launch on iOS and Android (audit S1, 2026-09-30).
- `device-reconciliation.test.ts` — live fallbacks and handle records are counted once, also across a restart and when older records arrive in the same batch (audit M3).
- `demo-history.test.ts` — demo sessions persist in their own store and never reach SQLite (audit G1).
- `storage-roundtrip.test.ts` — persistence, BLE import, complete backup export/inspect/restore, schema and pragmas, time zones, hostile backup files.
- `harness-selftest.test.ts` — the emulation itself against the expo-sqlite, expo-file-system and AsyncStorage semantics above.
