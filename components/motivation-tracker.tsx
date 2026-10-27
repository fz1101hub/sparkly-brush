import { useEffect } from "react";

import { useBrush } from "@/contexts/brush-context";
import { useBrushling } from "@/contexts/brushling-context";
import { useOptionalExtras } from "@/contexts/extras-context";
import { useCurrentDayTimestamp } from "@/hooks/use-current-day";
import { useFamilyHistories } from "@/hooks/use-family-histories";
import { motivationUpdates } from "@/lib/motivation";

/**
 * Keeps the child's long-term records (lotto 4) up to date as the sessions arrive. They live with
 * the child's extras, so they outlast the 120-session window of the recent history and travel in
 * the backup. Demo sessions never count.
 */
export function MotivationTracker() {
  const extrasContext = useOptionalExtras();
  const { history, demoMode, historyReady } = useBrush();
  const { stats } = useBrushling();
  const children = useFamilyHistories();
  const today = useCurrentDayTimestamp();
  const ready = Boolean(extrasContext?.ready) && historyReady && !demoMode;
  const apply = extrasContext?.apply;
  const extras = extrasContext?.extras;

  useEffect(() => {
    if (!ready || !apply || !extras) return;
    const inputs = {
      history,
      familyHistories: children.map((child) => child.history),
      completedSessions: stats.completedSessions,
      now: today,
    };
    if (!Object.keys(motivationUpdates(extras, inputs)).length) return;
    void apply((previous) => ({ ...previous, ...motivationUpdates(previous, inputs) }));
  }, [apply, children, extras, history, ready, stats.completedSessions, today]);

  return null;
}
