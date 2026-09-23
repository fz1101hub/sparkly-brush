import type { BrushSession } from "./brush-types";
import {
  createLifetimeProgress,
  type LifetimeProgress,
} from "./lifetime-progress";

export type ReconciledLegacyProgress = {
  history: BrushSession[];
  progress: LifetimeProgress;
  historyComplete: boolean;
};

export function reconcileLegacyProgress(
  lifetimeHistoryV1: BrushSession[],
  recentHistoryV2: BrushSession[],
  recentHistoryV1: BrushSession[],
  progressV2: LifetimeProgress | null,
): ReconciledLegacyProgress {
  const byId = new Map<string, BrushSession>();
  for (const session of [...lifetimeHistoryV1, ...recentHistoryV2, ...recentHistoryV1]) {
    byId.set(session.id, session);
  }
  const history = [...byId.values()].sort((first, second) => second.startedAt - first.startedAt);
  const progress = progressV2 && progressV2.attemptedSessions >= history.length
    ? progressV2
    : createLifetimeProgress(history);
  return {
    history,
    progress,
    historyComplete: progress.attemptedSessions === history.length,
  };
}
