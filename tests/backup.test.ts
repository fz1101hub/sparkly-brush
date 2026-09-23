import { describe, expect, it } from "vitest";

import {
  createBackup,
  createBackupManifest,
  parseBackup,
  parseBackupManifest,
  serializeBackup,
} from "@/lib/backup";
import { DEFAULT_CUSTOMIZATION_STATE } from "@/lib/customization";
import type { BrushSession } from "@/lib/brush-types";
import { createLifetimeProgress } from "@/lib/lifetime-progress";

const session: BrushSession = {
  id: "real-1",
  startedAt: new Date(2026, 8, 8, 8).getTime(),
  durationSeconds: 120,
  targetSeconds: 120,
  completed: true,
  source: "manual",
};

describe("portable Brushlings backup", () => {
  it("round-trips the child game state", () => {
    const backup = createBackup(
      [session],
      { selectedId: "spriggo", hasChosenStarter: true },
      DEFAULT_CUSTOMIZATION_STATE,
      123456,
    );

    const restored = parseBackup(serializeBackup(backup));
    expect(restored.profile.selectedId).toBe("spriggo");
    expect(restored.history).toHaveLength(1);
    expect(restored.createdAt).toBe(123456);
  });

  it("rejects malformed or unsupported backup codes", () => {
    expect(() => parseBackup("hello")).toThrow();
    expect(() => parseBackup("BRUSHLINGS-BACKUP-1:{\"version\":2}")).toThrow();
  });

  it("preserva la progressione lifetime oltre 120 sessioni con un backup compatto", () => {
    const lifetimeHistory = Array.from({ length: 365 }, (_, index) => ({
      ...session,
      id: `session-${index}`,
      startedAt: session.startedAt + index * 86_400_000,
    }));

    const backup = createBackup(
      lifetimeHistory,
      { selectedId: "bloopi", hasChosenStarter: true },
      DEFAULT_CUSTOMIZATION_STATE,
      123456,
    );
    const restored = parseBackup(serializeBackup(backup));

    expect(restored.history).toHaveLength(120);
    expect(restored.lifetimeProgress.completedSessions).toBe(365);
    expect(restored.lifetimeProgress.xp).toBe(21_900);
  });

  it("migra un backup v1 negli aggregati v2", () => {
    const legacyCode = "BRUSHLINGS-BACKUP-1:" + JSON.stringify({
      format: "brushlings-backup",
      version: 1,
      createdAt: 123456,
      profile: { selectedId: "bloopi", hasChosenStarter: true },
      customization: DEFAULT_CUSTOMIZATION_STATE,
      history: [session],
    });

    const restored = parseBackup(legacyCode);
    expect(restored.version).toBe(2);
    expect(restored.lifetimeProgress.completedSessions).toBe(1);
  });

  it("round-trip del manifest v3 per il database completo", () => {
    const progress = createLifetimeProgress([session]);
    const manifest = createBackupManifest(
      { selectedId: "bloopi", hasChosenStarter: true },
      DEFAULT_CUSTOMIZATION_STATE,
      progress,
      123456,
    );

    const restored = parseBackupManifest(JSON.stringify(manifest));
    expect(restored.version).toBe(3);
    expect(restored.createdAt).toBe(123456);
    expect(restored.historyComplete).toBe(true);
    expect(restored.archivedSessionCount).toBe(1);
    expect(restored.lifetimeProgress.attemptedSessions).toBe(1);
  });

  it("preserva nel manifest v3 una baseline legacy dichiarata come parziale", () => {
    const progress = createLifetimeProgress([session]);
    const manifest = {
      ...createBackupManifest(
        { selectedId: "bloopi" as const, hasChosenStarter: true },
        DEFAULT_CUSTOMIZATION_STATE,
        { ...progress, attemptedSessions: 365, completedSessions: 365 },
        123456,
      ),
      historyComplete: false,
      archivedSessionCount: 120,
    };

    const restored = parseBackupManifest(JSON.stringify(manifest));
    expect(restored.historyComplete).toBe(false);
    expect(restored.archivedSessionCount).toBe(120);
    expect(restored.lifetimeProgress.attemptedSessions).toBe(365);
  });
});
