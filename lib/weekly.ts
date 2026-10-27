import type { BrushSession } from "@/lib/brush-types";
import { isEvening, isMorning, localDateKey } from "@/lib/day-progress";

const DAY_MS = 86_400_000;

/** Monday 00:00 (local time) of the week containing the timestamp. */
export function weekStart(timestamp: number): number {
  const date = new Date(timestamp);
  const fromMonday = (date.getDay() + 6) % 7;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - fromMonday).getTime();
}

/** The Monday of the week, as a local day key: one key per week, the same on every device. */
export function weekKey(timestamp: number): string {
  return localDateKey(weekStart(timestamp));
}

export function previousWeekStart(start: number): number {
  const date = new Date(start);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 7).getTime();
}

export function nextWeekStart(start: number): number {
  const date = new Date(start);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7).getTime();
}

export function inWeek(session: BrushSession, start: number): boolean {
  return session.startedAt >= start && session.startedAt < nextWeekStart(start);
}

/** Weeks since Monday 5 January 1970, stable across time zones changes of the same calendar. */
export function weekNumber(start: number): number {
  const date = new Date(start);
  return Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(1970, 0, 5)) / (7 * DAY_MS));
}

/**
 * Rotating weekly challenges (voce 51): a different goal every week, the same for the whole
 * family, reachable also by an only child. They give a sticker-like win, never coins.
 */
export const CHALLENGE_IDS = ["sessions", "perfect", "evenings", "mornings", "full", "days", "extra"] as const;
export type ChallengeId = (typeof CHALLENGE_IDS)[number];
export const CHALLENGE_TARGETS: Record<ChallengeId, number> = {
  sessions: 10,
  perfect: 4,
  evenings: 6,
  mornings: 6,
  full: 8,
  days: 5,
  extra: 3,
};

export function challengeOfWeek(start: number): ChallengeId {
  const index = ((weekNumber(start) % CHALLENGE_IDS.length) + CHALLENGE_IDS.length) % CHALLENGE_IDS.length;
  return CHALLENGE_IDS[index];
}

export function challengeProgress(
  id: ChallengeId,
  history: readonly BrushSession[],
  extraStepDays: readonly string[],
  start: number,
): number {
  const week = history.filter((session) => session.completed && inWeek(session, start));
  const days = new Set(week.map((session) => localDateKey(session.startedAt)));
  const target = CHALLENGE_TARGETS[id];
  let value: number;
  switch (id) {
    case "sessions":
      value = week.length;
      break;
    case "perfect":
      value = [...days].filter((day) => {
        const sessions = week.filter((session) => localDateKey(session.startedAt) === day);
        return sessions.some((session) => isMorning(session.startedAt)) && sessions.some((session) => isEvening(session.startedAt));
      }).length;
      break;
    case "evenings":
      value = week.filter((session) => isEvening(session.startedAt)).length;
      break;
    case "mornings":
      value = week.filter((session) => isMorning(session.startedAt)).length;
      break;
    case "full":
      value = week.filter((session) => session.durationSeconds >= session.targetSeconds).length;
      break;
    case "days":
      value = days.size;
      break;
    case "extra": {
      const first = localDateKey(start);
      const last = localDateKey(nextWeekStart(start) - 1);
      value = extraStepDays.filter((day) => day >= first && day <= last).length;
      break;
    }
  }
  return Math.min(target, value);
}

/**
 * Weekly boss of the bacteria for the whole family (voce 13): 1,680 hit points, the seconds of 14
 * sessions of two minutes, worn down by every second brushed by any child. Siblings play together,
 * not against each other. Not defeated: the next week's boss is easier, down to half.
 */
export const BOSS_BASE_HP = 1_680;
export const BOSS_MIN_HP = 840;
export const BOSS_STEP_HP = 280;
/** How many past weeks are replayed to know how strong this week's boss is. */
const BOSS_LOOKBACK_WEEKS = 8;

export type BossWeek = { weekKey: string; hp: number; damage: number; defeated: boolean };

export function bossDamage(histories: readonly (readonly BrushSession[])[], start: number): number {
  return histories.reduce(
    (total, history) => total + history
      .filter((session) => inWeek(session, start))
      .reduce((sum, session) => sum + Math.max(0, Math.round(session.durationSeconds)), 0),
    0,
  );
}

/** This week's boss and the previous ones, oldest first; the last one is the current week. */
export function familyBossWeeks(histories: readonly (readonly BrushSession[])[], now: number): BossWeek[] {
  let start = weekStart(now);
  for (let index = 0; index < BOSS_LOOKBACK_WEEKS; index += 1) start = previousWeekStart(start);
  const weeks: BossWeek[] = [];
  let previous: BossWeek | null = null;
  for (let index = 0; index <= BOSS_LOOKBACK_WEEKS; index += 1) {
    const hp: number = previous && !previous.defeated ? Math.max(BOSS_MIN_HP, previous.hp - BOSS_STEP_HP) : BOSS_BASE_HP;
    const damage = bossDamage(histories, start);
    const week: BossWeek = { weekKey: localDateKey(start), hp, damage, defeated: damage >= hp };
    weeks.push(week);
    // Weeks before the family started brushing do not make the boss weaker.
    if (previous || damage > 0) previous = week;
    start = nextWeekStart(start);
  }
  return weeks;
}
