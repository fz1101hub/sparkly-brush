import type { BrushSession } from "./brush-types";
import {
  applySessionToLifetime,
  createEmptyLifetimeProgress,
  type LifetimeProgress,
} from "./lifetime-progress";
import {
  createRewardLedgerEntries,
  type RewardLedgerEntry,
} from "./reward-ledger";
import { computeAchievementsFromMetrics } from "./missions";

export type PersistedRewardLedgerEntry = {
  id: string;
  sessionId: string;
  kind: RewardLedgerEntry["kind"];
  coins: number;
  xp: number;
  details: string[];
  createdAt: number;
};

function derivedProgressSnapshot(progress: LifetimeProgress) {
  return {
    version: progress.version,
    attemptedSessions: progress.attemptedSessions,
    completedSessions: progress.completedSessions,
    totalBrushingSeconds: progress.totalBrushingSeconds,
    xp: progress.xp,
    itemCounts: progress.itemCounts,
  };
}

const TIMEZONE_STABLE_ACHIEVEMENTS = new Map([
  ["Primo sorriso", 10],
  ["Piccolo esploratore", 20],
  ["Campione dei Brushlings", 30],
]);

function timezoneStableLedger(entries: PersistedRewardLedgerEntry[]): PersistedRewardLedgerEntry[] {
  return entries.flatMap((entry) => {
    if (entry.kind === "session") return [entry];
    if (entry.kind !== "achievements") return [];
    const details = entry.details.filter((detail) => TIMEZONE_STABLE_ACHIEVEMENTS.has(detail));
    if (details.length === 0) return [];
    return [{
      ...entry,
      coins: details.reduce((total, detail) => total + (TIMEZONE_STABLE_ACHIEVEMENTS.get(detail) ?? 0), 0),
      details,
    }];
  });
}

function replayHistory(history: BrushSession[]): {
  progress: LifetimeProgress;
  ledger: RewardLedgerEntry[];
} {
  let progress = createEmptyLifetimeProgress();
  const ledger: RewardLedgerEntry[] = [];
  const ordered = [...history].sort((first, second) => (
    first.startedAt - second.startedAt || first.id.localeCompare(second.id)
  ));
  for (const session of ordered) {
    const after = applySessionToLifetime(progress, session);
    ledger.push(...createRewardLedgerEntries({ session, before: progress, after }));
    progress = after;
  }
  return { progress, ledger };
}

function normalizedLedgerEntry(entry: RewardLedgerEntry): PersistedRewardLedgerEntry {
  return {
    id: entry.id,
    sessionId: entry.sessionId,
    kind: entry.kind,
    coins: entry.coins,
    xp: entry.xp,
    details: entry.details,
    createdAt: entry.createdAt,
  };
}

export function validateBackupSemanticState(input: {
  sessions: BrushSession[];
  progress: LifetimeProgress;
  historyComplete: boolean;
  ledger: PersistedRewardLedgerEntry[] | null;
}): void {
  const replayed = replayHistory(input.sessions);
  if (
    input.historyComplete
    && JSON.stringify(derivedProgressSnapshot(replayed.progress))
      !== JSON.stringify(derivedProgressSnapshot(input.progress))
  ) {
    throw new Error("Gli aggregati lifetime del backup non corrispondono alle sessioni archiviate");
  }

  if (
    !input.historyComplete
    && (
      input.progress.completedSessions > input.progress.attemptedSessions
      || input.progress.attemptedSessions < input.sessions.length
      || input.progress.completedSessions < replayed.progress.completedSessions
      || input.progress.totalBrushingSeconds < replayed.progress.totalBrushingSeconds
      || input.progress.xp < replayed.progress.xp
    )
  ) {
    throw new Error("La baseline lifetime parziale del backup non è coerente");
  }

  if (!input.ledger) return;
  const sessionsById = new Map(input.sessions.map((session) => [session.id, session]));
  const baseRewards = input.ledger.filter((entry) => entry.kind === "session");
  if (
    baseRewards.length !== input.sessions.length
    || input.ledger.some((entry) => !sessionsById.has(entry.sessionId))
    || baseRewards.some((entry) => {
      const session = sessionsById.get(entry.sessionId);
      if (!session) return true;
      const completionCoins = session.completed ? 12 : 0;
      const expectedXp = session.completed
        ? 60
        : session.durationSeconds >= 5
          ? Math.min(20, Math.floor(session.durationSeconds / 6))
          : 0;
      return entry.id !== `session:${encodeURIComponent(session.id)}:base`
        || entry.xp !== expectedXp
        || entry.coins < completionCoins
        || entry.coins > completionCoins + Math.ceil(session.durationSeconds / 60)
        || JSON.stringify(entry.details) !== JSON.stringify([
          session.completed ? "sessione-completa" : "sessione-parziale",
        ]);
    })
  ) {
    throw new Error("Il reward ledger del backup non è coerente con le sessioni");
  }

  if (!input.historyComplete) return;
  const expectedLedger = replayed.ledger
    .map(normalizedLedgerEntry)
    .filter((entry) => timezoneStableLedger([entry]).length === 1)
    .sort((first, second) => first.id.localeCompare(second.id));
  const actualLedger = timezoneStableLedger(input.ledger)
    .sort((first, second) => first.id.localeCompare(second.id));
  if (JSON.stringify(actualLedger) !== JSON.stringify(expectedLedger)) {
    throw new Error("Il reward ledger del backup contiene importi o associazioni non validi");
  }


  const dailyCoins = input.ledger
    .filter((entry) => entry.kind === "daily-missions")
    .reduce((total, entry) => total + entry.coins, 0);
  const achievementCoins = input.ledger
    .filter((entry) => entry.kind === "achievements")
    .reduce((total, entry) => total + entry.coins, 0);
  const expectedAchievementCoins = computeAchievementsFromMetrics({
    completedSessions: input.progress.completedSessions,
    perfectDays: input.progress.perfectDays,
    longestStreakDays: input.progress.longestStreakDays,
  })
    .filter((achievement) => achievement.unlocked)
    .reduce((total, achievement) => total + achievement.rewardCoins, 0);
  if (
    dailyCoins !== input.progress.dailyBonusCoins
    || achievementCoins !== expectedAchievementCoins
  ) {
    throw new Error("I bonus del reward ledger non corrispondono agli aggregati lifetime");
  }
}
