import { isBrushlingId, type BrushlingId } from "@/lib/brushlings";
import { createProfileStorage, createProfileStore } from "@/lib/profile-scope";

/**
 * Small per-child settings and records added on 27 October 2026 (one record per profile, part of
 * the complete backup): forgiven days of the streak, the session length chosen by the parent and
 * the names the child gave to the creatures.
 */
export const EXTRAS_KEY = "brushlings.extras.v1";

/** "offline": brushed without the phone (voce 62), counts as a brushing day for the streak. */
export type ProtectedReason = "sick" | "holiday" | "offline";
export type ProtectedDay = { day: string; reason: ProtectedReason };

/** Seconds of the timer session; the parent shortens it for the youngest, then grows it to 2 minutes. */
export const SESSION_SECONDS_OPTIONS = [60, 90, 120] as const;
export type SessionSeconds = (typeof SESSION_SECONDS_OPTIONS)[number];

export const MAX_NAME_LENGTH = 16;
const MAX_PROTECTED_DAYS = 120;
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export type Extras = {
  version: 1;
  protectedDays: ProtectedDay[];
  sessionSeconds: SessionSeconds;
  creatureNames: Partial<Record<BrushlingId, string>>;
};

export const DEFAULT_EXTRAS: Extras = {
  version: 1,
  protectedDays: [],
  sessionSeconds: 120,
  creatureNames: {},
};

/** Letters, digits, spaces and a few signs; trimmed and cut to MAX_NAME_LENGTH. */
export function cleanCreatureName(value: string): string {
  return value
    .replace(/[^\p{L}\p{N}\p{M} '’.-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NAME_LENGTH);
}

export function normalizeExtras(raw: unknown): Extras {
  const value = (raw && typeof raw === "object" ? raw : {}) as Partial<Extras>;
  const byDay = new Map<string, ProtectedDay>();
  if (Array.isArray(value.protectedDays)) {
    for (const item of value.protectedDays) {
      const day = item as Partial<ProtectedDay> | null;
      if (day && typeof day.day === "string" && DAY_KEY.test(day.day) && (day.reason === "sick" || day.reason === "holiday" || day.reason === "offline")) {
        byDay.set(day.day, { day: day.day, reason: day.reason });
      }
    }
  }
  const names: Partial<Record<BrushlingId, string>> = {};
  if (value.creatureNames && typeof value.creatureNames === "object") {
    for (const [id, name] of Object.entries(value.creatureNames)) {
      if (isBrushlingId(id) && typeof name === "string" && cleanCreatureName(name)) names[id] = cleanCreatureName(name);
    }
  }
  return {
    version: 1,
    protectedDays: [...byDay.values()].sort((first, second) => first.day.localeCompare(second.day)).slice(-MAX_PROTECTED_DAYS),
    sessionSeconds: SESSION_SECONDS_OPTIONS.includes(value.sessionSeconds as SessionSeconds)
      ? (value.sessionSeconds as SessionSeconds)
      : 120,
    creatureNames: names,
  };
}

export const getExtrasStorage = createProfileStore((profileId: string) => {
  const storage = createProfileStorage(profileId);
  return {
    async load(): Promise<Extras> {
      const raw = await storage.getItem(EXTRAS_KEY);
      if (!raw) return { ...DEFAULT_EXTRAS };
      try {
        return normalizeExtras(JSON.parse(raw));
      } catch {
        return { ...DEFAULT_EXTRAS };
      }
    },
    async save(extras: Extras): Promise<void> {
      await storage.setItem(EXTRAS_KEY, JSON.stringify(normalizeExtras(extras)));
    },
  };
});
