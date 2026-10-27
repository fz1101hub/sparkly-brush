import { localDateKey, parseLocalDateKey } from "@/lib/day-progress";

/**
 * «Serie del sorriso», the streak the child sees, which forgives:
 * - one missed day per week (Monday to Sunday) is a joker and does not break it;
 * - days the parent marked as sick or on holiday keep it alive;
 * - after a break, the first three brushing days count double, so coming back pays off.
 * It is computed from the recent history and never changes coins, achievements or the
 * lifetime counters, which keep the strict streak.
 */
export const RETURN_BONUS_DAYS = 3;

export type ForgivingStreak = {
  days: number;
  /** A joker was used this week: the next missed day breaks the streak. */
  jokerUsedThisWeek: boolean;
  /** Days still counting double after a break. */
  bonusDaysLeft: number;
};

function mondayOf(dayKey: string): string {
  const date = parseLocalDateKey(dayKey);
  const fromMonday = (date.getDay() + 6) % 7;
  return localDateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() - fromMonday, 12).getTime());
}

function nextDay(dayKey: string): string {
  const date = parseLocalDateKey(dayKey);
  return localDateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 12).getTime());
}

/**
 * Walks the days from the first one in the window to today. `brushedDays` are local day keys
 * with at least one completed session, `protectedDays` those the parent marked.
 */
export function forgivingStreak(
  brushedDays: ReadonlySet<string>,
  protectedDays: ReadonlySet<string>,
  now: number,
): ForgivingStreak {
  const today = localDateKey(now);
  const first = [...brushedDays].filter((day) => day <= today).sort()[0];
  if (!first) return { days: 0, jokerUsedThisWeek: false, bonusDaysLeft: 0 };
  let days = 0;
  let bonusDaysLeft = 0;
  let jokerWeek: string | null = null;
  for (let day = first; day <= today; day = nextDay(day)) {
    if (brushedDays.has(day)) {
      days += bonusDaysLeft > 0 ? 2 : 1;
      if (bonusDaysLeft > 0) bonusDaysLeft -= 1;
    } else if (protectedDays.has(day) || day === today) {
      // Kept alive by the parent, or today is not over yet.
    } else if (jokerWeek !== mondayOf(day)) {
      jokerWeek = mondayOf(day);
    } else if (days > 0) {
      days = 0;
      bonusDaysLeft = RETURN_BONUS_DAYS;
    }
  }
  return { days, jokerUsedThisWeek: jokerWeek === mondayOf(today), bonusDaysLeft };
}
