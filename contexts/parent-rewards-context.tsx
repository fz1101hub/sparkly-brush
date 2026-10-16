import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState , useRef } from "react";

import { useBrush } from "@/contexts/brush-context";
import { getParentRewardsStorage, parentRewardProgress, parentRewardProgressFromMetrics, type ParentReward, type ParentRewardProgress, type ParentRewardRequirement } from "@/lib/parent-rewards";

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
  const storage = useRef(getParentRewardsStorage());
  const { history, lifetimeProgress, demoMode } = useBrush();
  const [definitions, setDefinitions] = useState<ParentReward[]>([]);
  const [ready, setReady] = useState(false);
  const current = useRef<ParentReward[]>([]);
  const writes = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    void storage.current.loadParentRewards().then(value => { current.current = value; setDefinitions(value); }).finally(() => setReady(true));
  }, []);

  const rewards = useMemo(
    () => definitions.map((reward) => demoMode
      ? parentRewardProgress(reward, history)
      : parentRewardProgressFromMetrics(reward, {
        completedSessions: lifetimeProgress.completedSessions,
        perfectDays: lifetimeProgress.perfectDays,
        longestStreakDays: lifetimeProgress.longestStreakDays,
      })),
    [definitions, demoMode, history, lifetimeProgress],
  );

  const nextReward = useMemo(
    () => rewards.find((reward) => !reward.deliveredAt) ?? null,
    [rewards],
  );

  const mutate = useCallback((transform: (previous: ParentReward[]) => ParentReward[]) => {
    const operation = writes.current.catch(() => {}).then(async () => {
      const next = transform(current.current);
      await storage.current.saveParentRewards(next);
      current.current = next;
      setDefinitions(next);
    });
    writes.current = operation;
    return operation;
  }, []);

  const addReward = useCallback((title: string, requirement: ParentRewardRequirement, target: number) => {
    const cleanTitle = title.trim();
    if (!cleanTitle || cleanTitle.length > 100 || !Number.isInteger(target) || target < 1 || target > 365) return Promise.reject(new Error("Inserisci un titolo e un obiettivo valido"));
    return mutate(previous => [...previous, { id: "parent-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8), title: cleanTitle, requirement, target, createdAt: Date.now(), deliveredAt: null }]);
  }, [mutate]);
  const removeReward = useCallback((id: string) => mutate(previous => previous.filter(reward => reward.id !== id)), [mutate]);
  const markDelivered = useCallback(async (id: string) => {
    if (demoMode) return;
    await mutate(previous => previous.map(reward => reward.id === id ? { ...reward, deliveredAt: Date.now() } : reward));
  }, [demoMode, mutate]);
  const restoreRewards = useCallback((restored: ParentReward[]) => mutate(() => restored), [mutate]);

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
  const value = useContext(ParentRewardsContext);
  if (!value) throw new Error("useParentRewards deve essere usato dentro ParentRewardsProvider");
  return value;
}

