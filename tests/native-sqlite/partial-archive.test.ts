/**
 * Partial archives (restored legacy codes, legacy migrations over 120 sessions) keep the restored
 * day, mission and streak counters. Newer sessions must keep extending them, whether they come
 * from the guided timer or from the handle. Regression test for audit finding G3 (2026-09-30):
 * handle records always went through the partial branch and never earned missions or streaks.
 */
import { describe, expect, it } from "vitest";

import type { BrushSession, StoredDeviceSession } from "@/lib/brush-types";
import { createLifetimeProgress } from "@/lib/lifetime-progress";

import { loadStorage, withRawDatabase } from "./harness";

const DEVICE = "24:E5:AA:00:00:02";

function manual(id: string, startedAt: number): BrushSession {
  return {
    id,
    startedAt,
    timeConfidence: "exact",
    rewardPolicy: "completed-only",
    durationSeconds: 120,
    targetSeconds: 120,
    completed: true,
    source: "manual",
  };
}

function record(sessionId: number, startedAt: number): StoredDeviceSession {
  return {
    sessionId,
    startedAt,
    timeConfidence: "reconstructed",
    durationSeconds: 120,
    targetSeconds: 120,
    mode: "clean",
    intensity: "media",
  };
}

/** Restores a legacy code whose lifetime counts 200 more sessions than it archived. */
async function partialArchive() {
  const app = await loadStorage();
  await app.storage.initializeHistoryStorage();
  const restored = [manual("restored-1", new Date(2026, 9, 5, 8, 0).getTime())];
  const legacyProgress = createLifetimeProgress(restored);
  const partial = await app.storage.replaceHistoryWithLifetime(restored, {
    ...legacyProgress,
    attemptedSessions: legacyProgress.attemptedSessions + 200,
    completedSessions: legacyProgress.completedSessions + 200,
    totalBrushingSeconds: legacyProgress.totalBrushingSeconds + 200 * 120,
    rewardedBrushingSeconds: legacyProgress.rewardedBrushingSeconds + 200 * 120,
  });
  expect(withRawDatabase("sparkly-brush.sqlite", (db) => db
    .prepare("SELECT value FROM metadata WHERE key = 'history-complete'")
    .get())).toEqual({ value: "false" });
  return { app, before: partial.lifetimeProgress };
}

describe("archivio parziale su SQLite reale", () => {
  it("le sessioni del manico più recenti dell'archivio danno missioni, bonus e serie", async () => {
    const { app, before } = await partialArchive();

    const result = await app.storage.saveDeviceSessionsWithLifetime(DEVICE, [
      record(41, new Date(2026, 9, 6, 7, 45).getTime()),
      record(42, new Date(2026, 9, 6, 20, 15).getTime()),
    ]);

    const after = result.lifetimeProgress;
    expect(result.importedCount).toBe(2);
    expect(after.completedSessions).toBe(before.completedSessions + 2);
    expect(after.dailyBonusCoins).toBe(before.dailyBonusCoins + 30);
    expect(after.perfectDays).toBe(before.perfectDays + 1);
    expect(after.currentStreakDays).toBe(2);
    expect(after.activeDateKey).toBe("2026-10-06");
  });

  it("la riconciliazione del fallback live non toglie le missioni già guadagnate", async () => {
    const { app, before } = await partialArchive();
    const morning = new Date(2026, 9, 6, 7, 45).getTime();
    const evening = new Date(2026, 9, 6, 20, 15).getTime();
    await app.storage.saveDeviceSessionsWithLifetime(DEVICE, [record(41, morning)]);
    // Evening brushing with the app: the Kids handle files its record late.
    const live = await app.storage.saveDeviceFallbackWithLifetime(DEVICE, {
      id: `ble-live:${DEVICE}:${evening}`,
      startedAt: evening,
      rewardPolicy: "completed-only",
      durationSeconds: 120,
      targetSeconds: 120,
      completed: true,
      source: "device",
    });
    expect(live.lifetimeProgress.dailyBonusCoins).toBe(before.dailyBonusCoins + 30);

    const reconciled = await app.storage.saveDeviceSessionsWithLifetime(DEVICE, [record(42, evening)]);

    expect(reconciled.lifetimeProgress).toMatchObject({
      attemptedSessions: before.attemptedSessions + 2,
      dailyBonusCoins: before.dailyBonusCoins + 30,
      perfectDays: before.perfectDays + 1,
      currentStreakDays: 2,
    });
    expect(Object.keys(reconciled.lifetimeProgress.pendingDeviceFallbacks)).toEqual([]);
  });
});
