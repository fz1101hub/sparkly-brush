import { useEffect, useMemo, useState } from "react";

import { useBrush } from "@/contexts/brush-context";
import { useOptionalFamily } from "@/contexts/family-context-value";
import type { BrushSession } from "@/lib/brush-types";
import { getBrushStorage } from "@/lib/brush-storage";

export type ChildHistory = { profileId: string; name: string; history: BrushSession[] };

/**
 * The recent real sessions of every child in the family, for what siblings do together (the
 * family boss, voce 13). The active child's come from the live context; the others are read once
 * per change of the active child's history. Demo sessions never count.
 */
export function useFamilyHistories(): ChildHistory[] {
  const family = useOptionalFamily();
  const { history, demoMode } = useBrush();
  const activeId = family?.active.id ?? null;
  const profiles = family?.profiles;
  const [others, setOthers] = useState<ChildHistory[]>([]);

  useEffect(() => {
    let active = true;
    const siblings = (profiles ?? []).filter((profile) => profile.id !== activeId);
    void Promise.all(
      siblings.map(async (profile) => {
        try {
          return { profileId: profile.id, name: profile.name, history: (await getBrushStorage(profile.id).loadHistoryBundle()).recentHistory };
        } catch {
          return { profileId: profile.id, name: profile.name, history: [] };
        }
      }),
    ).then((loaded) => {
      if (active) setOthers(loaded);
    });
    return () => {
      active = false;
    };
  }, [activeId, profiles, history]);

  const activeName = family?.active.name ?? "";
  return useMemo(() => {
    const own: ChildHistory = { profileId: activeId ?? "primary", name: activeName, history: demoMode ? [] : history };
    return [own, ...others.filter((child) => child.profileId !== own.profileId)];
  }, [activeId, activeName, demoMode, history, others]);
}
