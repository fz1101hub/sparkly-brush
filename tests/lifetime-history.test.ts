import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BrushSession, StoredDeviceSession } from "@/lib/brush-types";
import { computeBrushlingStats } from "@/lib/brushlings";
import { computeGameInventory } from "@/lib/game-inventory";
import { computeMissionCenter } from "@/lib/missions";
import {
  allocateDeviceSessionIdentity,
  applySessionToLifetime,
  applySessionToStoredLifetime,
  computeLifetimeBrushlingStats,
  computeLifetimeInventory,
  computeLifetimeMissionCenter,
  createLifetimeProgress,
  createEmptyLifetimeProgress,
  deviceKey,
  markPendingDeviceFallback,
  normalizeLifetimeProgress,
  rewindPendingDeviceFallbackProgress,
  shouldReplayStoredHistory,
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
  forgetDeviceWithLifetime,
  loadHistoryBundle,
  loadLastDevice,
  replaceHistoryWithLifetime,
  saveDeviceFallbackWithLifetime,
  saveDeviceSessionWithLifetime,
  saveDeviceSessionsWithLifetime,
  saveLastDevice,
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

  it("riconcilia il fallback live con la successiva sessione GATT senza doppio accredito", async () => {
    const startedAt = baseTime;
    const fallback: BrushSession = {
      id: `ble-live:brush-a:${startedAt}`,
      startedAt,
      durationSeconds: 120,
      targetSeconds: 120,
      completed: true,
      source: "device",
    };

    const savedFallback = await saveDeviceFallbackWithLifetime("brush-a", fallback);
    const reconciled = await saveDeviceSessionWithLifetime(
      "brush-a",
      storedDeviceSession(42),
      startedAt,
    );

    expect(savedFallback.lifetimeProgress.completedSessions).toBe(1);
    expect(reconciled.event).toBeNull();
    expect(reconciled.lifetimeProgress.completedSessions).toBe(1);
    expect(reconciled.lifetimeProgress.xp).toBe(60);
    expect(reconciled.recentHistory).toHaveLength(1);
    expect(reconciled.recentHistory[0]).toMatchObject({
      id: expect.stringMatching(/^device-session-[0-9a-f]{24}-0-42$/),
      deviceSessionId: 42,
    });
    expect(reconciled.lifetimeProgress.pendingDeviceFallbacks).toEqual({});
  });

  it("riconcilia il fallback anche se il contatore GATT salta una sessione", async () => {
    await saveDeviceSessionWithLifetime("brush-a", storedDeviceSession(40), baseTime - 300_000);
    const startedAt = baseTime;
    await saveDeviceFallbackWithLifetime("brush-a", {
      id: `ble-live:brush-a:${startedAt}`,
      startedAt,
      durationSeconds: 120,
      targetSeconds: 120,
      completed: true,
      source: "device",
    });

    const reconciled = await saveDeviceSessionWithLifetime(
      "brush-a",
      storedDeviceSession(42),
      startedAt,
    );

    expect(reconciled.event).toBeNull();
    expect(reconciled.lifetimeProgress.completedSessions).toBe(2);
    expect(reconciled.recentHistory).toHaveLength(2);
    expect(reconciled.recentHistory.some((session) => (
      /^device-session-[0-9a-f]{24}-0-42$/.test(session.id)
    ))).toBe(true);
    expect(reconciled.lifetimeProgress.pendingDeviceFallbacks).toEqual({});
  });

  it("non fonde due spazzolate uguali separate da dieci minuti", async () => {
    await saveDeviceFallbackWithLifetime("brush-a", {
      id: `ble-live:brush-a:${baseTime}`,
      startedAt: baseTime,
      durationSeconds: 120,
      targetSeconds: 120,
      completed: true,
      source: "device",
    });
    const distinct = await saveDeviceSessionWithLifetime(
      "brush-a",
      storedDeviceSession(42),
      baseTime + 10 * 60_000,
    );

    expect(distinct.lifetimeProgress.completedSessions).toBe(2);
    expect(distinct.recentHistory).toHaveLength(2);
  });

  it("non fonde il successore atteso se arriva dieci minuti dopo", async () => {
    await saveDeviceSessionWithLifetime("brush-a", storedDeviceSession(40), baseTime - 300_000);
    await saveDeviceFallbackWithLifetime("brush-a", {
      id: `ble-live:brush-a:${baseTime}`,
      startedAt: baseTime,
      durationSeconds: 120,
      targetSeconds: 120,
      completed: true,
      source: "device",
    });
    const distinct = await saveDeviceSessionWithLifetime(
      "brush-a",
      storedDeviceSession(41),
      baseTime + 10 * 60_000,
    );

    expect(distinct.lifetimeProgress.completedSessions).toBe(3);
    expect(distinct.recentHistory).toHaveLength(3);
  });

  it("riconcilia il successore approssimato anche dopo una sync tardiva", async () => {
    await saveDeviceSessionWithLifetime("brush-a", storedDeviceSession(40), baseTime - 300_000);
    await saveDeviceFallbackWithLifetime("brush-a", {
      id: `ble-live:brush-a:${baseTime}`,
      startedAt: baseTime,
      rewardPolicy: "completed-only",
      durationSeconds: 120,
      targetSeconds: 120,
      completed: true,
      source: "device",
    });

    const reconciled = await saveDeviceSessionsWithLifetime("brush-a", [{
      ...storedDeviceSession(41),
      startedAt: baseTime + 10 * 60_000,
      timeConfidence: "approximate",
    }]);

    expect(reconciled.lifetimeProgress.completedSessions).toBe(2);
    expect(reconciled.lifetimeProgress.xp).toBe(120);
    expect(reconciled.recentHistory).toHaveLength(2);
    expect(reconciled.recentHistory.some((session) => session.id.startsWith("ble-live:"))).toBe(false);
    expect(reconciled.recentHistory[0].startedAt).toBe(baseTime);
  });

  it("riconcilia una prima sessione approssimata tardiva anche senza cursore BLE", async () => {
    await saveDeviceFallbackWithLifetime("brush-first-use", {
      id: `ble-live:brush-first-use:${baseTime}`,
      startedAt: baseTime,
      rewardPolicy: "completed-only",
      durationSeconds: 120,
      targetSeconds: 120,
      completed: true,
      source: "device",
    });

    const reconciled = await saveDeviceSessionsWithLifetime("brush-first-use", [{
      ...storedDeviceSession(1),
      startedAt: baseTime + 10 * 60_000,
      timeConfidence: "approximate",
    }]);

    expect(reconciled.lifetimeProgress.completedSessions).toBe(1);
    expect(reconciled.lifetimeProgress.xp).toBe(60);
    expect(reconciled.recentHistory).toHaveLength(1);
    expect(reconciled.recentHistory[0].startedAt).toBe(baseTime);
  });

  it("su first-use correla il fallback soltanto alla coda più recente del batch", async () => {
    await saveDeviceFallbackWithLifetime("brush-first-batch", {
      id: `ble-live:brush-first-batch:${baseTime}`,
      startedAt: baseTime,
      rewardPolicy: "completed-only",
      durationSeconds: 120,
      targetSeconds: 120,
      completed: true,
      source: "device",
    });

    const reconciled = await saveDeviceSessionsWithLifetime("brush-first-batch", [
      { ...storedDeviceSession(0), startedAt: baseTime + 500_000, timeConfidence: "approximate" },
      { ...storedDeviceSession(1), startedAt: baseTime + 600_000, timeConfidence: "approximate" },
    ]);

    expect(reconciled.lifetimeProgress.completedSessions).toBe(2);
    expect(reconciled.recentHistory).toHaveLength(2);
    expect(reconciled.recentHistory.filter((session) => session.startedAt === baseTime)).toHaveLength(1);
    expect(reconciled.recentHistory.some((session) => session.id.startsWith("ble-live:"))).toBe(false);
  });

  it("sostituisce il fallback senza perdere una sessione manuale interveniente", async () => {
    await saveDeviceSessionWithLifetime("brush-a", storedDeviceSession(40), baseTime - 300_000);
    await saveDeviceFallbackWithLifetime("brush-a", {
      id: `ble-live:brush-a:${baseTime}`,
      startedAt: baseTime,
      rewardPolicy: "completed-only",
      durationSeconds: 120,
      targetSeconds: 120,
      completed: true,
      source: "device",
    });
    await saveSessionWithLifetime({ ...completeSession(99), startedAt: baseTime + 15_000 });

    const reconciled = await saveDeviceSessionsWithLifetime("brush-a", [{
      ...storedDeviceSession(41),
      startedAt: baseTime + 10 * 60_000,
      timeConfidence: "approximate",
    }]);

    expect(reconciled.lifetimeProgress.completedSessions).toBe(3);
    expect(reconciled.lifetimeProgress.xp).toBe(180);
    expect(reconciled.recentHistory).toHaveLength(3);
    expect(reconciled.recentHistory.some((session) => session.id === "session-99")).toBe(true);
    expect(reconciled.recentHistory.some((session) => session.id.startsWith("ble-live:"))).toBe(false);
  });

  it("correla due fallback consecutivi ai rispettivi record GATT", async () => {
    await saveDeviceSessionWithLifetime("brush-a", storedDeviceSession(40), baseTime - 300_000);
    for (const [offset, duration] of [[0, 120], [180_000, 114]] as const) {
      await saveDeviceFallbackWithLifetime("brush-a", {
        id: `ble-live:brush-a:${baseTime + offset}`,
        startedAt: baseTime + offset,
        rewardPolicy: "completed-only",
        durationSeconds: duration,
        targetSeconds: 120,
        completed: true,
        source: "device",
      });
    }

    const reconciled = await saveDeviceSessionsWithLifetime("brush-a", [
      { ...storedDeviceSession(41), startedAt: baseTime + 600_000, timeConfidence: "approximate" },
      { ...storedDeviceSession(42), durationSeconds: 114, startedAt: baseTime + 780_000, timeConfidence: "approximate" },
    ]);

    expect(reconciled.importedCount).toBe(2);
    expect(reconciled.lifetimeProgress.completedSessions).toBe(3);
    expect(reconciled.recentHistory).toHaveLength(3);
    expect(reconciled.recentHistory.some((session) => session.id.startsWith("ble-live:"))).toBe(false);
    expect(reconciled.lifetimeProgress.pendingDeviceFallbacks).toEqual({});
  });

  it("non perde progressi se oltre 120 sessioni seguono un fallback", async () => {
    await saveDeviceFallbackWithLifetime("brush-a", {
      id: `ble-live:brush-a:${baseTime}`,
      startedAt: baseTime,
      durationSeconds: 120,
      targetSeconds: 120,
      completed: true,
      source: "device",
    });
    for (let index = 1; index <= 121; index += 1) {
      await saveSessionWithLifetime({
        ...completeSession(index),
        startedAt: baseTime + index * 1_000,
      });
    }
    const canonical = await saveDeviceSessionWithLifetime("brush-a", storedDeviceSession(42), baseTime);

    expect(canonical.lifetimeProgress.completedSessions).toBe(123);
    expect(canonical.recentHistory).toHaveLength(MAX_RECENT_HISTORY);
  });

  it("non riapplica sessioni future già presenti nello snapshot pre-fallback", async () => {
    await saveSessionWithLifetime({ ...completeSession(99), startedAt: baseTime + 86_400_000 });
    await saveDeviceFallbackWithLifetime("brush-a", {
      id: `ble-live:brush-a:${baseTime}`,
      startedAt: baseTime,
      durationSeconds: 107,
      targetSeconds: 120,
      completed: false,
      source: "device",
    });
    const corrected = await saveDeviceSessionWithLifetime(
      "brush-a",
      { ...storedDeviceSession(42), durationSeconds: 109 },
      baseTime,
    );

    expect(corrected.lifetimeProgress.attemptedSessions).toBe(2);
    expect(corrected.lifetimeProgress.completedSessions).toBe(2);
  });

  it("sostituisce un fallback incompleto con i dati GATT completi", async () => {
    await saveDeviceFallbackWithLifetime("brush-a", {
      id: `ble-live:brush-a:${baseTime}`,
      startedAt: baseTime,
      durationSeconds: 107,
      targetSeconds: 120,
      completed: false,
      source: "device",
    });
    const corrected = await saveDeviceSessionWithLifetime(
      "brush-a",
      { ...storedDeviceSession(42), durationSeconds: 109 },
      baseTime,
    );

    expect(corrected.recentHistory).toHaveLength(1);
    expect(corrected.recentHistory[0]).toMatchObject({ durationSeconds: 109, completed: true });
    expect(corrected.lifetimeProgress.completedSessions).toBe(1);
    expect(corrected.lifetimeProgress.xp).toBe(60);
  });

  it("rimuove un accredito fallback quando il record GATT è incompleto", async () => {
    await saveDeviceFallbackWithLifetime("brush-a", {
      id: `ble-live:brush-a:${baseTime}`,
      startedAt: baseTime,
      durationSeconds: 109,
      targetSeconds: 120,
      completed: true,
      source: "device",
    });
    const corrected = await saveDeviceSessionWithLifetime(
      "brush-a",
      { ...storedDeviceSession(42), durationSeconds: 107 },
      baseTime,
    );

    expect(corrected.recentHistory[0]).toMatchObject({ durationSeconds: 107, completed: false });
    expect(corrected.lifetimeProgress.completedSessions).toBe(0);
    expect(corrected.lifetimeProgress.xp).toBe(0);
  });

  it("preserva la baseline lifetime non materializzata quando riconcilia un archivio parziale", () => {
    const baseline = createLifetimeProgress(
      Array.from({ length: 365 }, (_, index) => completeSession(index)),
    );
    const fallback = {
      ...completeSession(366),
      id: `ble-live:brush-a:${baseTime}`,
      startedAt: baseTime + 366_000,
      source: "device" as const,
    };
    const withFallback = markPendingDeviceFallback(
      applySessionToLifetime(baseline, fallback),
      "brush-a",
      fallback,
      baseline,
    );
    const rewound = rewindPendingDeviceFallbackProgress(withFallback, "brush-a");
    expect(rewound).not.toBeNull();

    const authoritative = applySessionToStoredLifetime(rewound!, {
      ...fallback,
      id: "device-session-authoritative",
      timeConfidence: "reconstructed",
    }, false);

    expect(authoritative.attemptedSessions).toBe(baseline.attemptedSessions + 1);
    expect(authoritative.completedSessions).toBe(baseline.completedSessions + 1);
    expect(authoritative.xp).toBe(baseline.xp + 60);
    expect(authoritative.dailyBonusCoins).toBe(baseline.dailyBonusCoins);
    expect(authoritative.perfectDays).toBe(baseline.perfectDays);
    expect(authoritative.currentStreakDays).toBe(baseline.currentStreakDays);
    expect(authoritative.longestStreakDays).toBe(baseline.longestStreakDays);
    expect(shouldReplayStoredHistory(true, 1, false)).toBe(false);
    expect(shouldReplayStoredHistory(true, 1, true)).toBe(true);
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

    expect(beforeRollover.event?.session.id).toMatch(/^device-session-[0-9a-f]{24}-0-65535$/);
    expect(afterRollover.event?.session.id).toMatch(/^device-session-[0-9a-f]{24}-1-0$/);
    expect(duplicate.event).toBeNull();
    expect(secondDevice.event?.session.id).toMatch(/^device-session-[0-9a-f]{24}-0-0$/);
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

  it("accetta il contatore ripartito dopo il reset del solo manico senza perdere progressi", async () => {
    await saveDeviceSessionWithLifetime("brush-a", storedDeviceSession(100), baseTime);
    await saveDeviceSessionWithLifetime("brush-a", storedDeviceSession(101), baseTime + 1_000);
    await saveDeviceSessionWithLifetime("brush-b", storedDeviceSession(7), baseTime + 2_000);
    const beforeReset = await loadHistoryBundle();

    const reset = await forgetDeviceWithLifetime("brush-a");
    expect(reset.recentHistory).toEqual(beforeReset.recentHistory);
    expect(reset.lifetimeProgress.completedSessions).toBe(3);
    expect(reset.lifetimeProgress.xp).toBe(beforeReset.lifetimeProgress.xp);

    const firstAfterReset = await saveDeviceSessionWithLifetime(
      "brush-a",
      storedDeviceSession(1),
      baseTime + 3_000,
    );
    const duplicate = await saveDeviceSessionWithLifetime(
      "brush-a",
      storedDeviceSession(1),
      baseTime + 4_000,
    );

    expect(firstAfterReset.event?.session.id).toMatch(/^device-session-[0-9a-f]{24}-1-1$/);
    expect(firstAfterReset.lifetimeProgress.completedSessions).toBe(4);
    expect(duplicate.event).toBeNull();
    expect(duplicate.lifetimeProgress.completedSessions).toBe(4);
    expect(firstAfterReset.lifetimeProgress.deviceCursors[deviceKey("brush-b")].lastSessionId).toBe(7);
  });

  it("non apre un epoch reset senza un cursore BLE precedente", async () => {
    await expect(forgetDeviceWithLifetime("brush-new")).rejects.toThrow(
      "Nessun contatore BLE precedente",
    );
    const unchanged = await loadHistoryBundle();
    expect(unchanged.lifetimeProgress.deviceCursors).toEqual({});
  });

  it("rifiuta il replay dello stesso manico se il contatore non è stato azzerato", async () => {
    await saveDeviceSessionWithLifetime("brush-a", storedDeviceSession(100), baseTime);
    const beforeReset = await saveDeviceSessionWithLifetime(
      "brush-a",
      storedDeviceSession(101),
      baseTime + 1_000,
    );
    await forgetDeviceWithLifetime("brush-a");

    await expect(saveDeviceSessionsWithLifetime("brush-a", [
      { ...storedDeviceSession(100), startedAt: baseTime, timeConfidence: "reconstructed" },
      { ...storedDeviceSession(101), startedAt: baseTime + 1_000, timeConfidence: "reconstructed" },
    ])).rejects.toThrow("reset di fabbrica");

    const afterRejectedReplay = await loadHistoryBundle();
    expect(afterRejectedReplay.lifetimeProgress.completedSessions).toBe(
      beforeReset.lifetimeProgress.completedSessions,
    );
    expect(afterRejectedReplay.recentHistory).toHaveLength(2);
  });

  it("salva un batch BLE contiguo con un solo avanzamento atomico del cursore", async () => {
    await saveDeviceSessionWithLifetime("brush-a", storedDeviceSession(40), baseTime);

    const result = await saveDeviceSessionsWithLifetime("brush-a", [
      { ...storedDeviceSession(41), startedAt: baseTime + 1_000, timeConfidence: "reconstructed" },
      { ...storedDeviceSession(42), startedAt: baseTime + 2_000, timeConfidence: "reconstructed" },
    ]);

    expect(result.importedCount).toBe(2);
    expect(result.lifetimeProgress.completedSessions).toBe(3);
    expect(result.lifetimeProgress.deviceCursors[deviceKey("brush-a")].lastSessionId).toBe(42);
    expect(result.recentHistory.slice(0, 2).map((item) => item.deviceSessionId)).toEqual([42, 41]);
  });

  it("non usa una data approssimata per streak o missioni calendariali", () => {
    const approximate = {
      ...completeSession(1),
      timeConfidence: "approximate" as const,
    };
    const progress = applySessionToLifetime(createEmptyLifetimeProgress(), approximate);

    expect(progress.completedSessions).toBe(1);
    expect(progress.xp).toBe(60);
    expect(progress.activeDateKey).toBeNull();
    expect(progress.currentStreakDays).toBe(0);
    expect(progress.dailyBonusCoins).toBe(0);
  });

  it("preserva un nuovo ultimo manico mentre dimentica quello precedente", async () => {
    await saveDeviceSessionWithLifetime("brush-a", storedDeviceSession(42), baseTime);
    await saveLastDevice({ id: "brush-b", name: "Sonicare4Kids", model: "HX6322/04" });

    await forgetDeviceWithLifetime("brush-a");

    expect(await loadLastDevice()).toMatchObject({ id: "brush-b" });
  });

  it("ignora un pacchetto del ciclo precedente dopo il rollover", async () => {
    await saveDeviceSessionWithLifetime("brush-a", storedDeviceSession(65_535), baseTime);
    const rolled = await saveDeviceSessionWithLifetime("brush-a", storedDeviceSession(0), baseTime + 1_000);
    const stalePreviousEpoch = await saveDeviceSessionWithLifetime("brush-a", storedDeviceSession(65_535), baseTime + 2_000);

    expect(rolled.lifetimeProgress.completedSessions).toBe(2);
    expect(stalePreviousEpoch.event).toBeNull();
    expect(stalePreviousEpoch.lifetimeProgress.completedSessions).toBe(2);
  });

  it("ricorda l’epoch precedente anche dopo oltre 32 sessioni dal rollover", async () => {
    await saveDeviceSessionWithLifetime("brush-a", storedDeviceSession(65_535), baseTime);
    await saveDeviceSessionWithLifetime("brush-a", storedDeviceSession(0), baseTime + 1_000);
    for (let sessionId = 1; sessionId <= 31; sessionId += 1) {
      await saveDeviceSessionWithLifetime(
        "brush-a",
        storedDeviceSession(sessionId),
        baseTime + (sessionId + 1) * 1_000,
      );
    }
    const stale = await saveDeviceSessionWithLifetime(
      "brush-a",
      storedDeviceSession(65_535),
      baseTime + 60_000,
    );

    expect(stale.event).toBeNull();
    expect(stale.lifetimeProgress.completedSessions).toBe(33);
  });

  it("accetta un salto alto autorevole nel nuovo epoch se non era stato osservato prima", async () => {
    await saveDeviceSessionWithLifetime("brush-a", storedDeviceSession(65_535), baseTime);
    await saveDeviceSessionWithLifetime("brush-a", storedDeviceSession(0), baseTime + 1_000);
    for (let sessionId = 1; sessionId <= 31; sessionId += 1) {
      await saveDeviceSessionWithLifetime(
        "brush-a",
        storedDeviceSession(sessionId),
        baseTime + (sessionId + 1) * 1_000,
      );
    }
    const jumped = await saveDeviceSessionWithLifetime(
      "brush-a",
      storedDeviceSession(65_000),
      baseTime + 60_000,
    );

    expect(jumped.event).not.toBeNull();
    expect(jumped.lifetimeProgress.completedSessions).toBe(34);
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

  it("limita a 32 anche cursori e fallback importati da payload sovradimensionati", () => {
    const raw = createEmptyLifetimeProgress();
    raw.deviceCursors = Object.fromEntries(Array.from({ length: 100 }, (_, index) => [
      `device-${index}`,
      {
        lastSessionId: index,
        epoch: 0,
        acceptNextSession: false,
        resetBaselineSessionId: null,
        previousEpochRecentSessionIds: [],
        recentIdentities: [`0:${index}`],
        updatedAt: 1,
      },
    ]));
    raw.pendingDeviceFallbacks = Object.fromEntries(Array.from({ length: 100 }, (_, index) => [
      `device-${index}`,
      {
        deviceKey: deviceKey(`device-${index}`),
        sessionId: `fallback-${index}`,
        startedAt: 1,
        timeConfidence: "exact" as const,
        rewardPolicy: "completed-only" as const,
        durationSeconds: 120,
        targetSeconds: 120,
        completed: true,
        expectedSessionId: index,
        hasInterveningProgress: false,
        progressBeforeSession: null,
      },
    ]));

    const normalized = normalizeLifetimeProgress(raw);
    const reversed = normalizeLifetimeProgress({
      ...raw,
      deviceCursors: Object.fromEntries(Object.entries(raw.deviceCursors).reverse()),
      pendingDeviceFallbacks: Object.fromEntries(Object.entries(raw.pendingDeviceFallbacks).reverse()),
    });
    expect(Object.keys(normalized?.deviceCursors ?? {})).toHaveLength(32);
    expect(Object.keys(normalized?.pendingDeviceFallbacks ?? {})).toHaveLength(32);
    expect(Object.keys(reversed?.deviceCursors ?? {}).sort()).toEqual(
      Object.keys(normalized?.deviceCursors ?? {}).sort(),
    );
    expect(Object.keys(reversed?.pendingDeviceFallbacks ?? {}).sort()).toEqual(
      Object.keys(normalized?.pendingDeviceFallbacks ?? {}).sort(),
    );
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
