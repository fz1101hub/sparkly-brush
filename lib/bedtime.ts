import type { AgeGroup } from "@/lib/dental-care";

/**
 * Optional bedtime missions (voce 28), turned on by the parent: floss, mouthwash and pyjamas. The
 * advice by age is for dentist review: floss with a grown-up's help once teeth touch; mouthwash only
 * from 6, when the child can spit it out without swallowing.
 */
export const BEDTIME_ITEMS = ["floss", "mouthwash", "pajamas"] as const;
export type BedtimeItem = (typeof BEDTIME_ITEMS)[number];

export function bedtimeAllowed(item: BedtimeItem, age: AgeGroup | null): boolean {
  return item !== "mouthwash" || age === "over6";
}

export type BedtimeDone = { day: string; items: BedtimeItem[] };

/** Is the holiday mode on today (voce 25)? It ends by itself after the chosen day. */
export function onHoliday(until: string | null, todayKey: string): boolean {
  return until !== null && todayKey <= until;
}
