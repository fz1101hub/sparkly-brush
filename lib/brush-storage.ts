import AsyncStorage from "@react-native-async-storage/async-storage";

import type { BrushSession, ToothbrushDevice } from "@/lib/brush-types";

const HISTORY_KEY = "sparkly-brush.history.v1";
const DEVICE_KEY = "sparkly-brush.device.v1";
const MAX_HISTORY = 120;

export async function loadHistory(): Promise<BrushSession[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BrushSession[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.id === "string" && item.durationSeconds >= 0)
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, MAX_HISTORY);
  } catch {
    return [];
  }
}

export async function saveSession(session: BrushSession): Promise<BrushSession[]> {
  const current = await loadHistory();
  const next = [session, ...current.filter((item) => item.id !== session.id)]
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, MAX_HISTORY);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
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
