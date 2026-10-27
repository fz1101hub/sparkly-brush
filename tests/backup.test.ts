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
import { createLifetimeProgress, type LifetimeProgress } from "@/lib/lifetime-progress";
import { DEFAULT_APP_PREFERENCES } from "@/lib/preferences";
import { DEFAULT_BRACES } from "@/lib/braces";
import { DEFAULT_VILLAGE } from "@/lib/village";

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
    expect(restored.preferences.language).toBe("system");
  });

  it("round-trip del manifest v3 per il database completo", () => {
    const progress = createLifetimeProgress([session]);
    const manifest = createBackupManifest(
      { selectedId: "bloopi", hasChosenStarter: true },
      DEFAULT_CUSTOMIZATION_STATE,
      progress,
      123456,
      {
        preferences: { ...DEFAULT_APP_PREFERENCES, language: "de" },
        parentRewards: [],
      },
    );

    const restored = parseBackupManifest(JSON.stringify(manifest));
    expect(restored.version).toBe(3);
    expect(restored.createdAt).toBe(123456);
    expect(restored.historyComplete).toBe(true);
    expect(restored.archivedSessionCount).toBe(1);
    expect(restored.lifetimeProgress.attemptedSessions).toBe(1);
    expect(restored.preferences.language).toBe("de");
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

  it("porta nel manifest v3 villaggio e apparecchio del bambino", () => {
    const village = {
      ...DEFAULT_VILLAGE,
      day: "2026-10-27",
      spent: 1,
      cards: ["body-enamel", "history-addis"],
      quizLevel: 2 as const,
      learningLanguage: "de" as const,
      dentition: "permanent" as const,
      bestFind: 4,
      memoryWins: 3,
      visits: 1,
      energyLimit: false,
    };
    const braces = {
      ...DEFAULT_BRACES,
      enabled: true,
      type: "aligners" as const,
      elasticColor: "pink" as const,
      careSeconds: 90 as const,
      alignerHours: 22,
      careDays: ["2026-10-26", "2026-10-27"],
    };
    const manifest = createBackupManifest(
      { selectedId: "bloopi", hasChosenStarter: true },
      DEFAULT_CUSTOMIZATION_STATE,
      createLifetimeProgress([session]),
      123456,
      { village, braces },
    );

    const restored = parseBackupManifest(JSON.stringify(manifest));
    expect(restored.village).toEqual(village);
    expect(restored.braces).toEqual(braces);
  });

  it("porta tema e promemoria e scarta orari non validi", () => {
    const reminders = { enabled: true, morning: "07:15", evening: "19:30", quiet: true };
    const manifest = createBackupManifest(
      { selectedId: "bloopi", hasChosenStarter: true },
      DEFAULT_CUSTOMIZATION_STATE,
      createLifetimeProgress([session]),
      123456,
      { themeId: "underwater", reminders },
    );
    const restored = parseBackupManifest(JSON.stringify(manifest));
    expect(restored.themeId).toBe("underwater");
    expect(restored.reminders).toEqual({ ...reminders, lastCall: false, lastCallTime: "21:00" });

    const tampered = parseBackupManifest(
      JSON.stringify({ ...manifest, themeId: "neon", reminders: { ...reminders, morning: "25:99" } }),
    );
    expect(tampered.themeId).toBeUndefined();
    expect(tampered.reminders).toBeUndefined();
  });

  it("porta giorni speciali, durata e nomi delle creature", () => {
    const extras = {
      version: 1 as const,
      protectedDays: [{ day: "2026-10-26", reason: "offline" as const }],
      sessionSeconds: 90 as const,
      creatureNames: { bloopi: "Blu" },
    };
    const manifest = createBackupManifest(
      { selectedId: "bloopi", hasChosenStarter: true },
      DEFAULT_CUSTOMIZATION_STATE,
      createLifetimeProgress([session]),
      123456,
      { extras },
    );
    expect(parseBackupManifest(JSON.stringify(manifest)).extras).toEqual(extras);
  });

  it("un file scritto prima del villaggio non porta villaggio né apparecchio", () => {
    const manifest = createBackupManifest(
      { selectedId: "bloopi", hasChosenStarter: true },
      DEFAULT_CUSTOMIZATION_STATE,
      createLifetimeProgress([session]),
      123456,
    );
    expect(JSON.stringify(manifest)).not.toMatch(/village|braces|themeId|reminders|extras/);

    const restored = parseBackupManifest(JSON.stringify(manifest));
    expect(restored.village).toBeUndefined();
    expect(restored.braces).toBeUndefined();
  });

  it("normalizza villaggio e apparecchio manipolati nel file", () => {
    const manifest = {
      ...createBackupManifest(
        { selectedId: "bloopi" as const, hasChosenStarter: true },
        DEFAULT_CUSTOMIZATION_STATE,
        createLifetimeProgress([session]),
        123456,
      ),
      village: { cards: ["body-enamel", 42, "body-enamel"], spent: -3, quizLevel: 9, bestFind: 99 },
      braces: { enabled: "yes", type: "titanium", alignerHours: 30, careDays: ["ieri", "2026-10-27"] },
    };

    const restored = parseBackupManifest(JSON.stringify(manifest));
    expect(restored.village).toMatchObject({ cards: ["body-enamel"], spent: 0, quizLevel: 1, bestFind: 5 });
    expect(restored.braces).toMatchObject({ enabled: false, type: "fixed", alignerHours: 0, careDays: ["2026-10-27"] });
  });
});

describe("codici testuali v2 manipolati", () => {
  const profile = { selectedId: "bloopi" as const, hasChosenStarter: true };
  // Three perfect days: morning and evening sessions on 1–3 September.
  const threeDays: BrushSession[] = Array.from({ length: 6 }, (_, index) => ({
    ...session,
    id: `day-${index}`,
    startedAt: new Date(2026, 8, 1 + Math.floor(index / 2), index % 2 === 0 ? 8 : 20).getTime(),
  }));

  function codeFor(
    history: BrushSession[],
    progress: LifetimeProgress = createLifetimeProgress(history),
  ): string {
    return serializeBackup(
      createBackup(history, profile, DEFAULT_CUSTOMIZATION_STATE, 123456, { lifetimeProgress: progress }),
    );
  }

  it("accetta un codice genuino e ne conserva gli aggregati", () => {
    const progress = createLifetimeProgress(threeDays);
    const restored = parseBackup(codeFor(threeDays, progress));

    expect(restored.lifetimeProgress).toEqual(progress);
    expect(progress).toMatchObject({ completedSessions: 6, perfectDays: 3, longestStreakDays: 3 });
  });

  it("rifiuta aggregati che uno storico completo non giustifica", () => {
    const genuine = createLifetimeProgress(threeDays);
    const forgeries: Partial<LifetimeProgress>[] = [
      { attemptedSessions: 500, completedSessions: 500 },
      { totalBrushingSeconds: genuine.totalBrushingSeconds + 120 },
      { xp: 6 * 60 + 1 },
      { perfectDays: 4 },
      { longestStreakDays: 7, currentStreakDays: 7 },
    ];
    for (const forged of forgeries) {
      expect(() => parseBackup(codeFor(threeDays, { ...genuine, ...forged })))
        .toThrow("Progressi del backup non coerenti con lo storico");
    }
  });

  it("con lo storico troncato a 120 sessioni accetta solo aggregati compatibili con le regole", () => {
    const longHistory: BrushSession[] = Array.from({ length: 130 }, (_, index) => ({
      ...session,
      id: `long-${index}`,
      startedAt: session.startedAt + index * 43_200_000,
    }));
    const genuine = createLifetimeProgress(longHistory);
    const restored = parseBackup(codeFor(longHistory, genuine));
    expect(restored.history).toHaveLength(120);
    expect(restored.lifetimeProgress.attemptedSessions).toBe(130);

    const forgeries: Partial<LifetimeProgress>[] = [
      { attemptedSessions: 100, completedSessions: 100 },
      { completedSessions: genuine.attemptedSessions + 1 },
      { perfectDays: 66 },
      { dailyBonusCoins: 130 * 15 + 1 },
      { itemCounts: { ...genuine.itemCounts, "smile-star": 500 } },
    ];
    for (const forged of forgeries) {
      expect(() => parseBackup(codeFor(longHistory, { ...genuine, ...forged })))
        .toThrow("Progressi del backup non coerenti con lo storico");
    }
  });
});
