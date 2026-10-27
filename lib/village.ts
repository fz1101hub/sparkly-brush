import type { BrushSession } from "@/lib/brush-types";
import { localDateKey, sameLocalDay } from "@/lib/day-progress";
import type { QuizLevel } from "@/lib/learning/quiz";
import { STORIES } from "@/lib/learning/stories";
import type { Dentition } from "@/lib/learning/tooth-names";
import { isContentLocale, type ContentLocale } from "@/lib/locale-types";
import { createProfileStorage, createProfileStore } from "@/lib/profile-scope";
import { BUBBLE_RECIPES } from "@/lib/village-lab";

/**
 * The Brushling village: activities away from the two minutes of brushing. They are paid with
 * energy that only brushing earns, so screen time stays tied to the habit.
 */
export const ENERGY_PER_SESSION = 2;
export const DAILY_ENERGY_MAX = 4;
export const VILLAGE_KEY = "brushlings.village.v1";
const MAX_CARDS = 200;

/** In the evening the village sleeps: the games that cost energy close until the morning. */
export const BEDTIMES = ["19:30", "20:00", "20:30", "21:00"] as const;
export type Bedtime = (typeof BEDTIMES)[number];
export const WAKE_TIME = "06:30";

/** The weekly boss of the square: one hit for each completed session from Monday to Sunday. */
export const BOSS_HP = 10;

/** A baby tooth that fell out, recorded in the mouse's house. */
export type LostTooth = { id: string; day: string };
const PRIMARY_TOOTH_ID = /^(upper|lower)-(right|left)-[0-4]$/;
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export type VillageState = {
  version: 1;
  /** Local day (YYYY-MM-DD) the `spent` energy refers to. */
  day: string;
  spent: number;
  /** Quiz questions answered correctly: the cards of the Smile Museum. */
  cards: string[];
  quizLevel: QuizLevel;
  /** null: the default, a language different from the app's. */
  learningLanguage: ContentLocale | null;
  dentition: Dentition;
  /** Best score of «Trova il dente» (out of 5). */
  bestFind: number;
  memoryWins: number;
  visits: number;
  /** Parent setting: off removes the daily limit. */
  energyLimit: boolean;
  /** Parent option: the dentists' FDI numbers on the tooth map. */
  showFdi: boolean;
  /** Parent setting: games close at bedtime and reopen at WAKE_TIME. */
  nightRest: boolean;
  bedtime: Bedtime;
  lostTeeth: LostTooth[];
  /** Best score in the food garden (out of 6). */
  gardenBest: number;
  /** Recipes brewed in the bubble lab. */
  bubbles: string[];
  /** Weeks (their Monday) whose plaque boss was defeated. */
  bossWeeks: string[];
  storiesRead: string[];
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
  nightRest: true,
  bedtime: "20:30",
  lostTeeth: [],
  gardenBest: 0,
  bubbles: [],
  bossWeeks: [],
  storiesRead: [],
};

const knownIds = (value: unknown, known: readonly string[]) =>
  Array.isArray(value) ? known.filter((id) => value.includes(id)) : [];

function normalizeLostTeeth(value: unknown): LostTooth[] {
  if (!Array.isArray(value)) return [];
  const byId = new Map<string, LostTooth>();
  for (const item of value) {
    const raw = (item && typeof item === "object" ? item : {}) as Partial<LostTooth>;
    if (typeof raw.id === "string" && PRIMARY_TOOTH_ID.test(raw.id) && typeof raw.day === "string" && DAY_KEY.test(raw.day)) {
      byId.set(raw.id, { id: raw.id, day: raw.day });
    }
  }
  return [...byId.values()];
}

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
    learningLanguage: isContentLocale(value.learningLanguage) ? value.learningLanguage : null,
    dentition: value.dentition === "permanent" ? "permanent" : "primary",
    bestFind: count(value.bestFind, 5),
    memoryWins: count(value.memoryWins, 100_000),
    visits: count(value.visits, 100_000),
    energyLimit: value.energyLimit !== false,
    showFdi: value.showFdi === true,
    nightRest: value.nightRest !== false,
    bedtime: BEDTIMES.includes(value.bedtime as Bedtime) ? (value.bedtime as Bedtime) : "20:30",
    lostTeeth: normalizeLostTeeth(value.lostTeeth),
    gardenBest: count(value.gardenBest, 6),
    bubbles: knownIds(value.bubbles, BUBBLE_RECIPES.map((recipe) => recipe.id)),
    bossWeeks: Array.isArray(value.bossWeeks)
      ? [...new Set(value.bossWeeks.filter((day): day is string => typeof day === "string" && DAY_KEY.test(day)))].sort().slice(-60)
      : [],
    storiesRead: knownIds(value.storiesRead, STORIES.map((story) => story.id)),
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

/** The state after one activity, or null when there is no energy left today or the village sleeps. */
export function spendEnergy(state: VillageState, history: readonly BrushSession[], now: number): VillageState | null {
  if (isVillageAsleep(state, now)) return null;
  const status = energyStatus(state, history, now);
  if (status.limited && status.available < 1) return null;
  return { ...state, day: localDateKey(now), spent: status.spent + 1 };
}

const minutesOf = (time: string) => {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
};

/** Between bedtime and WAKE_TIME, when the parent left the evening rest on. */
export function isVillageAsleep(state: Pick<VillageState, "nightRest" | "bedtime">, now: number): boolean {
  if (!state.nightRest) return false;
  const date = new Date(now);
  const minutes = date.getHours() * 60 + date.getMinutes();
  return minutes >= minutesOf(state.bedtime) || minutes < minutesOf(WAKE_TIME);
}

/** The Monday (local day key) of the week `now` falls in. */
export function weekKey(now: number): string {
  const date = new Date(now);
  const fromMonday = (date.getDay() + 6) % 7;
  return localDateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() - fromMonday, 12).getTime());
}

/** Completed sessions this week, each one a hit on the plaque boss. */
export function bossHits(history: readonly BrushSession[], now: number): number {
  const week = weekKey(now);
  return history.filter((session) => session.completed && weekKey(session.startedAt) === week).length;
}

export function withLostTooth(state: VillageState, id: string, now: number): VillageState {
  if (state.lostTeeth.some((tooth) => tooth.id === id)) return state;
  return { ...state, lostTeeth: [...state.lostTeeth, { id, day: localDateKey(now) }] };
}

export function withoutLostTooth(state: VillageState, id: string): VillageState {
  return { ...state, lostTeeth: state.lostTeeth.filter((tooth) => tooth.id !== id) };
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
