import AsyncStorage from "@react-native-async-storage/async-storage";

import type { BrushSession } from "@/lib/brush-types";

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

function localDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function parseLocalDayKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function completed(history: BrushSession[]): BrushSession[] {
  return history.filter((session) => session.completed);
}

function perfectDays(history: BrushSession[]): number {
  const sessions = completed(history);
  const keys = [...new Set(sessions.map((session) => localDateKey(session.startedAt)))];
  return keys.filter((key) => {
    const daySessions = sessions.filter((session) => localDateKey(session.startedAt) === key);
    const morning = daySessions.some((session) => {
      const hour = new Date(session.startedAt).getHours();
      return hour >= 5 && hour < 12;
    });
    const evening = daySessions.some((session) => new Date(session.startedAt).getHours() >= 18);
    return morning && evening;
  }).length;
}

function longestStreak(history: BrushSession[]): number {
  const keys = [...new Set(completed(history).map((session) => localDateKey(session.startedAt)))].sort();
  if (!keys.length) return 0;
  let longest = 1;
  let current = 1;
  for (let index = 1; index < keys.length; index += 1) {
    const previous = parseLocalDayKey(keys[index - 1]);
    const next = parseLocalDayKey(keys[index]);
    const diff = Math.round((next.getTime() - previous.getTime()) / 86_400_000);
    if (diff === 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

export function parentRewardProgress(reward: ParentReward, history: BrushSession[]): ParentRewardProgress {
  const progress = reward.requirement === "completed-sessions"
    ? completed(history).length
    : reward.requirement === "perfect-days"
      ? perfectDays(history)
      : longestStreak(history);
  return { ...reward, progress: Math.min(progress, reward.target), unlocked: progress >= reward.target };
}

export function rewardRequirementLabel(requirement: ParentRewardRequirement, target: number): string {
  if (requirement === "completed-sessions") return String(target) + " sessioni complete";
  if (requirement === "perfect-days") return String(target) + " giorni mattina + sera";
  return String(target) + " giorni consecutivi";
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