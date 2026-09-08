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
  type SonicareClient,
  type StoredDeviceSession,
  type ToothbrushDevice,
} from "@/lib/brush-types";
import {
  clearDemoHistory,
  clearHistory,
  loadDemoHistory,
  loadDemoMode,
  loadHistory,
  replaceDemoHistory,
  replaceHistory,
  saveDemoMode,
  saveDemoSession,
  saveLastDevice,
  saveSession,
} from "@/lib/brush-storage";
import { createSonicareClient } from "@/lib/sonicare-client";

export type DemoSessionPeriod = "morning" | "evening" | "now";

type BrushContextValue = {
  status: ConnectionStatus;
  statusMessage: string;
  adapterState: string;
  device: ToothbrushDevice | null;
  live: BrushLiveData;
  history: BrushSession[];
  realHistory: BrushSession[];
  historyReady: boolean;
  logs: DiagnosticLog[];
  isActive: boolean;
  activeElapsed: number;
  activeTarget: number;
  activeZone: number;
  manualActive: boolean;
  demoMode: boolean;
  demoSessionCount: number;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  syncLatest: () => Promise<void>;
  startManual: () => void;
  stopManual: () => Promise<void>;
  setDemoMode: (enabled: boolean) => Promise<void>;
  addDemoSession: (period: DemoSessionPeriod) => Promise<void>;
  generateDemoWeek: () => Promise<void>;
  clearDemoData: () => Promise<void>;
  restoreRealHistory: (history: BrushSession[]) => Promise<void>;
  clearAllHistory: () => Promise<void>;
};

const BrushContext = createContext<BrushContextValue | null>(null);

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
  return { id, startedAt, durationSeconds: 120, targetSeconds: 120, completed: true, source: "demo" };
}

export function BrushProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("Pronto per cercare lo spazzolino");
  const [adapterState, setAdapterState] = useState("Unknown");
  const [device, setDevice] = useState<ToothbrushDevice | null>(null);
  const [live, setLive] = useState<BrushLiveData>(DEFAULT_LIVE_DATA);
  const [realHistory, setRealHistory] = useState<BrushSession[]>([]);
  const [demoHistory, setDemoHistory] = useState<BrushSession[]>([]);
  const [demoMode, setDemoModeState] = useState(false);
  const [historyReady, setHistoryReady] = useState(false);
  const [logs, setLogs] = useState<DiagnosticLog[]>([]);
  const [manualActive, setManualActive] = useState(false);
  const [manualElapsed, setManualElapsed] = useState(0);

  const clientRef = useRef<SonicareClient | null>(null);
  const liveRef = useRef<BrushLiveData>(DEFAULT_LIVE_DATA);
  const manualStartRef = useRef<number>(Date.now());
  const manualSavedRef = useRef(false);

  const history = demoMode ? demoHistory : realHistory;

  const appendLog = useCallback((level: LogLevel, message: string) => {
    setLogs((current) => [
      { id: nowId(), at: Date.now(), level, message },
      ...current,
    ].slice(0, 80));
  }, []);

  const persistDeviceSession = useCallback(async (stored: StoredDeviceSession) => {
    const session: BrushSession = {
      id: `ble-${stored.sessionId}`,
      deviceSessionId: stored.sessionId,
      startedAt: Date.now() - stored.durationSeconds * 1000,
      durationSeconds: stored.durationSeconds,
      targetSeconds: stored.targetSeconds,
      completed: stored.durationSeconds >= Math.min(stored.targetSeconds, 120) * 0.9,
      source: "device",
    };
    const next = await saveSession(session);
    setRealHistory(next);
  }, []);

  useEffect(() => {
    void Promise.all([loadHistory(), loadDemoHistory(), loadDemoMode()])
      .then(([savedHistory, savedDemoHistory, savedDemoMode]) => {
        setRealHistory(savedHistory);
        setDemoHistory(savedDemoHistory);
        setDemoModeState(savedDemoMode);
      })
      .finally(() => setHistoryReady(true));

    const client = createSonicareClient({
      onAdapterState: setAdapterState,
      onStatus: (next, message) => {
        setStatus(next);
        if (message) setStatusMessage(message);
      },
      onDevice: (next) => {
        if (!next) {
          setDevice(null);
          return;
        }
        setDevice((current) => {
          const merged = { ...current, ...next };
          void saveLastDevice(merged);
          return merged;
        });
      },
      onLiveData: (next) => {
        const previous = liveRef.current;
        liveRef.current = next;
        setLive(next);

        if (previous.isBrushing && !next.isBrushing && previous.elapsedSeconds >= 5) {
          setTimeout(() => {
            void clientRef.current
              ?.syncLatestSession()
              .then((stored) => {
                if (stored) return persistDeviceSession(stored);
                return saveSession({
                  id: `ble-live-${Date.now()}`,
                  startedAt: Date.now() - previous.elapsedSeconds * 1000,
                  durationSeconds: previous.elapsedSeconds,
                  targetSeconds: previous.routineSeconds,
                  completed: previous.elapsedSeconds >= Math.min(previous.routineSeconds, 120) * 0.9,
                  source: "device",
                }).then(setRealHistory);
              })
              .catch(() => undefined);
          }, 450);
        }
      },
      onLog: appendLog,
    });

    clientRef.current = client;
    void client.initialize();
    return () => {
      client.destroy();
      clientRef.current = null;
    };
  }, [appendLog, persistDeviceSession]);

  useEffect(() => {
    if (!manualActive) return;
    const timer = setInterval(() => setManualElapsed((seconds) => seconds + 1), 1000);
    return () => clearInterval(timer);
  }, [manualActive]);

  useEffect(() => {
    if (!manualActive || manualElapsed < 120 || manualSavedRef.current) return;
    manualSavedRef.current = true;
    setManualActive(false);
    const session: BrushSession = {
      id: `${demoMode ? "demo-manual" : "manual"}-${manualStartRef.current}`,
      startedAt: manualStartRef.current,
      durationSeconds: manualElapsed,
      targetSeconds: 120,
      completed: true,
      source: demoMode ? "demo" : "manual",
    };
    const persist = demoMode
      ? saveDemoSession(session).then(setDemoHistory)
      : saveSession(session).then(setRealHistory);
    void persist;
    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    appendLog("success", demoMode ? "Sessione demo completata" : "Sessione guidata completata");
  }, [appendLog, demoMode, manualActive, manualElapsed]);

  const connect = useCallback(async () => {
    if (demoMode) {
      appendLog("warning", "Disattiva la modalità demo per collegare lo spazzolino reale");
      return;
    }
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await clientRef.current?.scanAndConnect().catch(() => undefined);
  }, [appendLog, demoMode]);

  const disconnect = useCallback(async () => {
    await clientRef.current?.disconnect();
  }, []);

  const syncLatest = useCallback(async () => {
    if (demoMode) {
      appendLog("warning", "La sincronizzazione BLE è disattivata in modalità demo");
      return;
    }
    try {
      const stored = await clientRef.current?.syncLatestSession();
      if (stored) {
        await persistDeviceSession(stored);
      } else {
        appendLog("warning", "Nessuna nuova sessione disponibile");
      }
    } catch (error) {
      appendLog("error", error instanceof Error ? error.message : "Sincronizzazione non riuscita");
    }
  }, [appendLog, demoMode, persistDeviceSession]);

  const startManual = useCallback(() => {
    manualStartRef.current = Date.now();
    manualSavedRef.current = false;
    setManualElapsed(0);
    setManualActive(true);
    appendLog("info", demoMode ? "Timer demo avviato" : "Timer guidato avviato");
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [appendLog, demoMode]);

  const stopManual = useCallback(async () => {
    setManualActive(false);
    const duration = manualElapsed;
    if (duration >= 5 && !manualSavedRef.current) {
      manualSavedRef.current = true;
      const session: BrushSession = {
        id: `${demoMode ? "demo-manual" : "manual"}-${manualStartRef.current}`,
        startedAt: manualStartRef.current,
        durationSeconds: duration,
        targetSeconds: 120,
        completed: duration >= 108,
        source: demoMode ? "demo" : "manual",
      };
      const next = demoMode ? await saveDemoSession(session) : await saveSession(session);
      if (demoMode) setDemoHistory(next);
      else setRealHistory(next);
      appendLog("info", `${demoMode ? "Sessione demo" : "Sessione manuale"} salvata (${duration}s)`);
    }
    setManualElapsed(0);
  }, [appendLog, demoMode, manualElapsed]);

  const setDemoMode = useCallback(async (enabled: boolean) => {
    if (enabled && status === "connected") await clientRef.current?.disconnect();
    setDemoModeState(enabled);
    await saveDemoMode(enabled);
    appendLog("info", enabled ? "Modalità demo attivata" : "Modalità demo disattivata");
  }, [appendLog, status]);

  const addDemoSession = useCallback(async (period: DemoSessionPeriod) => {
    const startedAt = demoTimestamp(period);
    const id = `demo-${localDayId(startedAt)}-${period}`;
    const next = await saveDemoSession(makeDemoSession(id, startedAt));
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
    const next = await replaceDemoHistory(sessions);
    setDemoHistory(next);
    appendLog("success", "Settimana demo completa generata");
  }, [appendLog]);

  const clearDemoData = useCallback(async () => {
    await clearDemoHistory();
    setDemoHistory([]);
    appendLog("info", "Dati demo eliminati");
  }, [appendLog]);

  const restoreRealHistory = useCallback(async (restoredHistory: BrushSession[]) => {
    const next = await replaceHistory(restoredHistory);
    setRealHistory(next);
    appendLog("success", "Storico ripristinato dal backup");
  }, [appendLog]);

  const clearAllHistory = useCallback(async () => {
    if (demoMode) {
      await clearDemoHistory();
      setDemoHistory([]);
      appendLog("info", "Storico demo eliminato");
      return;
    }
    await clearHistory();
    setRealHistory([]);
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
    historyReady,
    logs,
    isActive,
    activeElapsed,
    activeTarget,
    activeZone,
    manualActive,
    demoMode,
    demoSessionCount: demoHistory.length,
    connect,
    disconnect,
    syncLatest,
    startManual,
    stopManual,
    setDemoMode,
    addDemoSession,
    generateDemoWeek,
    clearDemoData,
    restoreRealHistory,
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
    history,
    historyReady,
    generateDemoWeek,
    isActive,
    live,
    logs,
    manualActive,
    realHistory,
    restoreRealHistory,
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
