import { dayDifference, localDateKey } from "@/lib/day-progress";
import { createProfileStorage, createProfileStore } from "@/lib/profile-scope";

/**
 * Braces mode, set up by a parent for one child. The app decides nothing medical: durations
 * and wear hours are those the orthodontist gave, entered by the parent.
 */
export const BRACES_TYPES = ["fixed", "removable", "aligners", "expander"] as const;
export type BracesType = (typeof BRACES_TYPES)[number];

/** Elastic colours the child can pick, as at the orthodontist's. */
export const ELASTIC_COLORS = {
  red: "#E53935",
  blue: "#1E88E5",
  green: "#43A047",
  purple: "#8E24AA",
  pink: "#EC407A",
  orange: "#FB8C00",
} as const;
export type ElasticColor = keyof typeof ELASTIC_COLORS;

export const CARE_SECONDS_OPTIONS = [30, 60, 90, 120] as const;
export type CareSeconds = (typeof CARE_SECONDS_OPTIONS)[number];

export type BracesStepId =
  | "interdental"
  | "mirror"
  | "takeOut"
  | "cleanAppliance"
  | "putBack"
  | "cleanAligners"
  | "refitAligners"
  | "gentleBrush"
  | "checkFood";

/** Care after brushing: timed steps use the parent's duration, the others are a checkmark. */
export const BRACES_STEPS: Record<BracesType, readonly { id: BracesStepId; timed: boolean }[]> = {
  fixed: [
    { id: "interdental", timed: true },
    { id: "mirror", timed: false },
  ],
  removable: [
    { id: "takeOut", timed: false },
    { id: "cleanAppliance", timed: true },
    { id: "putBack", timed: false },
  ],
  aligners: [
    { id: "cleanAligners", timed: true },
    { id: "refitAligners", timed: false },
  ],
  expander: [
    { id: "gentleBrush", timed: true },
    { id: "checkFood", timed: false },
  ],
};

/** Number of short tips per type, as `braces.tip.<type>.<n>` in the catalogs. */
export const BRACES_TIP_COUNT: Record<BracesType, number> = {
  fixed: 5,
  removable: 4,
  aligners: 5,
  expander: 4,
};

export const BRACES_KEY = "brushlings.braces.v1";
const MAX_CARE_DAYS = 400;

export type BracesSettings = {
  version: 1;
  enabled: boolean;
  type: BracesType;
  elasticColor: ElasticColor;
  careSeconds: CareSeconds;
  /** Aligners: daily wear hours set by the orthodontist; 0 when not entered. */
  alignerHours: number;
  /** Local days (YYYY-MM-DD) with the care routine done, oldest first. */
  careDays: string[];
  /** When the braces came off, to celebrate it; null while they are on. */
  removedAt: number | null;
};

export const DEFAULT_BRACES: BracesSettings = {
  version: 1,
  enabled: false,
  type: "fixed",
  elasticColor: "blue",
  careSeconds: 60,
  alignerHours: 0,
  careDays: [],
  removedAt: null,
};

export function normalizeBraces(raw: unknown): BracesSettings {
  const value = (raw && typeof raw === "object" ? raw : {}) as Partial<BracesSettings>;
  return {
    version: 1,
    enabled: value.enabled === true,
    type: BRACES_TYPES.includes(value.type as BracesType) ? (value.type as BracesType) : "fixed",
    elasticColor: value.elasticColor && value.elasticColor in ELASTIC_COLORS ? value.elasticColor : "blue",
    careSeconds: CARE_SECONDS_OPTIONS.includes(value.careSeconds as CareSeconds) ? (value.careSeconds as CareSeconds) : 60,
    alignerHours:
      typeof value.alignerHours === "number" && Number.isInteger(value.alignerHours) && value.alignerHours >= 0 && value.alignerHours <= 24
        ? value.alignerHours
        : 0,
    careDays: Array.isArray(value.careDays)
      ? [...new Set(value.careDays.filter((day): day is string => typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day)))]
          .sort()
          .slice(-MAX_CARE_DAYS)
      : [],
    removedAt: typeof value.removedAt === "number" && Number.isFinite(value.removedAt) ? value.removedAt : null,
  };
}

export function withCareDay(settings: BracesSettings, now: number): BracesSettings {
  const today = localDateKey(now);
  if (settings.careDays.includes(today)) return settings;
  return { ...settings, careDays: [...settings.careDays, today].slice(-MAX_CARE_DAYS) };
}

/** Days in a row with the care routine, ending today or, while today is still open, yesterday. */
export function careStreak(careDays: readonly string[], now: number): number {
  const days = new Set(careDays);
  const today = localDateKey(now);
  let cursor = new Date(now);
  if (!days.has(today)) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(localDateKey(cursor.getTime()))) {
    streak += 1;
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** «Settimana con l'apparecchio pulito»: seven days in a row. */
export const CLEAN_WEEK_DAYS = 7;

export function hadCleanWeek(careDays: readonly string[]): boolean {
  const sorted = [...careDays].sort();
  let run = 0;
  for (let index = 0; index < sorted.length; index += 1) {
    run = index > 0 && dayDifference(sorted[index - 1], sorted[index]) === 1 ? run + 1 : 1;
    if (run >= CLEAN_WEEK_DAYS) return true;
  }
  return false;
}

export const getBracesStorage = createProfileStore((profileId: string) => {
  const storage = createProfileStorage(profileId);
  return {
    async load(): Promise<BracesSettings> {
      const raw = await storage.getItem(BRACES_KEY);
      if (!raw) return { ...DEFAULT_BRACES };
      try {
        return normalizeBraces(JSON.parse(raw));
      } catch {
        return { ...DEFAULT_BRACES };
      }
    },
    async save(settings: BracesSettings): Promise<void> {
      await storage.setItem(BRACES_KEY, JSON.stringify(normalizeBraces(settings)));
    },
  };
});
