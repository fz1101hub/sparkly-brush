import { localDateKey } from "./day-progress";
import {
  computeLifetimeBrushlingStats,
  computeLifetimeProgressRewardDelta,
  type LifetimeProgressEvent,
} from "./lifetime-progress";

export type RewardLedgerKind = "session" | "daily-missions" | "achievements";

export type RewardLedgerEntry = {
  id: string;
  sessionId: string;
  kind: RewardLedgerKind;
  coins: number;
  xp: number;
  details: string[];
  createdAt: number;
};

/**
 * Builds stable, replay-safe reward entries. Persistence uses INSERT OR IGNORE on
 * `id`, so retries can never credit the same reward twice.
 */
export function createRewardLedgerEntries(event: LifetimeProgressEvent): RewardLedgerEntry[] {
  const beforeStats = computeLifetimeBrushlingStats(event.before, event.session.startedAt);
  const afterStats = computeLifetimeBrushlingStats(event.after, event.session.startedAt);
  const delta = computeLifetimeProgressRewardDelta(event);
  const baseId = encodeURIComponent(event.session.id);
  const entries: RewardLedgerEntry[] = [{
    id: `session:${baseId}:base`,
    sessionId: event.session.id,
    kind: "session",
    coins: Math.max(0, afterStats.coins - beforeStats.coins),
    xp: Math.max(0, event.after.xp - event.before.xp),
    details: [event.session.completed ? "sessione-completa" : "sessione-parziale"],
    createdAt: event.session.startedAt,
  }];

  if (delta && delta.dailyBonusCoins > 0) {
    entries.push({
      id: `session:${baseId}:daily:${localDateKey(event.session.startedAt)}`,
      sessionId: event.session.id,
      kind: "daily-missions",
      coins: delta.dailyBonusCoins,
      xp: 0,
      details: [...delta.missionTitles, ...(delta.chestUnlocked ? ["Scrigno giornaliero"] : [])],
      createdAt: event.session.startedAt,
    });
  }

  if (delta && delta.achievementBonusCoins > 0) {
    entries.push({
      id: `session:${baseId}:achievements`,
      sessionId: event.session.id,
      kind: "achievements",
      coins: delta.achievementBonusCoins,
      xp: 0,
      details: delta.achievementTitles,
      createdAt: event.session.startedAt,
    });
  }

  return entries;
}
