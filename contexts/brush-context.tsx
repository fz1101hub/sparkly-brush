import * as Haptics from "expo-haptics";
import { AppState, Platform } from "react-native";
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
  type SonicareClient,
  type StoredDeviceSession,
  type ToothbrushDevice,
} from "@/lib/brush-types";
import { getBrushStorage } from "@/lib/brush-storage";
import { getManualSessionStorage, type ManualCheckpoint } from "@/lib/manual-session";
import { useOptionalPreferences } from "@/contexts/preferences-context";
import { useOptionalFamily } from "@/contexts/family-context";
import { createSonicareClient } from "@/lib/sonicare-client";
import {
  createEmptyLifetimeProgress,
  deviceKey,
  type LifetimeProgress,
  type LifetimeProgressEvent,
} from "@/lib/lifetime-progress";

export type DemoSessionPeriod = "morning" | "evening" | "now";

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
  manualRecoveryReady: boolean;
  manualStartPending: boolean;
  recoveredManualSession: ManualCheckpoint | null;
  resumeManual: () => Promise<void>;
  pauseManual: () => Promise<void>;
  discardManualRecovery: () => Promise<void>;
  hasPendingManualSession: boolean;
  isSavingManualSession: boolean;
  demoMode: boolean;
  demoSessionCount: number;
  isForgettingToothbrush: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  forgetToothbrush: () => Promise<void>;
  syncLatest: () => Promise<void>;
  startManual: () => Promise<void>;
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
  const storage = useRef(getBrushStorage());
  const preferences = useOptionalPreferences();
  const hapticsAllowed = useRef(false);
  hapticsAllowed.current = !!preferences?.ready && preferences.preferences.hapticsEnabled;
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("Pronto per cercare lo spazzolino");
  const [adapterState, setAdapterState] = useState("Unknown");
  const [device, setDevice] = useState<ToothbrushDevice | null>(null);
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
  const [pendingManualSession, setPendingManualSession] = useState<BrushSession | null>(null);
  const [manualSaveError, setManualSaveError] = useState<string | null>(null);
  const [isSavingManualSession, setIsSavingManualSession] = useState(false);
  const [isForgettingToothbrush, setIsForgettingToothbrush] = useState(false);

  const journal = useRef(getManualSessionStorage());
  const checkpoint = useRef<ManualCheckpoint | null>(null);
  const startingManual = useRef(false);
  const pauseManualRef = useRef<() => Promise<void>>(async () => {});
  const [manualRecoveryReady, setManualRecoveryReady] = useState(false);
  const [manualStartPending, setManualStartPending] = useState(false);
  const [recoveredManualSession, setRecoveredManualSession] = useState<ManualCheckpoint | null>(null);

  const clientRef = useRef<SonicareClient | null>(null);
  const deviceRef = useRef<ToothbrushDevice | null>(null);
  const liveRef = useRef<BrushLiveData>(DEFAULT_LIVE_DATA);
  const lifetimeProgressRef = useRef<LifetimeProgress>(createEmptyLifetimeProgress());
  const manualStartRef = useRef<number>(Date.now());
  const manualDemoModeRef = useRef(false);
  const manualSavedRef = useRef(false);
  const manualSavePromiseRef = useRef<Promise<boolean> | null>(null);
  const pendingBleSyncQueueRef = useRef<PendingBleSync[]>([]);
  const flushPendingBleSyncRef = useRef<(() => Promise<void>) | null>(null);
  const forgettingToothbrushRef = useRef(false);

  const history = demoMode ? demoHistory : realHistory;
  const family = useOptionalFamily();
  const registerProfileGuard = family?.registerGuard;
  const transitionState = useRef({ manualActive, live, pendingManualSession, isSavingManualSession, status });
  transitionState.current = { manualActive, live, pendingManualSession, isSavingManualSession, status };

  useEffect(() => {
    let active = true;
    void journal.current.load().then(saved => {
      if (!active) return;
      checkpoint.current = saved;
      if (saved?.pending) {
        setPendingManualSession(saved.pending);
        setManualSaveError("Ho recuperato una sessione da salvare");
      } else setRecoveredManualSession(saved);
      setManualRecoveryReady(true);
    }).catch(error => { if (active) setManualSaveError(error instanceof Error ? error.message : "Recupero non disponibile"); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    lifetimeProgressRef.current = lifetimeProgress;
  }, [lifetimeProgress]);

  const appendLog = useCallback((level: LogLevel, message: string) => {
    setLogs((current) => [
      { id: nowId(), at: Date.now(), level, message },
      ...current,
    ].slice(0, 80));
  }, []);

  const persistDeviceSessions = useCallback(async (
    stored: StoredDeviceSession[],
    capturedDeviceId?: string,
  ) => {
    const deviceId = capturedDeviceId ?? deviceRef.current?.id;
    if (!deviceId) throw new Error("Identità dello spazzolino non disponibile");
    const next = await storage.current.saveDeviceSessionsWithLifetime(deviceId, stored);
    lifetimeProgressRef.current = next.lifetimeProgress;
    setRealHistory(next.recentHistory);
    setLifetimeProgress(next.lifetimeProgress);
    if (next.event) setProgressEvent(next.event);
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([storage.current.loadHistoryBundle(), storage.current.loadDemoHistory(), storage.current.loadDemoMode()])
      .then(([savedHistory, savedDemoHistory, savedDemoMode]) => {
        setRealHistory(savedHistory.recentHistory);
        setLifetimeProgress(savedHistory.lifetimeProgress);
        setDemoHistory(savedDemoHistory);
        setDemoModeState(savedDemoMode);
      })
      .finally(() => setHistoryReady(true));

    const applySavedSession = (next: Awaited<ReturnType<typeof storage.current.saveSessionWithLifetime>>) => {
      if (!active) return;
      setRealHistory(next.recentHistory);
      setLifetimeProgress(next.lifetimeProgress);
      if (next.event) setProgressEvent(next.event);
    };

    const saveLiveFallback = async (pending: PendingBleSync) => {
      const next = await storage.current.saveDeviceFallbackWithLifetime(pending.deviceId, {
        id: `ble-live:${pending.deviceId}:${pending.startedAt}`,
        startedAt: pending.startedAt,
        rewardPolicy: "completed-only",
        durationSeconds: pending.previous.elapsedSeconds,
        targetSeconds: pending.previous.routineSeconds,
        completed:
          pending.previous.elapsedSeconds >= Math.min(pending.previous.routineSeconds, 120) * 0.9,
        source: "device",
      });
      applySavedSession(next);
      appendLog("warning", "Sessione salvata dai dati live perché il record del manico non era disponibile");
    };

    const pendingFromLiveData = (
      syncClient: SonicareClient,
      deviceId: string | undefined,
    ): PendingBleSync | null => {
      const snapshot = liveRef.current;
      if (!deviceId || !snapshot.isBrushing || snapshot.elapsedSeconds < 5) return null;
      return {
        client: syncClient,
        deviceId,
        previous: snapshot,
        startedAt: Date.now() - snapshot.elapsedSeconds * 1000,
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
            appendLog("warning", error instanceof Error ? error.message : "Record BLE non disponibile");
          } finally {
            pending.cancelSync = null;
          }
        }
        if (stored?.length) await persistDeviceSessions(stored, pending.deviceId);
        else await saveLiveFallback(pending);
      })()
        .catch((error) => {
          appendLog("error", error instanceof Error ? error.message : "Sessione BLE non salvata");
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
        if (message) setStatusMessage(message);
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
          liveRef.current = { ...DEFAULT_LIVE_DATA };
          setLive({ ...DEFAULT_LIVE_DATA });
          return;
        }
        deviceRef.current = next;
        setDevice((current) => {
          const merged = { ...current, ...next };
          void storage.current.saveLastDevice(merged);
          return merged;
        });
      },
      onLiveData: (next) => {
        const previous = liveRef.current;
        if (next.isBrushing && !previous.isBrushing && transitionState.current.manualActive) void pauseManualRef.current();
        liveRef.current = next;
        setLive(next);

        if (previous.isBrushing && !next.isBrushing && previous.elapsedSeconds >= 5) {
          const deviceId = deviceRef.current?.id;
          if (!deviceId) {
            appendLog("error", "Sessione BLE senza identità del dispositivo");
            return;
          }
          const pending: PendingBleSync = {
            client,
            deviceId,
            previous,
            startedAt: Date.now() - previous.elapsedSeconds * 1000,
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
  }, [appendLog, clientFactory, persistDeviceSessions, syncDelayMs]);

  const persistManualSession = useCallback((session: BrushSession): Promise<boolean> => {
    if (manualSavePromiseRef.current) return manualSavePromiseRef.current;
    setPendingManualSession(session);
    setManualSaveError(null);
    setIsSavingManualSession(true);
    const sessionIsDemo = session.source === "demo";
    const operation = (async () => {
      try {
        const pending: ManualCheckpoint = { version: 1, id: session.id, startedAt: session.startedAt, elapsedSeconds: session.durationSeconds, demo: sessionIsDemo, pending: session };
        checkpoint.current = pending;
        await journal.current.save(pending);
        if (sessionIsDemo) {
          const next = await storage.current.saveDemoSession(session);
          setDemoHistory(next);
        } else {
          const next = await storage.current.saveSessionWithLifetime(session);
          setRealHistory(next.recentHistory);
          setLifetimeProgress(next.lifetimeProgress);
          if (next.event) setProgressEvent(next.event);
        }
        await journal.current.clear();
        checkpoint.current = null;
        setRecoveredManualSession(null);
        setPendingManualSession(null);
        setManualSaveError(null);
        setManualElapsed(0);
        appendLog(
          session.completed ? "success" : "info",
          `${sessionIsDemo ? "Sessione demo" : "Sessione manuale"} salvata (${session.durationSeconds}s)`,
        );
        return true;
      } catch (error) {
        manualSavedRef.current = false;
        const message = error instanceof Error ? error.message : "Sessione guidata non salvata";
        setManualSaveError(message);
        appendLog("error", message);
        return false;
      } finally {
        setIsSavingManualSession(false);
        manualSavePromiseRef.current = null;
      }
    })();
    manualSavePromiseRef.current = operation;
    return operation;
  }, [appendLog]);

  useEffect(() => {
    if (!manualActive) return;
    const refreshElapsed = () => {
      setManualElapsed(Math.min(120, Math.max(0, Math.floor(
        (Date.now() - manualStartRef.current) / 1_000,
      ))));
    };
    refreshElapsed();
    const timer = setInterval(refreshElapsed, 1_000);
    return () => clearInterval(timer);
  }, [manualActive]);

  useEffect(() => {
    if (!manualActive || manualElapsed < 120 || manualSavedRef.current) return;
    manualSavedRef.current = true;
    setManualActive(false);
    const sessionIsDemo = manualDemoModeRef.current;
    const session: BrushSession = {
      id: checkpoint.current?.id ?? `${sessionIsDemo ? "demo-manual" : "manual"}-${manualStartRef.current}`,
      startedAt: checkpoint.current?.startedAt ?? manualStartRef.current,
      rewardPolicy: "completed-only",
      durationSeconds: manualElapsed,
      targetSeconds: 120,
      completed: true,
      source: sessionIsDemo ? "demo" : "manual",
    };
    void persistManualSession(session);
  }, [manualActive, manualElapsed, persistManualSession]);

  const connect = useCallback(async () => {
    if (forgettingToothbrushRef.current) {
      appendLog("warning", "Attendi il completamento della rimozione del manico");
      return;
    }
    if (demoMode) {
      appendLog("warning", "Disattiva la modalità demo per collegare lo spazzolino reale");
      return;
    }
    if (Platform.OS !== "web" && hapticsAllowed.current) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    await clientRef.current?.scanAndConnect().catch(() => undefined);
  }, [appendLog, demoMode]);

  const disconnect = useCallback(async () => {
    const closeConnection = clientRef.current?.disconnect() ?? Promise.resolve();
    const savePending = flushPendingBleSyncRef.current?.() ?? Promise.resolve();
    await Promise.all([closeConnection, savePending]);
  }, []);

  useEffect(() => registerProfileGuard?.(async () => {
    const current = transitionState.current;
    if (startingManual.current || current.manualActive || current.live.isBrushing || current.pendingManualSession || current.isSavingManualSession) {
      throw new Error("Termina e salva la sessione prima di cambiare profilo");
    }
    if (current.status === "scanning" || current.status === "connecting") throw new Error("Attendi la connessione o annullala prima di cambiare profilo");
    await disconnect();
  }), [registerProfileGuard, disconnect]);

  const forgetToothbrush = useCallback(async () => {
    if (forgettingToothbrushRef.current) {
      throw new Error("La rimozione del manico è già in corso");
    }
    const deviceId = deviceRef.current?.id;
    if (!deviceId) throw new Error("Collega il manico da reimpostare");
    forgettingToothbrushRef.current = true;
    setIsForgettingToothbrush(true);
    try {
      await disconnect();
      const next = await storage.current.forgetDeviceWithLifetime(deviceId);
      if (!deviceRef.current || deviceRef.current.id === deviceId) {
        deviceRef.current = null;
        setDevice(null);
        liveRef.current = { ...DEFAULT_LIVE_DATA };
        setLive({ ...DEFAULT_LIVE_DATA });
      }
      setRealHistory(next.recentHistory);
      setLifetimeProgress(next.lifetimeProgress);
      setProgressEvent(null);
      appendLog("success", "Manico dimenticato: il prossimo contatore BLE partirà da una nuova generazione");
    } catch (error) {
      appendLog("error", error instanceof Error ? error.message : "Rimozione del manico non riuscita");
      throw error;
    } finally {
      forgettingToothbrushRef.current = false;
      setIsForgettingToothbrush(false);
    }
  }, [appendLog, disconnect]);

  const syncLatest = useCallback(async () => {
    if (forgettingToothbrushRef.current) {
      appendLog("warning", "Attendi il completamento della rimozione del manico");
      return;
    }
    if (demoMode) {
      appendLog("warning", "La sincronizzazione BLE è disattivata in modalità demo");
      return;
    }
    try {
      const deviceId = deviceRef.current?.id;
      if (!deviceId) throw new Error("Collega prima lo spazzolino");
      const cursor = lifetimeProgressRef.current.deviceCursors[deviceKey(deviceId)] ?? null;
      const stored = await clientRef.current?.syncStoredSessionsSince(cursor);
      if (stored?.length) {
        await persistDeviceSessions(stored, deviceId);
        appendLog("success", `${stored.length} sessioni sincronizzate`);
      } else {
        appendLog("warning", "Nessuna nuova sessione disponibile");
      }
    } catch (error) {
      appendLog("error", error instanceof Error ? error.message : "Sincronizzazione non riuscita");
    }
  }, [appendLog, demoMode, persistDeviceSessions]);

  const startManual = useCallback(async () => {
    if (startingManual.current || manualActive || liveRef.current.isBrushing) return;
    if (!manualRecoveryReady || recoveredManualSession || pendingManualSession || isSavingManualSession) {
      setManualSaveError("Riprendi o salva la sessione precedente prima di iniziarne un’altra");
      return;
    }
    startingManual.current = true;
    setManualStartPending(true);
    try {
      const startedAt = Date.now();
      const saved: ManualCheckpoint = { version: 1, id: `${demoMode ? "demo-manual" : "manual"}-${startedAt}-${Math.random().toString(36).slice(2, 7)}`, startedAt, elapsedSeconds: 0, demo: demoMode };
      await journal.current.save(saved);
      checkpoint.current = saved;
      if (liveRef.current.isBrushing) { setRecoveredManualSession(saved); return; }
      manualStartRef.current = Date.now();
      manualDemoModeRef.current = demoMode;
      manualSavedRef.current = false;
      setManualSaveError(null);
      setManualElapsed(0);
      setManualActive(true);
      appendLog("info", demoMode ? "Timer demo avviato" : "Timer guidato avviato");
      if (Platform.OS !== "web" && hapticsAllowed.current) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch (error) {
      setManualSaveError(error instanceof Error ? error.message : "Non riesco a proteggere la sessione. Riprova.");
    } finally { startingManual.current = false; setManualStartPending(false); }
  }, [appendLog, demoMode, isSavingManualSession, manualActive, manualRecoveryReady, pendingManualSession, recoveredManualSession]);

  const pauseManual = useCallback(async () => {
    if (!transitionState.current.manualActive || !checkpoint.current || checkpoint.current.pending) return;
    const elapsedSeconds = Math.min(120, Math.max(0, Math.floor((Date.now() - manualStartRef.current) / 1000)));
    const saved = { ...checkpoint.current, elapsedSeconds };
    checkpoint.current = saved;
    setManualActive(false);
    setManualElapsed(elapsedSeconds);
    setRecoveredManualSession(saved);
    try { await journal.current.save(saved); }
    catch (error) { setManualSaveError(error instanceof Error ? error.message : "Pausa non salvata: riprova prima di chiudere"); }
  }, []);

  pauseManualRef.current = pauseManual;

  const resumeManual = useCallback(async () => {
    const saved = recoveredManualSession;
    if (!saved || saved.pending || liveRef.current.isBrushing || startingManual.current) return;
    startingManual.current = true;
    setManualStartPending(true);
    try {
      await journal.current.save(saved);
      checkpoint.current = saved;
      if (liveRef.current.isBrushing) return;
      manualStartRef.current = Date.now() - saved.elapsedSeconds * 1000;
      manualDemoModeRef.current = saved.demo;
      manualSavedRef.current = false;
      setManualElapsed(saved.elapsedSeconds);
      setRecoveredManualSession(null);
      setManualSaveError(null);
      setManualActive(true);
    } catch (error) { setManualSaveError(error instanceof Error ? error.message : "Non riesco a riprendere la sessione"); }
    finally { startingManual.current = false; setManualStartPending(false); }
  }, [recoveredManualSession]);

  const discardManualRecovery = useCallback(async () => {
    if (pendingManualSession || isSavingManualSession || manualActive || startingManual.current) return;
    try {
      await journal.current.clear();
      checkpoint.current = null;
      setRecoveredManualSession(null);
      setManualElapsed(0);
      setManualSaveError(null);
      setManualRecoveryReady(true);
    } catch (error) { setManualSaveError(error instanceof Error ? error.message : "Non riesco ad aggiornare la sessione"); }
  }, [isSavingManualSession, manualActive, pendingManualSession]);

  useEffect(() => {
    if (!manualActive || !checkpoint.current || checkpoint.current.pending) return;
    const saved = { ...checkpoint.current, elapsedSeconds: manualElapsed };
    checkpoint.current = saved;
    void journal.current.save(saved).catch(error => {
      setManualActive(false);
      setRecoveredManualSession(checkpoint.current);
      setManualSaveError(error instanceof Error ? error.message : "Salvataggio interrotto: riprendi la sessione");
    });
  }, [manualActive, manualElapsed]);

  useEffect(() => {
    if (!manualActive) return;
    if (Platform.OS === "web") {
      const pause = () => { if (document.visibilityState === "hidden") void pauseManual(); };
      if (typeof document === "undefined") return;
      document.addEventListener("visibilitychange", pause);
      return () => document.removeEventListener("visibilitychange", pause);
    }
    const subscription = AppState.addEventListener("change", state => { if (state !== "active") void pauseManual(); });
    return () => subscription.remove();
  }, [manualActive, pauseManual]);

  const stopManual = useCallback(async () => {
    setManualActive(false);
    const duration = Math.min(120, Math.max(0, Math.floor(
      (Date.now() - manualStartRef.current) / 1_000,
    )));
    if (duration >= 5 && !manualSavedRef.current) {
      manualSavedRef.current = true;
      const sessionIsDemo = manualDemoModeRef.current;
      const session: BrushSession = {
        id: checkpoint.current?.id ?? `${sessionIsDemo ? "demo-manual" : "manual"}-${manualStartRef.current}`,
        startedAt: checkpoint.current?.startedAt ?? manualStartRef.current,
        rewardPolicy: "completed-only",
        durationSeconds: duration,
        targetSeconds: 120,
        completed: duration >= 108,
        source: sessionIsDemo ? "demo" : "manual",
      };
      await persistManualSession(session);
    } else if (duration < 5) {
      try { await journal.current.clear(); checkpoint.current = null; setManualElapsed(0); }
      catch (error) { setRecoveredManualSession(checkpoint.current); setManualSaveError(error instanceof Error ? error.message : "Salvataggio non disponibile"); }
    }
  }, [persistManualSession]);

  const retryManualSession = useCallback(async () => {
    if (!pendingManualSession) return;
    manualSavedRef.current = true;
    await persistManualSession(pendingManualSession);
  }, [pendingManualSession, persistManualSession]);

  const setDemoMode = useCallback(async (enabled: boolean) => {
    if (manualActive || recoveredManualSession || pendingManualSession || isSavingManualSession || startingManual.current) throw new Error("Termina e salva la sessione prima di cambiare modalità");
    if (enabled) {
      const closeConnection = clientRef.current?.disconnect() ?? Promise.resolve();
      const savePending = flushPendingBleSyncRef.current?.() ?? Promise.resolve();
      await Promise.all([closeConnection, savePending]);
    }
    await storage.current.saveDemoMode(enabled);
    setDemoModeState(enabled);
    appendLog("info", enabled ? "Modalità demo attivata" : "Modalità demo disattivata");
  }, [appendLog, manualActive, recoveredManualSession, pendingManualSession, isSavingManualSession]);

  const addDemoSession = useCallback(async (period: DemoSessionPeriod) => {
    const startedAt = demoTimestamp(period);
    const id = `demo-${localDayId(startedAt)}-${period}`;
    const next = await storage.current.saveDemoSession(makeDemoSession(id, startedAt));
    setDemoHistory(next);
    appendLog("success", `Sessione demo ${period === "morning" ? "mattina" : period === "evening" ? "sera" : "completa"} aggiunta`);
  }, [appendLog]);

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
    const next = await storage.current.replaceDemoHistory(sessions);
    setDemoHistory(next);
    appendLog("success", "Settimana demo completa generata");
  }, [appendLog]);

  const clearDemoData = useCallback(async () => {
    await storage.current.clearDemoHistory();
    setDemoHistory([]);
    appendLog("info", "Dati demo eliminati");
  }, [appendLog]);

  const restoreRealHistory = useCallback(async (
    restoredHistory: BrushSession[],
    restoredProgress?: LifetimeProgress,
    restoreId?: string,
  ) => {
    const next = await storage.current.replaceHistoryWithLifetime(restoredHistory, restoredProgress, restoreId);
    setRealHistory(next.recentHistory);
    setLifetimeProgress(next.lifetimeProgress);
    setProgressEvent(null);
    appendLog("success", "Storico ripristinato dal backup");
  }, [appendLog]);

  const reloadRealHistory = useCallback(async () => {
    const next = await storage.current.loadHistoryBundle();
    setRealHistory(next.recentHistory);
    setLifetimeProgress(next.lifetimeProgress);
    setProgressEvent(null);
    appendLog("success", "Archivio completo ripristinato dal backup");
  }, [appendLog]);

  const adoptRestoredHistory = useCallback((history: BrushSession[], progress: LifetimeProgress) => {
    setRealHistory(history);
    setLifetimeProgress(progress);
    setProgressEvent(null);
    appendLog("success", "Archivio completo ripristinato dal backup");
  }, [appendLog]);

  const clearAllHistory = useCallback(async () => {
    if (demoMode) {
      await storage.current.clearDemoHistory();
      setDemoHistory([]);
      appendLog("info", "Storico demo eliminato");
      return;
    }
    await storage.current.clearHistory();
    setRealHistory([]);
    setLifetimeProgress(createEmptyLifetimeProgress());
    setProgressEvent(null);
    appendLog("info", "Storico locale eliminato");
  }, [appendLog, demoMode]);

  const isActive = live.isBrushing || manualActive;
  const activeElapsed = live.isBrushing ? live.elapsedSeconds : manualElapsed;
  const activeTarget = live.isBrushing ? live.routineSeconds : 120;
  const activeZone = Math.min(3, Math.floor(Math.min(activeElapsed, 119) / 30));

  const value = useMemo<BrushContextValue>(() => ({
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
    manualRecoveryReady,
    manualStartPending,
    recoveredManualSession,
    resumeManual,
    pauseManual,
    discardManualRecovery,
    hasPendingManualSession: pendingManualSession !== null,
    isSavingManualSession,
    demoMode,
    demoSessionCount: demoHistory.length,
    isForgettingToothbrush,
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
  }), [
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
    manualRecoveryReady,
    manualStartPending,
    recoveredManualSession,
    resumeManual,
    pauseManual,
    discardManualRecovery,
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
  ]);

  return <BrushContext.Provider value={value}>{children}</BrushContext.Provider>;
}

export function useBrush(): BrushContextValue {
  const value = useContext(BrushContext);
  if (!value) throw new Error("useBrush deve essere usato dentro BrushProvider");
  return value;
}

