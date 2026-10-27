import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { useBrush } from "@/contexts/brush-context";
import { useI18n } from "@/contexts/locale-context";
import { useCurrentDayTimestamp } from "@/hooks/use-current-day";
import { localDateKey } from "@/lib/day-progress";
import { computeLifetimeBrushlingStats } from "@/lib/lifetime-progress";
import {
  MAX_PARENT_REWARD_TITLE_LENGTH,
  MAX_PARENT_REWARDS,
  parentRewardProgress,
  parentRewardProgressFromMetrics,
  type ParentReward,
  type ParentRewardProgress,
  type ParentRewardRequirement,
  getParentRewardsStorage,
} from "@/lib/parent-rewards";

type ParentRewardsContextValue = {
  rewards: ParentRewardProgress[];
  definitions: ParentReward[];
  nextReward: ParentRewardProgress | null;
  ready: boolean;
  addReward: (title: string, requirement: ParentRewardRequirement, target: number) => Promise<void>;
  removeReward: (id: string) => Promise<void>;
  markDelivered: (id: string) => Promise<void>;
  restoreRewards: (rewards: ParentReward[]) => Promise<void>;
};

const ParentRewardsContext = createContext<ParentRewardsContextValue | null>(null);

export function ParentRewardsProvider({ children }: PropsWithChildren) {
  // Captured at mount: a late write after a child switch must stay in this child's records.
  const store = useRef(getParentRewardsStorage());
  const { history, lifetimeProgress, demoMode } = useBrush();
  const today = useCurrentDayTimestamp();
  const [definitions, setDefinitions] = useState<ParentReward[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void store.current.loadParentRewards().then(setDefinitions).finally(() => setReady(true));
  }, []);

  const rewards = useMemo(
    () => definitions.map((reward) => demoMode
      ? parentRewardProgress(reward, history)
      : parentRewardProgressFromMetrics(reward, {
        completedSessions: lifetimeProgress.completedSessions,
        perfectDays: lifetimeProgress.perfectDays,
        longestStreakDays: lifetimeProgress.longestStreakDays,
        currentStreakDays: computeLifetimeBrushlingStats(lifetimeProgress, today).currentStreakDays,
        lastCompletedDateKey: lifetimeProgress.lastCompletedDateKey,
      })),
    [definitions, demoMode, history, lifetimeProgress, today],
  );

  // A goal reached stays reached (a streak may break before the parent hands the reward over).
  useEffect(() => {
    if (demoMode || !ready) return;
    const reached = new Set(rewards.filter((reward) => reward.unlocked && reward.baseline && !reward.reachedAt).map((reward) => reward.id));
    if (!reached.size) return;
    const next = definitions.map((reward) => (reached.has(reward.id) ? { ...reward, reachedAt: Date.now() } : reward));
    void store.current.saveParentRewards(next).then(() => setDefinitions(next)).catch(() => undefined);
  }, [definitions, demoMode, ready, rewards]);

  const nextReward = useMemo(
    () => rewards.find((reward) => !reward.deliveredAt) ?? null,
    [rewards],
  );

  const addReward = useCallback(async (
    title: string,
    requirement: ParentRewardRequirement,
    target: number,
  ) => {
    const cleanTitle = title.trim().slice(0, MAX_PARENT_REWARD_TITLE_LENGTH);
    if (!cleanTitle || target < 1 || definitions.length >= MAX_PARENT_REWARDS) return;
    const next: ParentReward[] = [
      ...definitions,
      {
        id: "parent-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6),
        title: cleanTitle,
        requirement,
        target,
        createdAt: Date.now(),
        deliveredAt: null,
        baseline: {
          completedSessions: lifetimeProgress.completedSessions,
          perfectDays: lifetimeProgress.perfectDays,
          dayKey: localDateKey(Date.now()),
        },
      },
    ];
    setDefinitions(next);
    await store.current.saveParentRewards(next);
  }, [definitions, lifetimeProgress]);

  const removeReward = useCallback(async (id: string) => {
    const next = definitions.filter((reward) => reward.id !== id);
    setDefinitions(next);
    await store.current.saveParentRewards(next);
  }, [definitions]);

  const markDelivered = useCallback(async (id: string) => {
    if (demoMode) return;
    const next = definitions.map((reward) => reward.id === id ? { ...reward, deliveredAt: Date.now() } : reward);
    setDefinitions(next);
    await store.current.saveParentRewards(next);
  }, [definitions, demoMode]);

  const restoreRewards = useCallback(async (restored: ParentReward[]) => {
    setDefinitions(restored);
    await store.current.saveParentRewards(restored);
  }, []);

  const value = useMemo(() => ({ rewards, definitions, nextReward, ready, addReward, removeReward, markDelivered, restoreRewards }), [
    addReward,
    definitions,
    markDelivered,
    nextReward,
    ready,
    removeReward,
    restoreRewards,
    rewards,
  ]);

  return <ParentRewardsContext.Provider value={value}>{children}</ParentRewardsContext.Provider>;
}

export function useParentRewards(): ParentRewardsContextValue {
  const { t } = useI18n();
  const value = useContext(ParentRewardsContext);
  if (!value) throw new Error(t("family.rewards.contextError"));
  return value;
}
