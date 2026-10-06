/**
 * A complete-backup restore killed mid-transaction must roll back to the previous history at the
 * next launch, on both platforms. Regression test for audit finding S1 (2026-09-30): on Android
 * `SQLite.defaultDatabaseDirectory` is a plain path and expo-file-system rejected it as
 * "URI is not absolute", so the rollback copy was never found and every later launch failed.
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";

import { createBackupManifest } from "@/lib/backup";
import type { BrushSession } from "@/lib/brush-types";
import type { HarnessPlatform } from "./core/state";

import {
  asyncStorage,
  faults,
  isSimulatedProcessDeath,
  loadStorage,
  paths,
  setPlatform,
  simulateRestart,
  type AppModules,
} from "./harness";

const RESTORE_JOURNAL_KEY = "sparkly-brush.restore-in-progress.v1";

function session(id: string, day: number): BrushSession {
  return {
    id,
    startedAt: new Date(2026, 5, day, 8, 0).getTime(),
    timeConfidence: "exact",
    rewardPolicy: "legacy",
    durationSeconds: 120,
    targetSeconds: 120,
    completed: true,
    source: "manual",
  };
}

/**
 * Device has history A (2 sessions). The user restores backup B (3 sessions) and the app is killed
 * inside the restore transaction, i.e. after the rollback copy was taken and the restore journal
 * flag was persisted. At next launch openDatabase() must roll back to A.
 */
async function interruptRestore(platform: HarnessPlatform): Promise<AppModules> {
  setPlatform(platform);
  const app = await loadStorage();
  await app.storage.initializeHistoryStorage();

  // Build backup B on this device first, then replace the history with A.
  for (const [index, id] of ["b-1", "b-2", "b-3"].entries()) {
    await app.storage.saveSessionWithLifetime(session(id, 1 + index));
  }
  const progressB = (await app.storage.loadHistoryBundle()).lifetimeProgress;
  const manifest = createBackupManifest({ selectedId: "bloopi", hasChosenStarter: true }, {
    ownedIds: ["bubble-room"], purchaseLedger: [], equippedHabitatId: "bubble-room",
    equippedAccessoryId: null, equippedDecorId: null,
  }, progressB);
  const backup = await app.storage.createCompleteBackupDatabase(JSON.stringify(manifest), "sparkly-brush-b.brushlings");
  await app.storage.replaceHistoryWithLifetime([session("a-1", 10), session("a-2", 11)]);

  const inspection = await app.storage.inspectCompleteBackupDatabase(backup.uri);
  faults.killAt("sqlite.run", { match: "INSERT OR IGNORE INTO sessions", database: "sparkly-brush.sqlite" });
  await expect(app.storage.restoreCompleteBackupDatabase(inspection.uri, "restore-b"))
    .rejects.toSatisfy(isSimulatedProcessDeath);
  expect(asyncStorage.get(RESTORE_JOURNAL_KEY)).toBe("true");
  expect(fs.existsSync(paths.database("sparkly-brush-restore-rollback.sqlite"))).toBe(true);
  return simulateRestart();
}

describe("interrupted complete-backup restore", () => {
  it("iOS: the next launch rolls back to the pre-restore history", async () => {
    const next = await interruptRestore("ios");
    const bundle = await next.storage.loadHistoryBundle();
    expect(bundle.recentHistory.map((item) => item.id)).toEqual(["a-2", "a-1"]);
    expect(asyncStorage.get(RESTORE_JOURNAL_KEY)).toBeNull();
    expect(fs.existsSync(paths.database("sparkly-brush-restore-rollback.sqlite"))).toBe(false);
  });

  it("Android: the next launch rolls back to the pre-restore history instead of failing forever", async () => {
    const next = await interruptRestore("android");
    const bundle = await next.storage.loadHistoryBundle();
    expect(bundle.recentHistory.map((item) => item.id)).toEqual(["a-2", "a-1"]);
    expect(asyncStorage.get(RESTORE_JOURNAL_KEY)).toBeNull();
    expect(fs.existsSync(paths.database("sparkly-brush-restore-rollback.sqlite"))).toBe(false);
  });
});
