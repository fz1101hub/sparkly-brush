import type { BrushSession } from "./brush-types";
import { dayDifference, isEvening, isMorning, localDateKey } from "./day-progress";

/** Streaming summary: native archives are never limited to the UI's 120 recent rows. */
export function createSessionSummary() {
  let completedSessions = 0;
  let attemptedSessions = 0;
  let totalSeconds = 0;
  let completedSeconds = 0;
  let approximateSessions = 0;
  const days = new Map<string, { morning: boolean; evening: boolean; count: number }>();
  return {
    add(session: BrushSession) {
      attemptedSessions += 1;
      totalSeconds += session.durationSeconds;
      if (!session.completed) return;
      completedSessions += 1;
      completedSeconds += session.durationSeconds;
      if (session.timeConfidence === "approximate") {
        approximateSessions += 1;
        return;
      }
      const key = localDateKey(session.startedAt);
      const day = days.get(key) ?? { morning: false, evening: false, count: 0 };
      day.count += 1;
      day.morning ||= isMorning(session.startedAt);
      day.evening ||= isEvening(session.startedAt);
      days.set(key, day);
    },
    result() {
      const ordered = [...days.entries()].sort(([a], [b]) => a.localeCompare(b));
      let streak = 0;
      let longestStreakDays = 0;
      let previous: string | null = null;
      for (const [key] of ordered) {
        streak = previous && dayDifference(previous, key) === 1 ? streak + 1 : 1;
        longestStreakDays = Math.max(longestStreakDays, streak);
        previous = key;
      }
      return {
        attemptedSessions, completedSessions, totalSeconds, approximateSessions,
        averageCompletedSeconds: completedSessions ? Math.round(completedSeconds / completedSessions) : 0,
        perfectDays: ordered.filter(([, day]) => day.morning && day.evening).length,
        longestStreakDays,
        days: ordered.map(([date, day]) => ({ date, ...day })),
      };
    },
  };
}

export type SessionSummary = ReturnType<ReturnType<typeof createSessionSummary>["result"]>;
