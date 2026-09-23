import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BrushSession, StoredDeviceSession } from "@/lib/brush-types";
import { computeBrushlingStats } from "@/lib/brushlings";
import { computeGameInventory } from "@/lib/game-inventory";
import { computeMissionCenter } from "@/lib/missions";
import {
  allocateDeviceSessionIdentity,
  applySessionToLifetime,
  computeLifetimeBrushlingStats,
  computeLifetimeInventory,
  computeLifetimeMissionCenter,
  createLifetimeProgress,
  createEmptyLifetimeProgress,
} from "@/lib/lifetime-progress";
import {
  parentRewardProgress,
  parentRewardProgressFromMetrics,
  type ParentReward,
} from "@/lib/parent-rewards";

const storage = vi.hoisted(() => new Map<string, string>());

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { storage.set(key, value); }),
    removeItem: vi.fn(async (key: string) => { storage.delete(key); }),
    multiSet: vi.fn(async (entries: [string, string][]) => {
      entries.forEach(([key, value]) => storage.set(key, value));
    }),
    multiRemove: vi.fn(async (keys: string[]) => {
      keys.forEach((key) => storage.delete(key));
    }),
  },
}));

import {
  MAX_RECENT_HISTORY,
  loadHistoryBundle,
  replaceHistoryWithLifetime,
  saveDeviceSessionWithLifetime,
  saveSessionWithLifetime,
} from "@/lib/brush-storage";

const baseTime = new Date(2026, 0, 1, 8).getTime();

function completeSession(index: number): BrushSession {
  return {
    id: `session-${index}`,
    startedAt: baseTime + index * 86_400_000,
    durationSeconds: 120,
    targetSeconds: 120,
    completed: true,
    source: "manual",
  };
}

function storedDeviceSession(sessionId: number): StoredDeviceSession {
  return {
    sessionId,
    durationSeconds: 120,
    targetSeconds: 120,
    mode: "clean",
    intensity: "media",
  };
}

describe("lifetime progress", () => {
  beforeEach(() => storage.clear());

  it("mantiene la timeline a 120 ma fa avanzare sempre gli aggregati lifetime", async () => {
    const firstBatch = Array.from({ length: MAX_RECENT_HISTORY }, (_, index) => completeSession(index));
    await replaceHistoryWithLifetime(firstBatch);

    const result = await saveSessionWithLifetime(completeSession(MAX_RECENT_HISTORY));
    const stats = computeLifetimeBrushlingStats(result.lifetimeProgress, completeSession(MAX_RECENT_HISTORY).startedAt);
    const inventory = computeLifetimeInventory(result.lifetimeProgress);

    expect(result.recentHistory).toHaveLength(MAX_RECENT_HISTORY);
    expect(result.lifetimeProgress.completedSessions).toBe(121);
    expect(stats.xp).toBe(7_260);
    expect(Object.values(inventory.itemCounts).reduce((sum, count) => sum + count, 0)).toBe(121);

    const reward: ParentReward = {
      id: "lifetime-reward",
      title: "121 avventure",
      requirement: "completed-sessions",
      target: 121,
      createdAt: baseTime,
      deliveredAt: null,
    };
    expect(parentRewardProgressFromMetrics(reward, {
      completedSessions: result.lifetimeProgress.completedSessions,
      perfectDays: result.lifetimeProgress.perfectDays,
      longestStreakDays: result.lifetimeProgress.longestStreakDays,
    }).unlocked).toBe(true);
  });

  it("non accredita due volte la stessa sessione", async () => {
    const first = await saveSessionWithLifetime(completeSession(1));
    const duplicate = await saveSessionWithLifetime({ ...completeSession(1), durationSeconds: 130 });

    expect(first.event).not.toBeNull();
    expect(duplicate.event).toBeNull();
    expect(duplicate.lifetimeProgress.completedSessions).toBe(1);
    expect(duplicate.lifetimeProgress.xp).toBe(60);
  });

  it("serializza salvataggi concorrenti senza perdere progressi", async () => {
    await Promise.all([
      saveSessionWithLifetime(completeSession(10)),
      saveSessionWithLifetime(completeSession(11)),
      saveSessionWithLifetime(completeSession(12)),
    ]);

    const result = await loadHistoryBundle();
    expect(result.lifetimeProgress.completedSessions).toBe(3);
    expect(result.recentHistory.map((item) => item.id).sort()).toEqual([
      "session-10",
      "session-11",
      "session-12",
    ]);
  });

  it("serializza migrazione v1 e nuova sessione concorrente", async () => {
    const legacyHistory = [completeSession(1), completeSession(2), completeSession(3)];
    storage.set("sparkly-brush.history.v1", JSON.stringify(legacyHistory));

    await Promise.all([
      loadHistoryBundle(),
      saveSessionWithLifetime(completeSession(4)),
    ]);
    const result = await loadHistoryBundle();

    expect(result.lifetimeProgress.completedSessions).toBe(4);
    expect(storage.has("sparkly-brush.progress.v2")).toBe(true);
    expect(storage.has("sparkly-brush.history.v1")).toBe(false);
  });

  it("migra il blob lifetime v1 completo senza fermarsi alle 120 sessioni recenti", async () => {
    const lifetimeHistory = Array.from({ length: 365 }, (_, index) => completeSession(index));
    storage.set("sparkly-brush.history.v1", JSON.stringify(lifetimeHistory.slice(0, 120)));
    storage.set("sparkly-brush.lifetime-history.v1", JSON.stringify(lifetimeHistory));

    const result = await loadHistoryBundle();

    expect(result.recentHistory).toHaveLength(120);
    expect(result.lifetimeProgress.attemptedSessions).toBe(365);
    expect(result.lifetimeProgress.completedSessions).toBe(365);
    expect(storage.has("sparkly-brush.lifetime-history.v1")).toBe(false);
  });

  it("isola i dispositivi, deduplica il latest e supera il rollover uint16", async () => {
    const beforeRollover = await saveDeviceSessionWithLifetime("brush-a", storedDeviceSession(65_535), baseTime);
    const afterRollover = await saveDeviceSessionWithLifetime("brush-a", storedDeviceSession(0), baseTime + 1_000);
    const duplicate = await saveDeviceSessionWithLifetime("brush-a", storedDeviceSession(0), baseTime + 2_000);
    const secondDevice = await saveDeviceSessionWithLifetime("brush-b", storedDeviceSession(0), baseTime + 3_000);

    expect(beforeRollover.event?.session.id).toContain("brush-a-0-65535");
    expect(afterRollover.event?.session.id).toContain("brush-a-1-0");
    expect(duplicate.event).toBeNull();
    expect(secondDevice.event?.session.id).toContain("brush-b-0-0");
    expect(secondDevice.lifetimeProgress.completedSessions).toBe(3);
  });

  it("ignora regressioni BLE stale senza scambiarle per rollover", async () => {
    await saveDeviceSessionWithLifetime("brush-a", storedDeviceSession(100), baseTime);
    const newest = await saveDeviceSessionWithLifetime("brush-a", storedDeviceSession(101), baseTime + 1_000);
    const stale = await saveDeviceSessionWithLifetime("brush-a", storedDeviceSession(100), baseTime + 2_000);

    expect(newest.lifetimeProgress.completedSessions).toBe(2);
    expect(stale.event).toBeNull();
    expect(stale.lifetimeProgress.completedSessions).toBe(2);
  });

  it("ignora un pacchetto del ciclo precedente dopo il rollover", async () => {
    await saveDeviceSessionWithLifetime("brush-a", storedDeviceSession(65_535), baseTime);
    const rolled = await saveDeviceSessionWithLifetime("brush-a", storedDeviceSession(0), baseTime + 1_000);
    const stalePreviousEpoch = await saveDeviceSessionWithLifetime("brush-a", storedDeviceSession(65_535), baseTime + 2_000);

    expect(rolled.lifetimeProgress.completedSessions).toBe(2);
    expect(stalePreviousEpoch.event).toBeNull();
    expect(stalePreviousEpoch.lifetimeProgress.completedSessions).toBe(2);
  });

  it("resta di dimensione costante anche dopo centomila sessioni", () => {
    let progress = createEmptyLifetimeProgress();
    for (let index = 0; index < 100_000; index += 1) {
      progress = applySessionToLifetime(progress, {
        ...completeSession(index),
        startedAt: baseTime + index * 120_000,
      });
    }

    expect(progress.completedSessions).toBe(100_000);
    expect(progress.xp).toBe(6_000_000);
    expect(Object.values(progress.itemCounts).reduce((sum, count) => sum + count, 0)).toBe(100_000);
    expect(JSON.stringify(progress).length).toBeLessThan(2_048);
  });

  it("mantiene al massimo 32 cursori BLE", () => {
    let progress = createEmptyLifetimeProgress();
    for (let index = 0; index < 100; index += 1) {
      progress = allocateDeviceSessionIdentity(progress, `brush-${index}`, 1).progress;
    }
    expect(Object.keys(progress.deviceCursors)).toHaveLength(32);
  });

  it("mantiene identiche le formule di gioco rispetto allo storico completo", () => {
    const now = new Date();
    now.setHours(21, 0, 0, 0);
    const history: BrushSession[] = [];
    for (let offset = 13; offset >= 0; offset -= 1) {
      const morning = new Date(now);
      morning.setDate(now.getDate() - offset);
      morning.setHours(8, 0, 0, 0);
      const evening = new Date(morning);
      evening.setHours(20, 0, 0, 0);
      history.push({ ...completeSession(offset * 2), startedAt: morning.getTime() });
      history.push({ ...completeSession(offset * 2 + 1), startedAt: evening.getTime() });
    }
    history.push({
      id: "partial",
      startedAt: now.getTime() - 1_000,
      durationSeconds: 60,
      targetSeconds: 120,
      completed: false,
      source: "manual",
    });

    const progress = createLifetimeProgress(history);
    expect(computeLifetimeBrushlingStats(progress, now.getTime())).toEqual(computeBrushlingStats(history));
    expect(computeLifetimeInventory(progress)).toEqual(computeGameInventory(history));
    expect(computeLifetimeMissionCenter(progress, now.getTime())).toEqual(computeMissionCenter(history, now.getTime()));

    const requirements: ParentReward["requirement"][] = ["completed-sessions", "perfect-days", "streak"];
    requirements.forEach((requirement) => {
      const reward: ParentReward = {
        id: requirement,
        title: requirement,
        requirement,
        target: 10,
        createdAt: now.getTime(),
        deliveredAt: null,
      };
      expect(parentRewardProgressFromMetrics(reward, {
        completedSessions: progress.completedSessions,
        perfectDays: progress.perfectDays,
        longestStreakDays: progress.longestStreakDays,
      })).toEqual(parentRewardProgress(reward, history));
    });
  });
});
