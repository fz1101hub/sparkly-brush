import { createProfileStorage, createProfileStore } from "@/lib/profile-scope";

import type { TranslationKey, TranslationParams } from "@/lib/i18n";
import type { BrushSession } from "@/lib/brush-types";
import {
  dayDifference,
  isEvening,
  isMorning,
  localDateKey,
  longestCompletedDayStreak,
  uniqueCompletedDayKeys,
} from "@/lib/day-progress";

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
  /**
   * The child's totals when the reward was created (voce 49): only brushing done afterwards
   * counts. Rewards created before 27 October 2026 have none and count everything, as before.
   */
  baseline?: RewardBaseline;
  /** When the goal was first reached: it stays reached even if a streak breaks later. */
  reachedAt?: number | null;
};

export type RewardBaseline = { completedSessions: number; perfectDays: number; dayKey: string };

export type ParentRewardProgress = ParentReward & {
  progress: number;
  unlocked: boolean;
};

export type ParentRewardMetrics = {
  completedSessions: number;
  perfectDays: number;
  longestStreakDays: number;
  /** The streak still running and its last day, for streak rewards with a baseline. */
  currentStreakDays?: number;
  lastCompletedDateKey?: string | null;
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
  const counted = reward.baseline ? history.filter((session) => session.startedAt >= reward.createdAt) : history;
  return parentRewardProgressFromMetrics(
    { ...reward, baseline: undefined },
    {
      completedSessions: completed(counted).length,
      perfectDays: perfectDays(counted),
      longestStreakDays: longestCompletedDayStreak(counted),
    },
  );
}

/** Progress made since the reward was created. */
function progressSinceBaseline(reward: ParentReward, baseline: RewardBaseline, metrics: ParentRewardMetrics): number {
  if (reward.requirement === "completed-sessions") return Math.max(0, metrics.completedSessions - baseline.completedSessions);
  if (reward.requirement === "perfect-days") return Math.max(0, metrics.perfectDays - baseline.perfectDays);
  if (!metrics.currentStreakDays || !metrics.lastCompletedDateKey) return 0;
  const daysSinceCreation = dayDifference(baseline.dayKey, metrics.lastCompletedDateKey) + 1;
  return Math.max(0, Math.min(metrics.currentStreakDays, daysSinceCreation));
}

export function parentRewardProgressFromMetrics(
  reward: ParentReward,
  metrics: ParentRewardMetrics,
): ParentRewardProgress {
  if (reward.reachedAt) return { ...reward, progress: reward.target, unlocked: true };
  const progress = reward.baseline
    ? progressSinceBaseline(reward, reward.baseline, metrics)
    : reward.requirement === "completed-sessions"
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
function normalizeBaseline(value: unknown): RewardBaseline | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Partial<RewardBaseline>;
  const count = (item: unknown) => typeof item === "number" && Number.isInteger(item) && item >= 0;
  if (!count(raw.completedSessions) || !count(raw.perfectDays) || typeof raw.dayKey !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw.dayKey)) {
    return undefined;
  }
  return { completedSessions: raw.completedSessions!, perfectDays: raw.perfectDays!, dayKey: raw.dayKey };
}

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
      ...(normalizeBaseline(raw.baseline) ? { baseline: normalizeBaseline(raw.baseline) } : {}),
      ...(typeof raw.reachedAt === "number" && Number.isFinite(raw.reachedAt) ? { reachedAt: raw.reachedAt } : {}),
    });
    if (rewards.length === MAX_PARENT_REWARDS) break;
  }
  return rewards;
}

function buildProfileStorage(profileId: string) {
  const AsyncStorage = createProfileStorage(profileId);
  const PARENT_REWARDS_KEY = "sparkly-brush.parent-rewards.v1";

  async function loadParentRewards(): Promise<ParentReward[]> {
    try {
      const raw = await AsyncStorage.getItem(PARENT_REWARDS_KEY);
      if (!raw) return [];
      return normalizeParentRewards(JSON.parse(raw));
    } catch {
      return [];
    }
  }

  async function saveParentRewards(rewards: ParentReward[]): Promise<void> {
    await AsyncStorage.setItem(PARENT_REWARDS_KEY, JSON.stringify(rewards));
  }
  return { loadParentRewards, saveParentRewards };
}

export const getParentRewardsStorage = createProfileStore(buildProfileStorage);
type ProfileStorage = ReturnType<typeof getParentRewardsStorage>;
export const loadParentRewards: ProfileStorage["loadParentRewards"] = (...args) => getParentRewardsStorage().loadParentRewards(...args);
export const saveParentRewards: ProfileStorage["saveParentRewards"] = (...args) => getParentRewardsStorage().saveParentRewards(...args);
