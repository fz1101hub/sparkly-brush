import AsyncStorage from "@react-native-async-storage/async-storage";

import type { BrushSession, StoredDeviceSession, ToothbrushDevice } from "@/lib/brush-types";
import { runHistoryOperation } from "@/lib/history-operation";
import { recoverApplicationRestore } from "@/lib/restore-journal";
import {
  allocateDeviceSessionIdentity,
  applySessionToLifetime,
  clearPendingDeviceFallback,
  createLifetimeProgress,
  markPendingDeviceFallback,
  matchesPendingDeviceFallback,
  normalizeLifetimeProgress,
  reconcilePendingDeviceFallbackProgress,
  type LifetimeProgress,
  type LifetimeProgressEvent,
} from "@/lib/lifetime-progress";

const LEGACY_HISTORY_KEY = "sparkly-brush.history.v1";
const LEGACY_LIFETIME_HISTORY_KEY = "sparkly-brush.lifetime-history.v1";
const PROGRESS_STATE_KEY = "sparkly-brush.progress.v2";
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

type PersistedProgressState = {
  version: 2;
  recentHistory: BrushSession[];
  lifetimeProgress: LifetimeProgress;
  lastRestoreId?: string;
};

let historyWriteQueue: Promise<void> = Promise.resolve();

function queueHistoryWrite<T>(operation: () => Promise<T>): Promise<T> {
  const result = historyWriteQueue.then(operation, operation);
  historyWriteQueue = result.then(() => undefined, () => undefined);
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
    && (item.source === "manual" || item.source === "device" || item.source === "demo");
}

function normalizeHistory(parsed: unknown, limit: number | null = MAX_RECENT_HISTORY): BrushSession[] {
  if (!Array.isArray(parsed)) return [];
  const byId = new Map<string, BrushSession>();
  parsed.forEach((item) => {
    if (isBrushSession(item)) byId.set(item.id, item);
  });
  const sorted = [...byId.values()].sort((a, b) => b.startedAt - a.startedAt);
  return limit === null ? sorted : sorted.slice(0, limit);
}

async function loadHistoryFromKey(key: string, limit: number | null = MAX_RECENT_HISTORY): Promise<BrushSession[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? normalizeHistory(JSON.parse(raw), limit) : [];
  } catch {
    return [];
  }
}

function normalizeProgressState(value: unknown): PersistedProgressState | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<PersistedProgressState>;
  if (raw.version !== 2) return null;
  const lifetimeProgress = normalizeLifetimeProgress(raw.lifetimeProgress);
  if (!lifetimeProgress) return null;
  return {
    version: 2,
    recentHistory: normalizeHistory(raw.recentHistory),
    lifetimeProgress,
    lastRestoreId: typeof raw.lastRestoreId === "string" ? raw.lastRestoreId : undefined,
  };
}

async function persistProgressState(bundle: HistoryBundle): Promise<HistoryBundle> {
  const state: PersistedProgressState = {
    version: 2,
    recentHistory: normalizeHistory(bundle.recentHistory),
    lifetimeProgress: bundle.lifetimeProgress,
  };
  await AsyncStorage.setItem(PROGRESS_STATE_KEY, JSON.stringify(state));
  return {
    recentHistory: state.recentHistory,
    lifetimeProgress: state.lifetimeProgress,
  };
}

async function loadProgressStateUnlocked(): Promise<HistoryBundle> {
  try {
    const raw = await AsyncStorage.getItem(PROGRESS_STATE_KEY);
    const normalized = raw ? normalizeProgressState(JSON.parse(raw)) : null;
    if (normalized) return normalized;
  } catch {
    // Falls through to the legacy migration.
  }

  const [legacyHistory, legacyLifetimeHistory] = await Promise.all([
    loadHistoryFromKey(LEGACY_HISTORY_KEY),
    loadHistoryFromKey(LEGACY_LIFETIME_HISTORY_KEY, null),
  ]);
  const canonicalHistory = legacyLifetimeHistory.length ? legacyLifetimeHistory : legacyHistory;
  const migrated = {
    recentHistory: legacyHistory.length ? legacyHistory : canonicalHistory.slice(0, MAX_RECENT_HISTORY),
    lifetimeProgress: createLifetimeProgress(canonicalHistory),
  };
  await persistProgressState(migrated);
  await AsyncStorage.multiRemove([
    LEGACY_HISTORY_KEY,
    LEGACY_LIFETIME_HISTORY_KEY,
  ]).catch(() => undefined);
  return migrated;
}

export async function loadHistoryBundle(): Promise<HistoryBundle> {
  return queueHistoryWrite(loadProgressStateUnlocked);
}

export async function initializeHistoryStorage(): Promise<void> {
  await queueHistoryWrite(async () => {
    await loadProgressStateUnlocked();
    const raw = await AsyncStorage.getItem(PROGRESS_STATE_KEY);
    const state = raw ? normalizeProgressState(JSON.parse(raw)) : null;
    await recoverApplicationRestore(state?.lastRestoreId ?? null);
  });
}

export async function loadHistory(): Promise<BrushSession[]> {
  return (await loadHistoryBundle()).recentHistory;
}

async function saveNewSessionUnlocked(
  bundle: HistoryBundle,
  session: BrushSession,
  progressBeforeSession: LifetimeProgress = bundle.lifetimeProgress,
  transformProgress?: (progress: LifetimeProgress) => LifetimeProgress,
): Promise<HistorySaveResult> {
  const existing = bundle.recentHistory.find((item) => item.id === session.id);
  if (existing) {
    const recentHistory = normalizeHistory([
      session,
      ...bundle.recentHistory.filter((item) => item.id !== session.id),
    ]);
    const persisted = await persistProgressState({ recentHistory, lifetimeProgress: progressBeforeSession });
    return { ...persisted, event: null };
  }

  const applied = applySessionToLifetime(progressBeforeSession, session);
  const after = transformProgress ? transformProgress(applied) : applied;
  const persisted = await persistProgressState({
    recentHistory: [session, ...bundle.recentHistory],
    lifetimeProgress: after,
  });
  return {
    ...persisted,
    event: { session, before: progressBeforeSession, after },
  };
}

export async function saveSessionWithLifetime(session: BrushSession): Promise<HistorySaveResult> {
  return runHistoryOperation(() => queueHistoryWrite(async () => {
    const bundle = await loadProgressStateUnlocked();
    return saveNewSessionUnlocked(bundle, session);
  }));
}

export async function saveDeviceFallbackWithLifetime(
  deviceId: string,
  session: BrushSession,
): Promise<HistorySaveResult> {
  return runHistoryOperation(() => queueHistoryWrite(async () => {
    const bundle = await loadProgressStateUnlocked();
    return saveNewSessionUnlocked(
      bundle,
      session,
      bundle.lifetimeProgress,
      (progress) => markPendingDeviceFallback(progress, deviceId, session, bundle.lifetimeProgress),
    );
  }));
}

export async function saveDeviceSessionWithLifetime(
  deviceId: string,
  stored: StoredDeviceSession,
  startedAt: number = Date.now() - stored.durationSeconds * 1000,
): Promise<HistorySaveResult> {
  return runHistoryOperation(() => queueHistoryWrite(async () => {
    const bundle = await loadProgressStateUnlocked();
    const pending = matchesPendingDeviceFallback(
      bundle.lifetimeProgress,
      deviceId,
      stored.sessionId,
      stored.durationSeconds,
      stored.targetSeconds,
      startedAt,
    );
    const allocation = allocateDeviceSessionIdentity(
      bundle.lifetimeProgress,
      deviceId,
      stored.sessionId,
    );
    if (allocation.duplicate) {
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
      const reconciledProgress = reconcilePendingDeviceFallbackProgress(
        allocation.progress,
        deviceId,
        session,
      ) ?? progressWithCursor;
      const recentHistory = normalizeHistory([
        session,
        ...bundle.recentHistory.filter((item) => item.id !== pending.sessionId && item.id !== session.id),
      ]);
      const persisted = await persistProgressState({
        recentHistory,
        lifetimeProgress: reconciledProgress,
      });
      return { ...persisted, event: null };
    }
    return saveNewSessionUnlocked(bundle, session, progressWithCursor);
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
  return queueHistoryWrite(async () => {
    const bundle = {
      recentHistory: normalizeHistory(history),
      lifetimeProgress: lifetimeProgress ?? createLifetimeProgress(history),
    };
    if (!restoreId) return persistProgressState(bundle);
    const state: PersistedProgressState = { version: 2, ...bundle, lastRestoreId: restoreId };
    await AsyncStorage.setItem(PROGRESS_STATE_KEY, JSON.stringify(state));
    return bundle;
  });
}

export async function replaceHistory(history: BrushSession[]): Promise<BrushSession[]> {
  return (await replaceHistoryWithLifetime(history)).recentHistory;
}

export async function clearHistory(): Promise<void> {
  await queueHistoryWrite(() => AsyncStorage.multiRemove([
    PROGRESS_STATE_KEY,
    LEGACY_HISTORY_KEY,
    LEGACY_LIFETIME_HISTORY_KEY,
  ]));
}

export async function loadDemoHistory(): Promise<BrushSession[]> {
  return loadHistoryFromKey(DEMO_HISTORY_KEY);
}

export async function saveDemoSession(session: BrushSession): Promise<BrushSession[]> {
  const current = await loadDemoHistory();
  const next = normalizeHistory([session, ...current.filter((item) => item.id !== session.id)]);
  await AsyncStorage.setItem(DEMO_HISTORY_KEY, JSON.stringify(next));
  return next;
}

export async function replaceDemoHistory(history: BrushSession[]): Promise<BrushSession[]> {
  const next = normalizeHistory(history);
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
