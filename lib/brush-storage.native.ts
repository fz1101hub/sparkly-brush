import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";
import * as SQLite from "expo-sqlite";
import type { SQLiteDatabase } from "expo-sqlite";

import type { BrushSession, StoredDeviceSession, ToothbrushDevice } from "@/lib/brush-types";
import { parseBackupManifest } from "@/lib/backup";
import { runHistoryOperation } from "@/lib/history-operation";
import { reconcileLegacyProgress } from "@/lib/legacy-migration";
import { recoverApplicationRestore } from "@/lib/restore-journal";
import { createRewardLedgerEntries, type RewardLedgerEntry } from "@/lib/reward-ledger";
import {
  allocateDeviceSessionIdentity,
  applySessionToLifetime,
  clearPendingDeviceFallback,
  createEmptyLifetimeProgress,
  createLifetimeProgress,
  markPendingDeviceFallback,
  matchesPendingDeviceFallback,
  normalizeLifetimeProgress,
  type LifetimeProgress,
  type LifetimeProgressEvent,
} from "@/lib/lifetime-progress";

const DATABASE_NAME = "sparkly-brush.sqlite";
const RESTORE_ROLLBACK_DATABASE_NAME = "sparkly-brush-restore-rollback.sqlite";
const RESTORE_JOURNAL_KEY = "sparkly-brush.restore-in-progress.v1";
const PROGRESS_META_KEY = "lifetime-progress";
const HISTORY_COMPLETE_META_KEY = "history-complete";
const LAST_RESTORE_ID_META_KEY = "last-restore-id";
const REWARD_LEDGER_BACKFILLED_META_KEY = "reward-ledger-backfilled-v1";
const LEGACY_HISTORY_KEY = "sparkly-brush.history.v1";
const LEGACY_LIFETIME_HISTORY_KEY = "sparkly-brush.lifetime-history.v1";
const LEGACY_PROGRESS_STATE_KEY = "sparkly-brush.progress.v2";
const DEMO_HISTORY_KEY = "sparkly-brush.demo-history.v1";
const DEMO_MODE_KEY = "sparkly-brush.demo-mode.v1";
const DEVICE_KEY = "sparkly-brush.device.v1";
export const MAX_RECENT_HISTORY = 120;

export type HistoryBundle = {
  recentHistory: BrushSession[];
  lifetimeProgress: LifetimeProgress;
};

export type HistorySaveResult = HistoryBundle & {
  event: LifetimeProgressEvent | null;
};

export type CompleteBackupFile = {
  uri: string;
  size: number;
  sessionCount: number;
};

export type CompleteBackupInspection = {
  uri: string;
  manifestJson: string;
  sessionCount: number;
  size: number;
};

type SessionRow = {
  id: string;
  started_at: number;
  duration_seconds: number;
  target_seconds: number;
  completed: number;
  source: "manual" | "device";
  device_session_id: number | null;
};

type MetadataRow = { value: string };
type CountRow = { count: number };
type MaxStartedRow = { max_started_at: number | null };

type LegacyProgressState = {
  version: 2;
  recentHistory: unknown;
  lifetimeProgress: unknown;
};

let databasePromise: Promise<SQLiteDatabase> | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function queueWrite<T>(operation: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(operation, operation);
  writeQueue = result.then(() => undefined, () => undefined);
  return result;
}

function isBrushSession(value: unknown): value is BrushSession {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<BrushSession>;
  return typeof item.id === "string"
    && typeof item.startedAt === "number"
    && typeof item.durationSeconds === "number"
    && item.durationSeconds >= 0
    && typeof item.targetSeconds === "number"
    && item.targetSeconds > 0
    && typeof item.completed === "boolean"
    && (item.source === "manual" || item.source === "device");
}

function normalizeHistory(value: unknown, limit?: number): BrushSession[] {
  if (!Array.isArray(value)) return [];
  const byId = new Map<string, BrushSession>();
  value.forEach((item) => {
    if (isBrushSession(item)) byId.set(item.id, item);
  });
  const sorted = [...byId.values()].sort((first, second) => second.startedAt - first.startedAt);
  return typeof limit === "number" ? sorted.slice(0, limit) : sorted;
}

function parseStoredHistory(raw: string | null, limit?: number): BrushSession[] {
  if (!raw) return [];
  try {
    return normalizeHistory(JSON.parse(raw), limit);
  } catch {
    return [];
  }
}

function rowToSession(row: SessionRow): BrushSession {
  return {
    id: row.id,
    startedAt: row.started_at,
    durationSeconds: row.duration_seconds,
    targetSeconds: row.target_seconds,
    completed: row.completed === 1,
    source: row.source,
    deviceSessionId: row.device_session_id ?? undefined,
  };
}

async function createSchema(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = FULL;
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY NOT NULL,
      started_at INTEGER NOT NULL,
      duration_seconds INTEGER NOT NULL,
      target_seconds INTEGER NOT NULL,
      completed INTEGER NOT NULL CHECK (completed IN (0, 1)),
      source TEXT NOT NULL CHECK (source IN ('manual', 'device')),
      device_session_id INTEGER
    );
    CREATE INDEX IF NOT EXISTS sessions_started_at_idx
      ON sessions(started_at DESC, id DESC);
    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reward_ledger (
      id TEXT PRIMARY KEY NOT NULL,
      session_id TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('session', 'daily-missions', 'achievements')),
      coins INTEGER NOT NULL,
      xp INTEGER NOT NULL,
      details_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS reward_ledger_session_idx
      ON reward_ledger(session_id, created_at ASC);
  `);
}

async function recoverInterruptedRestore(db: SQLiteDatabase): Promise<void> {
  if ((await AsyncStorage.getItem(RESTORE_JOURNAL_KEY)) !== "true") return;
  const rollbackFile = new File(SQLite.defaultDatabaseDirectory, RESTORE_ROLLBACK_DATABASE_NAME);
  if (!rollbackFile.exists) {
    throw new Error("Ripristino interrotto: copia di sicurezza non disponibile");
  }
  const rollback = await SQLite.openDatabaseAsync(
    RESTORE_ROLLBACK_DATABASE_NAME,
    { useNewConnection: true },
  );
  try {
    await SQLite.backupDatabaseAsync({ sourceDatabase: rollback, destDatabase: db });
  } finally {
    await rollback.closeAsync();
  }
  await AsyncStorage.removeItem(RESTORE_JOURNAL_KEY);
  await SQLite.deleteDatabaseAsync(RESTORE_ROLLBACK_DATABASE_NAME).catch(() => undefined);
}

async function insertSession(
  db: Pick<SQLiteDatabase, "runAsync">,
  session: BrushSession,
): Promise<number> {
  const result = await db.runAsync(
    `INSERT OR IGNORE INTO sessions
      (id, started_at, duration_seconds, target_seconds, completed, source, device_session_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    session.id,
    session.startedAt,
    session.durationSeconds,
    session.targetSeconds,
    session.completed ? 1 : 0,
    session.source === "device" ? "device" : "manual",
    session.deviceSessionId ?? null,
  );
  return result.changes;
}

async function insertRewardLedgerEntries(
  db: Pick<SQLiteDatabase, "runAsync">,
  entries: RewardLedgerEntry[],
): Promise<void> {
  for (const entry of entries) {
    await db.runAsync(
      `INSERT OR IGNORE INTO reward_ledger
        (id, session_id, kind, coins, xp, details_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      entry.id,
      entry.sessionId,
      entry.kind,
      entry.coins,
      entry.xp,
      JSON.stringify(entry.details),
      entry.createdAt,
    );
  }
}

async function rebuildRewardLedger(
  db: Pick<SQLiteDatabase, "runAsync">,
  history: BrushSession[],
): Promise<void> {
  await db.runAsync("DELETE FROM reward_ledger");
  let progress = createEmptyLifetimeProgress();
  for (const session of [...history].sort((first, second) => first.startedAt - second.startedAt)) {
    const after = applySessionToLifetime(progress, session);
    await insertRewardLedgerEntries(db, createRewardLedgerEntries({ session, before: progress, after }));
    progress = after;
  }
  await db.runAsync(
    `INSERT INTO metadata (key, value) VALUES (?, 'true')
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    REWARD_LEDGER_BACKFILLED_META_KEY,
  );
}

async function writeProgress(
  db: Pick<SQLiteDatabase, "runAsync">,
  progress: LifetimeProgress,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO metadata (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    PROGRESS_META_KEY,
    JSON.stringify(progress),
  );
}

async function writeHistoryComplete(
  db: Pick<SQLiteDatabase, "runAsync">,
  complete: boolean,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO metadata (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    HISTORY_COMPLETE_META_KEY,
    complete ? "true" : "false",
  );
}

async function readHistoryComplete(
  db: Pick<SQLiteDatabase, "getFirstAsync">,
): Promise<boolean> {
  const row = await db.getFirstAsync<MetadataRow>(
    "SELECT value FROM metadata WHERE key = ?",
    HISTORY_COMPLETE_META_KEY,
  );
  return row?.value !== "false";
}

async function writeLastRestoreId(
  db: Pick<SQLiteDatabase, "runAsync">,
  restoreId: string,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO metadata (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    LAST_RESTORE_ID_META_KEY,
    restoreId,
  );
}

async function readLastRestoreId(
  db: Pick<SQLiteDatabase, "getFirstAsync">,
): Promise<string | null> {
  const row = await db.getFirstAsync<MetadataRow>(
    "SELECT value FROM metadata WHERE key = ?",
    LAST_RESTORE_ID_META_KEY,
  );
  return row?.value ?? null;
}

async function readProgress(
  db: Pick<SQLiteDatabase, "getFirstAsync" | "getAllAsync">,
): Promise<LifetimeProgress> {
  const row = await db.getFirstAsync<MetadataRow>(
    "SELECT value FROM metadata WHERE key = ?",
    PROGRESS_META_KEY,
  );
  if (row) {
    try {
      const normalized = normalizeLifetimeProgress(JSON.parse(row.value));
      if (normalized) return normalized;
    } catch {
      // Rebuilds from the canonical session rows below.
    }
  }
  const rows = await db.getAllAsync<SessionRow>("SELECT * FROM sessions ORDER BY started_at ASC, id ASC");
  return createLifetimeProgress(rows.map(rowToSession));
}

async function recentHistory(
  db: Pick<SQLiteDatabase, "getAllAsync">,
): Promise<BrushSession[]> {
  const rows = await db.getAllAsync<SessionRow>(
    "SELECT * FROM sessions ORDER BY started_at DESC, id DESC LIMIT ?",
    MAX_RECENT_HISTORY,
  );
  return rows.map(rowToSession);
}

async function loadBundleFromDatabase(db: SQLiteDatabase): Promise<HistoryBundle> {
  const [recent, progress] = await Promise.all([recentHistory(db), readProgress(db)]);
  return { recentHistory: recent, lifetimeProgress: progress };
}

async function migrateLegacyData(db: SQLiteDatabase): Promise<void> {
  const count = await db.getFirstAsync<CountRow>("SELECT COUNT(*) AS count FROM sessions");
  const progressRow = await db.getFirstAsync<MetadataRow>(
    "SELECT value FROM metadata WHERE key = ?",
    PROGRESS_META_KEY,
  );
  if ((count?.count ?? 0) > 0 || progressRow) return;

  const [legacyLifetimeRaw, legacyRecentRaw, legacyProgressRaw] = await Promise.all([
    AsyncStorage.getItem(LEGACY_LIFETIME_HISTORY_KEY),
    AsyncStorage.getItem(LEGACY_HISTORY_KEY),
    AsyncStorage.getItem(LEGACY_PROGRESS_STATE_KEY),
  ]);
  const lifetimeHistory = parseStoredHistory(legacyLifetimeRaw);
  const recentHistory = parseStoredHistory(legacyRecentRaw);
  let progressFromV2: LifetimeProgress | null = null;
  let recentFromV2: BrushSession[] = [];
  if (legacyProgressRaw) {
    try {
      const parsed = JSON.parse(legacyProgressRaw) as Partial<LegacyProgressState>;
      if (parsed.version === 2) {
        progressFromV2 = normalizeLifetimeProgress(parsed.lifetimeProgress);
        recentFromV2 = normalizeHistory(parsed.recentHistory);
      }
    } catch {
      // Ignores malformed legacy state.
    }
  }

  const reconciled = reconcileLegacyProgress(
    lifetimeHistory,
    recentFromV2,
    recentHistory,
    progressFromV2,
  );
  const canonicalHistory = reconciled.history;
  const progress = reconciled.progress;
  const historyComplete = reconciled.historyComplete;

  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const session of canonicalHistory) await insertSession(txn, session);
    await writeProgress(txn, progress);
    await writeHistoryComplete(txn, historyComplete);
  });
  await AsyncStorage.multiRemove([
    LEGACY_LIFETIME_HISTORY_KEY,
    LEGACY_HISTORY_KEY,
    LEGACY_PROGRESS_STATE_KEY,
  ]).catch(() => undefined);
}

async function backfillRewardLedger(db: SQLiteDatabase): Promise<void> {
  const marker = await db.getFirstAsync<MetadataRow>(
    "SELECT value FROM metadata WHERE key = ?",
    REWARD_LEDGER_BACKFILLED_META_KEY,
  );
  if (marker?.value === "true") return;

  const rows = await db.getAllAsync<SessionRow>("SELECT * FROM sessions ORDER BY started_at ASC, id ASC");
  await db.withExclusiveTransactionAsync(async (txn) => {
    await rebuildRewardLedger(txn, rows.map(rowToSession));
  });
}

async function openDatabase(): Promise<SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await recoverInterruptedRestore(db);
  await createSchema(db);
  await migrateLegacyData(db);
  await backfillRewardLedger(db);
  const progressRow = await db.getFirstAsync<MetadataRow>(
    "SELECT value FROM metadata WHERE key = ?",
    PROGRESS_META_KEY,
  );
  if (!progressRow) {
    await db.withExclusiveTransactionAsync(async (txn) => {
      await writeProgress(txn, createEmptyLifetimeProgress());
      await writeHistoryComplete(txn, true);
    });
  }
  return db;
}

async function getDatabase(): Promise<SQLiteDatabase> {
  databasePromise ??= openDatabase();
  return databasePromise;
}

export async function initializeHistoryStorage(): Promise<void> {
  await queueWrite(async () => {
    const db = await getDatabase();
    await recoverApplicationRestore(await readLastRestoreId(db));
    try {
      const cache = new Directory(Paths.cache);
      if (cache.exists) {
        for (const entry of cache.list()) {
          if (!(entry instanceof File)) continue;
          const name = decodeURIComponent(entry.uri).split("/").pop() ?? "";
          if (name.startsWith("sparkly-import-") || (name.startsWith("sparkly-brush-") && name.endsWith(".brushlings"))) {
            entry.delete();
          }
        }
      }
    } catch {
      // Cache cleanup is best-effort and must not block access to durable data.
    }
  });
}

async function saveNewSession(
  session: BrushSession,
  progressBeforeInsert?: LifetimeProgress,
  transformProgress?: (progress: LifetimeProgress) => LifetimeProgress,
): Promise<HistorySaveResult> {
  const db = await getDatabase();
  let event: LifetimeProgressEvent | null = null;
  await db.withExclusiveTransactionAsync(async (txn) => {
    const before = progressBeforeInsert ?? await readProgress(txn);
    const historyComplete = await readHistoryComplete(txn);
    const maxRow = await txn.getFirstAsync<MaxStartedRow>(
      "SELECT MAX(started_at) AS max_started_at FROM sessions",
    );
    const changes = await insertSession(txn, session);
    if (changes === 0) return;

    let after: LifetimeProgress;
    if (maxRow?.max_started_at === null || session.startedAt >= (maxRow?.max_started_at ?? 0)) {
      after = applySessionToLifetime(before, session);
    } else if (historyComplete) {
      const rows = await txn.getAllAsync<SessionRow>(
        "SELECT * FROM sessions ORDER BY started_at ASC, id ASC",
      );
      after = createLifetimeProgress(rows.map(rowToSession));
      after.deviceCursors = before.deviceCursors;
    } else {
      after = applySessionToLifetime(before, session);
      after.dailyBonusCoins = before.dailyBonusCoins;
      after.perfectDays = before.perfectDays;
      after.lastCompletedDateKey = before.lastCompletedDateKey;
      after.currentStreakDays = before.currentStreakDays;
      after.longestStreakDays = before.longestStreakDays;
      after.activeDateKey = before.activeDateKey;
      after.activeDay = before.activeDay;
    }
    after = transformProgress ? transformProgress(after) : after;
    await writeProgress(txn, after);
    event = { session, before, after };
    await insertRewardLedgerEntries(txn, createRewardLedgerEntries(event));
  });
  const bundle = await loadBundleFromDatabase(db);
  return { ...bundle, event };
}

export async function loadHistoryBundle(): Promise<HistoryBundle> {
  return queueWrite(async () => loadBundleFromDatabase(await getDatabase()));
}

export async function loadHistory(): Promise<BrushSession[]> {
  return (await loadHistoryBundle()).recentHistory;
}

export async function saveSessionWithLifetime(session: BrushSession): Promise<HistorySaveResult> {
  return runHistoryOperation(() => queueWrite(() => saveNewSession(session)));
}

export async function saveDeviceFallbackWithLifetime(
  deviceId: string,
  session: BrushSession,
): Promise<HistorySaveResult> {
  return runHistoryOperation(() => queueWrite(async () => {
    const db = await getDatabase();
    const before = await readProgress(db);
    return saveNewSession(
      session,
      before,
      (progress) => markPendingDeviceFallback(progress, deviceId, session),
    );
  }));
}

export async function saveDeviceSessionWithLifetime(
  deviceId: string,
  stored: StoredDeviceSession,
  startedAt: number = Date.now() - stored.durationSeconds * 1000,
): Promise<HistorySaveResult> {
  return runHistoryOperation(() => queueWrite(async () => {
    const db = await getDatabase();
    const before = await readProgress(db);
    const observedStartedAt = startedAt;
    const pending = matchesPendingDeviceFallback(
      before,
      deviceId,
      stored.sessionId,
      stored.durationSeconds,
      stored.targetSeconds,
      observedStartedAt,
    );
    const allocation = allocateDeviceSessionIdentity(before, deviceId, stored.sessionId);
    if (allocation.duplicate) {
      const bundle = await loadBundleFromDatabase(db);
      return { ...bundle, event: null };
    }
    const session: BrushSession = {
      id: allocation.id,
      deviceSessionId: stored.sessionId,
      startedAt,
      durationSeconds: stored.durationSeconds,
      targetSeconds: stored.targetSeconds,
      completed: stored.durationSeconds >= Math.min(stored.targetSeconds, 120) * 0.9,
      source: "device",
    };
    const progressWithCursor = clearPendingDeviceFallback(allocation.progress, deviceId);
    if (pending) {
      const fallbackRow = await db.getFirstAsync<SessionRow>(
        "SELECT * FROM sessions WHERE id = ?",
        pending.sessionId,
      );
      if (fallbackRow) {
        await db.withExclusiveTransactionAsync(async (txn) => {
          await txn.runAsync(
            `INSERT INTO sessions (
              id, started_at, duration_seconds, target_seconds, completed, source, device_session_id
            ) SELECT ?, started_at, duration_seconds, target_seconds, completed, source, ?
              FROM sessions WHERE id = ?`,
            session.id,
            stored.sessionId,
            pending.sessionId,
          );
          await txn.runAsync(
            "UPDATE reward_ledger SET session_id = ? WHERE session_id = ?",
            session.id,
            pending.sessionId,
          );
          await txn.runAsync("DELETE FROM sessions WHERE id = ?", pending.sessionId);
          await writeProgress(txn, progressWithCursor);
        });
        const bundle = await loadBundleFromDatabase(db);
        return { ...bundle, event: null };
      }
    }
    return saveNewSession(session, progressWithCursor);
  }));
}

export async function saveSession(session: BrushSession): Promise<BrushSession[]> {
  return (await saveSessionWithLifetime(session)).recentHistory;
}

export async function replaceHistoryWithLifetime(
  history: BrushSession[],
  lifetimeProgress?: LifetimeProgress,
  restoreId?: string,
): Promise<HistoryBundle> {
  return queueWrite(async () => {
    const db = await getDatabase();
    const canonicalHistory = normalizeHistory(history);
    const consistentProgress = lifetimeProgress && lifetimeProgress.attemptedSessions >= canonicalHistory.length
      ? lifetimeProgress
      : createLifetimeProgress(canonicalHistory);
    const historyComplete = consistentProgress.attemptedSessions === canonicalHistory.length;
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.runAsync("DELETE FROM sessions");
      for (const session of canonicalHistory) await insertSession(txn, session);
      await rebuildRewardLedger(txn, canonicalHistory);
      await writeProgress(txn, consistentProgress);
      await writeHistoryComplete(txn, historyComplete);
      if (restoreId) await writeLastRestoreId(txn, restoreId);
    });
    return loadBundleFromDatabase(db);
  });
}

export async function replaceHistory(history: BrushSession[]): Promise<BrushSession[]> {
  return (await replaceHistoryWithLifetime(history)).recentHistory;
}

export async function clearHistory(): Promise<void> {
  await queueWrite(async () => {
    const db = await getDatabase();
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.runAsync("DELETE FROM reward_ledger");
      await txn.runAsync("DELETE FROM sessions");
      await writeProgress(txn, createEmptyLifetimeProgress());
      await writeHistoryComplete(txn, true);
    });
    await db.execAsync("PRAGMA wal_checkpoint(TRUNCATE); VACUUM;");
  });
}

export async function createCompleteBackupDatabase(
  manifestJson: string,
  fileName: string,
): Promise<CompleteBackupFile> {
  return queueWrite(async () => {
    const source = await getDatabase();
    const [sourceProgress, sourceCount, historyComplete] = await Promise.all([
      readProgress(source),
      source.getFirstAsync<CountRow>("SELECT COUNT(*) AS count FROM sessions"),
      readHistoryComplete(source),
    ]);
    const requestedManifest = JSON.parse(manifestJson) as Record<string, unknown>;
    const effectiveManifestJson = JSON.stringify({
      ...requestedManifest,
      createdAt: Date.now(),
      historyComplete,
      archivedSessionCount: sourceCount?.count ?? 0,
      lifetimeProgress: sourceProgress,
    });
    await source.execAsync("PRAGMA wal_checkpoint(FULL)");
    const destinationFile = new File(Paths.cache, fileName);
    if (destinationFile.exists) destinationFile.delete();
    const destination = await SQLite.openDatabaseAsync(
      fileName,
      { useNewConnection: true },
      Paths.cache.uri,
    );
    try {
      await SQLite.backupDatabaseAsync({ sourceDatabase: source, destDatabase: destination });
      await destination.execAsync(`
        CREATE TABLE IF NOT EXISTS backup_manifest (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          value TEXT NOT NULL
        );
      `);
      await destination.runAsync(
        `INSERT INTO backup_manifest (id, value) VALUES (1, ?)
         ON CONFLICT(id) DO UPDATE SET value = excluded.value`,
        effectiveManifestJson,
      );
      await destination.execAsync("PRAGMA wal_checkpoint(TRUNCATE)");
    } finally {
      await destination.closeAsync();
    }
    return {
      uri: destinationFile.uri,
      size: destinationFile.size,
      sessionCount: sourceCount?.count ?? 0,
    };
  });
}

async function openImportedDatabase(uri: string): Promise<{ database: SQLiteDatabase; file: File }> {
  const source = new File(uri);
  if (!source.exists) throw new Error("File backup non trovato");
  const fileName = `sparkly-import-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.sqlite`;
  const copied = new File(Paths.cache, fileName);
  source.copy(copied);
  const database = await SQLite.openDatabaseAsync(
    fileName,
    { useNewConnection: true },
    Paths.cache.uri,
  );
  return { database, file: copied };
}

async function validateBackupDatabase(database: SQLiteDatabase): Promise<{ manifestJson: string; sessionCount: number }> {
  const integrity = await database.getFirstAsync<Record<string, string>>("PRAGMA integrity_check");
  if (!integrity || !Object.values(integrity).includes("ok")) {
    throw new Error("Il database del backup è danneggiato");
  }
  const manifest = await database.getFirstAsync<MetadataRow>(
    "SELECT value FROM backup_manifest WHERE id = 1",
  );
  if (!manifest) throw new Error("Manifest del backup mancante");
  const parsedManifest = parseBackupManifest(manifest.value);
  const [count, progress, historyComplete] = await Promise.all([
    database.getFirstAsync<CountRow>("SELECT COUNT(*) AS count FROM sessions"),
    readProgress(database),
    readHistoryComplete(database),
  ]);
  const sessionCount = count?.count ?? 0;
  const ledgerMarker = await database.getFirstAsync<MetadataRow>(
    "SELECT value FROM metadata WHERE key = ?",
    REWARD_LEDGER_BACKFILLED_META_KEY,
  );
  if (ledgerMarker?.value === "true") {
    const [baseRewards, orphanRewards] = await Promise.all([
      database.getFirstAsync<CountRow>(
        "SELECT COUNT(*) AS count FROM reward_ledger WHERE kind = 'session'",
      ),
      database.getFirstAsync<CountRow>(
        `SELECT COUNT(*) AS count FROM reward_ledger ledger
         LEFT JOIN sessions session ON session.id = ledger.session_id
         WHERE session.id IS NULL`,
      ),
    ]);
    if ((baseRewards?.count ?? 0) !== sessionCount || (orphanRewards?.count ?? 0) !== 0) {
      throw new Error("Il reward ledger del backup non è coerente con le sessioni");
    }
  }
  const invalidCompleteArchive = historyComplete && sessionCount !== progress.attemptedSessions;
  const invalidPartialArchive = !historyComplete && sessionCount > progress.attemptedSessions;
  const manifestProgressMismatch = JSON.stringify(parsedManifest.lifetimeProgress) !== JSON.stringify(progress);
  if (
    invalidCompleteArchive
    || invalidPartialArchive
    || parsedManifest.historyComplete !== historyComplete
    || parsedManifest.archivedSessionCount !== sessionCount
    || manifestProgressMismatch
  ) {
    throw new Error("Il backup non contiene tutte le sessioni dichiarate");
  }
  return { manifestJson: manifest.value, sessionCount };
}

export async function inspectCompleteBackupDatabase(uri: string): Promise<CompleteBackupInspection> {
  const opened = await openImportedDatabase(uri);
  let valid = false;
  try {
    const validated = await validateBackupDatabase(opened.database);
    valid = true;
    return {
      uri: opened.file.uri,
      manifestJson: validated.manifestJson,
      sessionCount: validated.sessionCount,
      size: opened.file.size,
    };
  } finally {
    await opened.database.closeAsync();
    if (!valid && opened.file.exists) opened.file.delete();
  }
}

export async function restoreCompleteBackupDatabase(uri: string, restoreId: string): Promise<HistoryBundle> {
  return queueWrite(async () => {
    const importedFile = new File(uri);
    const imported = await SQLite.openDatabaseAsync(
      importedFile.name,
      { useNewConnection: true },
      Paths.cache.uri,
    );
    try {
      await validateBackupDatabase(imported);
      await writeLastRestoreId(imported, restoreId);
      const destination = await getDatabase();
      await SQLite.deleteDatabaseAsync(RESTORE_ROLLBACK_DATABASE_NAME).catch(() => undefined);
      const rollback = await SQLite.openDatabaseAsync(
        RESTORE_ROLLBACK_DATABASE_NAME,
        { useNewConnection: true },
      );
      try {
        await SQLite.backupDatabaseAsync({ sourceDatabase: destination, destDatabase: rollback });
      } finally {
        await rollback.closeAsync();
      }

      await AsyncStorage.setItem(RESTORE_JOURNAL_KEY, "true");
      try {
        await SQLite.backupDatabaseAsync({ sourceDatabase: imported, destDatabase: destination });
        await createSchema(destination);
        await backfillRewardLedger(destination);
        await validateBackupDatabase(destination);
        const restored = await loadBundleFromDatabase(destination);
        await AsyncStorage.removeItem(RESTORE_JOURNAL_KEY);
        await SQLite.deleteDatabaseAsync(RESTORE_ROLLBACK_DATABASE_NAME).catch(() => undefined);
        return restored;
      } catch (restoreError) {
        let rollbackSucceeded = false;
        const rollbackSource = await SQLite.openDatabaseAsync(
          RESTORE_ROLLBACK_DATABASE_NAME,
          { useNewConnection: true },
        );
        try {
          await SQLite.backupDatabaseAsync({ sourceDatabase: rollbackSource, destDatabase: destination });
          await createSchema(destination);
          rollbackSucceeded = true;
        } finally {
          await rollbackSource.closeAsync();
        }
        if (rollbackSucceeded) {
          await AsyncStorage.removeItem(RESTORE_JOURNAL_KEY);
          await SQLite.deleteDatabaseAsync(RESTORE_ROLLBACK_DATABASE_NAME).catch(() => undefined);
        }
        throw restoreError;
      }
    } finally {
      await imported.closeAsync();
      if (importedFile.exists) importedFile.delete();
    }
  });
}

export async function loadDemoHistory(): Promise<BrushSession[]> {
  return parseStoredHistory(await AsyncStorage.getItem(DEMO_HISTORY_KEY), MAX_RECENT_HISTORY);
}

export async function saveDemoSession(session: BrushSession): Promise<BrushSession[]> {
  const current = await loadDemoHistory();
  const next = normalizeHistory([session, ...current.filter((item) => item.id !== session.id)], MAX_RECENT_HISTORY);
  await AsyncStorage.setItem(DEMO_HISTORY_KEY, JSON.stringify(next));
  return next;
}

export async function replaceDemoHistory(history: BrushSession[]): Promise<BrushSession[]> {
  const next = normalizeHistory(history, MAX_RECENT_HISTORY);
  await AsyncStorage.setItem(DEMO_HISTORY_KEY, JSON.stringify(next));
  return next;
}

export async function clearDemoHistory(): Promise<void> {
  await AsyncStorage.removeItem(DEMO_HISTORY_KEY);
}

export async function loadDemoMode(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(DEMO_MODE_KEY)) === "true";
  } catch {
    return false;
  }
}

export async function saveDemoMode(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(DEMO_MODE_KEY, enabled ? "true" : "false");
}

export async function saveLastDevice(device: ToothbrushDevice | null): Promise<void> {
  if (!device) {
    await AsyncStorage.removeItem(DEVICE_KEY);
    return;
  }
  await AsyncStorage.setItem(DEVICE_KEY, JSON.stringify(device));
}

export async function loadLastDevice(): Promise<ToothbrushDevice | null> {
  try {
    const raw = await AsyncStorage.getItem(DEVICE_KEY);
    return raw ? (JSON.parse(raw) as ToothbrushDevice) : null;
  } catch {
    return null;
  }
}
