

import type { BrushSession, StoredDeviceSession, ToothbrushDevice } from "@/lib/brush-types";
import { runHistoryOperation } from "@/lib/history-operation";
import { getRestoreStorage } from "@/lib/restore-journal";
import {
  allocateDeviceSessionIdentity,
  applySessionToLifetime,
  clearPendingDeviceFallback,
  createLifetimeProgress,
  forgetDeviceSessionState,
  markPendingDeviceFallback,
  matchesPendingDeviceFallback,
  normalizeLifetimeProgress,
  rewindPendingDeviceFallbackProgress,
  type LifetimeProgress,
  type LifetimeProgressEvent,
} from "@/lib/lifetime-progress";
import { createProfileStorage, createProfileStore } from "@/lib/profile-scope";

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

type PersistedProgressState = {
  version: 2;
  recentHistory: BrushSession[];
  lifetimeProgress: LifetimeProgress;
  lastRestoreId?: string;
};
function buildProfileStorage(profileId: string) {
  const AsyncStorage = createProfileStorage(profileId);
  const { recoverApplicationRestore } = getRestoreStorage(profileId);


  const LEGACY_HISTORY_KEY = "sparkly-brush.history.v1";
  const LEGACY_LIFETIME_HISTORY_KEY = "sparkly-brush.lifetime-history.v1";
  const PROGRESS_STATE_KEY = "sparkly-brush.progress.v2";
  const DEMO_HISTORY_KEY = "sparkly-brush.demo-history.v1";
  const DEMO_MODE_KEY = "sparkly-brush.demo-mode.v1";
  const DEVICE_KEY = "sparkly-brush.device.v1";

  let historyWriteQueue: Promise<void> = Promise.resolve();
  let deviceWriteQueue: Promise<void> = Promise.resolve();

  function queueHistoryWrite<T>(operation: () => Promise<T>): Promise<T> {
    const result = historyWriteQueue.then(operation, operation);
    historyWriteQueue = result.then(() => undefined, () => undefined);
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

  async function loadHistoryBundle(): Promise<HistoryBundle> {
    return queueHistoryWrite(loadProgressStateUnlocked);
  }

  async function initializeHistoryStorage(): Promise<void> {
    await queueHistoryWrite(async () => {
      await loadProgressStateUnlocked();
      const raw = await AsyncStorage.getItem(PROGRESS_STATE_KEY);
      const state = raw ? normalizeProgressState(JSON.parse(raw)) : null;
      await recoverApplicationRestore(state?.lastRestoreId ?? null);
    });
  }

  async function loadHistory(): Promise<BrushSession[]> {
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

  async function saveSessionWithLifetime(session: BrushSession): Promise<HistorySaveResult> {
    return runHistoryOperation(() => queueHistoryWrite(async () => {
      const bundle = await loadProgressStateUnlocked();
      return saveNewSessionUnlocked(bundle, session);
    }));
  }

  async function saveDeviceFallbackWithLifetime(
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

  async function saveDeviceSessionWithLifetime(
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

  async function saveDeviceSessionsWithLifetime(
    deviceId: string,
    storedSessions: StoredDeviceSession[],
  ): Promise<HistoryBatchSaveResult> {
    return runHistoryOperation(() => queueHistoryWrite(async () => {
      const bundle = await loadProgressStateUnlocked();
      let progress = bundle.lifetimeProgress;
      let recentHistory = [...bundle.recentHistory];
      let event: LifetimeProgressEvent | null = null;
      let importedCount = 0;
      const pendingStored = storedSessions.find((stored) => matchesPendingDeviceFallback(
        progress,
        deviceId,
        stored.sessionId,
        stored.durationSeconds,
        stored.targetSeconds,
        stored.startedAt ?? Date.now() - stored.durationSeconds * 1000,
      ));
      if (pendingStored) {
        const fallback = matchesPendingDeviceFallback(
          progress,
          deviceId,
          pendingStored.sessionId,
          pendingStored.durationSeconds,
          pendingStored.targetSeconds,
          pendingStored.startedAt ?? Date.now() - pendingStored.durationSeconds * 1000,
        );
        if (fallback) {
          recentHistory = recentHistory.filter((item) => item.id !== fallback.sessionId);
          progress = rewindPendingDeviceFallbackProgress(progress, deviceId) ?? progress;
        }
      }

      for (const stored of storedSessions) {
        const allocation = allocateDeviceSessionIdentity(progress, deviceId, stored.sessionId);
        if (allocation.duplicate) continue;
        const session: BrushSession = {
          id: allocation.id,
          deviceSessionId: stored.sessionId,
          startedAt: stored.startedAt ?? Date.now() - stored.durationSeconds * 1000,
          timeConfidence: stored.timeConfidence ?? "approximate",
          rewardPolicy: "completed-only",
          durationSeconds: stored.durationSeconds,
          targetSeconds: stored.targetSeconds,
          completed: stored.durationSeconds >= Math.min(stored.targetSeconds, 120) * 0.9,
          source: "device",
        };
        const before = allocation.progress;
        progress = clearPendingDeviceFallback(applySessionToLifetime(before, session), deviceId);
        recentHistory = [session, ...recentHistory.filter((item) => item.id !== session.id)];
        event = { session, before, after: progress };
        importedCount += 1;
      }
      const persisted = await persistProgressState({ recentHistory, lifetimeProgress: progress });
      return { ...persisted, event: pendingStored ? null : event, importedCount };
    }));
  }

  async function saveSession(session: BrushSession): Promise<BrushSession[]> {
    return (await saveSessionWithLifetime(session)).recentHistory;
  }

  async function forgetDeviceWithLifetime(deviceId: string): Promise<HistoryBundle> {
    return runHistoryOperation(() => queueHistoryWrite(async () => {
      const bundle = await loadProgressStateUnlocked();
      const next = await persistProgressState({
        recentHistory: bundle.recentHistory,
        lifetimeProgress: forgetDeviceSessionState(bundle.lifetimeProgress, deviceId),
      });
      await queueDeviceWrite(async () => {
        const current = await loadLastDevice();
        if (!current || current.id === deviceId) await AsyncStorage.removeItem(DEVICE_KEY);
      });
      return next;
    }));
  }

  async function replaceHistoryWithLifetime(
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

  async function replaceHistory(history: BrushSession[]): Promise<BrushSession[]> {
    return (await replaceHistoryWithLifetime(history)).recentHistory;
  }

  async function clearHistory(): Promise<void> {
    await queueHistoryWrite(() => AsyncStorage.multiRemove([
      PROGRESS_STATE_KEY,
      LEGACY_HISTORY_KEY,
      LEGACY_LIFETIME_HISTORY_KEY,
    ]));
  }

  async function loadDemoHistory(): Promise<BrushSession[]> {
    return loadHistoryFromKey(DEMO_HISTORY_KEY);
  }

  async function saveDemoSession(session: BrushSession): Promise<BrushSession[]> {
    const current = await loadDemoHistory();
    const next = normalizeHistory([session, ...current.filter((item) => item.id !== session.id)]);
    await AsyncStorage.setItem(DEMO_HISTORY_KEY, JSON.stringify(next));
    return next;
  }

  async function replaceDemoHistory(history: BrushSession[]): Promise<BrushSession[]> {
    const next = normalizeHistory(history);
    await AsyncStorage.setItem(DEMO_HISTORY_KEY, JSON.stringify(next));
    return next;
  }

  async function clearDemoHistory(): Promise<void> {
    await AsyncStorage.removeItem(DEMO_HISTORY_KEY);
  }

  async function loadDemoMode(): Promise<boolean> {
    try {
      return (await AsyncStorage.getItem(DEMO_MODE_KEY)) === "true";
    } catch {
      return false;
    }
  }

  async function saveDemoMode(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(DEMO_MODE_KEY, enabled ? "true" : "false");
  }

  async function saveLastDevice(device: ToothbrushDevice | null): Promise<void> {
    await queueDeviceWrite(async () => {
      if (!device) {
        await AsyncStorage.removeItem(DEVICE_KEY);
        return;
      }
      await AsyncStorage.setItem(DEVICE_KEY, JSON.stringify(device));
    });
  }

  async function loadLastDevice(): Promise<ToothbrushDevice | null> {
    try {
      const raw = await AsyncStorage.getItem(DEVICE_KEY);
      return raw ? (JSON.parse(raw) as ToothbrushDevice) : null;
    } catch {
      return null;
    }
  }
  return { loadHistoryBundle, initializeHistoryStorage, loadHistory, saveSessionWithLifetime, saveDeviceFallbackWithLifetime, saveDeviceSessionWithLifetime, saveDeviceSessionsWithLifetime, saveSession, forgetDeviceWithLifetime, replaceHistoryWithLifetime, replaceHistory, clearHistory, loadDemoHistory, saveDemoSession, replaceDemoHistory, clearDemoHistory, loadDemoMode, saveDemoMode, saveLastDevice, loadLastDevice };
}

export const getBrushStorage = createProfileStore(buildProfileStorage);
type ProfileStorage = ReturnType<typeof getBrushStorage>;
export const loadHistoryBundle: ProfileStorage["loadHistoryBundle"] = (...args) => getBrushStorage().loadHistoryBundle(...args);
export const initializeHistoryStorage: ProfileStorage["initializeHistoryStorage"] = (...args) => getBrushStorage().initializeHistoryStorage(...args);
export const loadHistory: ProfileStorage["loadHistory"] = (...args) => getBrushStorage().loadHistory(...args);
export const saveSessionWithLifetime: ProfileStorage["saveSessionWithLifetime"] = (...args) => getBrushStorage().saveSessionWithLifetime(...args);
export const saveDeviceFallbackWithLifetime: ProfileStorage["saveDeviceFallbackWithLifetime"] = (...args) => getBrushStorage().saveDeviceFallbackWithLifetime(...args);
export const saveDeviceSessionWithLifetime: ProfileStorage["saveDeviceSessionWithLifetime"] = (...args) => getBrushStorage().saveDeviceSessionWithLifetime(...args);
export const saveDeviceSessionsWithLifetime: ProfileStorage["saveDeviceSessionsWithLifetime"] = (...args) => getBrushStorage().saveDeviceSessionsWithLifetime(...args);
export const saveSession: ProfileStorage["saveSession"] = (...args) => getBrushStorage().saveSession(...args);
export const forgetDeviceWithLifetime: ProfileStorage["forgetDeviceWithLifetime"] = (...args) => getBrushStorage().forgetDeviceWithLifetime(...args);
export const replaceHistoryWithLifetime: ProfileStorage["replaceHistoryWithLifetime"] = (...args) => getBrushStorage().replaceHistoryWithLifetime(...args);
export const replaceHistory: ProfileStorage["replaceHistory"] = (...args) => getBrushStorage().replaceHistory(...args);
export const clearHistory: ProfileStorage["clearHistory"] = (...args) => getBrushStorage().clearHistory(...args);
export const loadDemoHistory: ProfileStorage["loadDemoHistory"] = (...args) => getBrushStorage().loadDemoHistory(...args);
export const saveDemoSession: ProfileStorage["saveDemoSession"] = (...args) => getBrushStorage().saveDemoSession(...args);
export const replaceDemoHistory: ProfileStorage["replaceDemoHistory"] = (...args) => getBrushStorage().replaceDemoHistory(...args);
export const clearDemoHistory: ProfileStorage["clearDemoHistory"] = (...args) => getBrushStorage().clearDemoHistory(...args);
export const loadDemoMode: ProfileStorage["loadDemoMode"] = (...args) => getBrushStorage().loadDemoMode(...args);
export const saveDemoMode: ProfileStorage["saveDemoMode"] = (...args) => getBrushStorage().saveDemoMode(...args);
export const saveLastDevice: ProfileStorage["saveLastDevice"] = (...args) => getBrushStorage().saveLastDevice(...args);
export const loadLastDevice: ProfileStorage["loadLastDevice"] = (...args) => getBrushStorage().loadLastDevice(...args);
