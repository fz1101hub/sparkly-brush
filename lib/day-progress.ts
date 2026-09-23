import type { BrushSession } from "./brush-types";

export type RoutineSlot = "morning" | "evening" | "none";

export function localDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function parseLocalDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function startOfLocalDay(timestamp: number): Date {
  return parseLocalDateKey(localDateKey(timestamp));
}

export function sameLocalDay(first: number, second: number): boolean {
  return localDateKey(first) === localDateKey(second);
}

/** Civil-day difference, independent of daylight-saving day length. */
export function dayDifference(firstKey: string, secondKey: string): number {
  const [firstYear, firstMonth, firstDay] = firstKey.split("-").map(Number);
  const [secondYear, secondMonth, secondDay] = secondKey.split("-").map(Number);
  return Math.round(
    (Date.UTC(secondYear, secondMonth - 1, secondDay) - Date.UTC(firstYear, firstMonth - 1, firstDay))
      / 86_400_000,
  );
}

/** Morning is 05:00–11:59, evening starts at 18:00. */
export function routineSlot(timestamp: number): RoutineSlot {
  const hour = new Date(timestamp).getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 18) return "evening";
  return "none";
}

export function isMorning(timestamp: number): boolean {
  return routineSlot(timestamp) === "morning";
}

export function isEvening(timestamp: number): boolean {
  return routineSlot(timestamp) === "evening";
}

export function uniqueCompletedDayKeys(history: BrushSession[]): string[] {
  return [...new Set(
    history.filter((session) => session.completed).map((session) => localDateKey(session.startedAt)),
  )].sort();
}

export function longestCompletedDayStreak(history: BrushSession[]): number {
  const keys = uniqueCompletedDayKeys(history);
  if (keys.length === 0) return 0;
  let longest = 1;
  let current = 1;
  for (let index = 1; index < keys.length; index += 1) {
    if (dayDifference(keys[index - 1], keys[index]) === 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

export function currentCompletedDayStreak(
  history: BrushSession[],
  timestamp: number = Date.now(),
): number {
  const completedDays = new Set(uniqueCompletedDayKeys(history));
  if (completedDays.size === 0) return 0;

  const today = localDateKey(timestamp);
  const cursor = startOfLocalDay(timestamp);
  if (!completedDays.has(today)) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (completedDays.has(localDateKey(cursor.getTime()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
