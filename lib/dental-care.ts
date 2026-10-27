import type { TranslationKey } from "@/lib/i18n";

/**
 * Age-related advice after brushing (voce 58): the amount of fluoride toothpaste. Values follow
 * the usual paediatric guidance (a grain of rice under 3, a pea from 3 to 6) and are listed for
 * dentist review in docs/contenuti-da-validare-2026-10-27.md. Unknown age: both are shown.
 */
export const AGE_GROUPS = ["under3", "3to6", "over6"] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

export function toothpasteDoseKey(age: AgeGroup | null): TranslationKey {
  if (age === "under3") return "dental.dose.rice";
  if (age === "3to6" || age === "over6") return "dental.dose.pea";
  return "dental.dose.unknown";
}

/** Days before the dentist visit when the reminder arrives (voce 32). */
export const DENTIST_NOTICE_DAYS = [1, 3, 7] as const;
export type DentistNoticeDays = (typeof DENTIST_NOTICE_DAYS)[number];

/** Local time of the dentist reminder on the chosen day before the visit. */
export const DENTIST_REMINDER_TIME = "18:00";

export function dentistReminderAt(visitDay: string, noticeDays: number): number {
  const [year, month, day] = visitDay.split("-").map(Number);
  const [hour, minute] = DENTIST_REMINDER_TIME.split(":").map(Number);
  return new Date(year, month - 1, day - noticeDays, hour, minute).getTime();
}

/** Whole days from today to the visit (0 on the day), or null when it is in the past. */
export function daysToVisit(visitDay: string, now: number): number | null {
  const [year, month, day] = visitDay.split("-").map(Number);
  const today = new Date(now);
  const difference = Math.round(
    (Date.UTC(year, month - 1, day) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86_400_000,
  );
  return difference >= 0 ? difference : null;
}

/** Philips advises a new brush head every three months (voce 35). */
export const HEAD_LIFETIME_DAYS = 90;
/** From this many days before the change the handle screen starts to remind it. */
export const HEAD_NOTICE_DAYS = 14;
/** Below this charge the handle screen asks to recharge it. */
export const LOW_BATTERY_PERCENT = 20;

/** Days left before the brush head should be replaced: negative once it is overdue. */
export function headDaysLeft(changedOn: string, now: number): number {
  const [year, month, day] = changedOn.split("-").map(Number);
  const today = new Date(now);
  const elapsed = Math.round(
    (Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(year, month - 1, day)) / 86_400_000,
  );
  return HEAD_LIFETIME_DAYS - elapsed;
}

/**
 * Power setting suggested for the child's age (voce 36), for dentist review: the Sonicare for Kids
 * starts on the gentler setting for the youngest and moves to the stronger one from about 7.
 */
export function recommendedIntensity(age: AgeGroup | null): "low" | "high" | null {
  if (age === "under3" || age === "3to6") return "low";
  if (age === "over6") return "high";
  return null;
}
