import type { BrushSession } from "./brush-types";
import { localDateKey, routineSlot } from "./day-progress";

/** Stable identity makes a retry safe even if persistence succeeded before the UI failed. */
export function parentRecordedSession(
  period: "morning" | "evening",
  targetSeconds: number,
  now = Date.now(),
): BrushSession {
  if (!Number.isSafeInteger(now) || now <= 0 || ![60, 90, 120].includes(targetSeconds)) {
    throw new Error("Invalid recorded session");
  }
  const date = new Date(now);
  if (routineSlot(now) !== period) date.setHours(period === "morning" ? 8 : 20, 0, 0, 0);
  if (date.getTime() > now) throw new Error("Future session");
  return {
    id: `parent-recorded-${localDateKey(now)}-${period}`,
    startedAt: date.getTime(),
    timeConfidence: "exact",
    rewardPolicy: "completed-only",
    durationSeconds: targetSeconds,
    targetSeconds,
    completed: true,
    source: "manual",
  };
}
