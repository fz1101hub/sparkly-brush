import AsyncStorage from "@react-native-async-storage/async-storage";

import type { TranslationKey, TranslationParams } from "@/lib/i18n";
import type { BrushSession } from "@/lib/brush-types";
import {
  isEvening,
  isMorning,
  localDateKey,
  longestCompletedDayStreak,
  uniqueCompletedDayKeys,
} from "@/lib/day-progress";

const PARENT_REWARDS_KEY = "sparkly-brush.parent-rewards.v1";

/** Same limit as backups: more rewards would be dropped silently on restore. */
export const MAX_PARENT_REWARDS = 40;
export const MAX_PARENT_REWARD_TITLE_LENGTH = 60;

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

type Translate = (key: TranslationKey, params?: TranslationParams) => string;

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

export function rewardRequirementLabel(
  requirement: ParentRewardRequirement,
  target: number,
  t: Translate,
  formatNumber: (value: number) => string,
): string {
  const params = { target: formatNumber(target) };
  if (requirement === "completed-sessions") {
    return t("family.rewardRequirement.completedSessions", params);
  }
  if (requirement === "perfect-days") {
    return t("family.rewardRequirement.perfectDays", params);
  }
  return t("family.rewardRequirement.streak", params);
}

const REQUIREMENTS = new Set<ParentRewardRequirement>(["completed-sessions", "perfect-days", "streak"]);

/** Accepts only well-formed rewards and clips them to the limits the UI and backups enforce. */
export function normalizeParentRewards(value: unknown): ParentReward[] {
  if (!Array.isArray(value)) return [];
  const rewards: ParentReward[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Partial<ParentReward>;
    const title = typeof raw.title === "string" ? raw.title.trim().slice(0, MAX_PARENT_REWARD_TITLE_LENGTH) : "";
    if (
      typeof raw.id !== "string"
      || !raw.id
      || !title
      || !REQUIREMENTS.has(raw.requirement as ParentRewardRequirement)
      || typeof raw.target !== "number"
      || !Number.isFinite(raw.target)
      || raw.target < 1
    ) continue;
    rewards.push({
      id: raw.id,
      title,
      requirement: raw.requirement as ParentRewardRequirement,
      target: Math.floor(raw.target),
      createdAt: typeof raw.createdAt === "number" && Number.isFinite(raw.createdAt) ? raw.createdAt : 0,
      deliveredAt: typeof raw.deliveredAt === "number" && Number.isFinite(raw.deliveredAt) ? raw.deliveredAt : null,
    });
    if (rewards.length === MAX_PARENT_REWARDS) break;
  }
  return rewards;
}

export async function loadParentRewards(): Promise<ParentReward[]> {
  try {
    const raw = await AsyncStorage.getItem(PARENT_REWARDS_KEY);
    if (!raw) return [];
    return normalizeParentRewards(JSON.parse(raw));
  } catch {
    return [];
  }
}

export async function saveParentRewards(rewards: ParentReward[]): Promise<void> {
  await AsyncStorage.setItem(PARENT_REWARDS_KEY, JSON.stringify(rewards));
}
