import type { PortableBrushlingProfile } from "@/lib/backup";
import type { CustomizationState } from "@/lib/customization";
import type { LifetimeProgress } from "@/lib/lifetime-progress";
import type { ParentReward } from "@/lib/parent-rewards";

type BackupSnapshot = {
  profile: PortableBrushlingProfile;
  customization: Pick<CustomizationState, "ownedIds">;
  parentRewards: readonly ParentReward[];
  lifetimeProgress: Pick<
    LifetimeProgress,
    "attemptedSessions" | "completedSessions"
  >;
};

type Summary = {
  brushling: PortableBrushlingProfile["selectedId"];
  attemptedSessions: number;
  completedSessions: number;
  denItems: number;
  familyRewards: number;
};

export type BackupComparison = {
  current: Summary;
  incoming: Summary;
  /** Verified SQLite rows for files; consultable rows for legacy codes. */
  incomingRows: number;
  historyComplete: boolean;
  lowerLifetimeProgress: boolean;
};

function summarize(snapshot: BackupSnapshot): Summary {
  return {
    brushling: snapshot.profile.selectedId,
    attemptedSessions: snapshot.lifetimeProgress.attemptedSessions,
    completedSessions: snapshot.lifetimeProgress.completedSessions,
    denItems: snapshot.customization.ownedIds.length,
    familyRewards: snapshot.parentRewards.length,
  };
}

/** Constant-space preview: counts are not session identities or a merge plan. */
export function compareBackupContents(
  currentSnapshot: BackupSnapshot,
  incomingSnapshot: BackupSnapshot,
  incomingRows: number,
  historyComplete: boolean,
): BackupComparison {
  const current = summarize(currentSnapshot);
  const incoming = summarize(incomingSnapshot);
  return {
    current,
    incoming,
    incomingRows,
    historyComplete,
    lowerLifetimeProgress:
      incoming.attemptedSessions < current.attemptedSessions ||
      incoming.completedSessions < current.completedSessions,
  };
}
