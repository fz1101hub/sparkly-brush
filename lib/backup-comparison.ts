import type { AppThemeId } from "@/lib/app-themes";
import type { PortableBrushlingProfile } from "@/lib/backup";
import type { BracesSettings, BracesType } from "@/lib/braces";
import type { CustomizationState } from "@/lib/customization";
import type { LifetimeProgress } from "@/lib/lifetime-progress";
import type { ParentReward } from "@/lib/parent-rewards";
import type { ReminderSettings } from "@/lib/reminders";
import type { VillageState } from "@/lib/village";

type BackupSnapshot = {
  profile: PortableBrushlingProfile;
  customization: Pick<CustomizationState, "ownedIds">;
  parentRewards: readonly ParentReward[];
  lifetimeProgress: Pick<
    LifetimeProgress,
    "attemptedSessions" | "completedSessions"
  >;
  /** Absent in text codes and in files written before the village existed. */
  village?: Pick<VillageState, "cards">;
  braces?: Pick<BracesSettings, "enabled" | "type">;
  themeId?: AppThemeId;
  reminders?: Pick<ReminderSettings, "enabled" | "morning" | "evening">;
};

type Summary = {
  brushling: PortableBrushlingProfile["selectedId"];
  attemptedSessions: number;
  completedSessions: number;
  denItems: number;
  familyRewards: number;
  /** null: the backup has no village, the current one stays. */
  museumCards: number | null;
  /** The braces worn, "none", or null when the backup has no braces mode (the current one stays). */
  braces: BracesType | "none" | null;
  /** null when the backup has no theme or reminders: the current ones stay. */
  themeId: AppThemeId | null;
  reminders: Pick<ReminderSettings, "enabled" | "morning" | "evening"> | null;
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
    museumCards: snapshot.village ? snapshot.village.cards.length : null,
    braces: snapshot.braces ? (snapshot.braces.enabled ? snapshot.braces.type : "none") : null,
    themeId: snapshot.themeId ?? null,
    reminders: snapshot.reminders
      ? { enabled: snapshot.reminders.enabled, morning: snapshot.reminders.morning, evening: snapshot.reminders.evening }
      : null,
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
