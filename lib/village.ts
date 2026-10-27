import type { BrushSession } from "@/lib/brush-types";
import { localDateKey, sameLocalDay } from "@/lib/day-progress";
import type { QuizLevel } from "@/lib/learning/quiz";
import type { Dentition } from "@/lib/learning/tooth-names";
import { isSupportedLocale, type SupportedLocale } from "@/lib/locale-types";
import { createProfileStorage, createProfileStore } from "@/lib/profile-scope";

/**
 * The Brushling village: activities away from the two minutes of brushing. They are paid with
 * energy that only brushing earns, so screen time stays tied to the habit.
 */
export const ENERGY_PER_SESSION = 2;
export const DAILY_ENERGY_MAX = 4;
export const VILLAGE_KEY = "brushlings.village.v1";
const MAX_CARDS = 200;

export type VillageState = {
  version: 1;
  /** Local day (YYYY-MM-DD) the `spent` energy refers to. */
  day: string;
  spent: number;
  /** Quiz questions answered correctly: the cards of the Smile Museum. */
  cards: string[];
  quizLevel: QuizLevel;
  /** null: the default, a language different from the app's. */
  learningLanguage: SupportedLocale | null;
  dentition: Dentition;
  /** Best score of «Trova il dente» (out of 5). */
  bestFind: number;
  memoryWins: number;
  visits: number;
  /** Parent setting: off removes the daily limit. */
  energyLimit: boolean;
  /** Parent option: the dentists' FDI numbers on the tooth map. */
  showFdi: boolean;
};

export const DEFAULT_VILLAGE: VillageState = {
  version: 1,
  day: "",
  spent: 0,
  cards: [],
  quizLevel: 1,
  learningLanguage: null,
  dentition: "primary",
  bestFind: 0,
  memoryWins: 0,
  visits: 0,
  energyLimit: true,
  showFdi: false,
};

const count = (value: unknown, max: number) =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? Math.min(value, max) : 0;

export function normalizeVillage(raw: unknown): VillageState {
  const value = (raw && typeof raw === "object" ? raw : {}) as Partial<VillageState>;
  return {
    version: 1,
    day: typeof value.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.day) ? value.day : "",
    spent: count(value.spent, 1_000),
    cards: Array.isArray(value.cards)
      ? [...new Set(value.cards.filter((id): id is string => typeof id === "string" && id.length <= 80))].slice(0, MAX_CARDS)
      : [],
    quizLevel: value.quizLevel === 2 ? 2 : 1,
    learningLanguage: isSupportedLocale(value.learningLanguage) ? value.learningLanguage : null,
    dentition: value.dentition === "permanent" ? "permanent" : "primary",
    bestFind: count(value.bestFind, 5),
    memoryWins: count(value.memoryWins, 100_000),
    visits: count(value.visits, 100_000),
    energyLimit: value.energyLimit !== false,
    showFdi: value.showFdi === true,
  };
}

export type EnergyStatus = {
  earned: number;
  spent: number;
  available: number;
  max: number;
  limited: boolean;
};

/** Two energy per completed session today, up to four: two sessions fill the day. */
export function earnedEnergy(history: readonly BrushSession[], now: number): number {
  const sessions = history.filter(
    (session) => session.completed && session.timeConfidence !== "approximate" && sameLocalDay(session.startedAt, now),
  ).length;
  return Math.min(DAILY_ENERGY_MAX, sessions * ENERGY_PER_SESSION);
}

export function energyStatus(state: VillageState, history: readonly BrushSession[], now: number): EnergyStatus {
  const earned = earnedEnergy(history, now);
  const spent = state.day === localDateKey(now) ? state.spent : 0;
  return {
    earned,
    spent,
    available: state.energyLimit ? Math.max(0, earned - spent) : DAILY_ENERGY_MAX,
    max: DAILY_ENERGY_MAX,
    limited: state.energyLimit,
  };
}

/** The state after one activity, or null when there is no energy left today. */
export function spendEnergy(state: VillageState, history: readonly BrushSession[], now: number): VillageState | null {
  const status = energyStatus(state, history, now);
  if (status.limited && status.available < 1) return null;
  return { ...state, day: localDateKey(now), spent: status.spent + 1 };
}

export function withCard(state: VillageState, id: string): VillageState {
  return state.cards.includes(id) ? state : { ...state, cards: [...state.cards, id].slice(0, MAX_CARDS) };
}

export const getVillageStorage = createProfileStore((profileId: string) => {
  const storage = createProfileStorage(profileId);
  return {
    async load(): Promise<VillageState> {
      const raw = await storage.getItem(VILLAGE_KEY);
      if (!raw) return { ...DEFAULT_VILLAGE };
      try {
        return normalizeVillage(JSON.parse(raw));
      } catch {
        return { ...DEFAULT_VILLAGE };
      }
    },
    async save(state: VillageState): Promise<void> {
      await storage.setItem(VILLAGE_KEY, JSON.stringify(normalizeVillage(state)));
    },
  };
});
