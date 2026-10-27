/**
 * Fake of the `ExpoSQLite` NATIVE module (what `requireNativeModule('ExpoSQLite')`
 * returns on device), implemented over Node 22's `node:sqlite`.
 *
 * The public expo-sqlite API (SQLiteDatabase, withExclusiveTransactionAsync,
 * getEachAsync, normalizeParams, ...) is the REAL JS layer from
 * node_modules/expo-sqlite/build, wired to this module by the vitest config.
 *
 * Semantics mirrored from expo-sqlite 57.0.3 ios/SQLiteModule.swift and
 * android/.../SQLiteModule.kt + NativeDatabaseBinding.cpp:
 *  - connections opened without `useNewConnection` are cached per databasePath+options and ref-counted
 *  - no busy timeout (SQLITE_BUSY surfaces immediately as "database is locked")
 *  - foreign keys OFF and double-quoted string literals ON (vendored SQLite defaults)
 *  - array params bound by raw index, out-of-range params silently ignored
 *  - integral JS numbers bound as INTEGER, others as REAL; INTEGER read back as JS number
 *  - deleteDatabase removes ONLY the main file, refuses open DBs, throws if missing
 *  - backup = sqlite3_backup_init/step(-1)/finish into the destination (content fully replaced)
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { backup as nodeBackup, DatabaseSync, type StatementSync } from "node:sqlite";

import {
  appLayout,
  assertAlive,
  assertInsideTestRoot,
  checkpointAsync,
  checkpointSync,
  expoNativeError,
  HarnessError,
  harnessState,
  hop,
  traceError,
  trackInflight,
  type CallInfo,
  type SqliteConnectionRecordLike,
} from "../core/state";
import { scanSqlParameters, type SqlParamInfo } from "../core/sql-params";

const MODULE_JS_EPOCH = harnessState().jsEpoch;
const MODULE = "ExpoSQLite";

type BindValue = string | number | bigint | null | Uint8Array;

interface OpenOptions {
  enableChangeListener: boolean;
  useNewConnection: boolean;
  finalizeUnusedStatementsBeforeClosing: boolean;
  libSQLUrl: string | null;
  libSQLAuthToken: string | null;
  libSQLRemoteOnly: boolean;
}

interface StatementRecord {
  connection: ConnectionRecord;
  sql: string;
  statement: StatementSync;
  params: SqlParamInfo;
  args: BindValue[] | null;
  named: Record<string, BindValue> | null;
  iterator: Iterator<unknown[]> | null;
  finalized: boolean;
}

export interface ConnectionRecord extends SqliteConnectionRecordLike {
  databasePath: string;
  filePath: string;
  options: OpenOptions;
  db: DatabaseSync;
  refCount: number;
  nativeEpoch: number;
  statements: Set<StatementRecord>;
  changeCounter: StatementSync | null;
}

const SQLITE_ERROR_STRINGS: Record<number, string> = {
  1: "SQL logic error",
  5: "database is locked",
  6: "database table is locked",
  11: "database disk image is malformed",
  13: "database or disk is full",
  14: "unable to open database file",
  19: "constraint failed",
  26: "file is not a database",
};

function connections(): ConnectionRecord[] {
  return harnessState().sqliteConnections as ConnectionRecord[];
}

function normalizeOptions(raw: unknown): OpenOptions {
  const options = (raw ?? {}) as Partial<OpenOptions>;
  return {
    enableChangeListener: options.enableChangeListener === true,
    useNewConnection: options.useNewConnection === true,
    finalizeUnusedStatementsBeforeClosing: options.finalizeUnusedStatementsBeforeClosing !== false,
    libSQLUrl: options.libSQLUrl ?? null,
    libSQLAuthToken: options.libSQLAuthToken ?? null,
    libSQLRemoteOnly: options.libSQLRemoteOnly === true,
  };
}

function sameOptions(first: OpenOptions, second: OpenOptions): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}

/**
 * iOS: `URL(string:)` → file URL: decoded `.path`; no scheme: the raw string is used as path.
 * Android: `Uri.toUri().path` (decoded) → canonical path.
 */
export function resolveDatabaseFilePath(databasePath: string): string {
  if (databasePath === ":memory:") return databasePath;
  let filePath: string;
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(databasePath)?.[1]?.toLowerCase();
  if (scheme === "file") {
    filePath = decodeURIComponent(new URL(databasePath).pathname);
  } else if (scheme) {
    throw new HarnessError(`unsupported database URI scheme "${scheme}:" in ${databasePath}`);
  } else {
    filePath = harnessState().platform === "android" ? decodeURIComponent(databasePath) : databasePath;
  }
  filePath = path.resolve("/", filePath);
  assertInsideTestRoot(filePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  return filePath;
}

function primaryCode(error: unknown): number {
  const errcode = (error as { errcode?: number }).errcode;
  return typeof errcode === "number" ? errcode & 0xff : 1;
}

function sqliteReason(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return `Error code ${primaryCode(error)}: ${message}`;
}

function toBindValue(value: unknown, fn: string): BindValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    // iOS: NSNumber → Int64 when exactly representable, Android: Double with no fraction → Long.
    return Number.isInteger(value) && Math.abs(value) < 2 ** 63 ? BigInt(value) : value;
  }
  if (typeof value === "string" || typeof value === "bigint") return value;
  if (typeof value === "boolean") return value ? 1n : 0n;
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  throw expoNativeError(MODULE, fn, `Unsupported parameter type: ${Object.prototype.toString.call(value)}`,
    "ERR_INVALID_CONVERTIBLE");
}

function convertColumn(value: unknown): unknown {
  if (typeof value === "bigint") return Number(value);
  if (value instanceof Uint8Array) {
    return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
  }
  return value;
}

function convertRow(row: unknown): unknown[] {
  return (row as unknown[]).map(convertColumn);
}

function info(api: string, target: string, connection?: ConnectionRecord, detail?: Record<string, unknown>): CallInfo {
  return { api, target, database: connection?.filePath, detail };
}

function openConnection(databasePath: string, options: OpenOptions, filePath: string): ConnectionRecord {
  const state = harnessState();
  let db: DatabaseSync;
  try {
    db = new DatabaseSync(filePath, {
      enableForeignKeyConstraints: false,
      enableDoubleQuotedStringLiterals: true,
      timeout: 0,
    });
  } catch (error) {
    throw expoNativeError(MODULE, "NativeDatabase", `Could not open database: ${sqliteReason(error)}`,
      "E_SQLITE_OPEN_DATABASE");
  }
  const record: ConnectionRecord = {
    id: state.sqliteNextId++,
    databasePath,
    filePath,
    options,
    db,
    refCount: 1,
    closed: false,
    nativeEpoch: state.nativeEpoch,
    statements: new Set(),
    changeCounter: null,
    forceClose() {
      record.closed = true;
      for (const statement of record.statements) closeIterator(statement);
      record.statements.clear();
      if (record.db.isOpen) record.db.close();
    },
  };
  state.sqliteConnections.push(record);
  return record;
}

function closeIterator(statement: StatementRecord): void {
  const iterator = statement.iterator;
  statement.iterator = null;
  if (iterator && typeof iterator.return === "function") {
    try {
      iterator.return();
    } catch {
      // ignore
    }
  }
}

function activeStatementCount(connection: ConnectionRecord): number {
  let active = 0;
  for (const statement of connection.statements) if (statement.iterator) active += 1;
  return active;
}

function changeCounters(connection: ConnectionRecord): { changes: number; lastInsertRowId: number } {
  connection.changeCounter ??= (() => {
    const statement = connection.db.prepare("SELECT changes() AS c, last_insert_rowid() AS r");
    statement.setReadBigInts(true);
    statement.setReturnArrays(true);
    return statement;
  })();
  const row = connection.changeCounter.get() as unknown as [bigint, bigint];
  return { changes: Number(row[0]), lastInsertRowId: Number(row[1]) };
}

const DB_RECORD = Symbol.for("sparkly-native-sqlite.sqlite.connection");
const STATEMENT_RECORD = Symbol.for("sparkly-native-sqlite.sqlite.statement");

function recordOf(database: NativeDatabase, fn: string): ConnectionRecord {
  assertAlive(MODULE_JS_EPOCH, `${MODULE}.${fn}`);
  const record = (database as unknown as Record<symbol, ConnectionRecord | undefined>)[DB_RECORD];
  if (!record) throw new HarnessError(`${fn}: argument is not a NativeDatabase`);
  if (record.closed || record.nativeEpoch !== harnessState().nativeEpoch) {
    throw expoNativeError(MODULE, fn, "Access to closed resource", "ERR_ACCESS_CLOSED_RESOURCE");
  }
  return record;
}

function closeRecord(record: ConnectionRecord): void {
  record.refCount -= 1;
  if (record.refCount > 0) return;
  const state = harnessState();
  state.sqliteConnections = state.sqliteConnections.filter((candidate) => candidate !== record);
  if (!record.options.finalizeUnusedStatementsBeforeClosing && [...record.statements].some((s) => !s.finalized)) {
    // iOS marks the wrapper closed but sqlite3_close fails with SQLITE_BUSY and the handle leaks.
    record.closed = true;
    state.warnings.push(`leaked SQLite connection to ${record.filePath} (unfinalized statements)`);
    throw expoNativeError(MODULE, "closeAsync",
      "Error code 5: unable to close due to unfinalized statements or unfinished backups");
  }
  for (const statement of record.statements) {
    closeIterator(statement);
    statement.finalized = true;
  }
  record.statements.clear();
  record.closed = true;
  record.db.close();
}

export class NativeDatabase {
  declare [DB_RECORD]: ConnectionRecord;

  constructor(databasePath: string, rawOptions?: unknown, serializedData?: Uint8Array) {
    assertAlive(MODULE_JS_EPOCH, "NativeDatabase constructor");
    const options = normalizeOptions(rawOptions);
    checkpointSync(info("sqlite.open", databasePath));
    if (options.libSQLUrl) throw new HarnessError("libSQL is not supported by the native SQLite harness");
    let record: ConnectionRecord | undefined;
    if (serializedData) {
      const temp = path.join(appLayout().appRoot, ".harness-deserialized", `${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
      fs.mkdirSync(path.dirname(temp), { recursive: true });
      fs.writeFileSync(temp, serializedData);
      record = openConnection(":memory:", options, temp);
    } else {
      record = connections().find((candidate) => !candidate.closed
        && candidate.databasePath === databasePath
        && sameOptions(candidate.options, options)
        && !options.useNewConnection);
      if (record) {
        record.refCount += 1;
      } else {
        record = openConnection(databasePath, options, resolveDatabaseFilePath(databasePath));
      }
    }
    Object.defineProperty(this, DB_RECORD, { value: record, enumerable: false });
  }

  async initAsync(): Promise<void> {
    await hop();
    this.initSync();
  }

  initSync(): void {
    const record = recordOf(this, "initAsync");
    if (record.options.enableChangeListener) {
      harnessState().warnings.push("enableChangeListener is ignored by the native SQLite harness");
    }
  }

  async isInTransactionAsync(): Promise<boolean> {
    await hop();
    return this.isInTransactionSync();
  }

  isInTransactionSync(): boolean {
    return recordOf(this, "isInTransactionAsync").db.isTransaction;
  }

  async closeAsync(): Promise<void> {
    await hop();
    const record = recordOf(this, "closeAsync");
    await checkpointAsync(info("sqlite.close", record.databasePath, record));
    closeRecord(record);
    await checkpointAsync(info("sqlite.close", record.databasePath, record), "after");
  }

  closeSync(): void {
    const record = recordOf(this, "closeSync");
    checkpointSync(info("sqlite.close", record.databasePath, record));
    closeRecord(record);
  }

  async execAsync(source: string): Promise<void> {
    await hop();
    const record = recordOf(this, "execAsync");
    const callInfo = info("sqlite.exec", source, record);
    await checkpointAsync(callInfo);
    try {
      record.db.exec(source);
    } catch (error) {
      traceError(callInfo, error);
      // sqlite3_exec error string only (no "Error code N:" prefix), as in iOS/Android exec().
      throw expoNativeError(MODULE, "execAsync", error instanceof Error ? error.message : String(error));
    }
    await checkpointAsync(callInfo, "after");
  }

  execSync(source: string): void {
    const record = recordOf(this, "execSync");
    const callInfo = info("sqlite.exec", source, record);
    checkpointSync(callInfo);
    try {
      record.db.exec(source);
    } catch (error) {
      traceError(callInfo, error);
      throw expoNativeError(MODULE, "execSync", error instanceof Error ? error.message : String(error));
    }
    checkpointSync(callInfo, "after");
  }

  async serializeAsync(databaseName: string): Promise<Uint8Array> {
    await hop();
    return this.serializeSync(databaseName);
  }

  serializeSync(databaseName: string): Uint8Array {
    const record = recordOf(this, "serializeSync");
    const temp = path.join(os.tmpdir(), `sparkly-native-sqlite-serialize-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    try {
      // Content-equivalent (not page-identical) snapshot: node:sqlite 22 has no sqlite3_serialize.
      record.db.prepare(`VACUUM ${databaseName === "main" ? "main" : `"${databaseName}"`} INTO ?`).run(temp);
      return new Uint8Array(fs.readFileSync(temp));
    } catch (error) {
      throw expoNativeError(MODULE, "serializeAsync", sqliteReason(error));
    } finally {
      fs.rmSync(temp, { force: true });
    }
  }

  async prepareAsync(nativeStatement: NativeStatement, source: string): Promise<NativeStatement> {
    await hop();
    return this.prepareSync(nativeStatement, source, "prepareAsync");
  }

  prepareSync(nativeStatement: NativeStatement, source: string, fn = "prepareSync"): NativeStatement {
    const record = recordOf(this, fn);
    if ((nativeStatement as unknown as Record<symbol, StatementRecord | undefined>)[STATEMENT_RECORD]?.finalized) {
      throw expoNativeError(MODULE, fn, "Access to closed resource", "ERR_ACCESS_CLOSED_RESOURCE");
    }
    const callInfo = info("sqlite.prepare", source, record);
    checkpointSync(callInfo);
    let statement: StatementSync;
    try {
      statement = record.db.prepare(source);
    } catch (error) {
      traceError(callInfo, error);
      throw expoNativeError(MODULE, fn, sqliteReason(error));
    }
    statement.setReadBigInts(true);
    statement.setReturnArrays(true);
    statement.setAllowBareNamedParameters(false);
    statement.setAllowUnknownNamedParameters(true);
    const statementRecord: StatementRecord = {
      connection: record,
      sql: source,
      statement,
      params: scanSqlParameters(source),
      args: null,
      named: null,
      iterator: null,
      finalized: false,
    };
    record.statements.add(statementRecord);
    Object.defineProperty(nativeStatement, STATEMENT_RECORD, { value: statementRecord, configurable: true });
    return nativeStatement;
  }

  createSessionAsync(): Promise<never> {
    return Promise.reject(new HarnessError("SQLite sessions are not supported by the native SQLite harness"));
  }

  createSessionSync(): never {
    throw new HarnessError("SQLite sessions are not supported by the native SQLite harness");
  }

  loadExtensionAsync(): Promise<never> {
    return Promise.reject(new HarnessError("loadExtension is not supported by the native SQLite harness"));
  }

  loadExtensionSync(): never {
    throw new HarnessError("loadExtension is not supported by the native SQLite harness");
  }

  syncLibSQL(): Promise<never> {
    return Promise.reject(new Error("syncLibSQL is not supported in the current environment"));
  }
}

function statementOf(statement: NativeStatement, database: NativeDatabase, fn: string): StatementRecord {
  const connection = recordOf(database, fn);
  const record = (statement as unknown as Record<symbol, StatementRecord | undefined>)[STATEMENT_RECORD];
  if (!record || record.finalized) {
    throw expoNativeError(MODULE, fn, "Access to closed resource", "ERR_ACCESS_CLOSED_RESOURCE");
  }
  if (record.connection !== connection) {
    throw new HarnessError(`${fn}: statement was prepared on another connection`);
  }
  return record;
}

function bindArguments(
  record: StatementRecord,
  bindParams: Record<string, unknown>,
  bindBlobParams: Record<string, unknown>,
  shouldPassAsArray: boolean,
  fn: string,
): void {
  const { count, names } = record.params;
  const byIndex = new Map<number, BindValue>();
  const bind = (key: string, value: unknown) => {
    let index: number;
    if (shouldPassAsArray) {
      if (!/^\d+$/.test(key)) {
        throw expoNativeError(MODULE, fn, "Invalid bind parameter", "ERR_INVALID_BIND_PARAMETER");
      }
      index = Number(key) + 1;
    } else {
      index = names.indexOf(key) + 1; // sqlite3_bind_parameter_index: exact name incl. prefix
    }
    // Out-of-range indexes: sqlite3_bind_* returns SQLITE_RANGE, which expo ignores.
    if (index > 0 && index <= count) byIndex.set(index, toBindValue(value, fn));
  };
  for (const [key, value] of Object.entries(bindParams)) bind(key, value);
  for (const [key, value] of Object.entries(bindBlobParams)) bind(key, value);
  const positional: BindValue[] = [];
  const named: Record<string, BindValue> = {};
  for (let index = 1; index <= count; index += 1) {
    const name = names[index - 1];
    if (name === null || name.startsWith("?")) {
      positional.push(byIndex.has(index) ? byIndex.get(index)! : null);
    } else if (byIndex.has(index)) {
      named[name] = byIndex.get(index)!;
    }
  }
  record.args = positional;
  record.named = named;
}

function startIteration(record: StatementRecord): Iterator<unknown[]> {
  const iterable = record.statement.iterate(record.named ?? {}, ...(record.args ?? []));
  return iterable as unknown as Iterator<unknown[]>;
}

function stepOnce(record: StatementRecord, fn: string, callInfo: CallInfo): unknown[] | null {
  try {
    // sqlite3_step after SQLITE_DONE auto-resets and re-runs the statement (SQLite >= 3.6.23.1).
    record.iterator ??= startIteration(record);
    const next = record.iterator.next();
    if (next.done) {
      record.iterator = null;
      return null;
    }
    return convertRow(next.value);
  } catch (error) {
    // A failed step (e.g. SQLITE_BUSY) leaves the VM un-reset and holding its read snapshot;
    // expo finalizes the statement right after, so reset it here.
    closeIterator(record);
    traceError(callInfo, error);
    if (error instanceof HarnessError) throw error;
    throw expoNativeError(MODULE, fn, sqliteReason(error));
  }
}

export class NativeStatement {
  declare [STATEMENT_RECORD]: StatementRecord | undefined;

  async runAsync(
    database: NativeDatabase,
    bindParams: Record<string, unknown>,
    bindBlobParams: Record<string, unknown>,
    shouldPassAsArray: boolean,
  ): Promise<{ lastInsertRowId: number; changes: number; firstRowValues: unknown[] }> {
    await hop();
    const record = statementOf(this, database, "runAsync");
    const callInfo = info("sqlite.run", record.sql, record.connection, { bindParams, shouldPassAsArray });
    await checkpointAsync(callInfo);
    const result = this.runInternal(record, bindParams, bindBlobParams, shouldPassAsArray, "runAsync", callInfo);
    await checkpointAsync(callInfo, "after");
    return result;
  }

  runSync(
    database: NativeDatabase,
    bindParams: Record<string, unknown>,
    bindBlobParams: Record<string, unknown>,
    shouldPassAsArray: boolean,
  ): { lastInsertRowId: number; changes: number; firstRowValues: unknown[] } {
    const record = statementOf(this, database, "runSync");
    const callInfo = info("sqlite.run", record.sql, record.connection, { bindParams, shouldPassAsArray });
    checkpointSync(callInfo);
    const result = this.runInternal(record, bindParams, bindBlobParams, shouldPassAsArray, "runSync", callInfo);
    checkpointSync(callInfo, "after");
    return result;
  }

  private runInternal(
    record: StatementRecord,
    bindParams: Record<string, unknown>,
    bindBlobParams: Record<string, unknown>,
    shouldPassAsArray: boolean,
    fn: string,
    callInfo: CallInfo,
  ): { lastInsertRowId: number; changes: number; firstRowValues: unknown[] } {
    closeIterator(record); // sqlite3_reset + sqlite3_clear_bindings
    bindArguments(record, bindParams ?? {}, bindBlobParams ?? {}, shouldPassAsArray, fn);
    const firstRow = stepOnce(record, fn, callInfo);
    const counters = changeCounters(record.connection);
    return { ...counters, firstRowValues: firstRow ?? [] };
  }

  async stepAsync(database: NativeDatabase): Promise<unknown[] | null> {
    await hop();
    return this.stepInternal(database, "stepAsync");
  }

  stepSync(database: NativeDatabase): unknown[] | null {
    return this.stepInternal(database, "stepSync");
  }

  private stepInternal(database: NativeDatabase, fn: string): unknown[] | null {
    const record = statementOf(this, database, fn);
    const callInfo = info("sqlite.step", record.sql, record.connection);
    checkpointSync(callInfo);
    return stepOnce(record, fn, callInfo);
  }

  async getAllAsync(database: NativeDatabase): Promise<unknown[][]> {
    await hop();
    return this.getAllInternal(database, "getAllAsync");
  }

  getAllSync(database: NativeDatabase): unknown[][] {
    return this.getAllInternal(database, "getAllSync");
  }

  private getAllInternal(database: NativeDatabase, fn: string): unknown[][] {
    const record = statementOf(this, database, fn);
    const callInfo = info("sqlite.getAll", record.sql, record.connection);
    checkpointSync(callInfo);
    const rows: unknown[][] = [];
    for (;;) {
      const row = stepOnce(record, fn, callInfo);
      if (row === null) break;
      rows.push(row);
    }
    return rows;
  }

  async resetAsync(database: NativeDatabase): Promise<void> {
    await hop();
    this.resetSync(database);
  }

  resetSync(database: NativeDatabase): void {
    const record = statementOf(this, database, "resetAsync");
    closeIterator(record); // bindings are kept by sqlite3_reset
  }

  async getColumnNamesAsync(): Promise<string[]> {
    await hop();
    return this.getColumnNamesSync();
  }

  getColumnNamesSync(): string[] {
    assertAlive(MODULE_JS_EPOCH, "getColumnNames");
    const record = this[STATEMENT_RECORD];
    if (!record || record.finalized) {
      throw expoNativeError(MODULE, "getColumnNamesAsync", "Access to closed resource", "ERR_ACCESS_CLOSED_RESOURCE");
    }
    return record.statement.columns().map((column) => column.name);
  }

  async finalizeAsync(database: NativeDatabase): Promise<void> {
    await hop();
    this.finalizeSync(database);
  }

  finalizeSync(database: NativeDatabase): void {
    const record = statementOf(this, database, "finalizeAsync");
    closeIterator(record);
    record.finalized = true;
    record.connection.statements.delete(record);
  }
}

export class NativeSession {
  constructor() {
    throw new HarnessError("SQLite sessions are not supported by the native SQLite harness");
  }
}

async function backupDatabaseAsync(
  destDatabase: NativeDatabase,
  destDatabaseName: string,
  sourceDatabase: NativeDatabase,
  sourceDatabaseName: string,
): Promise<void> {
  await hop();
  const destination = recordOf(destDatabase, "backupDatabaseAsync");
  const source = recordOf(sourceDatabase, "backupDatabaseAsync");
  const callInfo = info("sqlite.backup", `${source.filePath} -> ${destination.filePath}`, destination,
    { source: source.filePath, destination: destination.filePath });
  await checkpointAsync(callInfo);
  if (destination === source) {
    throw expoNativeError(MODULE, "backupDatabaseAsync", "Error code 1: source and destination must be distinct");
  }
  if (destDatabaseName !== "main") {
    throw new HarnessError("backupDatabaseAsync into an attached destination schema is not supported");
  }
  // sqlite3_backup_init fails when the destination connection has an open (read) transaction.
  if (destination.db.isTransaction || activeStatementCount(destination) > 0) {
    throw expoNativeError(MODULE, "backupDatabaseAsync", "Error code 1: destination database is in use");
  }
  if (destination.databasePath === ":memory:" && !fs.existsSync(destination.filePath)) {
    throw new HarnessError("backupDatabaseAsync into an in-memory database is not supported");
  }
  // node:sqlite only exposes backup-to-path: the pages are written through a second connection
  // to the destination file; the destination connection stays open and sees the new content.
  const job = nodeBackup(source.db, destination.filePath, { source: sourceDatabaseName, target: "main", rate: -1 });
  try {
    await trackInflight(job);
  } catch (error) {
    traceError(callInfo, error);
    const code = primaryCode(error);
    const reason = code === 0 || (error as { errcode?: number }).errcode === 0
      ? "Error code 5: database is locked"
      : `Error code ${code}: ${error instanceof Error ? error.message : SQLITE_ERROR_STRINGS[code] ?? "error"}`;
    throw expoNativeError(MODULE, "backupDatabaseAsync", reason);
  }
  await checkpointAsync(callInfo, "after");
}

async function deleteDatabaseAsync(databasePath: string): Promise<void> {
  await hop();
  deleteDatabaseSync(databasePath, "deleteDatabaseAsync");
}

function deleteDatabaseSync(databasePath: string, fn = "deleteDatabaseSync"): void {
  assertAlive(MODULE_JS_EPOCH, `${MODULE}.${fn}`);
  checkpointSync(info("sqlite.delete", databasePath));
  if (connections().some((record) => !record.closed && record.databasePath === databasePath)) {
    throw expoNativeError(MODULE, fn,
      `Unable to delete database ${databasePath} that is currently open. Close it prior to deletion`,
      "E_SQLITE_DELETE_DATABASE");
  }
  if (databasePath === ":memory:") return;
  const filePath = resolveDatabaseFilePath(databasePath);
  if (!fs.existsSync(filePath)) {
    throw expoNativeError(MODULE, fn, `Database ${filePath} not found`, "E_SQLITE_DELETE_DATABASE");
  }
  // Both iOS (FileManager.removeItem) and Android (File.delete) remove ONLY the main file:
  // -wal / -shm / -journal side files are left behind.
  fs.rmSync(filePath, { recursive: true });
  checkpointSync(info("sqlite.delete", databasePath), "after");
}

const ExpoSQLiteFake = {
  get defaultDatabaseDirectory(): string {
    // iOS: documentDirectory.appendingPathComponent("SQLite").standardized.path  (plain path)
    // Android: filesDir.canonicalPath + "/SQLite"                              (plain path)
    return appLayout().sqliteDir;
  },
  bundledExtensions: {} as Record<string, { libPath: string; entryPoint: string } | undefined>,
  NativeDatabase,
  NativeStatement,
  NativeSession,
  backupDatabaseAsync,
  backupDatabaseSync(): never {
    throw new HarnessError("backupDatabaseSync is not supported by the native SQLite harness (use backupDatabaseAsync)");
  },
  deleteDatabaseAsync,
  deleteDatabaseSync: (databasePath: string) => deleteDatabaseSync(databasePath),
  async ensureDatabasePathExistsAsync(databasePath: string): Promise<void> {
    await hop();
    assertAlive(MODULE_JS_EPOCH, `${MODULE}.ensureDatabasePathExistsAsync`);
    resolveDatabaseFilePath(databasePath);
  },
  ensureDatabasePathExistsSync(databasePath: string): void {
    assertAlive(MODULE_JS_EPOCH, `${MODULE}.ensureDatabasePathExistsSync`);
    resolveDatabaseFilePath(databasePath);
  },
  importAssetDatabaseAsync(): Promise<never> {
    return Promise.reject(new HarnessError("importAssetDatabaseAsync is not supported by the native SQLite harness"));
  },
  addListener(): { remove(): void } {
    return { remove() {} };
  },
  removeListeners(): void {},
};

export default ExpoSQLiteFake;
