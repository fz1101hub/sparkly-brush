import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useBrush } from "@/contexts/brush-context";
import { useI18n } from "@/contexts/locale-context";
import { useCurrentDayTimestamp } from "@/hooks/use-current-day";
import {
  DEFAULT_BRUSHLING_ID,
  STARTER_IDS,
  computeBrushlingStats,
  computeSessionReward,
  getBrushling,
  type BrushlingDefinition,
  type BrushlingGameStats,
  type BrushlingId,
  type BrushlingReward,
} from "@/lib/brushlings";
import {
  computeGameInventory,
  computeSessionDiscovery,
  type GameInventory,
  type SessionDiscovery,
} from "@/lib/game-inventory";
import {
  computeMissionCenter,
  computeProgressRewardDelta,
  type MissionCenter,
  type ProgressRewardDelta,
} from "@/lib/missions";
import {
  DEFAULT_CUSTOMIZATION_STATE,
  availableCoins,
  equipCustomization as equipCustomizationState,
  purchaseCustomization as purchaseCustomizationState,
  settlePurchasesAfterHistoryReset as settlePurchasesState,
  type CustomizationItemId,
  type CustomizationState,
} from "@/lib/customization";
import {
  type BrushlingProfile,
  getBrushlingStorage,
} from "@/lib/brushling-storage";
import {
  computeLifetimeBrushlingStats,
  computeLifetimeDiscovery,
  computeLifetimeInventory,
  computeLifetimeMissionCenter,
  computeLifetimeProgressRewardDelta,
  computeLifetimeSessionReward,
} from "@/lib/lifetime-progress";

export type PurchaseResult = "purchased" | "owned" | "insufficient";

type BrushlingContextValue = {
  selectedId: BrushlingId;
  selected: BrushlingDefinition;
  stats: BrushlingGameStats;
  inventory: GameInventory;
  missionCenter: MissionCenter;
  customization: CustomizationState;
  totalEarnedCoins: number;
  walletCoins: number;
  profileReady: boolean;
  restoreInProgress: boolean;
  hasChosenStarter: boolean;
  reward: BrushlingReward | null;
  discovery: SessionDiscovery | null;
  progressReward: ProgressRewardDelta | null;
  chooseStarter: (id: BrushlingId) => Promise<boolean>;
  selectBrushling: (id: BrushlingId) => Promise<boolean>;
  buyCustomization: (id: CustomizationItemId) => Promise<PurchaseResult>;
  equipCustomization: (id: CustomizationItemId) => Promise<boolean>;
  restoreFromBackup: (profile: BrushlingProfile, customization: CustomizationState) => Promise<void>;
  /** Call after clearing the real history: keeps owned items, wallet restarts from zero. */
  settlePurchasesAfterHistoryReset: () => Promise<void>;
  setRestoreInProgress: (active: boolean) => void;
  dismissReward: () => void;
};

const BrushlingContext = createContext<BrushlingContextValue | null>(null);

export function BrushlingProvider({ children }: PropsWithChildren) {
  // Captured at mount: a late write after a child switch must stay in this child's records.
  const store = useRef(getBrushlingStorage());
  const { history, lifetimeProgress, progressEvent, historyReady, demoMode } =
    useBrush();
  const [selectedId, setSelectedId] =
    useState<BrushlingId>(DEFAULT_BRUSHLING_ID);
  const [customization, setCustomization] = useState<CustomizationState>(
    DEFAULT_CUSTOMIZATION_STATE,
  );
  const [profileReady, setProfileReady] = useState(false);
  const [restoreInProgress, setRestoreInProgress] = useState(false);
  const [hasChosenStarter, setHasChosenStarter] = useState(false);
  const [reward, setReward] = useState<BrushlingReward | null>(null);
  const [discovery, setDiscovery] = useState<SessionDiscovery | null>(null);
  const [progressReward, setProgressReward] = useState<ProgressRewardDelta | null>(null);

  const rewardTrackerReadyRef = useRef(false);
  const knownSessionIdsRef = useRef<Set<string>>(new Set());
  const lastHandledProgressEventIdRef = useRef<string | null>(null);
  const previousDemoModeRef = useRef(demoMode);

  useEffect(() => {
    void Promise.all([store.current.loadBrushlingProfile(), store.current.loadCustomizationState()])
      .then(([profile, savedCustomization]) => {
        setSelectedId(profile.selectedId);
        setHasChosenStarter(profile.hasChosenStarter);
        setCustomization(savedCustomization);
      })
      .finally(() => setProfileReady(true));
  }, []);

  useEffect(() => {
    const wasDemo = previousDemoModeRef.current;
    previousDemoModeRef.current = demoMode;
    rewardTrackerReadyRef.current = false;

    if (!wasDemo || demoMode) return;

    void Promise.all([store.current.loadBrushlingProfile(), store.current.loadCustomizationState()]).then(
      ([profile, savedCustomization]) => {
        setSelectedId(profile.selectedId);
        setHasChosenStarter(profile.hasChosenStarter);
        setCustomization(savedCustomization);
        setReward(null);
        setDiscovery(null);
        setProgressReward(null);
      },
    );
  }, [demoMode]);

  const today = useCurrentDayTimestamp();
  const stats = useMemo(
    () => demoMode
      ? computeBrushlingStats(history, today)
      : computeLifetimeBrushlingStats(lifetimeProgress, today),
    [demoMode, history, lifetimeProgress, today],
  );
  const inventory = useMemo(
    () => demoMode ? computeGameInventory(history) : computeLifetimeInventory(lifetimeProgress),
    [demoMode, history, lifetimeProgress],
  );
  const missionCenter = useMemo(
    () => demoMode
      ? computeMissionCenter(history, today)
      : computeLifetimeMissionCenter(lifetimeProgress, today),
    [demoMode, history, lifetimeProgress, today],
  );
  const totalEarnedCoins = stats.coins + missionCenter.totalBonusCoins;
  const walletCoins = useMemo(
    () => availableCoins(totalEarnedCoins, customization),
    [customization, totalEarnedCoins],
  );

  useEffect(() => {
    if (!profileReady || !historyReady || restoreInProgress) return;
    if (stats.unlockedIds.includes(selectedId)) return;
    // Reconcile a persisted selection only after the separate history is hydrated.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedId(DEFAULT_BRUSHLING_ID);
    if (!demoMode) void store.current.saveSelectedBrushling(DEFAULT_BRUSHLING_ID);
  }, [demoMode, historyReady, profileReady, restoreInProgress, selectedId, stats.unlockedIds]);

  useEffect(() => {
    if (!demoMode || !historyReady) return;

    if (!rewardTrackerReadyRef.current) {
      knownSessionIdsRef.current = new Set(history.map((session) => session.id));
      rewardTrackerReadyRef.current = true;
      return;
    }

    const known = knownSessionIdsRef.current;
    const newSession = history.find((session) => !known.has(session.id));
    knownSessionIdsRef.current = new Set(history.map((session) => session.id));

    if (!newSession || newSession.durationSeconds < 5 || !hasChosenStarter) return;

    const nextReward = computeSessionReward(history, newSession.id, selectedId);
    const nextDiscovery = computeSessionDiscovery(history, newSession.id);
    const nextProgressReward = computeProgressRewardDelta(history, newSession.id);

    if (nextReward && (nextReward.xpEarned > 0 || nextReward.coinsEarned > 0)) {
      setReward(nextReward);
      setDiscovery(nextDiscovery);
      setProgressReward(nextProgressReward);
    }
  }, [demoMode, hasChosenStarter, history, historyReady, selectedId]);

  useEffect(() => {
    if (demoMode || !historyReady || restoreInProgress || !progressEvent) return;
    if (lastHandledProgressEventIdRef.current === progressEvent.session.id) return;
    lastHandledProgressEventIdRef.current = progressEvent.session.id;
    if (progressEvent.session.durationSeconds < 5 || !hasChosenStarter) return;

    const nextReward = computeLifetimeSessionReward(progressEvent, selectedId);
    if (nextReward.xpEarned <= 0 && nextReward.coinsEarned <= 0) return;
    // Consume this new durable session exactly once; the event is external state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReward(nextReward);
    setDiscovery(computeLifetimeDiscovery(progressEvent));
    setProgressReward(computeLifetimeProgressRewardDelta(progressEvent));
  }, [demoMode, hasChosenStarter, historyReady, progressEvent, restoreInProgress, selectedId]);

  const chooseStarter = useCallback(async (id: BrushlingId) => {
    if (!STARTER_IDS.includes(id)) return false;
    setSelectedId(id);
    setHasChosenStarter(true);
    // The starter is profile data, not history: it is kept even when chosen during the demo.
    await store.current.saveStarterSelection(id);
    return true;
  }, []);

  const selectBrushling = useCallback(async (id: BrushlingId) => {
    if (!stats.unlockedIds.includes(id)) return false;
    setSelectedId(id);
    if (!demoMode) await store.current.saveSelectedBrushling(id);
    return true;
  }, [demoMode, stats.unlockedIds]);

  const buyCustomization = useCallback(async (id: CustomizationItemId): Promise<PurchaseResult> => {
    if (customization.ownedIds.includes(id)) return "owned";

    const purchased = purchaseCustomizationState(customization, id, totalEarnedCoins);
    if (!purchased) return "insufficient";

    const next = equipCustomizationState(purchased, id) ?? purchased;
    setCustomization(next);
    if (!demoMode) await store.current.saveCustomizationState(next);
    return "purchased";
  }, [customization, demoMode, totalEarnedCoins]);

  const equipCustomization = useCallback(async (id: CustomizationItemId) => {
    const next = equipCustomizationState(customization, id);
    if (!next) return false;

    setCustomization(next);
    if (!demoMode) await store.current.saveCustomizationState(next);
    return true;
  }, [customization, demoMode]);

  const restoreFromBackup = useCallback(async (
    profile: BrushlingProfile,
    restoredCustomization: CustomizationState,
  ) => {
    rewardTrackerReadyRef.current = false;
    // A restore replaces history but is not a newly completed session. Keep
    // the last handled event until BrushProvider clears its in-memory event.
    setSelectedId(profile.selectedId);
    setHasChosenStarter(profile.hasChosenStarter);
    setCustomization(restoredCustomization);
    setReward(null);
    setDiscovery(null);
    setProgressReward(null);
    await store.current.restoreBrushlingState(profile, restoredCustomization);
  }, []);

  const settlePurchasesAfterHistoryReset = useCallback(async () => {
    if (demoMode) return;
    const next = settlePurchasesState(customization);
    setCustomization(next);
    await store.current.saveCustomizationState(next);
  }, [customization, demoMode]);

  const dismissReward = useCallback(() => {
    setReward(null);
    setDiscovery(null);
    setProgressReward(null);
  }, []);

  const value = useMemo<BrushlingContextValue>(() => ({
    selectedId,
    selected: getBrushling(selectedId),
    stats,
    inventory,
    missionCenter,
    customization,
    totalEarnedCoins,
    walletCoins,
    profileReady,
    restoreInProgress,
    hasChosenStarter,
    reward,
    discovery,
    progressReward,
    chooseStarter,
    selectBrushling,
    buyCustomization,
    equipCustomization,
    restoreFromBackup,
    settlePurchasesAfterHistoryReset,
    setRestoreInProgress,
    dismissReward,
  }), [
    buyCustomization,
    chooseStarter,
    customization,
    discovery,
    dismissReward,
    equipCustomization,
    hasChosenStarter,
    inventory,
    missionCenter,
    profileReady,
    progressReward,
    restoreFromBackup,
    restoreInProgress,
    reward,
    selectBrushling,
    selectedId,
    settlePurchasesAfterHistoryReset,
    stats,
    totalEarnedCoins,
    walletCoins,
  ]);

  return <BrushlingContext.Provider value={value}>{children}</BrushlingContext.Provider>;
}

export function useBrushling(): BrushlingContextValue {
  const { t } = useI18n();
  const value = useContext(BrushlingContext);
  if (!value) throw new Error(t("context.brushling.missingProvider"));
  return value;
}
