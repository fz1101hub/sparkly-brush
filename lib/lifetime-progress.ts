import type { BrushSession } from "./brush-types";
import {
  BRUSHLINGS,
  XP_PER_LEVEL,
  getBrushling,
  getEvolution,
  type BrushlingGameStats,
  type BrushlingId,
  type BrushlingReward,
} from "./brushlings";
import {
  COLLECTIBLE_ITEMS,
  EGG_DEFINITIONS,
  getItemForCompletedSessionNumber,
  type CollectibleItemId,
  type GameInventory,
  type SessionDiscovery,
} from "./game-inventory";
import {
  computeAchievementsFromMetrics,
  computeDailyMissionSummaryFromCounts,
  type MissionCenter,
  type ProgressRewardDelta,
} from "./missions";
import { dayDifference, isEvening, isMorning, localDateKey } from "./day-progress";

export const LIFETIME_PROGRESS_VERSION = 1;

export type DeviceSessionCursor = {
  lastSessionId: number;
  epoch: number;
  previousEpochRecentSessionIds: number[];
  recentIdentities: string[];
  updatedAt: number;
};

export type PendingDeviceFallback = {
  sessionId: string;
  startedAt: number;
  durationSeconds: number;
  targetSeconds: number;
  expectedSessionId: number | null;
  hasInterveningProgress: boolean;
  progressBeforeSession: LifetimeAccountingSnapshot | null;
};

export type LifetimeAccountingSnapshot = Omit<
  LifetimeProgress,
  "deviceCursors" | "pendingDeviceFallbacks"
>;

export type LifetimeProgress = {
  version: typeof LIFETIME_PROGRESS_VERSION;
  attemptedSessions: number;
  completedSessions: number;
  totalBrushingSeconds: number;
  xp: number;
  dailyBonusCoins: number;
  perfectDays: number;
  lastCompletedDateKey: string | null;
  currentStreakDays: number;
  longestStreakDays: number;
  itemCounts: Record<CollectibleItemId, number>;
  activeDateKey: string | null;
  /** completedCount * 4 + morningBit + eveningBit for activeDateKey */
  activeDay: number;
  deviceCursors: Record<string, DeviceSessionCursor>;
  pendingDeviceFallbacks: Record<string, PendingDeviceFallback>;
};

export type LifetimeProgressEvent = {
  session: BrushSession;
  before: LifetimeProgress;
  after: LifetimeProgress;
};

type DayProgress = {
  completedSessions: number;
  morningCompleted: boolean;
  eveningCompleted: boolean;
};

function emptyItemCounts(): Record<CollectibleItemId, number> {
  return {
    "bubble-pearl": 0,
    "fresh-leaf": 0,
    "spark-crystal": 0,
    "moon-shard": 0,
    "smile-star": 0,
  };
}

export function createEmptyLifetimeProgress(): LifetimeProgress {
  return {
    version: LIFETIME_PROGRESS_VERSION,
    attemptedSessions: 0,
    completedSessions: 0,
    totalBrushingSeconds: 0,
    xp: 0,
    dailyBonusCoins: 0,
    perfectDays: 0,
    lastCompletedDateKey: null,
    currentStreakDays: 0,
    longestStreakDays: 0,
    itemCounts: emptyItemCounts(),
    activeDateKey: null,
    activeDay: 0,
    deviceCursors: {},
    pendingDeviceFallbacks: {},
  };
}

function decodeDay(encoded: number | undefined): DayProgress {
  const safe = Number.isFinite(encoded) ? Math.max(0, Math.floor(encoded ?? 0)) : 0;
  return {
    completedSessions: Math.floor(safe / 4),
    morningCompleted: (safe & 1) === 1,
    eveningCompleted: (safe & 2) === 2,
  };
}

function encodeDay(day: DayProgress): number {
  return Math.max(0, Math.floor(day.completedSessions)) * 4
    + Number(day.morningCompleted)
    + Number(day.eveningCompleted) * 2;
}

function currentStreak(progress: LifetimeProgress, timestamp: number): number {
  if (!progress.lastCompletedDateKey) return 0;
  const todayKey = localDateKey(timestamp);
  const daysSinceLastCompletion = dayDifference(progress.lastCompletedDateKey, todayKey);
  return daysSinceLastCompletion === 0 || daysSinceLastCompletion === 1
    ? progress.currentStreakDays
    : 0;
}

function daySummary(progress: LifetimeProgress, dateKey: string) {
  const day = progress.activeDateKey === dateKey
    ? decodeDay(progress.activeDay)
    : decodeDay(undefined);
  return computeDailyMissionSummaryFromCounts(
    dateKey,
    day.completedSessions,
    day.morningCompleted,
    day.eveningCompleted,
  );
}

function achievementMetrics(progress: LifetimeProgress) {
  return {
    completedSessions: progress.completedSessions,
    perfectDays: progress.perfectDays,
    longestStreakDays: progress.longestStreakDays,
  };
}

function cloneProgress(progress: LifetimeProgress): LifetimeProgress {
  return {
    ...progress,
    itemCounts: { ...progress.itemCounts },
    deviceCursors: Object.fromEntries(
      Object.entries(progress.deviceCursors).map(([key, cursor]) => [key, { ...cursor }]),
    ),
    pendingDeviceFallbacks: Object.fromEntries(
      Object.entries(progress.pendingDeviceFallbacks).map(([key, fallback]) => [key, { ...fallback }]),
    ),
  };
}

function accountingSnapshot(progress: LifetimeProgress): LifetimeAccountingSnapshot {
  const { deviceCursors: _deviceCursors, pendingDeviceFallbacks: _fallbacks, ...snapshot } = progress;
  return { ...snapshot, itemCounts: { ...snapshot.itemCounts } };
}

function normalizeAccountingSnapshot(value: unknown): LifetimeAccountingSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const normalized = normalizeLifetimeProgress({
    ...(value as object),
    deviceCursors: {},
    pendingDeviceFallbacks: {},
  });
  return normalized ? accountingSnapshot(normalized) : null;
}

export function applySessionToLifetime(
  progress: LifetimeProgress,
  session: BrushSession,
): LifetimeProgress {
  const next = cloneProgress(progress);
  Object.values(next.pendingDeviceFallbacks).forEach((fallback) => {
    fallback.hasInterveningProgress = true;
  });
  next.attemptedSessions += 1;
  next.totalBrushingSeconds += Math.max(0, session.durationSeconds);
  next.xp += session.completed
    ? 60
    : session.durationSeconds >= 5
      ? Math.min(20, Math.floor(session.durationSeconds / 6))
      : 0;

  if (!session.completed) return next;

  const dateKey = localDateKey(session.startedAt);
  const previousDay = next.activeDateKey === dateKey
    ? decodeDay(next.activeDay)
    : decodeDay(undefined);
  const previousSummary = daySummary(next, dateKey);
  const wasPerfect = previousDay.morningCompleted && previousDay.eveningCompleted;
  const firstCompletionForDay = previousDay.completedSessions === 0;

  next.completedSessions += 1;
  next.itemCounts[getItemForCompletedSessionNumber(next.completedSessions).id] += 1;
  const updatedDay: DayProgress = {
    completedSessions: previousDay.completedSessions + 1,
    morningCompleted: previousDay.morningCompleted || isMorning(session.startedAt),
    eveningCompleted: previousDay.eveningCompleted || isEvening(session.startedAt),
  };
  next.activeDateKey = dateKey;
  next.activeDay = encodeDay(updatedDay);

  const updatedSummary = daySummary(next, dateKey);
  next.dailyBonusCoins += Math.max(0, updatedSummary.earnedCoins - previousSummary.earnedCoins);
  if (!wasPerfect && updatedDay.morningCompleted && updatedDay.eveningCompleted) {
    next.perfectDays += 1;
  }
  if (firstCompletionForDay) {
    if (!next.lastCompletedDateKey) {
      next.currentStreakDays = 1;
      next.lastCompletedDateKey = dateKey;
    } else {
      const difference = dayDifference(next.lastCompletedDateKey, dateKey);
      if (difference === 1) next.currentStreakDays += 1;
      else if (difference > 1) next.currentStreakDays = 1;
      if (difference > 0) next.lastCompletedDateKey = dateKey;
    }
    next.longestStreakDays = Math.max(next.longestStreakDays, next.currentStreakDays);
  }
  return next;
}

export function createLifetimeProgress(history: BrushSession[]): LifetimeProgress {
  return [...history]
    .sort((a, b) => a.startedAt - b.startedAt || a.id.localeCompare(b.id))
    .reduce(applySessionToLifetime, createEmptyLifetimeProgress());
}

function nonNegativeInteger(value: unknown, fallback: number = 0): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : fallback;
}

export function normalizeLifetimeProgress(value: unknown): LifetimeProgress | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<LifetimeProgress>;
  if (raw.version !== LIFETIME_PROGRESS_VERSION) return null;

  const itemCounts = emptyItemCounts();
  COLLECTIBLE_ITEMS.forEach((item) => {
    itemCounts[item.id] = nonNegativeInteger(raw.itemCounts?.[item.id]);
  });

  const deviceCursors: Record<string, DeviceSessionCursor> = {};
  if (raw.deviceCursors && typeof raw.deviceCursors === "object") {
    Object.entries(raw.deviceCursors).forEach(([key, cursor]) => {
      if (key.length > 256) return;
      if (!cursor || typeof cursor !== "object") return;
      const candidate = cursor as Partial<DeviceSessionCursor>;
      deviceCursors[key] = {
        lastSessionId: Math.min(65_535, nonNegativeInteger(candidate.lastSessionId)),
        epoch: nonNegativeInteger(candidate.epoch),
        previousEpochRecentSessionIds: Array.isArray(candidate.previousEpochRecentSessionIds)
          ? candidate.previousEpochRecentSessionIds
            .map((sessionId) => Math.min(65_535, nonNegativeInteger(sessionId)))
            .slice(-32)
          : [],
        recentIdentities: Array.isArray(candidate.recentIdentities)
          ? candidate.recentIdentities.filter((value): value is string => typeof value === "string").slice(-32)
          : [],
        updatedAt: nonNegativeInteger(candidate.updatedAt),
      };
    });
    Object.keys(deviceCursors)
      .sort((first, second) => (
        deviceCursors[second].updatedAt - deviceCursors[first].updatedAt
        || first.localeCompare(second)
      ))
      .slice(32)
      .forEach((key) => delete deviceCursors[key]);
  }

  const pendingDeviceFallbacks: Record<string, PendingDeviceFallback> = {};
  if (raw.pendingDeviceFallbacks && typeof raw.pendingDeviceFallbacks === "object") {
    Object.entries(raw.pendingDeviceFallbacks).forEach(([key, fallback]) => {
      if (key.length > 256) return;
      if (!fallback || typeof fallback !== "object") return;
      const candidate = fallback as Partial<PendingDeviceFallback>;
      if (
        typeof candidate.sessionId !== "string"
        || candidate.sessionId.length > 512
        || typeof candidate.startedAt !== "number"
        || typeof candidate.durationSeconds !== "number"
        || typeof candidate.targetSeconds !== "number"
      ) return;
      pendingDeviceFallbacks[key] = {
        sessionId: candidate.sessionId,
        startedAt: Math.max(0, Math.floor(candidate.startedAt)),
        durationSeconds: Math.max(0, Math.floor(candidate.durationSeconds)),
        targetSeconds: Math.max(1, Math.floor(candidate.targetSeconds)),
        expectedSessionId: typeof candidate.expectedSessionId === "number"
          ? Math.min(65_535, nonNegativeInteger(candidate.expectedSessionId))
          : null,
        hasInterveningProgress: candidate.hasInterveningProgress === true
          || nonNegativeInteger((candidate as { attemptedSessionsAfterFallback?: unknown }).attemptedSessionsAfterFallback) > 0,
        progressBeforeSession: normalizeAccountingSnapshot(candidate.progressBeforeSession),
      };
    });
    Object.keys(pendingDeviceFallbacks)
      .sort((first, second) => (
        pendingDeviceFallbacks[second].startedAt - pendingDeviceFallbacks[first].startedAt
        || first.localeCompare(second)
      ))
      .slice(32)
      .forEach((key) => delete pendingDeviceFallbacks[key]);
  }

  return {
    version: LIFETIME_PROGRESS_VERSION,
    attemptedSessions: nonNegativeInteger(raw.attemptedSessions),
    completedSessions: nonNegativeInteger(raw.completedSessions),
    totalBrushingSeconds: nonNegativeInteger(raw.totalBrushingSeconds),
    xp: nonNegativeInteger(raw.xp),
    dailyBonusCoins: nonNegativeInteger(raw.dailyBonusCoins),
    perfectDays: nonNegativeInteger(raw.perfectDays),
    lastCompletedDateKey: typeof raw.lastCompletedDateKey === "string"
      && /^\d{4}-\d{2}-\d{2}$/.test(raw.lastCompletedDateKey)
      ? raw.lastCompletedDateKey
      : null,
    currentStreakDays: nonNegativeInteger(raw.currentStreakDays),
    longestStreakDays: nonNegativeInteger(raw.longestStreakDays),
    itemCounts,
    activeDateKey: typeof raw.activeDateKey === "string"
      && /^\d{4}-\d{2}-\d{2}$/.test(raw.activeDateKey)
      ? raw.activeDateKey
      : null,
    activeDay: nonNegativeInteger(raw.activeDay),
    deviceCursors,
    pendingDeviceFallbacks,
  };
}

function deviceKey(deviceId: string): string {
  return encodeURIComponent(deviceId);
}

export function markPendingDeviceFallback(
  progress: LifetimeProgress,
  deviceId: string,
  session: BrushSession,
  progressBeforeSession: LifetimeProgress = progress,
): LifetimeProgress {
  const next = cloneProgress(progress);
  const cursor = next.deviceCursors[deviceKey(deviceId)];
  next.pendingDeviceFallbacks[deviceKey(deviceId)] = {
    sessionId: session.id,
    startedAt: session.startedAt,
    durationSeconds: session.durationSeconds,
    targetSeconds: session.targetSeconds,
    expectedSessionId: cursor ? (cursor.lastSessionId + 1) & 0xffff : null,
    hasInterveningProgress: false,
    progressBeforeSession: accountingSnapshot(progressBeforeSession),
  };
  const activeKeys = Object.keys(next.pendingDeviceFallbacks);
  if (activeKeys.length > 32) {
    activeKeys
      .sort((first, second) => (
        next.pendingDeviceFallbacks[first].startedAt - next.pendingDeviceFallbacks[second].startedAt
      ))
      .slice(0, activeKeys.length - 32)
      .forEach((key) => delete next.pendingDeviceFallbacks[key]);
  }
  return next;
}

export function pendingDeviceFallback(
  progress: LifetimeProgress,
  deviceId: string,
): PendingDeviceFallback | null {
  return progress.pendingDeviceFallbacks[deviceKey(deviceId)] ?? null;
}

export function matchesPendingDeviceFallback(
  progress: LifetimeProgress,
  deviceId: string,
  sessionId: number,
  durationSeconds: number,
  targetSeconds: number,
  observedStartedAt: number,
): PendingDeviceFallback | null {
  const key = deviceKey(deviceId);
  const pending = progress.pendingDeviceFallbacks[key];
  if (!pending) return null;
  const sameShape = Math.abs(pending.durationSeconds - durationSeconds) <= 3
    && Math.abs(pending.targetSeconds - targetSeconds) <= 3;
  const expectedSuccessor = pending.expectedSessionId !== null
    && pending.expectedSessionId === sessionId;
  const maximumDrift = expectedSuccessor ? 30_000 : 5_000;
  const tightlyCorrelatedInTime = Math.abs(pending.startedAt - observedStartedAt) <= maximumDrift;
  const noInterveningProgress = !pending.hasInterveningProgress;
  return sameShape && tightlyCorrelatedInTime && noInterveningProgress ? pending : null;
}

export function clearPendingDeviceFallback(
  progress: LifetimeProgress,
  deviceId: string,
): LifetimeProgress {
  const next = cloneProgress(progress);
  delete next.pendingDeviceFallbacks[deviceKey(deviceId)];
  return next;
}

export function reconcilePendingDeviceFallbackProgress(
  progress: LifetimeProgress,
  deviceId: string,
  authoritativeSession: BrushSession,
): LifetimeProgress | null {
  const key = deviceKey(deviceId);
  const pending = progress.pendingDeviceFallbacks[key];
  if (!pending?.progressBeforeSession) return null;

  let rebuilt: LifetimeProgress = {
    ...pending.progressBeforeSession,
    itemCounts: { ...pending.progressBeforeSession.itemCounts },
    deviceCursors: Object.fromEntries(
      Object.entries(progress.deviceCursors).map(([cursorKey, cursor]) => [cursorKey, { ...cursor }]),
    ),
    pendingDeviceFallbacks: Object.fromEntries(
      Object.entries(progress.pendingDeviceFallbacks).filter(([fallbackKey]) => fallbackKey !== key),
    ),
  };
  rebuilt = applySessionToLifetime(rebuilt, authoritativeSession);
  return rebuilt;
}

export function allocateDeviceSessionIdentity(
  progress: LifetimeProgress,
  deviceId: string,
  sessionId: number,
): { progress: LifetimeProgress; id: string; duplicate: boolean } {
  const next = cloneProgress(progress);
  const key = encodeURIComponent(deviceId);
  const previous = next.deviceCursors[key];
  const rollover = Boolean(previous && previous.lastSessionId >= 65_000 && sessionId <= 1_024);
  const staleRegression = Boolean(previous && sessionId < previous.lastSessionId && !rollover);
  const epoch = rollover ? (previous?.epoch ?? 0) + 1 : previous?.epoch ?? 0;
  const identity = `${epoch}:${sessionId}`;
  const previousEpochRecentSessionIds = rollover
    ? (previous?.recentIdentities ?? [])
      .map((recentIdentity) => Number(recentIdentity.split(":").at(-1)))
      .filter((recentSessionId) => Number.isInteger(recentSessionId))
      .slice(-32)
    : previous?.previousEpochRecentSessionIds ?? [];
  const stalePreviousEpoch = Boolean(
    previous
      && previous.epoch > 0
      && previousEpochRecentSessionIds.includes(sessionId)
      && sessionId > previous.lastSessionId + 1,
  );
  const duplicate = previous?.lastSessionId === sessionId
    || staleRegression
    || stalePreviousEpoch
    || previous?.recentIdentities.includes(identity) === true;

  if (!duplicate) {
    next.deviceCursors[key] = {
      lastSessionId: sessionId,
      epoch,
      previousEpochRecentSessionIds: previousEpochRecentSessionIds
        .filter((previousSessionId) => previousSessionId !== sessionId)
        .slice(-32),
      recentIdentities: [...(previous?.recentIdentities ?? []), identity].slice(-32),
      updatedAt: Date.now(),
    };
    const activeKeys = Object.keys(next.deviceCursors);
    if (activeKeys.length > 32) {
      activeKeys
        .sort((first, second) => next.deviceCursors[first].updatedAt - next.deviceCursors[second].updatedAt)
        .slice(0, activeKeys.length - 32)
        .forEach((cursorKey) => delete next.deviceCursors[cursorKey]);
    }
  }
  return { progress: next, id: `ble-${key}-${epoch}-${sessionId}`, duplicate };
}

export function computeLifetimeBrushlingStats(
  progress: LifetimeProgress,
  timestamp: number = Date.now(),
): BrushlingGameStats {
  const level = 1 + Math.floor(progress.xp / XP_PER_LEVEL);
  return {
    xp: progress.xp,
    level,
    levelProgress: (progress.xp % XP_PER_LEVEL) / XP_PER_LEVEL,
    coins: progress.completedSessions * 12 + Math.floor(progress.totalBrushingSeconds / 60),
    completedSessions: progress.completedSessions,
    todayCompletedSessions: progress.activeDateKey === localDateKey(timestamp)
      ? decodeDay(progress.activeDay).completedSessions
      : 0,
    currentStreakDays: currentStreak(progress, timestamp),
    unlockedIds: BRUSHLINGS
      .filter((brushling) => progress.completedSessions >= brushling.unlockAtCompletedSessions)
      .map((brushling) => brushling.id),
  };
}

export function computeLifetimeMissionCenter(
  progress: LifetimeProgress,
  timestamp: number = Date.now(),
): MissionCenter {
  const achievements = computeAchievementsFromMetrics(achievementMetrics(progress));
  const achievementBonusCoins = achievements
    .filter((achievement) => achievement.unlocked)
    .reduce((total, achievement) => total + achievement.rewardCoins, 0);
  return {
    today: daySummary(progress, localDateKey(timestamp)),
    achievements,
    dailyBonusCoins: progress.dailyBonusCoins,
    achievementBonusCoins,
    totalBonusCoins: progress.dailyBonusCoins + achievementBonusCoins,
  };
}

export function computeLifetimeInventory(progress: LifetimeProgress): GameInventory {
  const eggs = EGG_DEFINITIONS.map((egg) => {
    const found = progress.completedSessions >= egg.foundAtCompletedSessions;
    const hatched = progress.completedSessions >= egg.hatchAtCompletedSessions;
    const denominator = Math.max(1, egg.hatchAtCompletedSessions - egg.foundAtCompletedSessions);
    const numerator = Math.max(
      0,
      Math.min(denominator, progress.completedSessions - egg.foundAtCompletedSessions),
    );
    return {
      ...egg,
      found,
      hatched,
      progress: found ? numerator / denominator : 0,
      sessionsRemaining: Math.max(0, egg.hatchAtCompletedSessions - progress.completedSessions),
    };
  });

  return {
    completedSessions: progress.completedSessions,
    itemCounts: { ...progress.itemCounts },
    eggs,
    hatchedBrushlingIds: eggs.filter((egg) => egg.hatched).map((egg) => egg.brushlingId),
  };
}

export function computeLifetimeSessionReward(
  event: LifetimeProgressEvent,
  selectedId: BrushlingId,
): BrushlingReward {
  const beforeStats = computeLifetimeBrushlingStats(event.before, event.session.startedAt);
  const afterStats = computeLifetimeBrushlingStats(event.after, event.session.startedAt);
  const creature = getBrushling(selectedId);
  const beforeEvolution = getEvolution(creature, beforeStats.level);
  const afterEvolution = getEvolution(creature, afterStats.level);
  const evolved = beforeEvolution.name !== afterEvolution.name;
  return {
    sessionId: event.session.id,
    completed: event.session.completed,
    xpEarned: Math.max(0, event.after.xp - event.before.xp),
    coinsEarned: Math.max(0, afterStats.coins - beforeStats.coins),
    previousLevel: beforeStats.level,
    level: afterStats.level,
    evolvedFrom: evolved ? beforeEvolution.name : undefined,
    evolvedTo: evolved ? afterEvolution.name : undefined,
  };
}

export function computeLifetimeDiscovery(event: LifetimeProgressEvent): SessionDiscovery | null {
  if (!event.session.completed || event.after.completedSessions !== event.before.completedSessions + 1) return null;
  const completedSessionNumber = event.after.completedSessions;
  const item = getItemForCompletedSessionNumber(completedSessionNumber);
  return {
    sessionId: event.session.id,
    completedSessionNumber,
    zoneId: item.zoneId,
    item,
    eggFound: EGG_DEFINITIONS.find((egg) => egg.foundAtCompletedSessions === completedSessionNumber),
    eggHatched: EGG_DEFINITIONS.find((egg) => egg.hatchAtCompletedSessions === completedSessionNumber),
  };
}

export function computeLifetimeProgressRewardDelta(
  event: LifetimeProgressEvent,
): ProgressRewardDelta | null {
  if (!event.session.completed) return null;
  const dateKey = localDateKey(event.session.startedAt);
  const beforeDay = daySummary(event.before, dateKey);
  const afterDay = daySummary(event.after, dateKey);
  const beforeAchievements = computeAchievementsFromMetrics(achievementMetrics(event.before));
  const afterAchievements = computeAchievementsFromMetrics(achievementMetrics(event.after));

  const missionTitles = afterDay.missions
    .filter((mission) => mission.completed)
    .filter((mission) => !beforeDay.missions.find((item) => item.id === mission.id)?.completed)
    .map((mission) => mission.title);
  const achievementTitles = afterAchievements
    .filter((achievement) => achievement.unlocked)
    .filter((achievement) => !beforeAchievements.find((item) => item.id === achievement.id)?.unlocked)
    .map((achievement) => achievement.title);
  const beforeAchievementCoins = beforeAchievements
    .filter((achievement) => achievement.unlocked)
    .reduce((total, achievement) => total + achievement.rewardCoins, 0);
  const afterAchievementCoins = afterAchievements
    .filter((achievement) => achievement.unlocked)
    .reduce((total, achievement) => total + achievement.rewardCoins, 0);

  const dailyBonusCoins = Math.max(0, event.after.dailyBonusCoins - event.before.dailyBonusCoins);
  const achievementBonusCoins = Math.max(0, afterAchievementCoins - beforeAchievementCoins);
  return {
    missionTitles,
    achievementTitles,
    dailyBonusCoins,
    achievementBonusCoins,
    chestUnlocked: afterDay.allCompleted && !beforeDay.allCompleted,
    totalBonusCoins: dailyBonusCoins + achievementBonusCoins,
  };
}
