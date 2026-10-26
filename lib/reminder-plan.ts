import { localDateKey } from "./day-progress";

export type PlannedReminder = { identifier: string; at: Date; period: "morning" | "evening" | "last-call" };
export const SMART_REMINDER_DAYS = 2;

/** 8 children × 3 reminders × 2 days = 48, within iOS's per-app pending limit. */
export function smartReminderIdentifiers(profileId: string): string[] {
  return Array.from({ length: SMART_REMINDER_DAYS * 3 }, (_, index) => `brushlings-${profileId}-smart-${index}`);
}

export function planSmartReminders(
  profileId: string,
  settings: { morning: string; evening: string; lastCall?: boolean },
  days: readonly { date: string; morning: boolean; evening: boolean }[],
  now = Date.now(),
): PlannedReminder[] {
  const result: PlannedReminder[] = [];
  const identifiers = smartReminderIdentifiers(profileId);
  for (let offset = 0; offset < SMART_REMINDER_DAYS; offset++) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() + offset);
    const progress = days.find((entry) => entry.date === localDateKey(day.getTime()));
    for (const [index, period] of (["morning", "evening", "last-call"] as const).entries()) {
      if (period === "last-call" && (!settings.lastCall || settings.evening >= "21:00")) continue;
      if (period === "morning" ? progress?.morning : progress?.evening) continue;
      const [hour, minute] = (period === "last-call" ? "21:00" : settings[period]).split(":").map(Number);
      const at = new Date(day);
      at.setHours(hour, minute, 0, 0);
      if (at.getTime() <= now) continue;
      result.push({ identifier: identifiers[offset * 3 + index], at, period });
    }
  }
  return result;
}
