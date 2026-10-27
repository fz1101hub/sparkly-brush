import type { BrushSession } from "@/lib/brush-types";
import { isEvening, isMorning, localDateKey } from "@/lib/day-progress";

/**
 * Long-term goals (voce 12): milestones at 30, 100 and 365 sessions, the «perfect month» and the
 * stars a creature gains past its last evolution. Display only: they give no coins, so the game's
 * economy stays as it is.
 */
export const SESSION_MILESTONES = [30, 100, 365] as const;
export const LAST_EVOLUTION_LEVEL = 6;
export const LEVELS_PER_STAR = 3;
export const MAX_STARS = 5;

export function creatureStars(level: number): number {
  return level > LAST_EVOLUTION_LEVEL ? Math.min(MAX_STARS, Math.floor((level - LAST_EVOLUTION_LEVEL) / LEVELS_PER_STAR)) : 0;
}

/** "YYYY-MM" of the month before the one containing the timestamp. */
export function previousMonthKey(timestamp: number): string {
  const date = new Date(timestamp);
  const previous = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  return `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, "0")}`;
}

/** Every day of the month had a completed session in the morning and one in the evening. */
export function isPerfectMonth(history: readonly BrushSession[], monthKey: string): boolean {
  const [year, month] = monthKey.split("-").map(Number);
  const days = new Date(year, month, 0).getDate();
  const completed = history.filter((session) => session.completed);
  for (let day = 1; day <= days; day += 1) {
    const key = localDateKey(new Date(year, month - 1, day, 12).getTime());
    const sessions = completed.filter((session) => localDateKey(session.startedAt) === key);
    if (!sessions.some((session) => isMorning(session.startedAt)) || !sessions.some((session) => isEvening(session.startedAt))) {
      return false;
    }
  }
  return true;
}

/**
 * The first week guided one discovery a day (voce 18), instead of showing everything at once.
 * Nothing is hidden: the card only points to one part of the app each day.
 */
export const DISCOVERIES = [
  { id: "creature", route: "/(tabs)/habitat" },
  { id: "missions", route: "/(tabs)/missions" },
  { id: "world", route: "/(tabs)/collection" },
  { id: "eggs", route: "/(tabs)/explore" },
  { id: "album", route: "/(tabs)/album" },
  { id: "quiz", route: "/(tabs)/quiz" },
  { id: "shop", route: "/(tabs)/rewards" },
] as const;
export type Discovery = (typeof DISCOVERIES)[number];

export function discoveryOfDay(startDayKey: string, now: number): Discovery | null {
  const [year, month, day] = startDayKey.split("-").map(Number);
  const today = new Date(now);
  const index = Math.round(
    (Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(year, month - 1, day)) / 86_400_000,
  );
  return index >= 0 && index < DISCOVERIES.length ? DISCOVERIES[index] : null;
}

/** Goals the child can choose (voce 19); the parent approves them as a reward. */
export const GOAL_IDS = ["story", "dinner", "park", "game", "movie", "breakfast"] as const;
export type GoalId = (typeof GOAL_IDS)[number];
export const GOAL_TARGETS = [3, 5, 7] as const;
export type GoalTarget = (typeof GOAL_TARGETS)[number];
export type GoalProposal = { goal: GoalId; target: GoalTarget; proposedAt: number };
