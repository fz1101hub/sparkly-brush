/**
 * The whole family in one file (voce 69) and the automatic weekly backup (voce 44) on the real
 * SQLite emulation: every child comes back on a new phone with sessions, settings and profile.
 */
import { describe, expect, it } from "vitest";

import type { BrushSession } from "@/lib/brush-types";

import { freshInstall, loadStorage } from "./harness";

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

const morning = new Date(2026, 9, 20, 8, 0).getTime();

describe("backup di famiglia su SQLite reale", () => {
  it("salva e ripristina tutti i bambini in un solo file", async () => {
    const app = await loadStorage();
    const { saveFamilyProfiles } = await import("@/lib/family-profiles");
    const { getExtrasStorage, DEFAULT_EXTRAS } = await import("@/lib/extras");
    await saveFamilyProfiles({
      version: 1,
      activeId: "primary",
      profiles: [{ id: "primary", name: "Emma", createdAt: 1 }, { id: "child-luca", name: "Luca", createdAt: 2 }],
    });
    await app.storage.getBrushStorage("primary").initializeHistoryStorage();
    await app.storage.getBrushStorage("child-luca").initializeHistoryStorage();
    await app.storage.getBrushStorage("primary").saveSessionWithLifetime(manual("emma-1", morning));
    await app.storage.getBrushStorage("primary").saveSessionWithLifetime(manual("emma-2", morning + 12 * 3_600_000));
    await app.storage.getBrushStorage("child-luca").saveSessionWithLifetime(manual("luca-1", morning));
    await getExtrasStorage("child-luca").save({ ...DEFAULT_EXTRAS, sessionSeconds: 60 });

    const family = await import("@/lib/family-backup.native");
    const { parseFamilyBackup } = await import("@/lib/family-backup-format");
    const text = JSON.stringify(await family.buildFamilyBackup("Bimbo"));
    const backup = parseFamilyBackup(text);
    expect(backup.children.map((child) => `${child.name}:${child.sessionCount}`)).toEqual(["Emma:2", "Luca:1"]);

    const phone = await freshInstall();
    const restoredFamily = await import("@/lib/family-backup.native");
    const restored = await restoredFamily.restoreFamilyBackup(parseFamilyBackup(text), "Bimbo");
    expect(restored).toEqual(["primary", "child-luca"]);
    const { loadFamilyProfiles } = await import("@/lib/family-profiles");
    expect((await loadFamilyProfiles("Bimbo")).profiles.map((profile) => profile.name)).toEqual(["Emma", "Luca"]);
    expect((await phone.storage.getBrushStorage("primary").loadHistoryBundle()).recentHistory.map((session) => session.id).sort()).toEqual(["emma-1", "emma-2"]);
    expect((await phone.storage.getBrushStorage("child-luca").loadHistoryBundle()).lifetimeProgress.completedSessions).toBe(1);
    const extras = await import("@/lib/extras");
    expect((await extras.getExtrasStorage("child-luca").load()).sessionSeconds).toBe(60);
  });

  it("il backup automatico si fa una volta a settimana e tiene gli ultimi quattro", async () => {
    await loadStorage();
    const family = await import("@/lib/family-backup.native");
    const { Directory, Paths } = await import("expo-file-system");
    const day = 86_400_000;
    const start = new Date(2026, 9, 1, 9).getTime();
    expect(await family.runAutoBackupIfDue(start, "Bimbo")).toBe(false);
    await family.saveAutoBackup({ enabled: true, lastAt: null, directoryUri: null });
    for (let week = 0; week < 6; week += 1) {
      expect(await family.runAutoBackupIfDue(start + week * 7 * day, "Bimbo")).toBe(true);
      expect(await family.runAutoBackupIfDue(start + week * 7 * day + day, "Bimbo")).toBe(false);
    }
    const files = new Directory(Paths.document, "backup").list().map((entry) => entry.name).sort();
    expect(files).toHaveLength(4);
    expect(files[0]).toBe("famiglia-2026-10-15.brushlings-family");
  });
});
