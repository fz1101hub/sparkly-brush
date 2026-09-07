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
  DEFAULT_CUSTOMIZATION_STATE,
  availableCoins,
  equipCustomization as equipCustomizationState,
  purchaseCustomization as purchaseCustomizationState,
  type CustomizationItemId,
  type CustomizationState,
} from "@/lib/customization";
import {
  loadBrushlingProfile,
  loadCustomizationState,
  saveCustomizationState,
  saveSelectedBrushling,
  saveStarterSelection,
} from "@/lib/brushling-storage";

export type PurchaseResult = "purchased" | "owned" | "insufficient";

type BrushlingContextValue = {
  selectedId: BrushlingId;
  selected: BrushlingDefinition;
  stats: BrushlingGameStats;
  inventory: GameInventory;
  customization: CustomizationState;
  walletCoins: number;
  profileReady: boolean;
  hasChosenStarter: boolean;
  reward: BrushlingReward | null;
  discovery: SessionDiscovery | null;
  chooseStarter: (id: BrushlingId) => Promise<boolean>;
  selectBrushling: (id: BrushlingId) => Promise<boolean>;
  buyCustomization: (id: CustomizationItemId) => Promise<PurchaseResult>;
  equipCustomization: (id: CustomizationItemId) => Promise<boolean>;
  dismissReward: () => void;
};

const BrushlingContext = createContext<BrushlingContextValue | null>(null);

export function BrushlingProvider({ children }: PropsWithChildren) {
  const { history, historyReady } = useBrush();
  const [selectedId, setSelectedId] = useState<BrushlingId>(DEFAULT_BRUSHLING_ID);
  const [customization, setCustomization] = useState<CustomizationState>(DEFAULT_CUSTOMIZATION_STATE);
  const [profileReady, setProfileReady] = useState(false);
  const [hasChosenStarter, setHasChosenStarter] = useState(false);
  const [reward, setReward] = useState<BrushlingReward | null>(null);
  const [discovery, setDiscovery] = useState<SessionDiscovery | null>(null);

  const rewardTrackerReadyRef = useRef(false);
  const knownSessionIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    void Promise.all([loadBrushlingProfile(), loadCustomizationState()])
      .then(([profile, savedCustomization]) => {
        setSelectedId(profile.selectedId);
        setHasChosenStarter(profile.hasChosenStarter);
        setCustomization(savedCustomization);
      })
      .finally(() => setProfileReady(true));
  }, []);

  const stats = useMemo(() => computeBrushlingStats(history), [history]);
  const inventory = useMemo(() => computeGameInventory(history), [history]);
  const walletCoins = useMemo(
    () => availableCoins(stats.coins, customization),
    [customization, stats.coins],
  );

  useEffect(() => {
    if (!profileReady) return;
    if (stats.unlockedIds.includes(selectedId)) return;
    setSelectedId(DEFAULT_BRUSHLING_ID);
    void saveSelectedBrushling(DEFAULT_BRUSHLING_ID);
  }, [profileReady, selectedId, stats.unlockedIds]);

  useEffect(() => {
    if (!historyReady) return;

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

    if (nextReward && (nextReward.xpEarned > 0 || nextReward.coinsEarned > 0)) {
      setReward(nextReward);
      setDiscovery(nextDiscovery);
    }
  }, [hasChosenStarter, history, historyReady, selectedId]);

  const chooseStarter = useCallback(async (id: BrushlingId) => {
    if (!STARTER_IDS.includes(id)) return false;
    setSelectedId(id);
    setHasChosenStarter(true);
    await saveStarterSelection(id);
    return true;
  }, []);

  const selectBrushling = useCallback(async (id: BrushlingId) => {
    if (!stats.unlockedIds.includes(id)) return false;
    setSelectedId(id);
    await saveSelectedBrushling(id);
    return true;
  }, [stats.unlockedIds]);

  const buyCustomization = useCallback(async (id: CustomizationItemId): Promise<PurchaseResult> => {
    if (customization.ownedIds.includes(id)) return "owned";

    const purchased = purchaseCustomizationState(customization, id, stats.coins);
    if (!purchased) return "insufficient";

    const next = equipCustomizationState(purchased, id) ?? purchased;
    setCustomization(next);
    await saveCustomizationState(next);
    return "purchased";
  }, [customization, stats.coins]);

  const equipCustomization = useCallback(async (id: CustomizationItemId) => {
    const next = equipCustomizationState(customization, id);
    if (!next) return false;

    setCustomization(next);
    await saveCustomizationState(next);
    return true;
  }, [customization]);

  const dismissReward = useCallback(() => {
    setReward(null);
    setDiscovery(null);
  }, []);

  const value = useMemo<BrushlingContextValue>(() => ({
    selectedId,
    selected: getBrushling(selectedId),
    stats,
    inventory,
    customization,
    walletCoins,
    profileReady,
    hasChosenStarter,
    reward,
    discovery,
    chooseStarter,
    selectBrushling,
    buyCustomization,
    equipCustomization,
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
    profileReady,
    reward,
    selectBrushling,
    selectedId,
    stats,
    walletCoins,
  ]);

  return <BrushlingContext.Provider value={value}>{children}</BrushlingContext.Provider>;
}

export function useBrushling(): BrushlingContextValue {
  const value = useContext(BrushlingContext);
  if (!value) throw new Error("useBrushling deve essere usato dentro BrushlingProvider");
  return value;
}
