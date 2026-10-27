/**
 * What keeps the child company during the two minutes (lotto 6): the creature's mouth with the
 * stains melting zone by zone (voce 6), the creature's voice with the child's name (voce 8) and
 * the parts of the serial story (voce 7), one for each zone.
 */
export const STAINS_PER_ZONE = 3;
export const ZONES = 4;

/** Stains still on each of the four zones: they melt one by one while that zone is brushed. */
export function stainsLeft(elapsedSeconds: number, targetSeconds: number): number[] {
  const zone = targetSeconds / ZONES;
  return Array.from({ length: ZONES }, (_, index) => {
    const into = elapsedSeconds - index * zone;
    if (into <= 0) return STAINS_PER_ZONE;
    if (into >= zone) return 0;
    return STAINS_PER_ZONE - Math.floor((into / zone) * STAINS_PER_ZONE);
  });
}

export type VoiceCue = "voice.start" | "voice.zone1" | "voice.half" | "voice.last";

/**
 * The cue to say when the session crosses a moment: the start, the second zone, half time and
 * the last zone (30 seconds of a two-minute session). Null between moments.
 */
export function voiceCue(previousElapsed: number, elapsed: number, targetSeconds: number): VoiceCue | null {
  if (elapsed <= previousElapsed) return null;
  const zone = targetSeconds / ZONES;
  const crossed = (moment: number) => previousElapsed < moment && elapsed >= moment;
  if (previousElapsed === 0) return "voice.start";
  if (crossed(zone * 3)) return "voice.last";
  if (crossed(zone * 2)) return "voice.half";
  if (crossed(zone)) return "voice.zone1";
  return null;
}

/** The zone whose story part should start now, or null. Part 0 starts with the session. */
export function storyPartCue(previousElapsed: number, elapsed: number, targetSeconds: number): number | null {
  if (elapsed <= previousElapsed) return null;
  const zone = targetSeconds / ZONES;
  if (previousElapsed === 0) return 0;
  for (let index = 1; index < ZONES; index += 1) {
    if (previousElapsed < index * zone && elapsed >= index * zone) return index;
  }
  return null;
}
