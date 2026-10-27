import { useMemo } from "react";

import { useBrush } from "@/contexts/brush-context";
import { useExtras } from "@/contexts/extras-context";
import { useCurrentDayTimestamp } from "@/hooks/use-current-day";
import { localDateKey } from "@/lib/day-progress";
import { forgivingStreak, type ForgivingStreak } from "@/lib/forgiving-streak";
import { computeLifetimeBrushlingStats } from "@/lib/lifetime-progress";

/**
 * The «serie del sorriso» of the active child (voci 16, 17 e 62): days brushed in the recent
 * history plus those brushed without the phone, with the weekly joker and the parent's sick or
 * holiday days. Never shorter than the strict streak, which older history may still hold.
 */
export function useSmileStreak(): ForgivingStreak {
  const { history, lifetimeProgress } = useBrush();
  const { extras } = useExtras();
  const today = useCurrentDayTimestamp();
  return useMemo(() => {
    const brushed = new Set(history.filter((session) => session.completed).map((session) => localDateKey(session.startedAt)));
    const kept = new Set<string>();
    for (const item of extras.protectedDays) {
      if (item.reason === "offline") brushed.add(item.day);
      else kept.add(item.day);
    }
    const streak = forgivingStreak(brushed, kept, today);
    const strict = computeLifetimeBrushlingStats(lifetimeProgress, today).currentStreakDays;
    return strict > streak.days ? { ...streak, days: strict } : streak;
  }, [extras.protectedDays, history, lifetimeProgress, today]);
}
