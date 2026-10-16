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
  type CustomizationItemId,
  type CustomizationState,
} from "@/lib/customization";
import { getBrushlingStorage, type BrushlingProfile } from "@/lib/brushling-storage";
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
  setRestoreInProgress: (active: boolean) => void;
  dismissReward: () => void;
};

const BrushlingContext = createContext<BrushlingContextValue | null>(null);

export function BrushlingProvider({ children }: PropsWithChildren) {
  const storage = useRef(getBrushlingStorage());
  const { history, lifetimeProgress, progressEvent, historyReady, demoMode } = useBrush();
  const [selectedId, setSelectedId] = useState<BrushlingId>(DEFAULT_BRUSHLING_ID);
  const [customization, setCustomizationState] = useState<CustomizationState>(DEFAULT_CUSTOMIZATION_STATE);
  const customizationRef = useRef(DEFAULT_CUSTOMIZATION_STATE);
  const customizationWrites = useRef<Promise<void>>(Promise.resolve());
  const setCustomization = useCallback((value: CustomizationState) => {
    customizationRef.current = value;
    setCustomizationState(value);
  }, []);
  const serializeCustomization = useCallback(<T,>(operation: () => Promise<T>) => {
    const result = customizationWrites.current.then(operation, operation);
    customizationWrites.current = result.then(() => undefined, () => undefined);
    return result;
  }, []);
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
    void Promise.all([storage.current.loadBrushlingProfile(), storage.current.loadCustomizationState()])
      .then(([profile, savedCustomization]) => {
        setSelectedId(profile.selectedId);
        setHasChosenStarter(profile.hasChosenStarter);
        setCustomization(savedCustomization);
      })
      .finally(() => setProfileReady(true));
  }, [setCustomization]);

  useEffect(() => {
    const wasDemo = previousDemoModeRef.current;
    previousDemoModeRef.current = demoMode;
    rewardTrackerReadyRef.current = false;

    if (!wasDemo || demoMode) return;

    void Promise.all([storage.current.loadBrushlingProfile(), storage.current.loadCustomizationState()]).then(
      ([profile, savedCustomization]) => {
        setSelectedId(profile.selectedId);
        setHasChosenStarter(profile.hasChosenStarter);
        setCustomization(savedCustomization);
        setReward(null);
        setDiscovery(null);
        setProgressReward(null);
      },
    );
  }, [demoMode, setCustomization]);

  const stats = useMemo(
    () => demoMode ? computeBrushlingStats(history) : computeLifetimeBrushlingStats(lifetimeProgress),
    [demoMode, history, lifetimeProgress],
  );
  const inventory = useMemo(
    () => demoMode ? computeGameInventory(history) : computeLifetimeInventory(lifetimeProgress),
    [demoMode, history, lifetimeProgress],
  );
  const missionCenter = useMemo(
    () => demoMode ? computeMissionCenter(history) : computeLifetimeMissionCenter(lifetimeProgress),
    [demoMode, history, lifetimeProgress],
  );
  const totalEarnedCoins = stats.coins + missionCenter.totalBonusCoins;
  const walletCoins = useMemo(
    () => availableCoins(totalEarnedCoins, customization),
    [customization, totalEarnedCoins],
  );

  useEffect(() => {
    if (!profileReady || !historyReady || restoreInProgress) return;
    if (stats.unlockedIds.includes(selectedId)) return;
    setSelectedId(DEFAULT_BRUSHLING_ID);
    if (!demoMode) void storage.current.saveSelectedBrushling(DEFAULT_BRUSHLING_ID);
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
    if (demoMode || !historyReady || !progressEvent) return;
    if (lastHandledProgressEventIdRef.current === progressEvent.session.id) return;
    lastHandledProgressEventIdRef.current = progressEvent.session.id;
    if (progressEvent.session.durationSeconds < 5 || !hasChosenStarter) return;

    const nextReward = computeLifetimeSessionReward(progressEvent, selectedId);
    if (nextReward.xpEarned <= 0 && nextReward.coinsEarned <= 0) return;
    setReward(nextReward);
    setDiscovery(computeLifetimeDiscovery(progressEvent));
    setProgressReward(computeLifetimeProgressRewardDelta(progressEvent));
  }, [demoMode, hasChosenStarter, historyReady, progressEvent, selectedId]);

  const chooseStarter = useCallback(async (id: BrushlingId) => {
    if (!STARTER_IDS.includes(id)) return false;
    if (!demoMode) await storage.current.saveStarterSelection(id);
    setSelectedId(id);
    setHasChosenStarter(true);
    return true;
  }, [demoMode]);

  const selectBrushling = useCallback(async (id: BrushlingId) => {
    if (!stats.unlockedIds.includes(id)) return false;
    if (!demoMode) await storage.current.saveSelectedBrushling(id);
    setSelectedId(id);
    return true;
  }, [demoMode, stats.unlockedIds]);

  const buyCustomization = useCallback((id: CustomizationItemId): Promise<PurchaseResult> => serializeCustomization(async () => {
    const current = customizationRef.current;
    if (current.ownedIds.includes(id)) return "owned";
    const purchased = purchaseCustomizationState(current, id, totalEarnedCoins);
    if (!purchased) return "insufficient";
    const next = equipCustomizationState(purchased, id) ?? purchased;
    if (!demoMode) await storage.current.saveCustomizationState(next);
    setCustomization(next);
    return "purchased";
  }), [demoMode, serializeCustomization, setCustomization, totalEarnedCoins]);

  const equipCustomization = useCallback((id: CustomizationItemId) => serializeCustomization(async () => {
    const next = equipCustomizationState(customizationRef.current, id);
    if (!next) return false;
    if (!demoMode) await storage.current.saveCustomizationState(next);
    setCustomization(next);
    return true;
  }), [demoMode, serializeCustomization, setCustomization]);

  const restoreFromBackup = useCallback(async (
    profile: BrushlingProfile,
    restoredCustomization: CustomizationState,
  ) => {
    await customizationWrites.current.catch(() => {});
    await storage.current.restoreBrushlingState(profile, restoredCustomization);
    rewardTrackerReadyRef.current = false;
    lastHandledProgressEventIdRef.current = null;
    setSelectedId(profile.selectedId);
    setHasChosenStarter(profile.hasChosenStarter);
    setCustomization(restoredCustomization);
    setReward(null);
    setDiscovery(null);
    setProgressReward(null);
  }, [setCustomization]);

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
    stats,
    totalEarnedCoins,
    walletCoins,
  ]);

  return <BrushlingContext.Provider value={value}>{children}</BrushlingContext.Provider>;
}

export function useBrushling(): BrushlingContextValue {
  const value = useContext(BrushlingContext);
  if (!value) throw new Error("useBrushling deve essere usato dentro BrushlingProvider");
  return value;
}

