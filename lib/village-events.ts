/**
 * Events of the village square, by date: each one brings a short tip. Days are local and the
 * ranges never cross the end of the year.
 */
export type VillageEvent = { id: "oralHealthDay" | "halloween" | "holidays"; month: number; from: number; to: number };

export const VILLAGE_EVENTS: readonly VillageEvent[] = [
  { id: "oralHealthDay", month: 3, from: 20, to: 20 },
  { id: "halloween", month: 10, from: 31, to: 31 },
  { id: "holidays", month: 12, from: 20, to: 31 },
];

export function currentEvent(now: number): VillageEvent | null {
  const date = new Date(now);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return VILLAGE_EVENTS.find((event) => event.month === month && day >= event.from && day <= event.to) ?? null;
}

/** The next event that has not started yet, with the local date it starts on. */
export function nextEvent(now: number): { event: VillageEvent; starts: Date } {
  const today = new Date(now);
  const start = (event: VillageEvent, year: number) => new Date(year, event.month - 1, event.from);
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const upcoming = VILLAGE_EVENTS.flatMap((event) => [
    { event, starts: start(event, today.getFullYear()) },
    { event, starts: start(event, today.getFullYear() + 1) },
  ])
    .filter((item) => item.starts.getTime() > midnight)
    .sort((first, second) => first.starts.getTime() - second.starts.getTime());
  return upcoming[0];
}
