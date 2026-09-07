import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useBrush } from "@/contexts/brush-context";
import {
  DEFAULT_BRUSHLING_ID,
  computeBrushlingStats,
  getBrushling,
  type BrushlingDefinition,
  type BrushlingGameStats,
  type BrushlingId,
} from "@/lib/brushlings";
import { loadSelectedBrushling, saveSelectedBrushling } from "@/lib/brushling-storage";

type BrushlingContextValue = {
  selectedId: BrushlingId;
  selected: BrushlingDefinition;
  stats: BrushlingGameStats;
  selectBrushling: (id: BrushlingId) => Promise<boolean>;
};

const BrushlingContext = createContext<BrushlingContextValue | null>(null);

export function BrushlingProvider({ children }: PropsWithChildren) {
  const { history } = useBrush();
  const [selectedId, setSelectedId] = useState<BrushlingId>(DEFAULT_BRUSHLING_ID);

  useEffect(() => {
    void loadSelectedBrushling().then(setSelectedId);
  }, []);

  const stats = useMemo(() => computeBrushlingStats(history), [history]);

  useEffect(() => {
    if (stats.unlockedIds.includes(selectedId)) return;
    setSelectedId(DEFAULT_BRUSHLING_ID);
    void saveSelectedBrushling(DEFAULT_BRUSHLING_ID);
  }, [selectedId, stats.unlockedIds]);

  const selectBrushling = useCallback(async (id: BrushlingId) => {
    if (!stats.unlockedIds.includes(id)) return false;
    setSelectedId(id);
    await saveSelectedBrushling(id);
    return true;
  }, [stats.unlockedIds]);

  const value = useMemo<BrushlingContextValue>(() => ({
    selectedId,
    selected: getBrushling(selectedId),
    stats,
    selectBrushling,
  }), [selectBrushling, selectedId, stats]);

  return <BrushlingContext.Provider value={value}>{children}</BrushlingContext.Provider>;
}

export function useBrushling(): BrushlingContextValue {
  const value = useContext(BrushlingContext);
  if (!value) throw new Error("useBrushling deve essere usato dentro BrushlingProvider");
  return value;
}
