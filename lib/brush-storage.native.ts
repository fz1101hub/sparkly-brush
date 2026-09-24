import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";
import * as SQLite from "expo-sqlite";
import type { SQLiteDatabase } from "expo-sqlite";

import type { BrushSession, StoredDeviceSession, ToothbrushDevice } from "@/lib/brush-types";
import { parseBackupManifest } from "@/lib/backup";
import {
  BackupSemanticValidator,
  progressForPortableBackup,
  type PersistedRewardLedgerEntry,
} from "@/lib/backup-integrity";
import { runHistoryOperation } from "@/lib/history-operation";
import { assertSafePostResetSessions } from "@/lib/device-reset-guard";
import {
  containsLikelyRawDeviceId,
  sanitizeDeviceSessionId,
} from "@/lib/device-identity";
import { reconcileLegacyProgress } from "@/lib/legacy-migration";
import { recoverApplicationRestore } from "@/lib/restore-journal";
import { createRewardLedgerEntries, type RewardLedgerEntry } from "@/lib/reward-ledger";
import {
  allocateDeviceSessionIdentity,
  applySessionToLifetime,
  applySessionToStoredLifetime,
  clearPendingDeviceFallback,
  createEmptyLifetimeProgress,
  createLifetimeProgress,
  deviceKey,
  forgetDeviceSessionState,
  markPendingDeviceFallback,
  matchesPendingDeviceFallback,
  normalizeLifetimeProgress,
  pendingDeviceFallbacks,
  replacePendingDeviceFallbackProgress,
  shouldReplayStoredHistory,
  type LifetimeProgress,
  type LifetimeProgressEvent,
} from "@/lib/lifetime-progress";
import {
  SQLITE_BACKUP_HEADER_BYTES,
  validateSQLiteBackupHeader,
} from "@/lib/sqlite-backup-preflight";
import {
  validateSQLiteBackupSchema,
  validateSQLiteBackupTableColumns,
} from "@/lib/sqlite-backup-schema";

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

export type HistoryBatchSaveResult = HistorySaveResult & {
  importedCount: number;
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
  time_confidence?: string;
  reward_policy?: string;
  duration_seconds: number;
  target_seconds: number;
  completed: number;
  source: "manual" | "device";
  device_session_id: number | null;
};

type MetadataRow = { value: string };
type TableInfoRow = { name: string };
type BackupTableColumnRow = { name: string; type: string; pk: number };
type CountRow = { count: number };
type ExistsRow = { found: number };
type TextLengthRow = { length: number | null };
type BackupFieldLengthsRow = {
  max_session_id: number | null;
  max_session_source: number | null;
  max_session_time_confidence: number | null;
  max_session_reward_policy: number | null;
  max_ledger_id: number | null;
  max_ledger_session_id: number | null;
  max_ledger_kind: number | null;
  max_ledger_details: number | null;
};
type MaxStartedRow = { max_started_at: number | null };
type SessionIdRow = { id: string };
type SQLiteSchemaRow = { type: string; name: string; table_name: string };
type RewardLedgerRow = {
  id: string;
  session_id: string;
  kind: RewardLedgerEntry["kind"];
  coins: number;
  xp: number;
  details_json: string;
  created_at: number;
};

type SessionLedgerRow = {
  session_id: string;
  session_started_at: number;
  session_time_confidence: string;
  session_reward_policy: string;
  session_duration_seconds: number;
  session_target_seconds: number;
  session_completed: number;
  session_source: "manual" | "device";
  session_device_session_id: number | null;
  ledger_id: string | null;
  ledger_session_id: string | null;
  ledger_kind: RewardLedgerEntry["kind"] | null;
  ledger_coins: number | null;
  ledger_xp: number | null;
  ledger_details_json: string | null;
  ledger_created_at: number | null;
};

type LegacyProgressState = {
  version: 2;
  recentHistory: unknown;
  lifetimeProgress: unknown;
};

let databasePromise: Promise<SQLiteDatabase> | null = null;
let writeQueue: Promise<void> = Promise.resolve();
let deviceWriteQueue: Promise<void> = Promise.resolve();

function queueWrite<T>(operation: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(operation, operation);
  writeQueue = result.then(() => undefined, () => undefined);
  return result;
}

function queueDeviceWrite<T>(operation: () => Promise<T>): Promise<T> {
  const result = deviceWriteQueue.then(operation, operation);
  deviceWriteQueue = result.then(() => undefined, () => undefined);
  return result;
}

function isBrushSession(value: unknown): value is BrushSession {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<BrushSession>;
  return typeof item.id === "string"
    && typeof item.startedAt === "number"
    && (item.timeConfidence === undefined
      || item.timeConfidence === "exact"
      || item.timeConfidence === "reconstructed"
      || item.timeConfidence === "approximate")
    && (item.rewardPolicy === undefined
      || item.rewardPolicy === "legacy"
      || item.rewardPolicy === "completed-only")
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
  if (
    typeof row.id !== "string"
    || row.id.length === 0
    || row.id.length > 512
    || !Number.isSafeInteger(row.started_at)
    || row.started_at < 0
    || !Number.isSafeInteger(row.duration_seconds)
    || row.duration_seconds < 0
    || !Number.isSafeInteger(row.target_seconds)
    || row.target_seconds <= 0
    || (row.completed !== 0 && row.completed !== 1)
    || (row.source !== "manual" && row.source !== "device")
    || (row.device_session_id !== null && (
      !Number.isSafeInteger(row.device_session_id)
      || row.device_session_id < 0
      || row.device_session_id > 65_535
    ))
  ) {
    throw new Error("La sessione del backup contiene valori numerici o campi non validi");
  }
  const timeConfidence = row.time_confidence ?? "exact";
  if (!["exact", "reconstructed", "approximate"].includes(timeConfidence)) {
    throw new Error("La sessione contiene una confidenza temporale non valida");
  }
  const rewardPolicy = row.reward_policy ?? "legacy";
  if (!["legacy", "completed-only"].includes(rewardPolicy)) {
    throw new Error("La sessione contiene una politica ricompense non valida");
  }
  return {
    id: row.id,
    startedAt: row.started_at,
    timeConfidence: timeConfidence as BrushSession["timeConfidence"],
    rewardPolicy: rewardPolicy as BrushSession["rewardPolicy"],
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
      time_confidence TEXT NOT NULL DEFAULT 'exact'
        CHECK (time_confidence IN ('exact', 'reconstructed', 'approximate')),
      reward_policy TEXT NOT NULL DEFAULT 'legacy'
        CHECK (reward_policy IN ('legacy', 'completed-only')),
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
  const sessionColumns = await db.getAllAsync<TableInfoRow>("PRAGMA table_info(sessions)");
  if (!sessionColumns.some((column) => column.name === "time_confidence")) {
    await db.execAsync(
      "ALTER TABLE sessions ADD COLUMN time_confidence TEXT NOT NULL DEFAULT 'exact' CHECK (time_confidence IN ('exact', 'reconstructed', 'approximate'))",
    );
  }
  if (!sessionColumns.some((column) => column.name === "reward_policy")) {
    await db.execAsync(
      "ALTER TABLE sessions ADD COLUMN reward_policy TEXT NOT NULL DEFAULT 'legacy' CHECK (reward_policy IN ('legacy', 'completed-only'))",
    );
  }
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
      (id, started_at, time_confidence, reward_policy, duration_seconds, target_seconds, completed, source, device_session_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    session.id,
    session.startedAt,
    session.timeConfidence ?? "exact",
    session.rewardPolicy ?? "legacy",
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
  for (const session of [...history].sort((first, second) => (
    first.startedAt - second.startedAt || first.id.localeCompare(second.id)
  ))) {
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

async function rebuildRewardLedgerFromDatabase(
  db: Pick<SQLiteDatabase, "getEachAsync" | "runAsync">,
): Promise<LifetimeProgress> {
  await db.runAsync("DELETE FROM reward_ledger");
  let progress = createEmptyLifetimeProgress();
  for await (const row of db.getEachAsync<SessionRow>(
    "SELECT * FROM sessions ORDER BY started_at ASC, id ASC",
  )) {
    const session = rowToSession(row);
    const after = applySessionToLifetime(progress, session);
    await insertRewardLedgerEntries(db, createRewardLedgerEntries({ session, before: progress, after }));
    progress = after;
  }
  await db.runAsync(
    `INSERT INTO metadata (key, value) VALUES (?, 'true')
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    REWARD_LEDGER_BACKFILLED_META_KEY,
  );
  return progress;
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
  db: Pick<SQLiteDatabase, "getFirstAsync" | "getEachAsync">,
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
  let progress = createEmptyLifetimeProgress();
  for await (const sessionRow of db.getEachAsync<SessionRow>(
    "SELECT * FROM sessions ORDER BY started_at ASC, id ASC",
  )) {
    progress = applySessionToLifetime(progress, rowToSession(sessionRow));
  }
  return progress;
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

  await db.withExclusiveTransactionAsync(async (txn) => {
    await rebuildRewardLedgerFromDatabase(txn);
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
    let ledgerRebuilt = false;
    if (maxRow?.max_started_at === null || session.startedAt >= (maxRow?.max_started_at ?? 0)) {
      after = applySessionToLifetime(before, session);
    } else if (historyComplete) {
      after = await rebuildRewardLedgerFromDatabase(txn);
      after.deviceCursors = before.deviceCursors;
      after.pendingDeviceFallbacks = before.pendingDeviceFallbacks;
      ledgerRebuilt = true;
    } else {
      after = applySessionToStoredLifetime(before, session, false);
    }
    after = transformProgress ? transformProgress(after) : after;
    await writeProgress(txn, after);
    event = { session, before, after };
    if (!ledgerRebuilt) {
      await insertRewardLedgerEntries(txn, createRewardLedgerEntries(event));
    }
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
      (progress) => markPendingDeviceFallback(progress, deviceId, session, before),
    );
  }));
}

export async function saveDeviceSessionWithLifetime(
  deviceId: string,
  stored: StoredDeviceSession,
  startedAt?: number,
): Promise<HistorySaveResult> {
  const effectiveStartedAt = startedAt ?? stored.startedAt ?? Date.now() - stored.durationSeconds * 1000;
  const batch = await saveDeviceSessionsWithLifetime(deviceId, [{
    ...stored,
    startedAt: effectiveStartedAt,
    timeConfidence: stored.timeConfidence ?? (startedAt !== undefined ? "exact" : "approximate"),
  }]);
  return {
    recentHistory: batch.recentHistory,
    lifetimeProgress: batch.lifetimeProgress,
    event: batch.event,
  };
}

export async function saveDeviceSessionsWithLifetime(
  deviceId: string,
  storedSessions: StoredDeviceSession[],
): Promise<HistoryBatchSaveResult> {
  return runHistoryOperation(() => queueWrite(async () => {
    const db = await getDatabase();
    let lastEvent: LifetimeProgressEvent | null = null;
    let importedCount = 0;
    await db.withExclusiveTransactionAsync(async (txn) => {
      let progress = await readProgress(txn);
      const historyComplete = await readHistoryComplete(txn);
      const resetCursor = progress.deviceCursors[deviceKey(deviceId)];
      const initialFallbackCount = resetCursor
        ? 0
        : pendingDeviceFallbacks(progress, deviceId).length;
      const initialFallbackSessionIds = new Set(
        initialFallbackCount > 0
          ? storedSessions.slice(-initialFallbackCount).map((stored) => stored.sessionId)
          : [],
      );
      if (resetCursor?.acceptNextSession) {
        assertSafePostResetSessions({
          resetBaselineSessionId: resetCursor.resetBaselineSessionId,
          sessionIds: storedSessions.map((stored) => stored.sessionId),
        });
      }
      let requiresReplay = false;
      let reconciledAny = false;
      for (const stored of storedSessions) {
        const observedStartedAt = stored.startedAt ?? Date.now() - stored.durationSeconds * 1000;
        const observedTimeConfidence = stored.timeConfidence ?? "approximate";
        const fallback = matchesPendingDeviceFallback(
          progress,
          deviceId,
          stored.sessionId,
          stored.durationSeconds,
          stored.targetSeconds,
          observedStartedAt,
          observedTimeConfidence,
          initialFallbackSessionIds.has(stored.sessionId),
        );
        const allocation = allocateDeviceSessionIdentity(progress, deviceId, stored.sessionId);
        if (allocation.duplicate) continue;
        const session: BrushSession = {
          id: allocation.id,
          deviceSessionId: stored.sessionId,
          startedAt: fallback?.startedAt ?? observedStartedAt,
          timeConfidence: fallback?.timeConfidence ?? observedTimeConfidence,
          rewardPolicy: "completed-only",
          durationSeconds: stored.durationSeconds,
          targetSeconds: stored.targetSeconds,
          completed: stored.durationSeconds >= Math.min(stored.targetSeconds, 120) * 0.9,
          source: "device",
        };
        const maxRow = await txn.getFirstAsync<MaxStartedRow>(
          "SELECT MAX(started_at) AS max_started_at FROM sessions",
        );
        if (fallback) {
          await txn.runAsync("DELETE FROM reward_ledger WHERE session_id = ?", fallback.sessionId);
          await txn.runAsync("DELETE FROM sessions WHERE id = ?", fallback.sessionId);
        }
        const changes = await insertSession(txn, session);
        if (changes === 0) continue;
        const replacement = fallback
          ? replacePendingDeviceFallbackProgress(
            allocation.progress,
            deviceId,
            fallback.sessionId,
            session,
            historyComplete,
          )
          : null;
        const before = replacement?.before ?? allocation.progress;
        const after = replacement?.after ?? applySessionToStoredLifetime(before, session, historyComplete);
        progress = fallback
          ? clearPendingDeviceFallback(after, deviceId, fallback.sessionId)
          : after;
        importedCount += 1;
        lastEvent = { session, before, after: progress };
        reconciledAny = reconciledAny || fallback !== null;
        requiresReplay = requiresReplay || fallback !== null
          || (maxRow?.max_started_at !== null && session.startedAt < (maxRow?.max_started_at ?? 0));
        if (!requiresReplay || !historyComplete) {
          await insertRewardLedgerEntries(txn, createRewardLedgerEntries(lastEvent));
        }
      }

      if (shouldReplayStoredHistory(requiresReplay, importedCount, historyComplete)) {
        const cursors = progress.deviceCursors;
        const fallbacks = progress.pendingDeviceFallbacks;
        progress = await rebuildRewardLedgerFromDatabase(txn);
        progress.deviceCursors = cursors;
        progress.pendingDeviceFallbacks = fallbacks;
        lastEvent = null;
      }
      if (reconciledAny) lastEvent = null;
      await writeProgress(txn, progress);
    });
    const bundle = await loadBundleFromDatabase(db);
    return { ...bundle, event: lastEvent, importedCount };
  }));
}

export async function saveSession(session: BrushSession): Promise<BrushSession[]> {
  return (await saveSessionWithLifetime(session)).recentHistory;
}

export async function forgetDeviceWithLifetime(deviceId: string): Promise<HistoryBundle> {
  return runHistoryOperation(() => queueWrite(async () => {
    const db = await getDatabase();
    await db.withExclusiveTransactionAsync(async (txn) => {
      const progress = await readProgress(txn);
      if (!progress.deviceCursors[deviceKey(deviceId)]) {
        throw new Error("Nessun contatore BLE precedente da reimpostare per questo manico");
      }
      await writeProgress(txn, forgetDeviceSessionState(progress, deviceId));
    });
    await queueDeviceWrite(async () => {
      const current = await loadLastDevice();
      if (!current || current.id === deviceId) await AsyncStorage.removeItem(DEVICE_KEY);
    });
    return loadBundleFromDatabase(db);
  }));
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
    const portableProgress: LifetimeProgress = {
      ...sourceProgress,
      deviceCursors: { ...sourceProgress.deviceCursors },
      pendingDeviceFallbacks: Object.fromEntries(
        Object.entries(sourceProgress.pendingDeviceFallbacks).map(([key, pending]) => [
          key,
          { ...pending, sessionId: sanitizeDeviceSessionId(pending.sessionId) },
        ]),
      ),
    };
    await source.execAsync("PRAGMA wal_checkpoint(FULL)");
    const destinationFile = new File(Paths.cache, fileName);
    if (destinationFile.exists) destinationFile.delete();
    const destination = await SQLite.openDatabaseAsync(
      fileName,
      { useNewConnection: true },
      Paths.cache.uri,
    );
    let completed = false;
    let exportedProgress = portableProgress;
    try {
      await SQLite.backupDatabaseAsync({ sourceDatabase: source, destDatabase: destination });
      await destination.withExclusiveTransactionAsync(async (txn) => {
        await txn.runAsync("DELETE FROM reward_ledger");
        for await (const row of txn.getEachAsync<SessionIdRow>(
          "SELECT id FROM sessions WHERE source = 'device' ORDER BY id ASC",
        )) {
          const portableId = sanitizeDeviceSessionId(row.id);
          if (containsLikelyRawDeviceId(portableId)) {
            throw new Error("Il backup contiene ancora un identificativo Bluetooth non sanitizzato");
          }
          if (portableId !== row.id) {
            await txn.runAsync("UPDATE sessions SET id = ? WHERE id = ?", portableId, row.id);
          }
        }
        const replayedProgress = await rebuildRewardLedgerFromDatabase(txn);
        exportedProgress = progressForPortableBackup(
          portableProgress,
          replayedProgress,
          historyComplete,
        );
        await writeProgress(txn, exportedProgress);
      });
      const effectiveManifestJson = JSON.stringify({
        ...requestedManifest,
        createdAt: Date.now(),
        historyComplete,
        archivedSessionCount: sourceCount?.count ?? 0,
        lifetimeProgress: exportedProgress,
      });
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
      completed = true;
    } finally {
      await destination.closeAsync();
      if (!completed && destinationFile.exists) destinationFile.delete();
    }
    return {
      uri: destinationFile.uri,
      size: destinationFile.size,
      sessionCount: sourceCount?.count ?? 0,
    };
  });
}

function assertSQLiteBackupFile(file: File): void {
  if (!file.exists) throw new Error("File backup non trovato");
  const handle = file.open();
  try {
    const header = handle.readBytes(SQLITE_BACKUP_HEADER_BYTES);
    validateSQLiteBackupHeader(header, file.size);
  } finally {
    handle.close();
  }
}

async function openImportedDatabase(uri: string): Promise<{ database: SQLiteDatabase; file: File }> {
  const source = new File(uri);
  assertSQLiteBackupFile(source);
  const fileName = `sparkly-import-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.sqlite`;
  const copied = new File(Paths.cache, fileName);
  await source.copy(copied);
  try {
    assertSQLiteBackupFile(copied);
    const database = await SQLite.openDatabaseAsync(
      copied.name,
      { useNewConnection: true },
      copied.parentDirectory.uri,
    );
    return { database, file: copied };
  } catch (error) {
    if (copied.exists) copied.delete();
    throw error;
  }
}

function normalizedLedgerRow(row: RewardLedgerRow): PersistedRewardLedgerEntry {
  if (
    typeof row.id !== "string"
    || row.id.length === 0
    || row.id.length > 1_024
    || typeof row.session_id !== "string"
    || row.session_id.length === 0
    || row.session_id.length > 512
  ) {
    throw new Error("Il reward ledger del backup contiene identificativi non validi");
  }
  if (!["session", "daily-missions", "achievements"].includes(row.kind)) {
    throw new Error("Il reward ledger del backup contiene un tipo non valido");
  }
  if (
    !Number.isSafeInteger(row.coins)
    || row.coins < 0
    || !Number.isSafeInteger(row.xp)
    || row.xp < 0
    || !Number.isSafeInteger(row.created_at)
    || row.created_at < 0
  ) {
    throw new Error("Il reward ledger del backup contiene valori numerici non validi");
  }
  if (typeof row.details_json !== "string" || row.details_json.length > 65_536) {
    throw new Error("Il reward ledger del backup contiene dettagli non validi");
  }
  let details: string[];
  try {
    const parsed = JSON.parse(row.details_json) as unknown;
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
      throw new Error("invalid reward details");
    }
    details = parsed;
  } catch {
    throw new Error("Il reward ledger del backup contiene dettagli non validi");
  }
  return {
    id: row.id,
    sessionId: row.session_id,
    kind: row.kind,
    coins: row.coins,
    xp: row.xp,
    details,
    createdAt: row.created_at,
  };
}

async function boundedMetadataValue(
  database: SQLiteDatabase,
  table: "backup_manifest" | "metadata",
  whereClause: string,
  params: (string | number)[],
  maximumBytes: number,
  missingMessage: string,
): Promise<string> {
  const length = await database.getFirstAsync<TextLengthRow>(
    `SELECT length(value) AS length FROM ${table} WHERE ${whereClause}`,
    ...params,
  );
  if (length?.length === null || length?.length === undefined) throw new Error(missingMessage);
  if (length.length > maximumBytes) throw new Error("Il backup contiene metadati troppo grandi");
  const row = await database.getFirstAsync<MetadataRow>(
    `SELECT value FROM ${table} WHERE ${whereClause}`,
    ...params,
  );
  if (!row) throw new Error(missingMessage);
  return row.value;
}

async function readBackupProgress(database: SQLiteDatabase): Promise<LifetimeProgress> {
  const value = await boundedMetadataValue(
    database,
    "metadata",
    "key = ?",
    [PROGRESS_META_KEY],
    1_048_576,
    "Progressione lifetime del backup mancante",
  );
  try {
    const progress = normalizeLifetimeProgress(JSON.parse(value));
    if (progress) return progress;
  } catch {
    // The stable error below avoids exposing parser details in the UI.
  }
  throw new Error("Progressione lifetime del backup non valida");
}

function sessionFromJoinedRow(row: SessionLedgerRow): BrushSession {
  return rowToSession({
    id: row.session_id,
    started_at: row.session_started_at,
    time_confidence: row.session_time_confidence,
    reward_policy: row.session_reward_policy,
    duration_seconds: row.session_duration_seconds,
    target_seconds: row.session_target_seconds,
    completed: row.session_completed,
    source: row.session_source,
    device_session_id: row.session_device_session_id,
  });
}

function ledgerFromJoinedRow(row: SessionLedgerRow): PersistedRewardLedgerEntry | null {
  if (row.ledger_id === null) return null;
  if (
    row.ledger_session_id === null
    || row.ledger_kind === null
    || row.ledger_coins === null
    || row.ledger_xp === null
    || row.ledger_details_json === null
    || row.ledger_created_at === null
  ) {
    throw new Error("Il reward ledger del backup contiene campi mancanti");
  }
  return normalizedLedgerRow({
    id: row.ledger_id,
    session_id: row.ledger_session_id,
    kind: row.ledger_kind,
    coins: row.ledger_coins,
    xp: row.ledger_xp,
    details_json: row.ledger_details_json,
    created_at: row.ledger_created_at,
  });
}

async function validateBackupDatabase(database: SQLiteDatabase): Promise<{
  manifestJson: string;
  sessionCount: number;
  progress: LifetimeProgress;
  historyComplete: boolean;
  ledgerPresent: boolean;
}> {
  const integrity = await database.getFirstAsync<Record<string, string>>("PRAGMA integrity_check");
  if (!integrity || !Object.values(integrity).includes("ok")) {
    throw new Error("Il database del backup è danneggiato");
  }
  const schemaRows = await database.getAllAsync<SQLiteSchemaRow>(`
    SELECT type, name, tbl_name AS table_name
    FROM sqlite_schema
    ORDER BY type ASC, name ASC
  `);
  validateSQLiteBackupSchema(schemaRows.map((row) => ({
    type: row.type,
    name: row.name,
    tableName: row.table_name,
  })));
  for (const table of schemaRows.filter((row) => row.type === "table")) {
    const tableName = table.name as "sessions" | "metadata" | "backup_manifest" | "reward_ledger";
    const columns = await database.getAllAsync<BackupTableColumnRow>(`PRAGMA table_info(${tableName})`);
    validateSQLiteBackupTableColumns(tableName, columns);
  }
  const manifestJson = await boundedMetadataValue(
    database,
    "backup_manifest",
    "id = ?",
    [1],
    1_048_576,
    "Manifest del backup mancante",
  );
  const parsedManifest = parseBackupManifest(manifestJson);
  const [count, progress, historyComplete, ledgerMarker, ledgerTable, sessionColumns] = await Promise.all([
    database.getFirstAsync<CountRow>("SELECT COUNT(*) AS count FROM sessions"),
    readBackupProgress(database),
    readHistoryComplete(database),
    database.getFirstAsync<MetadataRow>(
      "SELECT value FROM metadata WHERE key = ?",
      REWARD_LEDGER_BACKFILLED_META_KEY,
    ),
    database.getFirstAsync<ExistsRow>(`
      SELECT 1 AS found FROM sqlite_schema
      WHERE type = 'table' AND name = 'reward_ledger'
      LIMIT 1
    `),
    database.getAllAsync<TableInfoRow>("PRAGMA table_info(sessions)"),
  ]);
  const hasTimeConfidence = sessionColumns.some((column) => column.name === "time_confidence");
  const hasRewardPolicy = sessionColumns.some((column) => column.name === "reward_policy");
  const fieldLengths = ledgerTable?.found === 1
    ? await database.getFirstAsync<BackupFieldLengthsRow>(`
      SELECT
        (SELECT MAX(length(id)) FROM sessions) AS max_session_id,
        (SELECT MAX(length(source)) FROM sessions) AS max_session_source,
        ${hasTimeConfidence ? "(SELECT MAX(length(time_confidence)) FROM sessions)" : "NULL"} AS max_session_time_confidence,
        ${hasRewardPolicy ? "(SELECT MAX(length(reward_policy)) FROM sessions)" : "NULL"} AS max_session_reward_policy,
        (SELECT MAX(length(id)) FROM reward_ledger) AS max_ledger_id,
        (SELECT MAX(length(session_id)) FROM reward_ledger) AS max_ledger_session_id,
        (SELECT MAX(length(kind)) FROM reward_ledger) AS max_ledger_kind,
        (SELECT MAX(length(details_json)) FROM reward_ledger) AS max_ledger_details
    `)
    : await database.getFirstAsync<BackupFieldLengthsRow>(`
      SELECT
        (SELECT MAX(length(id)) FROM sessions) AS max_session_id,
        (SELECT MAX(length(source)) FROM sessions) AS max_session_source,
        ${hasTimeConfidence ? "(SELECT MAX(length(time_confidence)) FROM sessions)" : "NULL"} AS max_session_time_confidence,
        ${hasRewardPolicy ? "(SELECT MAX(length(reward_policy)) FROM sessions)" : "NULL"} AS max_session_reward_policy,
        NULL AS max_ledger_id,
        NULL AS max_ledger_session_id,
        NULL AS max_ledger_kind,
        NULL AS max_ledger_details
    `);
  const sessionCount = count?.count ?? 0;
  if (
    !fieldLengths
    || (fieldLengths.max_session_id ?? 0) > 512
    || (fieldLengths.max_session_source ?? 0) > 16
    || (fieldLengths.max_session_time_confidence ?? 0) > 16
    || (fieldLengths.max_session_reward_policy ?? 0) > 16
    || (fieldLengths.max_ledger_id ?? 0) > 1_024
    || (fieldLengths.max_ledger_session_id ?? 0) > 512
    || (fieldLengths.max_ledger_kind ?? 0) > 32
    || (fieldLengths.max_ledger_details ?? 0) > 65_536
  ) {
    throw new Error("Il backup contiene campi testuali troppo grandi");
  }
  const ledgerPresent = ledgerTable?.found === 1 && ledgerMarker?.value === "true";
  if (ledgerPresent) {
    const orphan = await database.getFirstAsync<ExistsRow>(`
      SELECT 1 AS found
      FROM reward_ledger AS ledger
      LEFT JOIN sessions AS session ON session.id = ledger.session_id
      WHERE session.id IS NULL
      LIMIT 1
    `);
    if (orphan?.found === 1) {
      throw new Error("Il reward ledger del backup non è coerente con le sessioni");
    }
  }

  const validator = new BackupSemanticValidator(historyComplete, ledgerPresent);
  let streamedSessionCount = 0;
  let activeSessionId: string | null = null;
  if (ledgerPresent) {
    for await (const row of database.getEachAsync<SessionLedgerRow>(`
      SELECT
        session.id AS session_id,
        session.started_at AS session_started_at,
        ${hasTimeConfidence ? "session.time_confidence" : "'exact'"} AS session_time_confidence,
        ${hasRewardPolicy ? "session.reward_policy" : "'legacy'"} AS session_reward_policy,
        session.duration_seconds AS session_duration_seconds,
        session.target_seconds AS session_target_seconds,
        session.completed AS session_completed,
        session.source AS session_source,
        session.device_session_id AS session_device_session_id,
        ledger.id AS ledger_id,
        ledger.session_id AS ledger_session_id,
        ledger.kind AS ledger_kind,
        ledger.coins AS ledger_coins,
        ledger.xp AS ledger_xp,
        ledger.details_json AS ledger_details_json,
        ledger.created_at AS ledger_created_at
      FROM sessions AS session
      LEFT JOIN reward_ledger AS ledger ON ledger.session_id = session.id
      ORDER BY session.started_at ASC, session.id ASC, ledger.id ASC
    `)) {
      if (row.session_id !== activeSessionId) {
        validator.beginSession(sessionFromJoinedRow(row));
        activeSessionId = row.session_id;
        streamedSessionCount += 1;
      }
      const ledger = ledgerFromJoinedRow(row);
      if (ledger) validator.addLedgerEntry(ledger);
    }
  } else {
    for await (const row of database.getEachAsync<SessionRow>(
      "SELECT * FROM sessions ORDER BY started_at ASC, id ASC",
    )) {
      validator.beginSession(rowToSession(row));
      streamedSessionCount += 1;
    }
  }
  validator.finish(progress);
  if (streamedSessionCount !== sessionCount) {
    throw new Error("Il backup non contiene tutte le sessioni dichiarate");
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
  return { manifestJson, sessionCount, progress, historyComplete, ledgerPresent };
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
    assertSQLiteBackupFile(importedFile);
    const imported = await SQLite.openDatabaseAsync(
      importedFile.name,
      { useNewConnection: true },
      importedFile.parentDirectory.uri,
    );
    try {
      const validated = await validateBackupDatabase(imported);
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
        await destination.withExclusiveTransactionAsync(async (txn) => {
          await txn.runAsync("DELETE FROM reward_ledger");
          await txn.runAsync("DELETE FROM sessions");
          let copiedSessionCount = 0;
          for await (const row of imported.getEachAsync<SessionRow>(
            "SELECT * FROM sessions ORDER BY started_at ASC, id ASC",
          )) {
            const changes = await insertSession(txn, rowToSession(row));
            if (changes !== 1) throw new Error("Il backup contiene sessioni duplicate o non importabili");
            copiedSessionCount += 1;
          }
          if (copiedSessionCount !== validated.sessionCount) {
            throw new Error("Il backup non contiene tutte le sessioni dichiarate");
          }
          if (validated.ledgerPresent) {
            for await (const row of imported.getEachAsync<RewardLedgerRow>(
              "SELECT * FROM reward_ledger ORDER BY session_id ASC, id ASC",
            )) {
              await insertRewardLedgerEntries(txn, [normalizedLedgerRow(row)]);
            }
            await txn.runAsync(
              `INSERT INTO metadata (key, value) VALUES (?, 'true')
               ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
              REWARD_LEDGER_BACKFILLED_META_KEY,
            );
          } else {
            await txn.runAsync("DELETE FROM metadata WHERE key = ?", REWARD_LEDGER_BACKFILLED_META_KEY);
          }
          await writeProgress(txn, validated.progress);
          await writeHistoryComplete(txn, validated.historyComplete);
          await writeLastRestoreId(txn, restoreId);
        });
        if (!validated.ledgerPresent) await backfillRewardLedger(destination);
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
  await queueDeviceWrite(async () => {
    if (!device) {
      await AsyncStorage.removeItem(DEVICE_KEY);
      return;
    }
    await AsyncStorage.setItem(DEVICE_KEY, JSON.stringify(device));
  });
}

export async function loadLastDevice(): Promise<ToothbrushDevice | null> {
  try {
    const raw = await AsyncStorage.getItem(DEVICE_KEY);
    return raw ? (JSON.parse(raw) as ToothbrushDevice) : null;
  } catch {
    return null;
  }
}
