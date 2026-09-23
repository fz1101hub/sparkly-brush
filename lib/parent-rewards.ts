import AsyncStorage from "@react-native-async-storage/async-storage";

import type { BrushSession } from "@/lib/brush-types";
import {
  isEvening,
  isMorning,
  localDateKey,
  longestCompletedDayStreak,
  uniqueCompletedDayKeys,
} from "@/lib/day-progress";

const PARENT_REWARDS_KEY = "sparkly-brush.parent-rewards.v1";

export type ParentRewardRequirement = "completed-sessions" | "perfect-days" | "streak";

export type ParentReward = {
  id: string;
  title: string;
  requirement: ParentRewardRequirement;
  target: number;
  createdAt: number;
  deliveredAt: number | null;
};

export type ParentRewardProgress = ParentReward & {
  progress: number;
  unlocked: boolean;
};

export type ParentRewardMetrics = {
  completedSessions: number;
  perfectDays: number;
  longestStreakDays: number;
};

function completed(history: BrushSession[]): BrushSession[] {
  return history.filter((session) => session.completed);
}

function perfectDays(history: BrushSession[]): number {
  const sessions = completed(history);
  const keys = uniqueCompletedDayKeys(history);
  return keys.filter((key) => {
    const daySessions = sessions.filter((session) => localDateKey(session.startedAt) === key);
    const morning = daySessions.some((session) => isMorning(session.startedAt));
    const evening = daySessions.some((session) => isEvening(session.startedAt));
    return morning && evening;
  }).length;
}

export function parentRewardProgress(reward: ParentReward, history: BrushSession[]): ParentRewardProgress {
  return parentRewardProgressFromMetrics(reward, {
    completedSessions: completed(history).length,
    perfectDays: perfectDays(history),
    longestStreakDays: longestCompletedDayStreak(history),
  });
}

export function parentRewardProgressFromMetrics(
  reward: ParentReward,
  metrics: ParentRewardMetrics,
): ParentRewardProgress {
  const progress = reward.requirement === "completed-sessions"
    ? metrics.completedSessions
    : reward.requirement === "perfect-days"
      ? metrics.perfectDays
      : metrics.longestStreakDays;
  return { ...reward, progress: Math.min(progress, reward.target), unlocked: progress >= reward.target };
}

export function rewardRequirementLabel(requirement: ParentRewardRequirement, target: number): string {
  if (requirement === "completed-sessions") return String(target) + " sessioni complete";
  if (requirement === "perfect-days") return String(target) + " giorni mattina + sera";
  return "Record di serie: " + String(target) + " giorni consecutivi";
}

export async function loadParentRewards(): Promise<ParentReward[]> {
  try {
    const raw = await AsyncStorage.getItem(PARENT_REWARDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ParentReward[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) =>
      item
      && typeof item.id === "string"
      && typeof item.title === "string"
      && ["completed-sessions", "perfect-days", "streak"].includes(item.requirement)
      && typeof item.target === "number"
    );
  } catch {
    return [];
  }
}

export async function saveParentRewards(rewards: ParentReward[]): Promise<void> {
  await AsyncStorage.setItem(PARENT_REWARDS_KEY, JSON.stringify(rewards));
}
