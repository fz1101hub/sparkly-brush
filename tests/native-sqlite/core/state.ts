/**
 * Global (module-reset-proof) state of the native SQLite test harness.
 *
 * Everything that must survive `vi.resetModules()` (simulated app restarts)
 * lives on `globalThis.__SPARKLY_NATIVE_SQLITE_HARNESS__`: the per-test temp root, the
 * emulated app container, the AsyncStorage contents, open SQLite connections,
 * fault-injection rules, the "process killed" flag and the trace log.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type HarnessPlatform = "ios" | "android";
export type HopMode = "macrotask" | "microtask" | "none";

export type FaultApi = string;

export interface CallInfo {
  /** e.g. `sqlite.run`, `sqlite.exec`, `fs.copy`, `asyncStorage.setItem`. */
  api: FaultApi;
  /** SQL text, host file path, AsyncStorage key(s)... */
  target: string;
  /** Host path of the SQLite database file for `sqlite.*` calls. */
  database?: string;
  detail?: Record<string, unknown>;
}

export type FaultAction =
  | "throw"
  | "kill"
  | "pause"
  | ((info: CallInfo) => void | Promise<void>);

export interface FaultSpec {
  api: FaultApi | FaultApi[] | RegExp;
  /** String = substring of `info.target`; RegExp tested on target; function gets the whole CallInfo. */
  match?: string | RegExp | ((info: CallInfo) => boolean);
  /** Substring/RegExp matched against the database host path (sqlite.* only). */
  database?: string | RegExp;
  /** Ignore the first N matching calls. Default 0. */
  skip?: number;
  /** How many times the rule fires. Default 1. Use Infinity for "always". */
  times?: number;
  /** Fire before the operation (default) or after it succeeded. */
  phase?: "before" | "after";
  /** Default "throw". "kill" simulates process death. "pause" blocks the (async) call until released. */
  action?: FaultAction;
  error?: Error | string | (() => Error);
  label?: string;
}

export interface FaultRule extends Required<Pick<FaultSpec, "skip" | "times" | "phase">> {
  spec: FaultSpec;
  hits: number;
  fired: number;
  removed: boolean;
  paused: { info: CallInfo; release: () => void; reject: (error: Error) => void }[];
  hitWaiters: (() => void)[];
}

export interface TraceEntry {
  seq: number;
  api: string;
  phase: "before" | "after" | "error";
  target: string;
  database?: string;
  error?: string;
}

export interface SqliteConnectionRecordLike {
  id: number;
  closed: boolean;
  forceClose(): void;
}

export interface SharedRecord {
  url: string;
  options: unknown;
  existed: boolean;
  size: number | null;
  savedCopy: string | null;
}

export interface PickerEntry {
  kind: "file" | "cancel";
  sourcePath?: string;
  name?: string;
  mimeType?: string;
}

export interface HarnessState {
  platform: HarnessPlatform;
  hopMode: HopMode;
  realSetImmediate: (callback: () => void) => unknown;
  testRoot: string | null;
  appRoot: string | null;
  externalRoot: string | null;
  installCount: number;
  jsEpoch: number;
  nativeEpoch: number;
  dead: boolean;
  deathReason: string | null;
  booted: boolean;
  asyncStorage: Map<string, string>;
  sqliteConnections: SqliteConnectionRecordLike[];
  sqliteNextId: number;
  inflight: Set<Promise<unknown>>;
  openHandles: Set<{ close(): void }>;
  faults: FaultRule[];
  traceEnabled: boolean;
  trace: TraceEntry[];
  traceSeq: number;
  sharingAvailable: boolean;
  sharingSaveCopies: boolean;
  shared: SharedRecord[];
  pickerQueue: PickerEntry[];
  warnings: string[];
  keepTmp: boolean;
}

const KEY = "__SPARKLY_NATIVE_SQLITE_HARNESS__";

function createState(): HarnessState {
  return {
    platform: "ios",
    hopMode: "macrotask",
    realSetImmediate: globalThis.setImmediate.bind(globalThis) as HarnessState["realSetImmediate"],
    testRoot: null,
    appRoot: null,
    externalRoot: null,
    installCount: 0,
    jsEpoch: 1,
    nativeEpoch: 1,
    dead: false,
    deathReason: null,
    booted: false,
    asyncStorage: new Map(),
    sqliteConnections: [],
    sqliteNextId: 1,
    inflight: new Set(),
    openHandles: new Set(),
    faults: [],
    traceEnabled: false,
    trace: [],
    traceSeq: 0,
    sharingAvailable: true,
    sharingSaveCopies: true,
    shared: [],
    pickerQueue: [],
    warnings: [],
    keepTmp: process.env.NATIVE_SQLITE_KEEP_TMP === "1",
  };
}

export function harnessState(): HarnessState {
  const holder = globalThis as unknown as Record<string, HarnessState | undefined>;
  holder[KEY] ??= createState();
  return holder[KEY];
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class HarnessError extends Error {
  constructor(message: string) {
    super(`[native-sqlite] ${message}`);
    this.name = "HarnessError";
  }
}

export class SimulatedProcessDeath extends Error {
  constructor(message: string) {
    super(`[native-sqlite] simulated process death: ${message}`);
    this.name = "SimulatedProcessDeath";
  }
}

export class InjectedFault extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InjectedFault";
  }
}

export function isSimulatedProcessDeath(error: unknown): boolean {
  return error instanceof Error && error.name === "SimulatedProcessDeath";
}

/**
 * Error shape surfaced by Expo modules for a failing native function.
 * iOS: "Calling the 'fn' function has failed\n→ Caused by: <reason>"
 * Android: "Call to function 'Module.fn' has been rejected.\n→ Caused by: <reason>"
 */
export function expoNativeError(
  moduleName: string,
  functionName: string,
  reason: string,
  code = "ERR_INTERNAL_SQLITE_ERROR",
): Error & { code: string } {
  const platform = harnessState().platform;
  const message = platform === "android"
    ? `Call to function '${moduleName}.${functionName}' has been rejected.\n→ Caused by: ${reason}`
    : `Calling the '${functionName}' function has failed\n→ Caused by: ${reason}`;
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  return error;
}

// ---------------------------------------------------------------------------
// Liveness (process death + stale module instances)
// ---------------------------------------------------------------------------

export function assertAlive(moduleJsEpoch: number, what: string): void {
  const state = harnessState();
  if (state.dead) {
    throw new SimulatedProcessDeath(`${what} called after the process was killed (${state.deathReason ?? "kill"})`);
  }
  if (moduleJsEpoch !== state.jsEpoch) {
    throw new SimulatedProcessDeath(`${what} called from a module instance that belongs to a previous app process`);
  }
}

export function hop(): Promise<void> {
  const state = harnessState();
  if (state.hopMode === "none") return Promise.resolve();
  if (state.hopMode === "microtask") return Promise.resolve();
  return new Promise((resolve) => {
    state.realSetImmediate(resolve);
  });
}

export function trackInflight<T>(promise: Promise<T>): Promise<T> {
  const state = harnessState();
  state.inflight.add(promise);
  const done = () => state.inflight.delete(promise);
  promise.then(done, done);
  return promise;
}

// ---------------------------------------------------------------------------
// Trace + fault injection
// ---------------------------------------------------------------------------

function record(info: CallInfo, phase: TraceEntry["phase"], error?: unknown): void {
  const state = harnessState();
  if (!state.traceEnabled) return;
  state.traceSeq += 1;
  state.trace.push({
    seq: state.traceSeq,
    api: info.api,
    phase,
    target: info.target,
    database: info.database,
    error: error instanceof Error ? error.message : error === undefined ? undefined : String(error),
  });
}

export function traceError(info: CallInfo, error: unknown): void {
  record(info, "error", error);
}

function apiMatches(spec: FaultSpec, api: string): boolean {
  if (spec.api instanceof RegExp) return spec.api.test(api);
  if (Array.isArray(spec.api)) return spec.api.includes(api);
  return spec.api === api || (spec.api.endsWith(".*") && api.startsWith(spec.api.slice(0, -1)));
}

function targetMatches(spec: FaultSpec, info: CallInfo): boolean {
  const { match } = spec;
  if (match === undefined) return true;
  if (typeof match === "string") return info.target.includes(match);
  if (match instanceof RegExp) return match.test(info.target);
  return match(info);
}

function databaseMatches(spec: FaultSpec, info: CallInfo): boolean {
  if (spec.database === undefined) return true;
  const database = info.database ?? "";
  return typeof spec.database === "string" ? database.includes(spec.database) : spec.database.test(database);
}

function faultError(rule: FaultRule, info: CallInfo): Error {
  const { error } = rule.spec;
  if (error instanceof Error) return error;
  if (typeof error === "function") return error();
  return new InjectedFault(error ?? `[native-sqlite] injected fault at ${info.api}: ${info.target.slice(0, 120)}`);
}

function matchingRules(info: CallInfo, phase: "before" | "after"): FaultRule[] {
  const state = harnessState();
  const fired: FaultRule[] = [];
  for (const rule of state.faults) {
    if (rule.removed || rule.phase !== phase) continue;
    if (!apiMatches(rule.spec, info.api) || !targetMatches(rule.spec, info) || !databaseMatches(rule.spec, info)) {
      continue;
    }
    rule.hits += 1;
    if (rule.hits <= rule.skip || rule.fired >= rule.times) continue;
    rule.fired += 1;
    fired.push(rule);
  }
  return fired;
}

function kill(info: CallInfo): never {
  const state = harnessState();
  state.dead = true;
  state.deathReason = `${info.api} ${info.target.slice(0, 160)}`;
  throw new SimulatedProcessDeath(`killed at ${state.deathReason}`);
}

/** Synchronous checkpoint (used by sync APIs such as File.exists / File.delete). */
export function checkpointSync(info: CallInfo, phase: "before" | "after" = "before"): void {
  record(info, phase);
  for (const rule of matchingRules(info, phase)) {
    const action = rule.spec.action ?? "throw";
    if (action === "throw") throw faultError(rule, info);
    if (action === "kill") kill(info);
    if (action === "pause") {
      throw new HarnessError(`fault action "pause" is not supported for synchronous API ${info.api}`);
    }
    if (typeof action === "function") {
      const result = action(info);
      if (result && typeof (result as Promise<void>).then === "function") {
        throw new HarnessError(`async fault callbacks are not supported for synchronous API ${info.api}`);
      }
    }
  }
}

/** Asynchronous checkpoint (supports "pause" and async callbacks). */
export async function checkpointAsync(info: CallInfo, phase: "before" | "after" = "before"): Promise<void> {
  record(info, phase);
  for (const rule of matchingRules(info, phase)) {
    const action = rule.spec.action ?? "throw";
    if (action === "throw") throw faultError(rule, info);
    if (action === "kill") kill(info);
    if (action === "pause") {
      await new Promise<void>((resolve, reject) => {
        rule.paused.push({ info, release: resolve, reject });
        rule.hitWaiters.splice(0).forEach((notify) => notify());
      });
      const state = harnessState();
      if (state.dead) throw new SimulatedProcessDeath(`paused call ${info.api} resumed after process death`);
      continue;
    }
    if (typeof action === "function") await action(info);
  }
}

export interface FaultHandle {
  readonly hits: number;
  readonly fired: number;
  /** Paused calls waiting for release (action "pause"). */
  readonly pausedCount: number;
  /** Resolves when at least one call is paused by this rule. */
  waitForPause(): Promise<CallInfo>;
  /** Releases all paused calls. */
  release(): void;
  remove(): void;
}

export function addFault(spec: FaultSpec): FaultHandle {
  const state = harnessState();
  const rule: FaultRule = {
    spec,
    skip: spec.skip ?? 0,
    times: spec.times ?? 1,
    phase: spec.phase ?? "before",
    hits: 0,
    fired: 0,
    removed: false,
    paused: [],
    hitWaiters: [],
  };
  state.faults.push(rule);
  return {
    get hits() { return rule.hits; },
    get fired() { return rule.fired; },
    get pausedCount() { return rule.paused.length; },
    waitForPause() {
      if (rule.paused.length > 0) return Promise.resolve(rule.paused[0].info);
      return new Promise((resolve) => {
        rule.hitWaiters.push(() => resolve(rule.paused[0].info));
      });
    },
    release() {
      rule.paused.splice(0).forEach((entry) => entry.release());
    },
    remove() {
      rule.removed = true;
      rule.paused.splice(0).forEach((entry) => entry.release());
    },
  };
}

export function clearFaults(): void {
  const state = harnessState();
  for (const rule of state.faults) {
    rule.removed = true;
    rule.paused.splice(0).forEach((entry) => entry.reject(new SimulatedProcessDeath("fault rules cleared")));
  }
  state.faults = [];
}

// ---------------------------------------------------------------------------
// Emulated app container layout
// ---------------------------------------------------------------------------

export interface AppLayout {
  appRoot: string;
  documentsDir: string;
  cacheDir: string;
  sqliteDir: string;
  bundleDir: string;
}

export function appLayout(): AppLayout {
  const state = harnessState();
  if (!state.appRoot) throw new HarnessError("no app container: is tests/native-sqlite/setup.ts registered as setupFile?");
  const appRoot = state.appRoot;
  if (state.platform === "android") {
    return {
      appRoot,
      documentsDir: path.join(appRoot, "files"),
      cacheDir: path.join(appRoot, "cache"),
      sqliteDir: path.join(appRoot, "files", "SQLite"),
      bundleDir: path.join(appRoot, "bundle"),
    };
  }
  return {
    appRoot,
    documentsDir: path.join(appRoot, "Documents"),
    cacheDir: path.join(appRoot, "Library", "Caches"),
    sqliteDir: path.join(appRoot, "Documents", "SQLite"),
    bundleDir: path.join(appRoot, "Bundle.app"),
  };
}

export function createAppContainer(): string {
  const state = harnessState();
  if (!state.testRoot) throw new HarnessError("no test root");
  state.installCount += 1;
  const appRoot = path.join(state.testRoot, `install-${state.installCount}`);
  state.appRoot = appRoot;
  const layout = appLayout();
  fs.mkdirSync(layout.documentsDir, { recursive: true });
  fs.mkdirSync(layout.cacheDir, { recursive: true });
  fs.mkdirSync(layout.bundleDir, { recursive: true });
  return appRoot;
}

export function isInside(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

/** Throws unless the host path is inside the per-test temp root (protects the host FS). */
export function assertInsideTestRoot(hostPath: string): void {
  const state = harnessState();
  if (!state.testRoot || !isInside(state.testRoot, path.resolve(hostPath))) {
    throw new HarnessError(`refusing to touch ${hostPath}: outside the per-test sandbox ${state.testRoot ?? "<none>"}`);
  }
}

export function newTestRoot(): string {
  const base = process.env.NATIVE_SQLITE_TMP ?? os.tmpdir();
  fs.mkdirSync(base, { recursive: true });
  return fs.realpathSync(fs.mkdtempSync(path.join(base, "sparkly-native-sqlite-")));
}

/** Forcefully "kills the process": closes every native resource (uncommitted transactions roll back). */
export async function shutdownNative(reason: string): Promise<void> {
  const state = harnessState();
  state.dead = true;
  state.deathReason ??= reason;
  const inflight = [...state.inflight];
  await Promise.allSettled(inflight);
  for (const connection of [...state.sqliteConnections]) {
    try {
      connection.forceClose();
    } catch {
      // A crashed process does not get to close cleanly either.
    }
  }
  state.sqliteConnections = [];
  for (const handle of [...state.openHandles]) {
    try {
      handle.close();
    } catch {
      // ignore
    }
  }
  state.openHandles.clear();
  for (const rule of state.faults) {
    rule.paused.splice(0).forEach((entry) => entry.reject(new SimulatedProcessDeath("process killed while paused")));
  }
}

export function reviveProcess(): void {
  const state = harnessState();
  state.jsEpoch += 1;
  state.nativeEpoch += 1;
  state.dead = false;
  state.deathReason = null;
}
