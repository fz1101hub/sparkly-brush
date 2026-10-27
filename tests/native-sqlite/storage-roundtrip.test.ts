/**
 * End-to-end checks of the REAL lib/brush-storage.native.ts and lib/complete-backup.native.ts
 * code on a real SQLite engine (node:sqlite): persistence across restarts, BLE import, complete
 * backup export/inspect/restore, schema and pragmas, time zones and hostile backup files.
 */
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

import { createBackupManifest } from "@/lib/backup";
import { DEFAULT_BRACES } from "@/lib/braces";
import { DEFAULT_VILLAGE } from "@/lib/village";
import type { BrushSession, StoredDeviceSession } from "@/lib/brush-types";
import type { LifetimeProgress } from "@/lib/lifetime-progress";

import {
  asyncStorage,
  documentPicker,
  freshInstall,
  loadStorage,
  openRawDatabase,
  paths,
  sharing,
  simulateRestart,
  sqliteHeader,
  withRawDatabase,
  type AppModules,
} from "./harness";

const CUSTOMIZATION = {
  ownedIds: ["bubble-room" as const],
  purchaseLedger: [],
  equippedHabitatId: "bubble-room" as const,
  equippedAccessoryId: null,
  equippedDecorId: null,
};

const BLE_DEVICE_ID = "AA:BB:CC:DD:EE:FF";

function manualSession(index: number, overrides: Partial<BrushSession> = {}): BrushSession {
  return {
    id: `manual-${String(index).padStart(3, "0")}`,
    startedAt: new Date(2026, 2, 1 + index, index % 2 === 0 ? 7 : 20, 30).getTime(),
    timeConfidence: "exact",
    rewardPolicy: "legacy",
    durationSeconds: 120,
    targetSeconds: 120,
    completed: true,
    source: "manual",
    ...overrides,
  };
}

function deviceSession(sessionId: number, startedAt: number, durationSeconds = 125): StoredDeviceSession {
  return {
    sessionId,
    startedAt,
    timeConfidence: "exact",
    durationSeconds,
    targetSeconds: 120,
    mode: "clean",
    intensity: "media",
  };
}

function aggregates(progress: LifetimeProgress) {
  return {
    attemptedSessions: progress.attemptedSessions,
    completedSessions: progress.completedSessions,
    totalBrushingSeconds: progress.totalBrushingSeconds,
    rewardedBrushingSeconds: progress.rewardedBrushingSeconds,
    xp: progress.xp,
    dailyBonusCoins: progress.dailyBonusCoins,
    perfectDays: progress.perfectDays,
    longestStreakDays: progress.longestStreakDays,
    itemCounts: progress.itemCounts,
  };
}

function manifestFor(progress: LifetimeProgress, createdAt = Date.now()) {
  return createBackupManifest({ selectedId: "bloopi", hasChosenStarter: true }, CUSTOMIZATION, progress, createdAt);
}

type RawCounts = { sessions: number; ledger: number; ledgerCoins: number; ledgerXp: number };

function rawCounts(file: string): RawCounts {
  return withRawDatabase(file, (db) => {
    const row = db.prepare(`SELECT
        (SELECT COUNT(*) FROM sessions) AS sessions,
        (SELECT COUNT(*) FROM reward_ledger) AS ledger,
        (SELECT COALESCE(SUM(coins), 0) FROM reward_ledger) AS ledgerCoins,
        (SELECT COALESCE(SUM(xp), 0) FROM reward_ledger) AS ledgerXp`).get() as RawCounts;
    return { ...row };
  });
}

/** Populates install #1 with manual + BLE device sessions and returns the resulting bundle. */
async function seedHistory(app: AppModules) {
  await app.storage.initializeHistoryStorage();
  for (let index = 0; index < 6; index += 1) {
    await app.storage.saveSessionWithLifetime(manualSession(index));
  }
  await app.storage.saveSessionWithLifetime(manualSession(6, { completed: false, durationSeconds: 40 }));
  const base = new Date(2026, 2, 20, 7, 45).getTime();
  const device = await app.storage.saveDeviceSessionsWithLifetime(BLE_DEVICE_ID, [
    deviceSession(41, base),
    deviceSession(42, base + 12 * 3_600_000),
    deviceSession(43, base + 24 * 3_600_000, 30),
  ]);
  return device;
}

/** Export through the real app flow (createCompleteBackupDatabase → share sheet → saved to "Files"). */
async function exportBackup(app: AppModules, progress: LifetimeProgress): Promise<string> {
  const result = await app.completeBackup.exportAndShareCompleteBackup(manifestFor(progress));
  expect(result.sessionCount).toBe(progress.attemptedSessions);
  return sharing.lastSavedCopy();
}

describe("native storage on real SQLite", () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it("(a) persists a manual session and reads it back after a simulated restart", async () => {
    const app = await loadStorage();
    await app.storage.initializeHistoryStorage();
    const session = manualSession(1);
    const saved = await app.storage.saveSessionWithLifetime(session);
    expect(saved.event?.session.id).toBe(session.id);
    expect(saved.recentHistory.map((item) => item.id)).toEqual([session.id]);
    expect(saved.lifetimeProgress.completedSessions).toBe(1);

    const restarted = await simulateRestart();
    const bundle = await restarted.storage.loadHistoryBundle();
    expect(bundle.recentHistory).toEqual([
      { ...session, deviceSessionId: undefined },
    ]);
    expect(bundle.lifetimeProgress.attemptedSessions).toBe(1);
    expect(bundle.lifetimeProgress.xp).toBe(60);

    // The module instance from before the restart is dead, like a killed process.
    await expect(app.storage.loadHistoryBundle()).rejects.toThrow(/simulated process death/);
  });

  it("(b) imports BLE device sessions with sanitized, idempotent identities", async () => {
    const app = await loadStorage();
    await app.storage.initializeHistoryStorage();
    const base = new Date(2026, 2, 20, 7, 45).getTime();
    const first = await app.storage.saveDeviceSessionsWithLifetime(BLE_DEVICE_ID, [
      deviceSession(10, base),
      deviceSession(11, base + 12 * 3_600_000),
    ]);
    expect(first.importedCount).toBe(2);
    expect(first.recentHistory.every((item) => /^device-session-[0-9a-f]{24}-0-1[01]$/.test(item.id))).toBe(true);
    expect(first.recentHistory.some((item) => item.id.includes(BLE_DEVICE_ID))).toBe(false);
    expect(first.lifetimeProgress.completedSessions).toBe(2);

    const replay = await app.storage.saveDeviceSessionsWithLifetime(BLE_DEVICE_ID, [
      deviceSession(10, base),
      deviceSession(11, base + 12 * 3_600_000),
    ]);
    expect(replay.importedCount).toBe(0);

    const restarted = await simulateRestart();
    const bundle = await restarted.storage.loadHistoryBundle();
    expect(bundle.recentHistory).toHaveLength(2);
    expect(bundle.lifetimeProgress.attemptedSessions).toBe(2);
    expect(rawCounts(paths.database()).sessions).toBe(2);
  });

  it("(c) storage API round trip: create → inspect → restore into a fresh install", async () => {
    const app = await loadStorage();
    const seeded = await seedHistory(app);
    const sourceProgress = seeded.lifetimeProgress;
    const sourceCounts = rawCounts(paths.database());

    const backup = await app.storage.createCompleteBackupDatabase(
      JSON.stringify(manifestFor(sourceProgress)),
      "sparkly-brush-sanity.brushlings",
    );
    expect(backup.sessionCount).toBe(10);
    const backupPath = fileURLToPath(backup.uri);
    expect(backup.size).toBe(fs.statSync(backupPath).size);
    expect(fs.existsSync(`${backupPath}-wal`)).toBe(false);
    const header = sqliteHeader(backupPath);
    expect(header.size % header.pageSize).toBe(0);
    // The exported archive contains no raw BLE identifier.
    expect(fs.readFileSync(backupPath).includes(Buffer.from(BLE_DEVICE_ID))).toBe(false);
    const saved = paths.external("sanity.brushlings");
    fs.copyFileSync(backupPath, saved);

    const target = await freshInstall();
    await target.storage.initializeHistoryStorage();
    fs.copyFileSync(saved, `${paths.cache}/picked.brushlings`);
    const inspection = await target.storage.inspectCompleteBackupDatabase(paths.toUri(`${paths.cache}/picked.brushlings`));
    expect(inspection.sessionCount).toBe(10);
    expect(JSON.parse(inspection.manifestJson).archivedSessionCount).toBe(10);

    const restored = await target.storage.restoreCompleteBackupDatabase(inspection.uri, "restore-sanity");
    expect(aggregates(restored.lifetimeProgress)).toEqual(aggregates(sourceProgress));
    expect(restored.recentHistory.map((item) => item.id).sort())
      .toEqual(seeded.recentHistory.map((item) => item.id).sort());
    const targetCounts = rawCounts(paths.database());
    expect(targetCounts).toEqual(sourceCounts);
    expect(fs.existsSync(fileURLToPath(inspection.uri))).toBe(false);
    expect(asyncStorage.get("sparkly-brush.restore-in-progress.v1")).toBeNull();

    const afterRestart = await simulateRestart();
    const bundle = await afterRestart.storage.loadHistoryBundle();
    expect(aggregates(bundle.lifetimeProgress)).toEqual(aggregates(sourceProgress));
  });

  it("(c') app flow round trip: exportAndShare → document picker → inspect → restore", async () => {
    const app = await loadStorage();
    const seeded = await seedHistory(app);
    const saved = await exportBackup(app, seeded.lifetimeProgress);

    const target = await freshInstall();
    await target.storage.initializeHistoryStorage();
    documentPicker.pick(saved, { name: "Sparkly backup.brushlings" });
    const preview = await target.completeBackup.pickAndInspectCompleteBackup();
    expect(preview).not.toBeNull();
    expect(preview!.sessionCount).toBe(10);
    expect(preview!.manifest.lifetimeProgress.completedSessions).toBe(seeded.lifetimeProgress.completedSessions);
    // The DocumentPicker copy was deleted, the validated import copy is in the cache.
    expect(paths.listApp().filter((file) => file.includes("DocumentPicker/"))).toEqual([]);

    const restored = await target.completeBackup.restoreCompleteBackup(preview!, "restore-app-flow");
    expect(aggregates(restored.lifetimeProgress)).toEqual(aggregates(seeded.lifetimeProgress));
    expect(paths.listApp().filter((file) => file.includes("sparkly-import-"))).toEqual([]);
  });

  it("(c'') the file carries the child's village and braces mode", async () => {
    const app = await loadStorage();
    const seeded = await seedHistory(app);
    const village = { ...DEFAULT_VILLAGE, cards: ["body-enamel", "world-tooth-fairy"], visits: 2, learningLanguage: "fr" as const };
    const braces = { ...DEFAULT_BRACES, enabled: true, type: "fixed" as const, elasticColor: "green" as const, careDays: ["2026-03-20"] };
    await app.completeBackup.exportAndShareCompleteBackup(
      createBackupManifest({ selectedId: "bloopi", hasChosenStarter: true }, CUSTOMIZATION, seeded.lifetimeProgress, Date.now(), {
        village,
        braces,
      }),
    );

    const target = await freshInstall();
    await target.storage.initializeHistoryStorage();
    documentPicker.pick(sharing.lastSavedCopy(), { name: "Sparkly backup.brushlings" });
    const preview = await target.completeBackup.pickAndInspectCompleteBackup();
    expect(preview!.manifest.village).toEqual(village);
    expect(preview!.manifest.braces).toEqual(braces);
    target.completeBackup.discardCompleteBackupPreview(preview!);
  });

  it("(d) creates the expected schema, WAL mode and pragmas on a real SQLite file", async () => {
    const app = await loadStorage();
    await seedHistory(app);
    const db = openRawDatabase();
    const objects = db.prepare("SELECT type, name, tbl_name FROM sqlite_schema ORDER BY type, name").all()
      .map((row) => `${String(row.type)}:${String(row.name)}`);
    expect(objects).toEqual([
      "index:reward_ledger_session_idx",
      "index:sessions_started_at_idx",
      "index:sqlite_autoindex_metadata_1",
      "index:sqlite_autoindex_reward_ledger_1",
      "index:sqlite_autoindex_sessions_1",
      "table:metadata",
      "table:reward_ledger",
      "table:sessions",
    ]);
    const columns = db.prepare("PRAGMA table_info(sessions)").all().map((row) => `${String(row.name)}:${String(row.type)}:${String(row.pk)}`);
    expect(columns).toEqual([
      "id:TEXT:1",
      "started_at:INTEGER:0",
      "time_confidence:TEXT:0",
      "reward_policy:TEXT:0",
      "duration_seconds:INTEGER:0",
      "target_seconds:INTEGER:0",
      "completed:INTEGER:0",
      "source:TEXT:0",
      "device_session_id:INTEGER:0",
    ]);
    expect(db.prepare("PRAGMA journal_mode").get()).toEqual({ journal_mode: "wal" });
    const metadata = Object.fromEntries(db.prepare("SELECT key, value FROM metadata").all()
      .map((row) => [String(row.key), String(row.value)]));
    expect(Object.keys(metadata).sort()).toEqual(["history-complete", "lifetime-progress", "reward-ledger-backfilled-v1"]);
    // Integers are stored with INTEGER storage class (expo binds integral numbers as int64).
    expect(db.prepare("SELECT DISTINCT typeof(started_at) AS t FROM sessions").all()).toEqual([{ t: "integer" }]);
    const orphanLedger = db.prepare(`SELECT COUNT(*) AS c FROM reward_ledger l LEFT JOIN sessions s ON s.id = l.session_id
      WHERE s.id IS NULL`).get() as { c: number };
    expect(orphanLedger.c).toBe(0);
    db.close();
  });

  it("(e) cross-timezone round trip: export in Europe/Rome, inspect + restore in America/New_York", async () => {
    process.env.TZ = "Europe/Rome";
    const app = await loadStorage();
    await app.storage.initializeHistoryStorage();
    // Sessions close to local midnight/morning boundaries so local-day keys differ between zones.
    const romeTimes = [
      new Date(2026, 4, 3, 7, 5), new Date(2026, 4, 3, 21, 50), new Date(2026, 4, 3, 23, 40),
      new Date(2026, 4, 4, 0, 20), new Date(2026, 4, 4, 6, 50), new Date(2026, 4, 4, 22, 10),
      new Date(2026, 4, 5, 7, 30), new Date(2026, 4, 5, 20, 0), new Date(2026, 4, 6, 1, 15),
    ];
    let last;
    for (const [index, when] of romeTimes.entries()) {
      last = await app.storage.saveSessionWithLifetime(manualSession(index, { startedAt: when.getTime() }));
    }
    const progress = last!.lifetimeProgress;
    const saved = await exportBackup(app, progress);

    process.env.TZ = "America/New_York";
    const target = await freshInstall();
    await target.storage.initializeHistoryStorage();
    documentPicker.pick(saved);
    const preview = await target.completeBackup.pickAndInspectCompleteBackup();
    expect(preview?.sessionCount).toBe(romeTimes.length);
    const restored = await target.completeBackup.restoreCompleteBackup(preview!, "restore-tz");
    expect(aggregates(restored.lifetimeProgress)).toEqual(aggregates(progress));
    expect(restored.recentHistory).toHaveLength(romeTimes.length);
  });

  it("(f) rejects a crafted .brushlings containing a TRIGGER or a VIEW and leaves the live DB intact", async () => {
    const app = await loadStorage();
    const seeded = await seedHistory(app);
    const saved = await exportBackup(app, seeded.lifetimeProgress);

    const variants: [string, string][] = [
      ["trigger", "CREATE TRIGGER evil AFTER INSERT ON sessions BEGIN DELETE FROM metadata; END;"],
      ["view", "CREATE VIEW evil_view AS SELECT id FROM sessions;"],
    ];
    const target = await freshInstall();
    await target.storage.initializeHistoryStorage();
    await target.storage.saveSessionWithLifetime(manualSession(99));
    const before = rawCounts(paths.database());

    for (const [label, ddl] of variants) {
      const crafted = paths.external(`crafted-${label}.brushlings`);
      fs.copyFileSync(saved, crafted);
      withRawDatabase(crafted, (db) => db.exec(ddl));

      // 1. Through the app flow (picker → inspect): rejected before any restore.
      documentPicker.pick(crafted);
      await expect(target.completeBackup.pickAndInspectCompleteBackup())
        .rejects.toThrow(/trigger o viste SQLite non consentiti/);

      // 2. Bypassing inspection (file placed directly in the cache): restore itself must reject.
      const direct = `${paths.cache}/direct-${label}.sqlite`;
      fs.copyFileSync(crafted, direct);
      await expect(target.storage.restoreCompleteBackupDatabase(paths.toUri(direct), `restore-${label}`))
        .rejects.toThrow(/trigger o viste SQLite non consentiti/);
    }

    expect(rawCounts(paths.database())).toEqual(before);
    withRawDatabase(paths.database(), (db) => {
      expect(db.prepare("SELECT COUNT(*) AS c FROM sqlite_schema WHERE type IN ('trigger','view')").get()).toEqual({ c: 0 });
    });
    const bundle = await target.storage.loadHistoryBundle();
    expect(bundle.recentHistory.map((item) => item.id)).toEqual(["manual-099"]);
  });
});
