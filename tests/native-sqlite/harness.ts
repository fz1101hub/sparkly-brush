/**
 * Public helper API for the native SQLite tests. See tests/native-sqlite/README.md.
 */
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath, pathToFileURL } from "node:url";
import { vi } from "vitest";

import {
  addFault,
  appLayout,
  assertInsideTestRoot,
  clearFaults,
  createAppContainer,
  harnessState,
  reviveProcess,
  shutdownNative,
  type CallInfo,
  type FaultHandle,
  type FaultSpec,
  type HarnessPlatform,
  type HopMode,
  type TraceEntry,
} from "./core/state";

export {
  HarnessError,
  InjectedFault,
  isSimulatedProcessDeath,
  SimulatedProcessDeath,
  type CallInfo,
  type FaultHandle,
  type FaultSpec,
} from "./core/state";

export interface AppModules {
  storage: typeof import("@/lib/brush-storage.native");
  completeBackup: typeof import("@/lib/complete-backup.native");
  restoreJournal: typeof import("@/lib/restore-journal");
  manualSessions: typeof import("@/lib/manual-session-storage");
  AsyncStorage: typeof import("./mocks/async-storage").default;
}

async function importApp(): Promise<AppModules> {
  const [storage, completeBackup, restoreJournal, manualSessions, asyncStorage] = await Promise.all([
    import("@/lib/brush-storage.native"),
    import("@/lib/complete-backup.native"),
    import("@/lib/restore-journal"),
    import("@/lib/manual-session-storage"),
    import("./mocks/async-storage"),
  ]);
  harnessState().booted = true;
  return { storage, completeBackup, restoreJournal, manualSessions, AsyncStorage: asyncStorage.default };
}

/**
 * Kills the emulated app process: every native SQLite connection / file handle is closed
 * (open transactions roll back, exactly what a crash does to uncommitted work) and every module
 * instance created before is poisoned (its native calls throw SimulatedProcessDeath).
 * Files on disk and AsyncStorage contents are kept.
 */
export async function killApp(reason = "killApp()"): Promise<void> {
  await shutdownNative(reason);
  reviveProcess();
  harnessState().booted = false;
  vi.resetModules();
}

/**
 * Returns FRESH instances of the storage modules (vi.resetModules + dynamic import).
 * If an app instance was already booted in this test, this is a process restart.
 */
export async function loadStorage(): Promise<AppModules> {
  if (harnessState().booted) await killApp("loadStorage() restart");
  vi.resetModules();
  return importApp();
}

/** Process restart: kill + boot, keeping files and AsyncStorage. */
export async function simulateRestart(): Promise<AppModules> {
  await killApp("simulateRestart()");
  return importApp();
}

/**
 * New install on a (new) device: new empty app container + empty AsyncStorage. Files under
 * `externalDir()` (e.g. backups saved through the share sheet) survive.
 */
export async function freshInstall(): Promise<AppModules> {
  await killApp("freshInstall()");
  harnessState().asyncStorage.clear();
  createAppContainer();
  return importApp();
}

/** Switch emulated platform ("ios" default). Call before loadStorage(). */
export function setPlatform(platform: HarnessPlatform): void {
  harnessState().platform = platform;
  const layout = appLayout();
  fs.mkdirSync(layout.documentsDir, { recursive: true });
  fs.mkdirSync(layout.cacheDir, { recursive: true });
}

/** "macrotask" (default: each native call yields to the event loop), "microtask" or "none". */
export function setAsyncHop(mode: HopMode): void {
  harnessState().hopMode = mode;
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

export const paths = {
  get testRoot(): string {
    return harnessState().testRoot ?? "";
  },
  get appRoot(): string {
    return appLayout().appRoot;
  },
  get documents(): string {
    return appLayout().documentsDir;
  },
  get cache(): string {
    return appLayout().cacheDir;
  },
  get sqliteDir(): string {
    return appLayout().sqliteDir;
  },
  /** Host path of a database created by openDatabaseAsync(name) in the default directory. */
  database(name = "sparkly-brush.sqlite"): string {
    return path.join(appLayout().sqliteDir, name);
  },
  /** Storage outside the app container (Files app / iCloud) that survives freshInstall(). */
  external(...segments: string[]): string {
    return path.join(harnessState().externalRoot ?? "", ...segments);
  },
  toUri(hostPath: string): string {
    return pathToFileURL(hostPath).href;
  },
  fromUri(uri: string): string {
    return fileURLToPath(uri);
  },
  /** Recursive listing (relative paths) of the app container, handy for asserting leftovers. */
  listApp(): string[] {
    const rootDir = appLayout().appRoot;
    const out: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else out.push(path.relative(rootDir, full));
      }
    };
    if (fs.existsSync(rootDir)) walk(rootDir);
    return out.sort();
  },
};

// ---------------------------------------------------------------------------
// Raw database inspection
// ---------------------------------------------------------------------------

/**
 * Opens a raw node:sqlite connection (same engine settings as the app: FK off, DQS on, no busy
 * timeout) on a host path or on a DB name in the app's SQLite directory. Closed automatically at
 * the next kill/restart/test end. Use it to inspect or to craft malicious backup files.
 */
export function openRawDatabase(nameOrPath: string = "sparkly-brush.sqlite"): DatabaseSync {
  const filePath = nameOrPath.startsWith("file:")
    ? fileURLToPath(nameOrPath)
    : path.isAbsolute(nameOrPath) ? nameOrPath : paths.database(nameOrPath);
  assertInsideTestRoot(filePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const db = new DatabaseSync(filePath, {
    enableForeignKeyConstraints: false,
    enableDoubleQuotedStringLiterals: true,
    timeout: 0,
  });
  const state = harnessState();
  const record = {
    id: state.sqliteNextId++,
    closed: false,
    forceClose() {
      record.closed = true;
      if (db.isOpen) db.close();
    },
  };
  state.sqliteConnections.push(record);
  return db;
}

/** Runs `fn` on a raw connection and closes it. */
export function withRawDatabase<T>(nameOrPath: string, fn: (db: DatabaseSync) => T): T {
  const db = openRawDatabase(nameOrPath);
  try {
    return fn(db);
  } finally {
    db.close();
  }
}

export function sqliteHeader(filePath: string): { pageSize: number; writeVersion: number; readVersion: number; size: number } {
  const bytes = fs.readFileSync(filePath);
  const encoded = bytes.readUInt16BE(16);
  return { pageSize: encoded === 1 ? 65_536 : encoded, writeVersion: bytes[18], readVersion: bytes[19], size: bytes.length };
}

// ---------------------------------------------------------------------------
// AsyncStorage
// ---------------------------------------------------------------------------

export const asyncStorage = {
  get(key: string): string | null {
    return harnessState().asyncStorage.get(key) ?? null;
  },
  set(key: string, value: string): void {
    harnessState().asyncStorage.set(key, value);
  },
  remove(key: string): void {
    harnessState().asyncStorage.delete(key);
  },
  snapshot(): Record<string, string> {
    return Object.fromEntries(harnessState().asyncStorage);
  },
  clear(): void {
    harnessState().asyncStorage.clear();
  },
};

// ---------------------------------------------------------------------------
// Fault injection
// ---------------------------------------------------------------------------

export const faults = {
  /** Generic rule, see FaultSpec in core/state.ts. */
  inject(spec: FaultSpec): FaultHandle {
    return addFault(spec);
  },
  /** Make the next matching call throw (e.g. failNext("asyncStorage.setItem", { match: "journal" })). */
  failNext(api: string | RegExp, options: Omit<FaultSpec, "api" | "action"> = {}): FaultHandle {
    return addFault({ ...options, api, action: "throw" });
  },
  /**
   * Simulate process death at a precise point. With phase "after" the operation completes first.
   * The pending app promise rejects with SimulatedProcessDeath; then call simulateRestart().
   */
  killAt(api: string | RegExp, options: Omit<FaultSpec, "api" | "action"> = {}): FaultHandle {
    return addFault({ ...options, api, action: "kill" });
  },
  /** Block an async native call until handle.release() — to force interleavings. */
  pauseAt(api: string | RegExp, options: Omit<FaultSpec, "api" | "action"> = {}): FaultHandle {
    return addFault({ ...options, api, action: "pause" });
  },
  /** Run a callback when a call happens (e.g. mutate files mid-operation). */
  onCall(api: string | RegExp, callback: (info: CallInfo) => void | Promise<void>, options: Omit<FaultSpec, "api" | "action"> = {}): FaultHandle {
    return addFault({ times: Infinity, ...options, api, action: callback });
  },
  clear(): void {
    clearFaults();
  },
};

// ---------------------------------------------------------------------------
// Trace
// ---------------------------------------------------------------------------

export const trace = {
  enable(): void {
    harnessState().traceEnabled = true;
  },
  disable(): void {
    harnessState().traceEnabled = false;
  },
  clear(): void {
    harnessState().trace = [];
  },
  entries(filter?: RegExp): TraceEntry[] {
    const entries = harnessState().trace;
    return filter ? entries.filter((entry) => filter.test(entry.api)) : [...entries];
  },
  format(filter?: RegExp): string {
    return trace.entries(filter)
      .map((entry) => `${entry.seq} ${entry.phase.padEnd(6)} ${entry.api.padEnd(20)} ${entry.database ? `[${path.basename(entry.database)}] ` : ""}${entry.target.replace(/\s+/g, " ").slice(0, 140)}${entry.error ? `  !! ${entry.error}` : ""}`)
      .join("\n");
  },
};

// ---------------------------------------------------------------------------
// Sharing / document picker
// ---------------------------------------------------------------------------

export const sharing = {
  setAvailable(available: boolean): void {
    harnessState().sharingAvailable = available;
  },
  /** When true (default) shareAsync copies the file to paths.external("shared"). */
  saveCopies(save: boolean): void {
    harnessState().sharingSaveCopies = save;
  },
  get calls() {
    return [...harnessState().shared];
  },
  /** Host path of the copy saved by the last shareAsync call. */
  lastSavedCopy(): string {
    const last = harnessState().shared.at(-1);
    if (!last?.savedCopy) throw new Error("[native-sqlite] no file has been shared/saved yet");
    return last.savedCopy;
  },
};

export const documentPicker = {
  /** Queue the next getDocumentAsync result: the user picks this host file. */
  pick(hostPath: string, options: { name?: string; mimeType?: string } = {}): void {
    assertInsideTestRoot(hostPath);
    harnessState().pickerQueue.push({ kind: "file", sourcePath: hostPath, ...options });
  },
  cancel(): void {
    harnessState().pickerQueue.push({ kind: "cancel" });
  },
};

export function warnings(): string[] {
  return [...harnessState().warnings];
}
