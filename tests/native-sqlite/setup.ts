/**
 * Per-test harness lifecycle: every test gets a brand-new temp sandbox with an empty emulated app
 * container, empty AsyncStorage, no fault rules, platform "ios"; afterwards every native resource
 * is closed and the sandbox deleted (set NATIVE_SQLITE_KEEP_TMP=1 to keep it for inspection).
 */
import fs from "node:fs";
import { afterEach, beforeEach, vi } from "vitest";

import {
  clearFaults,
  createAppContainer,
  harnessState,
  newTestRoot,
  reviveProcess,
  shutdownNative,
} from "./core/state";

// Loading node:sqlite prints "SQLite is an experimental feature" once per worker: expected here.
const emitWarning = process.emitWarning.bind(process) as (warning: string | Error, ...rest: unknown[]) => void;
process.emitWarning = ((warning: string | Error, ...rest: unknown[]) => {
  const message = typeof warning === "string" ? warning : warning.message;
  if (message.startsWith("SQLite is an experimental feature")) return;
  emitWarning(warning, ...rest);
}) as typeof process.emitWarning;

// node:sqlite is unflagged since Node 22.13 and its backup() API exists since 22.16.
const nodeSqlite = await import("node:sqlite").catch(() => null);
if (typeof nodeSqlite?.backup !== "function") {
  throw new Error(
    `tests/native-sqlite requires Node.js >= 22.16 (node:sqlite with backup()); running ${process.version}`,
  );
}

(globalThis as Record<string, unknown>).__DEV__ = false;

beforeEach(async () => {
  const state = harnessState();
  await shutdownNative("previous test");
  clearFaults();
  reviveProcess();
  state.platform = "ios";
  state.hopMode = "macrotask";
  state.testRoot = newTestRoot();
  state.externalRoot = `${state.testRoot}/external`;
  fs.mkdirSync(state.externalRoot, { recursive: true });
  state.installCount = 0;
  createAppContainer();
  state.asyncStorage.clear();
  state.booted = false;
  state.traceEnabled = false;
  state.trace = [];
  state.traceSeq = 0;
  state.sharingAvailable = true;
  state.sharingSaveCopies = true;
  state.shared = [];
  state.pickerQueue = [];
  state.warnings = [];
  vi.resetModules();
});

afterEach(async () => {
  const state = harnessState();
  await shutdownNative("test finished");
  clearFaults();
  reviveProcess();
  if (state.testRoot && !state.keepTmp) {
    fs.rmSync(state.testRoot, { recursive: true, force: true });
  } else if (state.testRoot) {
    console.info(`[native-sqlite] kept sandbox ${state.testRoot}`);
  }
  state.testRoot = null;
  state.appRoot = null;
  state.externalRoot = null;
  vi.useRealTimers();
});
