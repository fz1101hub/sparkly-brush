export type ConnectionStatus =
  | "idle"
  | "scanning"
  | "connecting"
  | "connected"
  | "unsupported"
  | "error";

export type LogLevel = "info" | "success" | "warning" | "error";

export interface DiagnosticLog {
  id: string;
  at: number;
  level: LogLevel;
  message: string;
}

export interface ToothbrushDevice {
  id: string;
  name: string;
  model: string;
  firmware?: string;
  battery?: number;
}

export interface BrushLiveData {
  handleState: number;
  isBrushing: boolean;
  elapsedSeconds: number;
  routineSeconds: number;
  mode: "clean" | "unknown";
  intensity: "bassa" | "media" | "alta" | "sconosciuta";
}

export interface BrushSession {
  id: string;
  startedAt: number;
  durationSeconds: number;
  targetSeconds: number;
  completed: boolean;
  source: "manual" | "device" | "demo";
  deviceSessionId?: number;
}

export interface StoredDeviceSession {
  sessionId: number;
  durationSeconds: number;
  targetSeconds: number;
  mode: "clean" | "unknown";
  intensity: "bassa" | "media" | "alta" | "sconosciuta";
}

export interface BleClientEvents {
  onAdapterState: (state: string) => void;
  onStatus: (status: ConnectionStatus, message?: string) => void;
  onDevice: (device: ToothbrushDevice | null) => void;
  onLiveData: (data: BrushLiveData) => void;
  onLog: (level: LogLevel, message: string) => void;
}

export interface SonicareClient {
  initialize(): Promise<void>;
  scanAndConnect(): Promise<void>;
  disconnect(): Promise<void>;
  syncLatestSession(): Promise<StoredDeviceSession | null>;
  destroy(): void;
}

export const DEFAULT_LIVE_DATA: BrushLiveData = {
  handleState: 1,
  isBrushing: false,
  elapsedSeconds: 0,
  routineSeconds: 120,
  mode: "clean",
  intensity: "media",
};
