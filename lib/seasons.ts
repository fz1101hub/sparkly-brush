/**
 * Seasons and events (voce 15): Halloween, Christmas and summer, each with three special stickers
 * found by brushing while the season lasts and a decoration of the creature's den. Dates are
 * local days, inclusive; Christmas runs across the new year.
 */
export const SEASON_IDS = ["halloween", "christmas", "summer"] as const;
export type SeasonId = (typeof SEASON_IDS)[number];

type MonthDay = [month: number, day: number];
export const SEASONS: Record<SeasonId, { from: MonthDay; to: MonthDay; decoration: string }> = {
  halloween: { from: [10, 20], to: [11, 2], decoration: "🎃 🦇 👻" },
  christmas: { from: [12, 1], to: [1, 6], decoration: "🎄 ⛄ 🎁" },
  summer: { from: [7, 1], to: [8, 31], decoration: "☀️ 🍉 🏖️" },
};

const order = ([month, day]: MonthDay) => month * 100 + day;

export function seasonAt(timestamp: number): SeasonId | null {
  const date = new Date(timestamp);
  const today = order([date.getMonth() + 1, date.getDate()]);
  for (const id of SEASON_IDS) {
    const from = order(SEASONS[id].from);
    const to = order(SEASONS[id].to);
    const inside = from <= to ? today >= from && today <= to : today >= from || today <= to;
    if (inside) return id;
  }
  return null;
}

/** Last day of the season that contains the timestamp, as a timestamp at noon. */
export function seasonEnd(id: SeasonId, timestamp: number): number {
  const date = new Date(timestamp);
  const [month, day] = SEASONS[id].to;
  const crossesYear = order(SEASONS[id].from) > order(SEASONS[id].to) && date.getMonth() + 1 >= SEASONS[id].from[0];
  return new Date(date.getFullYear() + (crossesYear ? 1 : 0), month - 1, day, 12).getTime();
}
