/**
 * Experimental handle features (lotto 11), off until the hardware test plan confirms them on the
 * HX6322: the zone from the handle's quad pacer (voce 10, characteristic 40a0), the zone that got
 * less time yesterday (voce 11) and the motor run time (voce 35, characteristic 4040).
 */
export const ZONE_COUNT = 4;

/**
 * The quad pacer counts the quarters of the routine, 0–3. Any other value is ignored rather than
 * guessed: the hardware test plan records the raw values the HX6322 actually sends.
 */
export function quadrantFromByte(value: number | undefined): number | null {
  return value !== undefined && Number.isInteger(value) && value >= 0 && value < ZONE_COUNT ? value : null;
}

export type ZoneSeconds = { day: string; seconds: number[] };

/** Adds the seconds just brushed to the zone the handle reports. */
export function addZoneSeconds(current: number[], zone: number | null, seconds: number): number[] {
  if (zone === null || zone < 0 || zone >= ZONE_COUNT || !(seconds > 0) || seconds > 10) return current;
  const next = Array.from({ length: ZONE_COUNT }, (_, index) => current[index] ?? 0);
  next[zone] += seconds;
  return next;
}

/**
 * The zone that clearly got less time (under 60% of the average of the others), or null when the
 * brushing was even or too short to say.
 */
export function forgottenZone(seconds: readonly number[]): number | null {
  if (seconds.length !== ZONE_COUNT) return null;
  const total = seconds.reduce((sum, value) => sum + value, 0);
  if (total < 60) return null;
  let lowest = 0;
  seconds.forEach((value, index) => {
    if (value < seconds[lowest]) lowest = index;
  });
  const others = (total - seconds[lowest]) / (ZONE_COUNT - 1);
  return seconds[lowest] < others * 0.6 ? lowest : null;
}

/** The motor run time, read as seconds; shown in hours with one decimal. */
export function motorHours(seconds: number | undefined): number | null {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return null;
  return Math.round((seconds / 3600) * 10) / 10;
}
