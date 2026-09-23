import type { BrushSession } from "@/lib/brush-types";
import { isEvening, isMorning, sameLocalDay, startOfLocalDay } from "@/lib/day-progress";

export type ParentDaySummary = {
  timestamp: number;
  label: string;
  morningCompleted: boolean;
  eveningCompleted: boolean;
  completedSessions: number;
  attemptedSessions: number;
  totalSeconds: number;
};

export type ParentDashboard = {
  days: ParentDaySummary[];
  completedRoutineSlots: number;
  totalRoutineSlots: number;
  adherenceRate: number;
  completedSessions: number;
  attemptedSessions: number;
  completionRate: number;
  averageCompletedSeconds: number;
  totalMinutes: number;
  deviceSessions: number;
  manualSessions: number;
  daysWithBoth: number;
};

export function computeParentDashboard(
  history: BrushSession[],
  now: number = Date.now(),
  daysCount: number = 7,
): ParentDashboard {
  const today = startOfLocalDay(now);

  const days = Array.from({ length: daysCount }, (_, offset) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (daysCount - 1 - offset));
    const timestamp = date.getTime();
    const sessions = history.filter((session) => sameLocalDay(session.startedAt, timestamp));
    const completed = sessions.filter((session) => session.completed);

    return {
      timestamp,
      label: new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric" }).format(date),
      morningCompleted: completed.some((session) => isMorning(session.startedAt)),
      eveningCompleted: completed.some((session) => isEvening(session.startedAt)),
      completedSessions: completed.length,
      attemptedSessions: sessions.length,
      totalSeconds: sessions.reduce((total, session) => total + session.durationSeconds, 0),
    };
  });

  const windowStart = days[0]?.timestamp ?? today.getTime();
  const windowEnd = new Date(today);
  windowEnd.setDate(today.getDate() + 1);

  const windowSessions = history.filter(
    (session) => session.startedAt >= windowStart && session.startedAt < windowEnd.getTime(),
  );
  const completed = windowSessions.filter((session) => session.completed);
  const completedRoutineSlots = days.reduce(
    (total, day) => total + Number(day.morningCompleted) + Number(day.eveningCompleted),
    0,
  );
  const totalRoutineSlots = daysCount * 2;
  const totalCompletedSeconds = completed.reduce((total, session) => total + session.durationSeconds, 0);

  return {
    days,
    completedRoutineSlots,
    totalRoutineSlots,
    adherenceRate: totalRoutineSlots ? completedRoutineSlots / totalRoutineSlots : 0,
    completedSessions: completed.length,
    attemptedSessions: windowSessions.length,
    completionRate: windowSessions.length ? completed.length / windowSessions.length : 0,
    averageCompletedSeconds: completed.length ? Math.round(totalCompletedSeconds / completed.length) : 0,
    totalMinutes: Math.round(windowSessions.reduce((total, session) => total + session.durationSeconds, 0) / 60),
    deviceSessions: windowSessions.filter((session) => session.source === "device").length,
    manualSessions: windowSessions.filter((session) => session.source === "manual").length,
    daysWithBoth: days.filter((day) => day.morningCompleted && day.eveningCompleted).length,
  };
}
