import AsyncStorage from "@react-native-async-storage/async-storage";

import type { BrushSession, ToothbrushDevice } from "@/lib/brush-types";

const HISTORY_KEY = "sparkly-brush.history.v1";
const DEMO_HISTORY_KEY = "sparkly-brush.demo-history.v1";
const DEMO_MODE_KEY = "sparkly-brush.demo-mode.v1";
const DEVICE_KEY = "sparkly-brush.device.v1";
const MAX_HISTORY = 120;

function normalizeHistory(parsed: unknown): BrushSession[] {
  if (!Array.isArray(parsed)) return [];
  return (parsed as BrushSession[])
    .filter((item) => item && typeof item.id === "string" && item.durationSeconds >= 0)
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, MAX_HISTORY);
}

async function loadHistoryFromKey(key: string): Promise<BrushSession[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    return normalizeHistory(JSON.parse(raw));
  } catch {
    return [];
  }
}

async function saveSessionToKey(key: string, session: BrushSession): Promise<BrushSession[]> {
  const current = await loadHistoryFromKey(key);
  const next = [session, ...current.filter((item) => item.id !== session.id)]
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, MAX_HISTORY);
  await AsyncStorage.setItem(key, JSON.stringify(next));
  return next;
}

export async function loadHistory(): Promise<BrushSession[]> {
  return loadHistoryFromKey(HISTORY_KEY);
}

export async function saveSession(session: BrushSession): Promise<BrushSession[]> {
  return saveSessionToKey(HISTORY_KEY, session);
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}

export async function loadDemoHistory(): Promise<BrushSession[]> {
  return loadHistoryFromKey(DEMO_HISTORY_KEY);
}

export async function saveDemoSession(session: BrushSession): Promise<BrushSession[]> {
  return saveSessionToKey(DEMO_HISTORY_KEY, session);
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
