import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  DEFAULT_LIVE_DATA,
  type BrushLiveData,
  type BrushSession,
  type ConnectionStatus,
  type DiagnosticLog,
  type LogLevel,
  type ScanTarget,
  type SonicareClient,
  type StoredDeviceSession,
  type ToothbrushDevice,
} from "@/lib/brush-types";
import {
  clearDemoHistory,
  clearHistory,
  forgetDeviceWithLifetime,
  loadDemoHistory,
  loadDemoMode,
  loadHistoryBundle,
  loadLastDevice,
  replaceDemoHistory,
  replaceHistoryWithLifetime,
  saveDeviceFallbackWithLifetime,
  saveDeviceSessionsWithLifetime,
  saveDemoMode,
  saveDemoSession,
  saveLastDevice,
  saveSessionWithLifetime,
} from "@/lib/brush-storage";
import { useI18n } from "@/contexts/locale-context";
import { useOptionalPreferences } from "@/contexts/preferences-context";
import {
  translateDynamic,
  type TranslationKey,
  type TranslationParams,
} from "@/lib/i18n";
import { DEFAULT_LOCALE } from "@/lib/locale-types";
import { createSonicareClient } from "@/lib/sonicare-client";
import { isKnownSonicareMessage, localizeSonicareMessage } from "@/lib/sonicare-message-i18n";
import {
  createEmptyLifetimeProgress,
  deviceKey,
  pendingDeviceFallbacks,
  type LifetimeProgress,
  type LifetimeProgressEvent,
} from "@/lib/lifetime-progress";
import {
  clearPendingManualSession,
  loadPendingManualSession,
  savePendingManualSession,
} from "@/lib/manual-session-storage";

export type DemoSessionPeriod = "morning" | "evening" | "now";

type BrushTranslate = (
  key: TranslationKey,
  params?: TranslationParams,
) => string;

const fallbackTranslate: BrushTranslate = (key, params) =>
  translateDynamic(DEFAULT_LOCALE, key, params);

/** Keeps isolated provider tests backward-compatible while using active app i18n. */
function useBrushTranslation(): BrushTranslate {
  try {
    return useI18n().t;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "useI18n must be used inside LocaleProvider"
    ) {
      return fallbackTranslate;
    }
    throw error;
  }
}

type BrushContextValue = {
  status: ConnectionStatus;
  statusMessage: string;
  adapterState: string;
  device: ToothbrushDevice | null;
  live: BrushLiveData;
  history: BrushSession[];
  realHistory: BrushSession[];
  lifetimeProgress: LifetimeProgress;
  progressEvent: LifetimeProgressEvent | null;
  historyReady: boolean;
  logs: DiagnosticLog[];
  isActive: boolean;
  activeElapsed: number;
  activeTarget: number;
  activeZone: number;
  manualActive: boolean;
  manualSaveError: string | null;
  hasPendingManualSession: boolean;
  isSavingManualSession: boolean;
  demoMode: boolean;
  demoSessionCount: number;
  isForgettingToothbrush: boolean;
  /** Handle remembered from the last connection: the only one scans connect to. */
  pairedDevice: ToothbrushDevice | null;
  connect: (options?: ConnectOptions) => Promise<void>;
  disconnect: () => Promise<void>;
  forgetToothbrush: () => Promise<void>;
  syncLatest: () => Promise<void>;
  startManual: () => void;
  stopManual: () => Promise<void>;
  retryManualSession: () => Promise<void>;
  setDemoMode: (enabled: boolean) => Promise<void>;
  addDemoSession: (period: DemoSessionPeriod) => Promise<void>;
  generateDemoWeek: () => Promise<void>;
  clearDemoData: () => Promise<void>;
  restoreRealHistory: (history: BrushSession[], progress?: LifetimeProgress, restoreId?: string) => Promise<void>;
  reloadRealHistory: () => Promise<void>;
  adoptRestoredHistory: (history: BrushSession[], progress: LifetimeProgress) => void;
  clearAllHistory: () => Promise<void>;
};

export type ConnectOptions = {
  /** Pair a handle different from the remembered one (for example a sibling's). */
  replaceHandle?: boolean;
};

const BrushContext = createContext<BrushContextValue | null>(null);

export type BrushProviderProps = PropsWithChildren<{
  clientFactory?: typeof createSonicareClient;
  syncDelayMs?: number;
}>;

type PendingBleSync = {
  client: SonicareClient;
  deviceId: string;
  previous: BrushLiveData;
  startedAt: number;
  timer: ReturnType<typeof setTimeout> | null;
  running: Promise<void> | null;
  forceFallback: boolean;
  cancelSync: (() => void) | null;
};

const nowId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const MANUAL_TARGET_SECONDS = process.env.EXPO_PUBLIC_E2E === "1" ? 5 : 120;

function localDayId(timestamp: number): string {
  const date = new Date(timestamp);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("");
}

function demoTimestamp(period: DemoSessionPeriod, base: Date = new Date()): number {
  if (period === "now") return base.getTime();
  const date = new Date(base);
  date.setHours(period === "morning" ? 8 : 20, 0, 0, 0);
  return date.getTime();
}

function makeDemoSession(id: string, startedAt: number): BrushSession {
  return {
    id,
    startedAt,
    rewardPolicy: "completed-only",
    durationSeconds: 120,
    targetSeconds: 120,
    completed: true,
    source: "demo",
  };
}

export function BrushProvider({
  children,
  clientFactory = createSonicareClient,
  syncDelayMs = 450,
}: BrushProviderProps) {
  const activeTranslate = useBrushTranslation();
  const hapticsEnabled = useOptionalPreferences()?.preferences.hapticsEnabled ?? true;
  const translateRef = useRef(activeTranslate);
  useEffect(() => {
    translateRef.current = activeTranslate;
  }, [activeTranslate]);
  const t = useCallback<BrushTranslate>(
    (key, params) => translateRef.current(key, params),
    [],
  );
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [statusDetail, setStatusDetail] = useState<string | null>(null);
  const [adapterState, setAdapterState] = useState("Unknown");
  const [device, setDevice] = useState<ToothbrushDevice | null>(null);
  const [pairedDevice, setPairedDevice] = useState<ToothbrushDevice | null>(null);
  const [live, setLive] = useState<BrushLiveData>(DEFAULT_LIVE_DATA);
  const [realHistory, setRealHistory] = useState<BrushSession[]>([]);
  const [lifetimeProgress, setLifetimeProgress] = useState<LifetimeProgress>(createEmptyLifetimeProgress);
  const [progressEvent, setProgressEvent] = useState<LifetimeProgressEvent | null>(null);
  const [demoHistory, setDemoHistory] = useState<BrushSession[]>([]);
  const [demoMode, setDemoModeState] = useState(false);
  const [historyReady, setHistoryReady] = useState(false);
  const [logs, setLogs] = useState<DiagnosticLog[]>([]);
  const [manualActive, setManualActive] = useState(false);
  const [manualElapsed, setManualElapsed] = useState(0);
  const [pendingManualSession, setPendingManualSession] =
    useState<BrushSession | null>(null);
  const [manualSaveErrorKey, setManualSaveErrorKey] =
    useState<TranslationKey | null>(null);
  const [isSavingManualSession, setIsSavingManualSession] = useState(false);
  const [isForgettingToothbrush, setIsForgettingToothbrush] = useState(false);

  const clientRef = useRef<SonicareClient | null>(null);
  const deviceRef = useRef<ToothbrushDevice | null>(null);
  const pairedDeviceRef = useRef<ToothbrushDevice | null>(null);
  const liveRef = useRef<BrushLiveData>(DEFAULT_LIVE_DATA);
  const liveSessionPeakRef = useRef<BrushLiveData | null>(null);
  const lifetimeProgressRef = useRef<LifetimeProgress>(createEmptyLifetimeProgress());
  const manualStartRef = useRef<number>(0);
  const manualActiveRef = useRef(false);
  const manualDemoModeRef = useRef(false);
  const manualSavedRef = useRef(false);
  const manualSavePromiseRef = useRef<Promise<boolean> | null>(null);
  const pendingBleSyncQueueRef = useRef<PendingBleSync[]>([]);
  const flushPendingBleSyncRef = useRef<(() => Promise<void>) | null>(null);
  const forgettingToothbrushRef = useRef(false);

  const history = demoMode ? demoHistory : realHistory;
  const manualSaveError = manualSaveErrorKey ? activeTranslate(manualSaveErrorKey) : null;
  const statusKeyByStatus: Record<ConnectionStatus, TranslationKey> = {
    idle: device
      ? "brush.client.disconnectedShort"
      : pairedDevice
        ? "brush.status.pairedReady"
        : "brush.status.ready",
    scanning: "brush.client.scanPrompt",
    connecting: "brush.client.connecting",
    connected: "brush.client.ready",
    unsupported: "brush.client.unsupported",
    error: "brush.client.connectionFailed",
  };
  const statusMessage = statusDetail
    ? localizeSonicareMessage(statusDetail, activeTranslate)
    : activeTranslate(statusKeyByStatus[status]);

  useEffect(() => {
    lifetimeProgressRef.current = lifetimeProgress;
  }, [lifetimeProgress]);

  const appendLog = useCallback(
    (
      level: LogLevel,
      message: string,
      translationKey?: TranslationKey,
      translationParams?: TranslationParams,
    ) => {
      setLogs((current) =>
        [
          {
            id: nowId(),
            at: Date.now(),
            level,
            message,
            translationKey,
            translationParams,
          },
          ...current,
        ].slice(0, 80),
      );
    },
    [],
  );

  const appendTranslatedLog = useCallback(
    (level: LogLevel, key: TranslationKey, params?: TranslationParams) =>
      appendLog(level, t(key, params), key, params),
    [appendLog, t],
  );

  const persistDeviceSessions = useCallback(
    async (stored: StoredDeviceSession[], capturedDeviceId?: string) => {
      const deviceId = capturedDeviceId ?? deviceRef.current?.id;
      if (!deviceId) throw new Error(t("brush.error.identityUnavailable"));
      const next = await saveDeviceSessionsWithLifetime(deviceId, stored);
      lifetimeProgressRef.current = next.lifetimeProgress;
      setRealHistory(next.recentHistory);
      setLifetimeProgress(next.lifetimeProgress);
      if (next.event) setProgressEvent(next.event);
      return next;
    },
    [t],
  );

  useEffect(() => {
    let active = true;
    void Promise.all([
      loadHistoryBundle(),
      loadDemoHistory(),
      loadDemoMode(),
      loadPendingManualSession(),
      loadLastDevice(),
    ])
      .then(
        ([
          savedHistory,
          savedDemoHistory,
          savedDemoMode,
          savedPendingManualSession,
          savedDevice,
        ]) => {
          setRealHistory(savedHistory.recentHistory);
          setLifetimeProgress(savedHistory.lifetimeProgress);
          setDemoHistory(savedDemoHistory);
          setDemoModeState(savedDemoMode);
          // A handle connected before this launch stays paired; a connection made in the
          // meantime has already replaced it.
          if (savedDevice && !pairedDeviceRef.current) {
            pairedDeviceRef.current = savedDevice;
            setPairedDevice(savedDevice);
          }
          if (savedPendingManualSession) {
            setPendingManualSession(savedPendingManualSession);
            setManualSaveErrorKey("brush.error.pendingManualSession");
            manualSavedRef.current = false;
          }
        },
      )
      .finally(() => setHistoryReady(true));

    const applySavedSession = (next: Awaited<ReturnType<typeof saveSessionWithLifetime>>) => {
      if (!active) return;
      setRealHistory(next.recentHistory);
      setLifetimeProgress(next.lifetimeProgress);
      if (next.event) setProgressEvent(next.event);
    };

    const saveLiveFallback = async (pending: PendingBleSync) => {
      const next = await saveDeviceFallbackWithLifetime(pending.deviceId, {
        id: `ble-live:${pending.deviceId}:${pending.startedAt}`,
        startedAt: pending.startedAt,
        rewardPolicy: "completed-only",
        durationSeconds: pending.previous.elapsedSeconds,
        targetSeconds: pending.previous.routineSeconds,
        completed:
          pending.previous.elapsedSeconds >= Math.min(pending.previous.routineSeconds, 120) * 0.9,
        source: "device",
      });
      lifetimeProgressRef.current = next.lifetimeProgress;
      applySavedSession(next);
    };

    const pendingFromLiveData = (
      syncClient: SonicareClient,
      deviceId: string | undefined,
    ): PendingBleSync | null => {
      const snapshot = liveRef.current;
      const peak = liveSessionPeakRef.current ?? snapshot;
      if (!deviceId || !snapshot.isBrushing || peak.elapsedSeconds < 5) return null;
      return {
        client: syncClient,
        deviceId,
        previous: peak,
        startedAt: Date.now() - peak.elapsedSeconds * 1000,
        timer: null,
        running: null,
        forceFallback: false,
        cancelSync: null,
      };
    };

    const enqueuePendingBleSync = (candidate: PendingBleSync): PendingBleSync => {
      const existing = pendingBleSyncQueueRef.current.find((pending) => (
        pending.deviceId === candidate.deviceId
        && Math.abs(pending.startedAt - candidate.startedAt) <= 2_000
        && Math.abs(pending.previous.elapsedSeconds - candidate.previous.elapsedSeconds) <= 1
        && pending.previous.routineSeconds === candidate.previous.routineSeconds
      ));
      if (existing) return existing;
      pendingBleSyncQueueRef.current.push(candidate);
      return candidate;
    };

    const runPendingBleSync = (pending: PendingBleSync, fallbackOnly = false): Promise<void> => {
      if (fallbackOnly) {
        pending.forceFallback = true;
        pending.cancelSync?.();
      }
      if (pending.running) return pending.running;
      if (pending.timer) {
        clearTimeout(pending.timer);
        pending.timer = null;
      }
      pending.running = (async () => {
        const position = pendingBleSyncQueueRef.current.indexOf(pending);
        const predecessors = position > 0
          ? pendingBleSyncQueueRef.current.slice(0, position)
          : [];
        for (const predecessor of predecessors) {
          await runPendingBleSync(predecessor, fallbackOnly);
        }
        // The live session must be durable even if the handle still exposes only
        // older records at this stop. Storage reconciles its eventual record.
        await saveLiveFallback(pending);
        let stored: StoredDeviceSession[] | null = null;
        if (!pending.forceFallback) {
          try {
            const cursor = lifetimeProgressRef.current.deviceCursors[deviceKey(pending.deviceId)] ?? null;
            stored = await Promise.race([
              pending.client.syncStoredSessionsSince(cursor),
              new Promise<null>((resolve) => {
                pending.cancelSync = () => resolve(null);
              }),
            ]);
          } catch (error) {
            const detail = error instanceof Error ? error.message : "";
            if (isKnownSonicareMessage(detail)) appendLog("warning", detail);
            else appendTranslatedLog("warning", "brush.error.bleRecordUnavailable");
          } finally {
            pending.cancelSync = null;
          }
        }
        if (stored?.length) await persistDeviceSessions(stored, pending.deviceId);
        const fallbackId = `ble-live:${pending.deviceId}:${pending.startedAt}`;
        if (pendingDeviceFallbacks(lifetimeProgressRef.current, pending.deviceId)
          .some((fallback) => fallback.sessionId === fallbackId)) {
          appendTranslatedLog("warning", "brush.log.liveFallback");
        }
      })()
        .catch((error) => {
          const detail = error instanceof Error ? error.message : "";
          if (isKnownSonicareMessage(detail)) appendLog("error", detail);
          else appendTranslatedLog("error", "brush.error.bleSessionNotSaved");
        })
        .finally(() => {
          pendingBleSyncQueueRef.current = pendingBleSyncQueueRef.current.filter(
            (queued) => queued !== pending,
          );
        });
      return pending.running;
    };

    const client = clientFactory({
      onAdapterState: setAdapterState,
      onStatus: (next, message) => {
        setStatus(next);
        setStatusDetail(message && isKnownSonicareMessage(message) ? message : null);
      },
      onDevice: (next) => {
        if (!next) {
          const deviceId = deviceRef.current?.id;
          const livePending = pendingFromLiveData(client, deviceId);
          if (livePending) enqueuePendingBleSync(livePending);
          for (const pending of [...pendingBleSyncQueueRef.current]) {
            if (!pending.running) void runPendingBleSync(pending, true);
          }
          deviceRef.current = null;
          setDevice(null);
          setStatusDetail(null);
          liveRef.current = { ...DEFAULT_LIVE_DATA };
          liveSessionPeakRef.current = null;
          setLive({ ...DEFAULT_LIVE_DATA });
          return;
        }
        const previous = deviceRef.current;
        const merged = previous && previous.id === next.id ? { ...previous, ...next } : { ...next };
        deviceRef.current = merged;
        pairedDeviceRef.current = merged;
        setDevice(merged);
        setPairedDevice(merged);
        void saveLastDevice(merged);
      },
      onLiveData: (next) => {
        const previous = liveRef.current;
        if (next.isBrushing) {
          liveSessionPeakRef.current = {
            ...next,
            elapsedSeconds: Math.max(
              previous.isBrushing ? (liveSessionPeakRef.current?.elapsedSeconds ?? 0) : 0,
              next.elapsedSeconds,
            ),
          };
          if (!previous.isBrushing && manualActiveRef.current) {
            manualActiveRef.current = false;
            manualSavedRef.current = true;
            setManualActive(false);
            setManualElapsed(0);
            appendTranslatedLog("info", "brush.log.manualReplacedByHandle");
          }
        }
        liveRef.current = next;
        setLive(next);

        if (previous.isBrushing && !next.isBrushing) {
          const peak = liveSessionPeakRef.current ?? previous;
          liveSessionPeakRef.current = null;
          if (peak.elapsedSeconds < 5) return;
          const deviceId = deviceRef.current?.id;
          if (!deviceId) {
            appendTranslatedLog("error", "brush.error.bleSessionNoIdentity");
            return;
          }
          const pending: PendingBleSync = {
            client,
            deviceId,
            previous: peak,
            startedAt: Date.now() - peak.elapsedSeconds * 1000,
            timer: null,
            running: null,
            forceFallback: false,
            cancelSync: null,
          };
          const queued = enqueuePendingBleSync(pending);
          if (queued === pending) {
            pending.timer = setTimeout(() => void runPendingBleSync(pending), syncDelayMs);
          }
          const firstPending = pendingBleSyncQueueRef.current[0];
          if (firstPending !== queued && !firstPending.running) void runPendingBleSync(firstPending);
        }
      },
      onLog: appendLog,
    });

    flushPendingBleSyncRef.current = async () => {
      const livePending = pendingFromLiveData(client, deviceRef.current?.id);
      if (livePending) enqueuePendingBleSync(livePending);
      for (const pending of [...pendingBleSyncQueueRef.current]) {
        await runPendingBleSync(pending, true);
      }
    };

    clientRef.current = client;
    void client.initialize();
    return () => {
      active = false;
      const flushPending = flushPendingBleSyncRef.current;
      if (flushPending) void flushPending();
      flushPendingBleSyncRef.current = null;
      client.destroy();
      clientRef.current = null;
    };
  }, [appendLog, appendTranslatedLog, clientFactory, persistDeviceSessions, syncDelayMs, t]);

  const persistManualSession = useCallback(
    (session: BrushSession): Promise<boolean> => {
      if (manualSavePromiseRef.current) return manualSavePromiseRef.current;
      setPendingManualSession(session);
      setManualSaveErrorKey(null);
      setIsSavingManualSession(true);
      const sessionIsDemo = session.source === "demo";
      const operation = (async () => {
        try {
          await savePendingManualSession(session);
          if (sessionIsDemo) {
            const next = await saveDemoSession(session);
            setDemoHistory(next);
          } else {
            const next = await saveSessionWithLifetime(session);
            setRealHistory(next.recentHistory);
            setLifetimeProgress(next.lifetimeProgress);
            if (next.event) setProgressEvent(next.event);
          }
          await clearPendingManualSession();
          setPendingManualSession(null);
          setManualSaveErrorKey(null);
          setManualElapsed(0);
          appendTranslatedLog(
            session.completed ? "success" : "info",
            sessionIsDemo
              ? "brush.log.demoSessionSaved"
              : "brush.log.realSessionSaved",
            { duration: session.durationSeconds },
          );
          if (session.completed && Platform.OS !== "web" && hapticsEnabled) {
            void Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            );
          }
          return true;
        } catch {
          manualSavedRef.current = false;
          setManualSaveErrorKey("brush.error.guidedSessionNotSaved");
          appendTranslatedLog("error", "brush.error.guidedSessionNotSaved");
          return false;
        } finally {
          setIsSavingManualSession(false);
          manualSavePromiseRef.current = null;
        }
      })();
      manualSavePromiseRef.current = operation;
      return operation;
    },
    [appendTranslatedLog, hapticsEnabled],
  );

  useEffect(() => {
    if (!manualActive) return;
    const refreshElapsed = () => {
      setManualElapsed(Math.min(MANUAL_TARGET_SECONDS, Math.max(0, Math.floor(
        (Date.now() - manualStartRef.current) / 1_000,
      ))));
    };
    refreshElapsed();
    const timer = setInterval(refreshElapsed, 1_000);
    return () => clearInterval(timer);
  }, [manualActive]);

  useEffect(() => {
    if (!manualActive || !manualActiveRef.current || manualElapsed < MANUAL_TARGET_SECONDS || manualSavedRef.current) return;
    manualSavedRef.current = true;
    manualActiveRef.current = false;
    setManualActive(false);
    const sessionIsDemo = manualDemoModeRef.current;
    const session: BrushSession = {
      id: `${sessionIsDemo ? "demo-manual" : "manual"}-${manualStartRef.current}`,
      startedAt: manualStartRef.current,
      rewardPolicy: "completed-only",
      durationSeconds: manualElapsed,
      targetSeconds: MANUAL_TARGET_SECONDS,
      completed: true,
      source: sessionIsDemo ? "demo" : "manual",
    };
    void persistManualSession(session);
  }, [manualActive, manualElapsed, persistManualSession]);

  const disconnect = useCallback(async () => {
    await (clientRef.current?.disconnect() ?? Promise.resolve());
    await (flushPendingBleSyncRef.current?.() ?? Promise.resolve());
  }, []);

  const forgetToothbrush = useCallback(async () => {
    if (forgettingToothbrushRef.current) {
      throw new Error(t("brush.error.forgettingInProgress"));
    }
    const deviceId = deviceRef.current?.id ?? pairedDeviceRef.current?.id;
    if (!deviceId) throw new Error(t("brush.error.connectHandleToReset"));
    forgettingToothbrushRef.current = true;
    setIsForgettingToothbrush(true);
    try {
      await disconnect();
      const next = await forgetDeviceWithLifetime(deviceId);
      if (!deviceRef.current || deviceRef.current.id === deviceId) {
        deviceRef.current = null;
        setDevice(null);
        liveRef.current = { ...DEFAULT_LIVE_DATA };
        setLive({ ...DEFAULT_LIVE_DATA });
      }
      if (pairedDeviceRef.current?.id === deviceId) {
        pairedDeviceRef.current = null;
        setPairedDevice(null);
      }
      setRealHistory(next.recentHistory);
      setLifetimeProgress(next.lifetimeProgress);
      setProgressEvent(null);
      appendTranslatedLog("success", "brush.log.handleForgotten");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "";
      if (isKnownSonicareMessage(detail)) appendLog("error", detail);
      else appendTranslatedLog("error", "brush.error.handleRemovalFailed");
      throw error;
    } finally {
      forgettingToothbrushRef.current = false;
      setIsForgettingToothbrush(false);
    }
  }, [appendLog, appendTranslatedLog, disconnect, t]);

  const syncLatest = useCallback(async () => {
    if (forgettingToothbrushRef.current) {
      appendTranslatedLog("warning", "brush.log.waitForForget");
      return;
    }
    if (demoMode) {
      appendTranslatedLog("warning", "brush.log.syncDisabledInDemo");
      return;
    }
    try {
      const deviceId = deviceRef.current?.id;
      if (!deviceId) {
        appendTranslatedLog("warning", "brush.error.connectFirst");
        return;
      }
      setStatusDetail(null);
      const cursor =
        lifetimeProgressRef.current.deviceCursors[deviceKey(deviceId)] ?? null;
      const stored = await clientRef.current?.syncStoredSessionsSince(cursor);
      if (stored?.length) {
        const persisted = await persistDeviceSessions(stored, deviceId);
        appendTranslatedLog(
          persisted.importedCount > 0 ? "success" : "warning",
          persisted.importedCount > 0
            ? "brush.log.sessionsSynced"
            : "brush.log.noNewSessions",
          persisted.importedCount > 0
            ? { count: persisted.importedCount }
            : undefined,
        );
      } else {
        appendTranslatedLog("warning", "brush.log.noNewSessions");
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : "";
      if (isKnownSonicareMessage(detail)) {
        appendLog("error", detail);
        setStatusDetail(detail);
      } else appendTranslatedLog("error", "brush.error.syncFailed");
    }
  }, [appendLog, appendTranslatedLog, demoMode, persistDeviceSessions]);

  const connect = useCallback(async (options?: ConnectOptions) => {
    if (forgettingToothbrushRef.current) {
      appendTranslatedLog("warning", "brush.log.waitForForget");
      return;
    }
    if (demoMode) {
      appendTranslatedLog("warning", "brush.log.disableDemoToConnect");
      return;
    }
    if (Platform.OS !== "web" && hapticsEnabled) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const client = clientRef.current;
    if (!client) return;
    const paired = pairedDeviceRef.current;
    const target: ScanTarget = options?.replaceHandle && paired
      ? { mode: "replace", currentDeviceId: paired.id }
      : paired
        ? { mode: "paired", deviceId: paired.id }
        : { mode: "any" };
    try {
      await client.scanAndConnect(target);
    } catch {
      // The client already reports the connection error to the user and log.
      return;
    }
    if (deviceRef.current?.id) await syncLatest();
  }, [appendTranslatedLog, demoMode, hapticsEnabled, syncLatest]);

  const startManual = useCallback(() => {
    if (liveRef.current.isBrushing || manualActiveRef.current) {
      appendTranslatedLog("warning", "brush.log.liveSessionInProgress");
      return;
    }
    if (pendingManualSession || isSavingManualSession) {
      appendTranslatedLog("warning", "brush.log.retryPreviousSave");
      return;
    }
    manualStartRef.current = Date.now();
    manualDemoModeRef.current = demoMode;
    manualSavedRef.current = false;
    manualActiveRef.current = true;
    setManualElapsed(0);
    setManualActive(true);
    appendTranslatedLog(
      "info",
      demoMode ? "brush.log.demoTimerStarted" : "brush.log.guidedTimerStarted",
    );
    if (Platform.OS !== "web" && hapticsEnabled) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [appendTranslatedLog, demoMode, hapticsEnabled, isSavingManualSession, pendingManualSession]);

  const stopManual = useCallback(async () => {
    if (!manualActiveRef.current) return;
    manualActiveRef.current = false;
    setManualActive(false);
    const duration = Math.min(MANUAL_TARGET_SECONDS, Math.max(0, Math.floor(
      (Date.now() - manualStartRef.current) / 1_000,
    )));
    if (duration >= 5 && !manualSavedRef.current) {
      manualSavedRef.current = true;
      const sessionIsDemo = manualDemoModeRef.current;
      const session: BrushSession = {
        id: `${sessionIsDemo ? "demo-manual" : "manual"}-${manualStartRef.current}`,
        startedAt: manualStartRef.current,
        rewardPolicy: "completed-only",
        durationSeconds: duration,
        targetSeconds: MANUAL_TARGET_SECONDS,
        completed: duration >= Math.ceil(MANUAL_TARGET_SECONDS * 0.9),
        source: sessionIsDemo ? "demo" : "manual",
      };
      await persistManualSession(session);
    } else if (duration < 5) {
      setManualElapsed(0);
    }
  }, [persistManualSession]);

  const retryManualSession = useCallback(async () => {
    if (!pendingManualSession) return;
    manualSavedRef.current = true;
    await persistManualSession(pendingManualSession);
  }, [pendingManualSession, persistManualSession]);

  const setDemoMode = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        await (clientRef.current?.disconnect() ?? Promise.resolve());
        await (flushPendingBleSyncRef.current?.() ?? Promise.resolve());
      }
      setDemoModeState(enabled);
      await saveDemoMode(enabled);
      appendTranslatedLog(
        "info",
        enabled ? "brush.log.demoModeEnabled" : "brush.log.demoModeDisabled",
      );
    },
    [appendTranslatedLog],
  );

  const addDemoSession = useCallback(
    async (period: DemoSessionPeriod) => {
      const startedAt = demoTimestamp(period);
      const id = `demo-${localDayId(startedAt)}-${period}`;
      const next = await saveDemoSession(makeDemoSession(id, startedAt));
      setDemoHistory(next);
      const keyByPeriod: Record<DemoSessionPeriod, TranslationKey> = {
        morning: "brush.log.demoSessionMorningAdded",
        evening: "brush.log.demoSessionEveningAdded",
        now: "brush.log.demoSessionNowAdded",
      };
      appendTranslatedLog("success", keyByPeriod[period]);
    },
    [appendTranslatedLog],
  );

  const generateDemoWeek = useCallback(async () => {
    const sessions: BrushSession[] = [];
    const today = new Date();
    for (let offset = 6; offset >= 0; offset -= 1) {
      const day = new Date(today);
      day.setDate(today.getDate() - offset);
      const morning = demoTimestamp("morning", day);
      const evening = demoTimestamp("evening", day);
      sessions.push(makeDemoSession(`demo-${localDayId(morning)}-morning`, morning));
      sessions.push(makeDemoSession(`demo-${localDayId(evening)}-evening`, evening));
    }
    const next = await replaceDemoHistory(sessions);
    setDemoHistory(next);
    appendTranslatedLog("success", "brush.log.demoWeekGenerated");
  }, [appendTranslatedLog]);

  const clearDemoData = useCallback(async () => {
    await clearDemoHistory();
    setDemoHistory([]);
    appendTranslatedLog("info", "brush.log.demoDataDeleted");
  }, [appendTranslatedLog]);

  const restoreRealHistory = useCallback(
    async (
      restoredHistory: BrushSession[],
      restoredProgress?: LifetimeProgress,
      restoreId?: string,
    ) => {
      const next = await replaceHistoryWithLifetime(
        restoredHistory,
        restoredProgress,
        restoreId,
      );
      setRealHistory(next.recentHistory);
      setLifetimeProgress(next.lifetimeProgress);
      setProgressEvent(null);
      appendTranslatedLog("success", "brush.log.historyRestored");
    },
    [appendTranslatedLog],
  );

  const reloadRealHistory = useCallback(async () => {
    const next = await loadHistoryBundle();
    setRealHistory(next.recentHistory);
    setLifetimeProgress(next.lifetimeProgress);
    setProgressEvent(null);
    appendTranslatedLog("success", "brush.log.archiveRestored");
  }, [appendTranslatedLog]);

  const adoptRestoredHistory = useCallback(
    (history: BrushSession[], progress: LifetimeProgress) => {
      setRealHistory(history);
      setLifetimeProgress(progress);
      setProgressEvent(null);
      appendTranslatedLog("success", "brush.log.archiveRestored");
    },
    [appendTranslatedLog],
  );

  const clearAllHistory = useCallback(async () => {
    if (demoMode) {
      await clearDemoHistory();
      setDemoHistory([]);
      appendTranslatedLog("info", "brush.log.demoHistoryDeleted");
      return;
    }
    await clearHistory();
    setRealHistory([]);
    setLifetimeProgress(createEmptyLifetimeProgress());
    setProgressEvent(null);
    appendTranslatedLog("info", "brush.log.localHistoryDeleted");
  }, [appendTranslatedLog, demoMode]);

  const isActive = live.isBrushing || manualActive;
  const activeElapsed = live.isBrushing ? live.elapsedSeconds : manualElapsed;
  const activeTarget = live.isBrushing ? live.routineSeconds : MANUAL_TARGET_SECONDS;
  const activeZone = Math.min(3, Math.floor(Math.min(activeElapsed, 119) / 30));

  const value = useMemo<BrushContextValue>(
    () => ({
      status,
      statusMessage,
      adapterState,
      device,
      live,
      history,
      realHistory,
      lifetimeProgress,
      progressEvent,
      historyReady,
      logs,
      isActive,
      activeElapsed,
      activeTarget,
      activeZone,
      manualActive,
      manualSaveError,
      hasPendingManualSession: pendingManualSession !== null,
      isSavingManualSession,
      demoMode,
      demoSessionCount: demoHistory.length,
      isForgettingToothbrush,
      pairedDevice,
      connect,
      disconnect,
      forgetToothbrush,
      syncLatest,
      startManual,
      stopManual,
      retryManualSession,
      setDemoMode,
      addDemoSession,
      generateDemoWeek,
      clearDemoData,
      restoreRealHistory,
      reloadRealHistory,
      adoptRestoredHistory,
      clearAllHistory,
    }),
    [
      activeElapsed,
      activeTarget,
      activeZone,
      adapterState,
      addDemoSession,
      clearAllHistory,
      clearDemoData,
      connect,
      demoHistory.length,
      demoMode,
      device,
      disconnect,
      forgetToothbrush,
      history,
      historyReady,
      isSavingManualSession,
      isForgettingToothbrush,
      lifetimeProgress,
      generateDemoWeek,
      isActive,
      live,
      logs,
      manualActive,
      manualSaveError,
      pairedDevice,
      pendingManualSession,
      progressEvent,
      realHistory,
      reloadRealHistory,
      adoptRestoredHistory,
      restoreRealHistory,
      retryManualSession,
      setDemoMode,
      startManual,
      status,
      statusMessage,
      stopManual,
      syncLatest,
    ],
  );

  return (
    <BrushContext.Provider value={value}>{children}</BrushContext.Provider>
  );
}

export function useBrush(): BrushContextValue {
  const value = useContext(BrushContext);
  if (!value) throw new Error("useBrush deve essere usato dentro BrushProvider");
  return value;
}
