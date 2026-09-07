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
  loadBrushlingProfile,
  saveSelectedBrushling,
  saveStarterSelection,
} from "@/lib/brushling-storage";

type BrushlingContextValue = {
  selectedId: BrushlingId;
  selected: BrushlingDefinition;
  stats: BrushlingGameStats;
  inventory: GameInventory;
  profileReady: boolean;
  hasChosenStarter: boolean;
  reward: BrushlingReward | null;
  discovery: SessionDiscovery | null;
  chooseStarter: (id: BrushlingId) => Promise<boolean>;
  selectBrushling: (id: BrushlingId) => Promise<boolean>;
  dismissReward: () => void;
};

const BrushlingContext = createContext<BrushlingContextValue | null>(null);

export function BrushlingProvider({ children }: PropsWithChildren) {
  const { history, historyReady } = useBrush();
  const [selectedId, setSelectedId] = useState<BrushlingId>(DEFAULT_BRUSHLING_ID);
  const [profileReady, setProfileReady] = useState(false);
  const [hasChosenStarter, setHasChosenStarter] = useState(false);
  const [reward, setReward] = useState<BrushlingReward | null>(null);
  const [discovery, setDiscovery] = useState<SessionDiscovery | null>(null);

  const rewardTrackerReadyRef = useRef(false);
  const knownSessionIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    void loadBrushlingProfile()
      .then((profile) => {
        setSelectedId(profile.selectedId);
        setHasChosenStarter(profile.hasChosenStarter);
      })
      .finally(() => setProfileReady(true));
  }, []);

  const stats = useMemo(() => computeBrushlingStats(history), [history]);
  const inventory = useMemo(() => computeGameInventory(history), [history]);

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

  const dismissReward = useCallback(() => {
    setReward(null);
    setDiscovery(null);
  }, []);

  const value = useMemo<BrushlingContextValue>(() => ({
    selectedId,
    selected: getBrushling(selectedId),
    stats,
    inventory,
    profileReady,
    hasChosenStarter,
    reward,
    discovery,
    chooseStarter,
    selectBrushling,
    dismissReward,
  }), [
    chooseStarter,
    discovery,
    dismissReward,
    hasChosenStarter,
    inventory,
    profileReady,
    reward,
    selectBrushling,
    selectedId,
    stats,
  ]);

  return <BrushlingContext.Provider value={value}>{children}</BrushlingContext.Provider>;
}

export function useBrushling(): BrushlingContextValue {
  const value = useContext(BrushlingContext);
  if (!value) throw new Error("useBrushling deve essere usato dentro BrushlingProvider");
  return value;
}
