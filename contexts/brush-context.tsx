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
import { clearHistory, loadHistory, replaceHistory, saveLastDevice, saveSession } from "@/lib/brush-storage";
import { createSonicareClient } from "@/lib/sonicare-client";

type BrushContextValue = {
  status: ConnectionStatus;
  statusMessage: string;
  adapterState: string;
  device: ToothbrushDevice | null;
  live: BrushLiveData;
  history: BrushSession[];
  historyReady: boolean;
  logs: DiagnosticLog[];
  isActive: boolean;
  activeElapsed: number;
  activeTarget: number;
  activeZone: number;
  manualActive: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  syncLatest: () => Promise<void>;
  startManual: () => void;
  stopManual: () => Promise<void>;
  restoreRealHistory: (history: BrushSession[]) => Promise<void>;
  clearAllHistory: () => Promise<void>;
};

const BrushContext = createContext<BrushContextValue | null>(null);

const nowId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export function BrushProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("Pronto per cercare lo spazzolino");
  const [adapterState, setAdapterState] = useState("Unknown");
  const [device, setDevice] = useState<ToothbrushDevice | null>(null);
  const [live, setLive] = useState<BrushLiveData>(DEFAULT_LIVE_DATA);
  const [history, setHistory] = useState<BrushSession[]>([]);
  const [historyReady, setHistoryReady] = useState(false);
  const [logs, setLogs] = useState<DiagnosticLog[]>([]);
  const [manualActive, setManualActive] = useState(false);
  const [manualElapsed, setManualElapsed] = useState(0);

  const clientRef = useRef<SonicareClient | null>(null);
  const liveRef = useRef<BrushLiveData>(DEFAULT_LIVE_DATA);
  const manualStartRef = useRef<number>(Date.now());
  const manualSavedRef = useRef(false);

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
    setHistory(next);
  }, []);

  useEffect(() => {
    void loadHistory()
      .then(setHistory)
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
                }).then(setHistory);
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
      id: `manual-${manualStartRef.current}`,
      startedAt: manualStartRef.current,
      durationSeconds: manualElapsed,
      targetSeconds: 120,
      completed: true,
      source: "manual",
    };
    void saveSession(session).then(setHistory);
    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    appendLog("success", "Sessione guidata completata");
  }, [appendLog, manualActive, manualElapsed]);

  const connect = useCallback(async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await clientRef.current?.scanAndConnect().catch(() => undefined);
  }, []);

  const disconnect = useCallback(async () => {
    await clientRef.current?.disconnect();
  }, []);

  const syncLatest = useCallback(async () => {
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
  }, [appendLog, persistDeviceSession]);

  const startManual = useCallback(() => {
    manualStartRef.current = Date.now();
    manualSavedRef.current = false;
    setManualElapsed(0);
    setManualActive(true);
    appendLog("info", "Timer guidato avviato");
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [appendLog]);

  const stopManual = useCallback(async () => {
    setManualActive(false);
    const duration = manualElapsed;
    if (duration >= 5 && !manualSavedRef.current) {
      manualSavedRef.current = true;
      const next = await saveSession({
        id: `manual-${manualStartRef.current}`,
        startedAt: manualStartRef.current,
        durationSeconds: duration,
        targetSeconds: 120,
        completed: duration >= 108,
        source: "manual",
      });
      setHistory(next);
      appendLog("info", `Sessione manuale salvata (${duration}s)`);
    }
    setManualElapsed(0);
  }, [appendLog, manualElapsed]);

  const restoreRealHistory = useCallback(async (restoredHistory: BrushSession[]) => {
    const next = await replaceHistory(restoredHistory);
    setHistory(next);
    appendLog("success", "Storico ripristinato dal backup");
  }, [appendLog]);

  const clearAllHistory = useCallback(async () => {
    await clearHistory();
    setHistory([]);
    appendLog("info", "Storico locale eliminato");
  }, [appendLog]);

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
    historyReady,
    logs,
    isActive,
    activeElapsed,
    activeTarget,
    activeZone,
    manualActive,
    connect,
    disconnect,
    syncLatest,
    startManual,
    stopManual,
    restoreRealHistory,
    clearAllHistory,
  }), [
    activeElapsed,
    activeTarget,
    activeZone,
    adapterState,
    clearAllHistory,
    connect,
    device,
    disconnect,
    history,
    historyReady,
    isActive,
    live,
    logs,
    manualActive,
    restoreRealHistory,
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
