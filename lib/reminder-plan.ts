import type { BrushSession } from "@/lib/brush-types";
import { isEvening, isMorning, localDateKey, sameLocalDay } from "@/lib/day-progress";

/**
 * The reminders of the next days as single dated notifications instead of a daily repetition,
 * so that a reminder whose brushing is already done today can be left out (voce 59) and the
 * optional «ultimo richiamo gentile» (voce 60) can follow the evening one. The plan is renewed
 * every time the app starts or a session is saved.
 */
export const PLANNED_DAYS = 6;

export type ReminderSlot = "morning" | "evening" | "lastCall";
export type PlannedReminder = { id: string; slot: ReminderSlot; at: number };

export type PlanSettings = {
  enabled: boolean;
  morning: string;
  evening: string;
  lastCall: boolean;
  lastCallTime: string;
};

/** Which of today's routine brushings are already done. */
export type DoneToday = { morning: boolean; evening: boolean };

/** Today's completed brushings in the morning and evening windows of the daily missions. */
export function doneTodayFrom(history: readonly BrushSession[], now: number): DoneToday {
  const today = history.filter((session) => session.completed && sameLocalDay(session.startedAt, now));
  return {
    morning: today.some((session) => isMorning(session.startedAt)),
    evening: today.some((session) => isEvening(session.startedAt)),
  };
}

export function reminderIdPrefix(profileId: string): string {
  return `brushlings-${profileId}-`;
}

function at(day: Date, time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute).getTime();
}

export function planReminders(
  profileId: string,
  settings: PlanSettings,
  now: number,
  doneToday: DoneToday = { morning: false, evening: false },
  days = PLANNED_DAYS,
): PlannedReminder[] {
  if (!settings.enabled) return [];
  const today = new Date(now);
  const plan: PlannedReminder[] = [];
  for (let offset = 0; offset < days; offset += 1) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset, 12);
    const key = localDateKey(day.getTime());
    const isToday = offset === 0;
    const slots: [ReminderSlot, string, boolean][] = [
      ["morning", settings.morning, isToday && doneToday.morning],
      ["evening", settings.evening, isToday && doneToday.evening],
      ["lastCall", settings.lastCallTime, !settings.lastCall || (isToday && doneToday.evening)],
    ];
    for (const [slot, time, skip] of slots) {
      const when = at(day, time);
      if (!skip && when > now) plan.push({ id: `${reminderIdPrefix(profileId)}${slot}-${key}`, slot, at: when });
    }
  }
  return plan;
}
