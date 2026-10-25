import { createProfileStorage, createProfileStore } from "@/lib/profile-scope";

import type { BrushSession } from "@/lib/brush-types";

function isPendingManualSession(value: unknown): value is BrushSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<BrushSession>;
  return typeof session.id === "string"
    && session.id.length > 0
    && session.id.length <= 512
    && Number.isSafeInteger(session.startedAt)
    && (session.startedAt ?? -1) >= 0
    && Number.isSafeInteger(session.durationSeconds)
    && (session.durationSeconds ?? -1) >= 5
    && (session.durationSeconds ?? 0) <= 120
    && Number.isSafeInteger(session.targetSeconds)
    && (session.targetSeconds ?? 0) > 0
    && typeof session.completed === "boolean"
    && (session.source === "manual" || session.source === "demo");
}

function buildProfileStorage(profileId: string) {
  const AsyncStorage = createProfileStorage(profileId);
  const PENDING_MANUAL_SESSION_KEY = "sparkly-brush.manual.pending.v1";

  async function loadPendingManualSession(): Promise<BrushSession | null> {
    try {
      const raw = await AsyncStorage.getItem(PENDING_MANUAL_SESSION_KEY);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      return isPendingManualSession(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  async function savePendingManualSession(session: BrushSession): Promise<void> {
    if (!isPendingManualSession(session)) throw new Error("Sessione manuale pendente non valida");
    await AsyncStorage.setItem(PENDING_MANUAL_SESSION_KEY, JSON.stringify(session));
  }

  async function clearPendingManualSession(): Promise<void> {
    await AsyncStorage.removeItem(PENDING_MANUAL_SESSION_KEY);
  }
  return { loadPendingManualSession, savePendingManualSession, clearPendingManualSession };
}

export const getPendingManualStorage = createProfileStore(buildProfileStorage);
type ProfileStorage = ReturnType<typeof getPendingManualStorage>;
export const loadPendingManualSession: ProfileStorage["loadPendingManualSession"] = (...args) => getPendingManualStorage().loadPendingManualSession(...args);
export const savePendingManualSession: ProfileStorage["savePendingManualSession"] = (...args) => getPendingManualStorage().savePendingManualSession(...args);
export const clearPendingManualSession: ProfileStorage["clearPendingManualSession"] = (...args) => getPendingManualStorage().clearPendingManualSession(...args);
