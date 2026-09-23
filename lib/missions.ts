import type { BrushSession } from "@/lib/brush-types";
import {
  isEvening,
  isMorning,
  localDateKey,
  longestCompletedDayStreak,
  parseLocalDateKey,
  uniqueCompletedDayKeys,
} from "@/lib/day-progress";

export { longestCompletedDayStreak } from "@/lib/day-progress";

export type DailyMissionId = "morning" | "evening" | "double";
export type AchievementId =
  | "first-smile"
  | "five-adventures"
  | "ten-adventures"
  | "three-perfect-days"
  | "seven-day-streak";

export type DailyMissionStatus = {
  id: DailyMissionId;
  title: string;
  description: string;
  progress: number;
  target: number;
  rewardCoins: number;
  completed: boolean;
  icon: "wb-sunny" | "dark-mode" | "done-all";
};

export type AchievementStatus = {
  id: AchievementId;
  title: string;
  description: string;
  rewardCoins: number;
  unlocked: boolean;
  progress: number;
  target: number;
  icon: "auto-awesome" | "explore" | "emoji-events" | "calendar-month" | "local-fire-department";
};

export type DailyMissionSummary = {
  dateKey: string;
  missions: DailyMissionStatus[];
  completedCount: number;
  allCompleted: boolean;
  chestRewardCoins: number;
  earnedCoins: number;
};

export type MissionCenter = {
  today: DailyMissionSummary;
  achievements: AchievementStatus[];
  dailyBonusCoins: number;
  achievementBonusCoins: number;
  totalBonusCoins: number;
};

export type ProgressRewardDelta = {
  missionTitles: string[];
  achievementTitles: string[];
  dailyBonusCoins: number;
  achievementBonusCoins: number;
  chestUnlocked: boolean;
  totalBonusCoins: number;
};

export type AchievementMetrics = {
  completedSessions: number;
  perfectDays: number;
  longestStreakDays: number;
};

const DAILY_CHEST_REWARD = 12;

export function computeDailyMissionSummaryFromCounts(
  dateKey: string,
  completedSessions: number,
  morningCompleted: boolean,
  eveningCompleted: boolean,
): DailyMissionSummary {
  const missions: DailyMissionStatus[] = [
    {
      id: "morning",
      title: "Buongiorno, sorriso!",
      description: "Completa una sessione al mattino.",
      progress: Number(morningCompleted),
      target: 1,
      rewardCoins: 5,
      completed: morningCompleted,
      icon: "wb-sunny",
    },
    {
      id: "evening",
      title: "Missione buonanotte",
      description: "Completa una sessione dalle 18 in poi.",
      progress: Number(eveningCompleted),
      target: 1,
      rewardCoins: 5,
      completed: eveningCompleted,
      icon: "dark-mode",
    },
    {
      id: "double",
      title: "Doppio sorriso",
      description: "Completa due sessioni nella stessa giornata.",
      progress: Math.min(2, completedSessions),
      target: 2,
      rewardCoins: 8,
      completed: completedSessions >= 2,
      icon: "done-all",
    },
  ];

  const completedCount = missions.filter((mission) => mission.completed).length;
  const allCompleted = completedCount === missions.length;
  const earnedCoins = missions
    .filter((mission) => mission.completed)
    .reduce((total, mission) => total + mission.rewardCoins, 0)
    + (allCompleted ? DAILY_CHEST_REWARD : 0);

  return {
    dateKey,
    missions,
    completedCount,
    allCompleted,
    chestRewardCoins: DAILY_CHEST_REWARD,
    earnedCoins,
  };
}

function completeSessions(history: BrushSession[]): BrushSession[] {
  return history.filter((session) => session.completed);
}

function sessionsForDay(history: BrushSession[], dateKey: string): BrushSession[] {
  return completeSessions(history).filter((session) => localDateKey(session.startedAt) === dateKey);
}

export function computeDailyMissionSummary(
  history: BrushSession[],
  timestamp: number = Date.now(),
): DailyMissionSummary {
  const dateKey = localDateKey(timestamp);
  const sessions = sessionsForDay(history, dateKey);
  const morning = sessions.filter((session) => isMorning(session.startedAt)).length;
  const evening = sessions.filter((session) => isEvening(session.startedAt)).length;
  return computeDailyMissionSummaryFromCounts(dateKey, sessions.length, morning >= 1, evening >= 1);
}

function perfectDayCount(history: BrushSession[]): number {
  return uniqueCompletedDayKeys(history).filter((key) => {
    const timestamp = parseLocalDateKey(key).getTime();
    const summary = computeDailyMissionSummary(history, timestamp);
    const morning = summary.missions.find((mission) => mission.id === "morning")?.completed;
    const evening = summary.missions.find((mission) => mission.id === "evening")?.completed;
    return Boolean(morning && evening);
  }).length;
}

export function computeAchievementsFromMetrics(metrics: AchievementMetrics): AchievementStatus[] {
  return [
    {
      id: "first-smile",
      title: "Primo sorriso",
      description: "Completa la tua prima sessione.",
      rewardCoins: 10,
      unlocked: metrics.completedSessions >= 1,
      progress: Math.min(metrics.completedSessions, 1),
      target: 1,
      icon: "auto-awesome",
    },
    {
      id: "five-adventures",
      title: "Piccolo esploratore",
      description: "Completa 5 sessioni.",
      rewardCoins: 20,
      unlocked: metrics.completedSessions >= 5,
      progress: Math.min(metrics.completedSessions, 5),
      target: 5,
      icon: "explore",
    },
    {
      id: "ten-adventures",
      title: "Campione dei Brushlings",
      description: "Completa 10 sessioni.",
      rewardCoins: 30,
      unlocked: metrics.completedSessions >= 10,
      progress: Math.min(metrics.completedSessions, 10),
      target: 10,
      icon: "emoji-events",
    },
    {
      id: "three-perfect-days",
      title: "Tre giorni perfetti",
      description: "Completa mattina e sera per 3 giorni.",
      rewardCoins: 30,
      unlocked: metrics.perfectDays >= 3,
      progress: Math.min(metrics.perfectDays, 3),
      target: 3,
      icon: "calendar-month",
    },
    {
      id: "seven-day-streak",
      title: "Settimana di fuoco",
      description: "Raggiungi una serie record di 7 giorni consecutivi.",
      rewardCoins: 50,
      unlocked: metrics.longestStreakDays >= 7,
      progress: Math.min(metrics.longestStreakDays, 7),
      target: 7,
      icon: "local-fire-department",
    },
  ];
}

export function computeAchievements(history: BrushSession[]): AchievementStatus[] {
  return computeAchievementsFromMetrics({
    completedSessions: completeSessions(history).length,
    perfectDays: perfectDayCount(history),
    longestStreakDays: longestCompletedDayStreak(history),
  });
}

export function computeLifetimeDailyBonusCoins(history: BrushSession[]): number {
  return uniqueCompletedDayKeys(history).reduce((total, key) => {
    const timestamp = parseLocalDateKey(key).getTime();
    return total + computeDailyMissionSummary(history, timestamp).earnedCoins;
  }, 0);
}

export function computeMissionCenter(
  history: BrushSession[],
  timestamp: number = Date.now(),
): MissionCenter {
  const achievements = computeAchievements(history);
  const dailyBonusCoins = computeLifetimeDailyBonusCoins(history);
  const achievementBonusCoins = achievements
    .filter((achievement) => achievement.unlocked)
    .reduce((total, achievement) => total + achievement.rewardCoins, 0);

  return {
    today: computeDailyMissionSummary(history, timestamp),
    achievements,
    dailyBonusCoins,
    achievementBonusCoins,
    totalBonusCoins: dailyBonusCoins + achievementBonusCoins,
  };
}

export function computeProgressRewardDelta(
  history: BrushSession[],
  sessionId: string,
): ProgressRewardDelta | null {
  const session = history.find((item) => item.id === sessionId);
  if (!session || !session.completed) return null;

  const beforeHistory = history.filter((item) => item.id !== sessionId);
  const beforeDay = computeDailyMissionSummary(beforeHistory, session.startedAt);
  const afterDay = computeDailyMissionSummary(history, session.startedAt);
  const beforeAchievements = computeAchievements(beforeHistory);
  const afterAchievements = computeAchievements(history);

  const missionTitles = afterDay.missions
    .filter((mission) => mission.completed)
    .filter((mission) => !beforeDay.missions.find((before) => before.id === mission.id)?.completed)
    .map((mission) => mission.title);

  const achievementTitles = afterAchievements
    .filter((achievement) => achievement.unlocked)
    .filter((achievement) => !beforeAchievements.find((before) => before.id === achievement.id)?.unlocked)
    .map((achievement) => achievement.title);

  const dailyBonusCoins = Math.max(0, afterDay.earnedCoins - beforeDay.earnedCoins);
  const beforeAchievementCoins = beforeAchievements
    .filter((achievement) => achievement.unlocked)
    .reduce((total, achievement) => total + achievement.rewardCoins, 0);
  const afterAchievementCoins = afterAchievements
    .filter((achievement) => achievement.unlocked)
    .reduce((total, achievement) => total + achievement.rewardCoins, 0);
  const achievementBonusCoins = Math.max(0, afterAchievementCoins - beforeAchievementCoins);

  return {
    missionTitles,
    achievementTitles,
    dailyBonusCoins,
    achievementBonusCoins,
    chestUnlocked: afterDay.allCompleted && !beforeDay.allCompleted,
    totalBonusCoins: dailyBonusCoins + achievementBonusCoins,
  };
}
