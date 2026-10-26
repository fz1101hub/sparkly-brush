import { getBrushStorage } from "@/lib/brush-storage";
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { useBrush } from "@/contexts/brush-context";
import { useI18n } from "@/contexts/locale-context";
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
  const historyStore = useRef(getBrushStorage());
  const { history, lifetimeProgress, demoMode } = useBrush();
  const [definitions, setDefinitions] = useState<ParentReward[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void store.current.loadParentRewards().then(setDefinitions).finally(() => setReady(true));
  }, []);

  const [rewardMetrics, setRewardMetrics] = useState<Record<string, { completedSessions: number; perfectDays: number; longestStreakDays: number }>>({});

  useEffect(() => {
    if (demoMode) return;
    let cancelled = false;
    void Promise.all(definitions.map(async (reward) => {
      const metrics = await historyStore.current.summarizeSessions(reward.createdAt);
      return [reward.id, metrics] as const;
    })).then((entries) => {
      if (!cancelled) setRewardMetrics(Object.fromEntries(entries));
    }).catch(() => {
      // Never unlock a prize using stale lifetime totals when the archive cannot be read.
      if (!cancelled) setRewardMetrics({});
    });
    return () => { cancelled = true; };
  }, [definitions, demoMode, lifetimeProgress]);

  const rewards = useMemo(
    () => definitions.map((reward) => demoMode
      ? parentRewardProgress(reward, history)
      : parentRewardProgressFromMetrics(reward, rewardMetrics[reward.id] ?? {
        completedSessions: 0, perfectDays: 0, longestStreakDays: 0,
      })),
    [definitions, demoMode, history, rewardMetrics],
  );

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
    if (!cleanTitle || !Number.isSafeInteger(target) || target < 1 || definitions.length >= MAX_PARENT_REWARDS) return;
    const next: ParentReward[] = [
      ...definitions,
      {
        id: "parent-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6),
        title: cleanTitle,
        requirement,
        target,
        createdAt: Date.now(),
        deliveredAt: null,
      },
    ];
    await store.current.saveParentRewards(next);
    setDefinitions(next);
  }, [definitions]);

  const removeReward = useCallback(async (id: string) => {
    const next = definitions.filter((reward) => reward.id !== id);
    await store.current.saveParentRewards(next);
    setDefinitions(next);
  }, [definitions]);

  const markDelivered = useCallback(async (id: string) => {
    if (demoMode) return;
    const next = definitions.map((reward) => reward.id === id ? { ...reward, deliveredAt: Date.now() } : reward);
    await store.current.saveParentRewards(next);
    setDefinitions(next);
  }, [definitions, demoMode]);

  const restoreRewards = useCallback(async (restored: ParentReward[]) => {
    await store.current.saveParentRewards(restored);
    setDefinitions(restored);
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
