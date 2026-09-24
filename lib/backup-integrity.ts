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

function assertValidPersistedLedgerEntry(entry: PersistedRewardLedgerEntry): void {
  if (
    typeof entry.id !== "string"
    || entry.id.length === 0
    || entry.id.length > 1_024
    || typeof entry.sessionId !== "string"
    || entry.sessionId.length === 0
    || entry.sessionId.length > 512
    || !["session", "daily-missions", "achievements"].includes(entry.kind)
    || !Number.isSafeInteger(entry.coins)
    || entry.coins < 0
    || !Number.isSafeInteger(entry.xp)
    || entry.xp < 0
    || !Number.isSafeInteger(entry.createdAt)
    || entry.createdAt < 0
    || !Array.isArray(entry.details)
    || !entry.details.every((detail) => typeof detail === "string")
  ) {
    throw new Error("Il reward ledger del backup contiene valori non validi");
  }
}

function derivedProgressSnapshot(progress: LifetimeProgress) {
  return {
    version: progress.version,
    attemptedSessions: progress.attemptedSessions,
    completedSessions: progress.completedSessions,
    totalBrushingSeconds: progress.totalBrushingSeconds,
    rewardedBrushingSeconds: progress.rewardedBrushingSeconds,
    xp: progress.xp,
    itemCounts: progress.itemCounts,
  };
}

const TIMEZONE_STABLE_ACHIEVEMENTS = new Map([
  ["Primo sorriso", 10],
  ["Piccolo esploratore", 20],
  ["Campione dei Brushlings", 30],
]);

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

function timezoneStableLedgerEntry(
  entry: PersistedRewardLedgerEntry,
): PersistedRewardLedgerEntry | null {
  if (entry.kind === "session") return entry;
  if (entry.kind !== "achievements") return null;
  const details = entry.details.filter((detail) => TIMEZONE_STABLE_ACHIEVEMENTS.has(detail));
  if (details.length === 0) return null;
  return {
    ...entry,
    coins: details.reduce(
      (total, detail) => total + (TIMEZONE_STABLE_ACHIEVEMENTS.get(detail) ?? 0),
      0,
    ),
    details,
  };
}

function sameLedgerEntry(
  first: PersistedRewardLedgerEntry,
  second: PersistedRewardLedgerEntry,
): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}

type ActiveSessionValidation = {
  session: BrushSession;
  baseRewards: number;
  expectedStable: Map<string, PersistedRewardLedgerEntry>;
  seenStable: Set<string>;
};

const FINITE_PROGRESS_FIELDS = [
  "attemptedSessions",
  "completedSessions",
  "totalBrushingSeconds",
  "rewardedBrushingSeconds",
  "xp",
  "dailyBonusCoins",
  "perfectDays",
  "currentStreakDays",
  "longestStreakDays",
  "activeDay",
] as const satisfies readonly (keyof LifetimeProgress)[];

function assertFiniteSession(session: BrushSession): void {
  if (
    typeof session.id !== "string"
    || session.id.length === 0
    || !Number.isFinite(session.startedAt)
    || !Number.isSafeInteger(session.startedAt)
    || session.startedAt < 0
    || !Number.isFinite(session.durationSeconds)
    || !Number.isSafeInteger(session.durationSeconds)
    || session.durationSeconds < 0
    || !Number.isFinite(session.targetSeconds)
    || !Number.isSafeInteger(session.targetSeconds)
    || session.targetSeconds <= 0
    || typeof session.completed !== "boolean"
    || !["manual", "device", "demo"].includes(session.source)
    || (session.deviceSessionId !== undefined && (
      !Number.isSafeInteger(session.deviceSessionId)
      || session.deviceSessionId < 0
      || session.deviceSessionId > 65_535
    ))
  ) {
    throw new Error("La sessione del backup contiene valori numerici o campi non validi");
  }
}

function assertFiniteProgress(progress: LifetimeProgress): void {
  if (FINITE_PROGRESS_FIELDS.some((field) => !Number.isFinite(progress[field]))) {
    throw new Error("Gli aggregati lifetime del backup contengono valori non finiti");
  }
}

export function progressForPortableBackup(
  sourceProgress: LifetimeProgress,
  replayedProgress: LifetimeProgress,
  historyComplete: boolean,
): LifetimeProgress {
  const accounting = historyComplete ? replayedProgress : sourceProgress;
  return {
    ...accounting,
    itemCounts: { ...accounting.itemCounts },
    deviceCursors: Object.fromEntries(
      Object.entries(sourceProgress.deviceCursors).map(([key, cursor]) => [key, { ...cursor }]),
    ),
    pendingDeviceFallbacks: Object.fromEntries(
      Object.entries(sourceProgress.pendingDeviceFallbacks).map(([key, fallback]) => [key, { ...fallback }]),
    ),
  };
}

/**
 * Incrementally verifies a backup while keeping only one session and its small
 * expected reward set in memory. Callers may therefore stream an unlimited
 * SQLite archive without materializing the whole history or ledger.
 */
export class BackupSemanticValidator {
  private replayedProgress = createEmptyLifetimeProgress();
  private sessionCount = 0;
  private readonly seenSessionIds = new Set<string>();
  private active: ActiveSessionValidation | null = null;
  private dailyCoins = 0;
  private achievementCoins = 0;

  constructor(
    private readonly historyComplete: boolean,
    private readonly ledgerPresent: boolean,
  ) {}

  beginSession(session: BrushSession): void {
    this.endActiveSession();
    assertFiniteSession(session);
    if (this.seenSessionIds.has(session.id)) {
      throw new Error("Il backup contiene identificativi sessione duplicati");
    }
    this.seenSessionIds.add(session.id);
    const before = this.replayedProgress;
    const after = applySessionToLifetime(before, session);
    const expectedStable = new Map<string, PersistedRewardLedgerEntry>();
    if (this.historyComplete && this.ledgerPresent) {
      for (const entry of createRewardLedgerEntries({ session, before, after })) {
        const stable = timezoneStableLedgerEntry(normalizedLedgerEntry(entry));
        if (stable) expectedStable.set(stable.id, stable);
      }
    }
    this.active = {
      session,
      baseRewards: 0,
      expectedStable,
      seenStable: new Set<string>(),
    };
    this.replayedProgress = after;
    this.sessionCount += 1;
  }

  addLedgerEntry(entry: PersistedRewardLedgerEntry): void {
    assertValidPersistedLedgerEntry(entry);
    const active = this.active;
    if (!active || entry.sessionId !== active.session.id) {
      throw new Error("Il reward ledger del backup non è coerente con le sessioni");
    }

    if (entry.kind === "session") {
      active.baseRewards += 1;
      const completionCoins = active.session.completed ? 12 : 0;
      const expectedXp = active.session.completed
        ? 60
        : active.session.rewardPolicy !== "completed-only" && active.session.durationSeconds >= 5
          ? Math.min(20, Math.floor(active.session.durationSeconds / 6))
          : 0;
      const maximumDurationCoins = active.session.completed
        || active.session.rewardPolicy !== "completed-only"
        ? Math.ceil(active.session.durationSeconds / 60)
        : 0;
      if (
        entry.id !== `session:${encodeURIComponent(active.session.id)}:base`
        || entry.xp !== expectedXp
        || entry.coins < completionCoins
        || entry.coins > completionCoins + maximumDurationCoins
        || JSON.stringify(entry.details) !== JSON.stringify([
          active.session.completed ? "sessione-completa" : "sessione-parziale",
        ])
      ) {
        throw new Error("Il reward ledger del backup non è coerente con le sessioni");
      }
    }

    if (this.historyComplete) {
      const stable = timezoneStableLedgerEntry(entry);
      if (stable) {
        const expected = active.expectedStable.get(stable.id);
        if (
          !expected
          || active.seenStable.has(stable.id)
          || !sameLedgerEntry(stable, expected)
        ) {
          throw new Error("Il reward ledger del backup contiene importi o associazioni non validi");
        }
        active.seenStable.add(stable.id);
      }
      if (entry.kind === "daily-missions") this.dailyCoins += entry.coins;
      if (entry.kind === "achievements") this.achievementCoins += entry.coins;
    }
  }

  finish(progress: LifetimeProgress): void {
    this.endActiveSession();
    assertFiniteProgress(this.replayedProgress);
    assertFiniteProgress(progress);
    if (
      this.historyComplete
      && JSON.stringify(derivedProgressSnapshot(this.replayedProgress))
        !== JSON.stringify(derivedProgressSnapshot(progress))
    ) {
      throw new Error("Gli aggregati lifetime del backup non corrispondono alle sessioni archiviate");
    }

    if (
      !this.historyComplete
      && (
        progress.completedSessions > progress.attemptedSessions
        || progress.attemptedSessions < this.sessionCount
        || progress.completedSessions < this.replayedProgress.completedSessions
        || progress.totalBrushingSeconds < this.replayedProgress.totalBrushingSeconds
        || progress.rewardedBrushingSeconds < this.replayedProgress.rewardedBrushingSeconds
        || progress.xp < this.replayedProgress.xp
      )
    ) {
      throw new Error("La baseline lifetime parziale del backup non è coerente");
    }

    if (!this.historyComplete || !this.ledgerPresent) return;
    const expectedAchievementCoins = computeAchievementsFromMetrics({
      completedSessions: progress.completedSessions,
      perfectDays: progress.perfectDays,
      longestStreakDays: progress.longestStreakDays,
    })
      .filter((achievement) => achievement.unlocked)
      .reduce((total, achievement) => total + achievement.rewardCoins, 0);
    if (
      this.dailyCoins !== progress.dailyBonusCoins
      || this.achievementCoins !== expectedAchievementCoins
    ) {
      throw new Error("I bonus del reward ledger non corrispondono agli aggregati lifetime");
    }
  }

  private endActiveSession(): void {
    const active = this.active;
    if (!active) return;
    if (this.ledgerPresent && active.baseRewards !== 1) {
      throw new Error("Il reward ledger del backup non è coerente con le sessioni");
    }
    if (
      this.historyComplete
      && this.ledgerPresent
      && active.seenStable.size !== active.expectedStable.size
    ) {
      throw new Error("Il reward ledger del backup contiene importi o associazioni non validi");
    }
    this.active = null;
  }
}

export function validateBackupSemanticState(input: {
  sessions: BrushSession[];
  progress: LifetimeProgress;
  historyComplete: boolean;
  ledger: PersistedRewardLedgerEntry[] | null;
}): void {
  const validator = new BackupSemanticValidator(input.historyComplete, input.ledger !== null);
  const ledgerBySession = new Map<string, PersistedRewardLedgerEntry[]>();
  if (input.ledger) {
    const sessionIds = new Set(input.sessions.map((session) => session.id));
    for (const entry of input.ledger) {
      if (!sessionIds.has(entry.sessionId)) {
        throw new Error("Il reward ledger del backup non è coerente con le sessioni");
      }
      const entries = ledgerBySession.get(entry.sessionId) ?? [];
      entries.push(entry);
      ledgerBySession.set(entry.sessionId, entries);
    }
  }

  const ordered = [...input.sessions].sort((first, second) => (
    first.startedAt - second.startedAt || first.id.localeCompare(second.id)
  ));
  for (const session of ordered) {
    validator.beginSession(session);
    for (const entry of ledgerBySession.get(session.id) ?? []) {
      validator.addLedgerEntry(entry);
    }
  }
  validator.finish(input.progress);
}
