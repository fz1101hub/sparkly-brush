/**
 * Family profiles (from PR #10) on the corrected native storage: every child has its own
 * SQLite database and AsyncStorage keys, while the primary profile keeps the pre-existing ones so
 * nothing already saved on the phone is lost.
 */
import { describe, expect, it } from "vitest";

import type { BrushSession, StoredDeviceSession } from "@/lib/brush-types";
import { deviceKey } from "@/lib/lifetime-progress";

import { loadStorage, simulateRestart, withRawDatabase } from "./harness";

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

const morning = new Date(2026, 9, 20, 8, 0).getTime();

describe("profili famiglia su SQLite reale", () => {
  it("il primo profilo resta nel database esistente, ogni bambino ha il proprio e niente si mescola", async () => {
    const app = await loadStorage();
    const primary = app.storage.getBrushStorage("primary");
    const child = app.storage.getBrushStorage("child-anna");
    await primary.initializeHistoryStorage();
    await child.initializeHistoryStorage();

    // Same session id in two profiles: two independent rows, two independent counters.
    await primary.saveSessionWithLifetime(manual("shared-id", morning));
    await child.saveSessionWithLifetime(manual("shared-id", morning));
    await child.saveSessionWithLifetime(manual("child-only", morning + 12 * 3_600_000));

    expect(withRawDatabase("sparkly-brush.sqlite", (db) => db.prepare("SELECT id FROM sessions ORDER BY id").all()))
      .toEqual([{ id: "shared-id" }]);
    expect(withRawDatabase("child-anna-sparkly-brush.sqlite", (db) => db.prepare("SELECT id FROM sessions ORDER BY id").all()))
      .toEqual([{ id: "child-only" }, { id: "shared-id" }]);

    await child.clearHistory();
    const next = await simulateRestart();
    expect((await next.storage.getBrushStorage("primary").loadHistoryBundle()).lifetimeProgress.completedSessions).toBe(1);
    expect((await next.storage.getBrushStorage("child-anna").loadHistoryBundle()).lifetimeProgress.completedSessions).toBe(0);
  });

  it("cursori del manico, demo e manico abbinato sono del singolo bambino", async () => {
    const app = await loadStorage();
    const primary = app.storage.getBrushStorage("primary");
    const child = app.storage.getBrushStorage("child-luca");
    await primary.initializeHistoryStorage();
    await child.initializeHistoryStorage();

    await child.saveDeviceSessionsWithLifetime("AA:BB", [record(7, morning)]);
    await child.saveLastDevice({ id: "AA:BB", name: "Sonicare4Kids", model: "HX6322/04" });
    await child.saveDemoMode(true);

    const primaryBundle = await primary.loadHistoryBundle();
    expect(primaryBundle.lifetimeProgress.deviceCursors[deviceKey("AA:BB")]).toBeUndefined();
    expect(await primary.loadLastDevice()).toBeNull();
    expect(await primary.loadDemoMode()).toBe(false);

    const childBundle = await child.loadHistoryBundle();
    expect(childBundle.lifetimeProgress.deviceCursors[deviceKey("AA:BB")]).toMatchObject({ lastSessionId: 7 });
    expect(await child.loadLastDevice()).toMatchObject({ id: "AA:BB" });
    expect(await child.loadDemoMode()).toBe(true);
  });

  it("il backup completo di un bambino contiene solo le sue sessioni e si ripristina nel suo profilo", async () => {
    const app = await loadStorage();
    const primary = app.storage.getBrushStorage("primary");
    const child = app.storage.getBrushStorage("child-sara");
    await primary.initializeHistoryStorage();
    await child.initializeHistoryStorage();
    await primary.saveSessionWithLifetime(manual("parent-copy", morning));
    await child.saveSessionWithLifetime(manual("sara-1", morning));

    const exported = await child.createCompleteBackupDatabase(JSON.stringify({
      format: "brushlings-backup",
      version: 3,
      createdAt: morning,
      historyComplete: true,
      archivedSessionCount: 1,
      profile: { selectedId: "bloopi", hasChosenStarter: true },
      customization: { ownedIds: ["bubble-room"], purchaseLedger: [], equippedHabitatId: "bubble-room", equippedAccessoryId: null, equippedDecorId: null },
      lifetimeProgress: (await child.loadHistoryBundle()).lifetimeProgress,
    }), "sara.brushlings");
    expect(exported.sessionCount).toBe(1);

    await child.clearHistory();
    const inspection = await child.inspectCompleteBackupDatabase(exported.uri);
    const restored = await child.restoreCompleteBackupDatabase(inspection.uri, "restore-sara");
    expect(restored.recentHistory.map((session) => session.id)).toEqual(["sara-1"]);
    expect((await primary.loadHistoryBundle()).recentHistory.map((session) => session.id)).toEqual(["parent-copy"]);
  });

  it("un manico passato a un altro bambino gli porta solo le spazzolate fatte da quel momento (voce 50)", async () => {
    const app = await loadStorage();
    const primary = app.storage.getBrushStorage("primary");
    const child = app.storage.getBrushStorage("child-luca");
    await primary.initializeHistoryStorage();
    await child.initializeHistoryStorage();
    const handle = "AA:BB:CC:00:00:50";

    await primary.saveDeviceSessionsWithLifetime(handle, [record(41, morning), record(42, morning + 12 * 3_600_000)]);
    const cursor = (await primary.loadHistoryBundle()).lifetimeProgress.deviceCursors[deviceKey(handle)];
    expect(cursor.lastSessionId).toBe(42);

    await child.adoptDeviceCursorWithLifetime(handle, cursor);
    const next = await simulateRestart();
    const luca = next.storage.getBrushStorage("child-luca");
    const imported = await luca.saveDeviceSessionsWithLifetime(handle, [
      record(41, morning),
      record(42, morning + 12 * 3_600_000),
      record(43, morning + 24 * 3_600_000),
    ]);
    expect(imported.importedCount).toBe(1);
    expect((await luca.loadHistoryBundle()).lifetimeProgress.completedSessions).toBe(1);
    expect((await next.storage.getBrushStorage("primary").loadHistoryBundle()).lifetimeProgress.completedSessions).toBe(2);
  });
});
