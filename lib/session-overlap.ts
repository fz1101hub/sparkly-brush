/** Reconstructed handle clocks and a parent who starts the timer late can differ by this much. */
export const MANUAL_OVERLAP_TOLERANCE_MS = 120_000;

type BrushingInterval = { startedAt: number; durationSeconds: number };

/**
 * Whether two brushings overlap in time. Audit M4: a handle record that overlaps a session the
 * guided timer already saved describes the same brushing and must not be credited twice.
 */
export function sessionsOverlap(
  first: BrushingInterval,
  second: BrushingInterval,
  toleranceMs: number = MANUAL_OVERLAP_TOLERANCE_MS,
): boolean {
  const firstEnd = first.startedAt + Math.max(0, first.durationSeconds) * 1_000;
  const secondEnd = second.startedAt + Math.max(0, second.durationSeconds) * 1_000;
  return first.startedAt <= secondEnd + toleranceMs && second.startedAt <= firstEnd + toleranceMs;
}
