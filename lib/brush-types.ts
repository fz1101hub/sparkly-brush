import type { TranslationKey, TranslationParams } from "@/lib/i18n";

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
  translationKey?: TranslationKey;
  translationParams?: TranslationParams;
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
  timeConfidence?: "exact" | "reconstructed" | "approximate";
  rewardPolicy?: "legacy" | "completed-only";
  durationSeconds: number;
  targetSeconds: number;
  completed: boolean;
  source: "manual" | "device" | "demo";
  deviceSessionId?: number;
}

export interface StoredDeviceSession {
  sessionId: number;
  handleTimestampSeconds?: number;
  startedAt?: number;
  timeConfidence?: "exact" | "reconstructed" | "approximate";
  durationSeconds: number;
  targetSeconds: number;
  mode: "clean" | "unknown";
  intensity: "bassa" | "media" | "alta" | "sconosciuta";
}

export interface DeviceSyncCursor {
  lastSessionId: number;
  acceptNextSession: boolean;
  resetBaselineSessionId?: number | null;
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
  syncStoredSessionsSince(cursor?: DeviceSyncCursor | null): Promise<StoredDeviceSession[]>;
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
