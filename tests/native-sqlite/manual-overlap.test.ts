/**
 * Audit M4: a brushing timed with the guided timer while the handle was recording too must not
 * be credited twice when the handle record arrives later. The record only moves the cursor.
 */
import { describe, expect, it } from "vitest";

import type { BrushSession, StoredDeviceSession } from "@/lib/brush-types";
import { deviceKey } from "@/lib/lifetime-progress";

import { loadStorage } from "./harness";

const DEVICE = "24:E5:AA:00:00:04";

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

function record(
  sessionId: number,
  startedAt: number,
  timeConfidence: "reconstructed" | "approximate" = "reconstructed",
): StoredDeviceSession {
  return {
    sessionId,
    startedAt,
    timeConfidence,
    durationSeconds: 118,
    targetSeconds: 120,
    mode: "clean",
    intensity: "media",
  };
}

describe("record del manico coincidenti con il timer guidato su SQLite reale", () => {
  it("non accredita due volte la stessa spazzolata ma sposta il cursore", async () => {
    const app = await loadStorage();
    await app.storage.initializeHistoryStorage();
    const manualStart = new Date(2026, 9, 6, 8, 0, 0).getTime();
    await app.storage.saveSessionWithLifetime(manual("manual-1", manualStart));

    const overlapping = await app.storage.saveDeviceSessionsWithLifetime(DEVICE, [record(50, manualStart + 20_000)]);
    expect(overlapping.importedCount).toBe(0);
    expect(overlapping.supersededManualCount).toBe(1);
    expect(overlapping.lifetimeProgress.attemptedSessions).toBe(1);
    expect(overlapping.lifetimeProgress.completedSessions).toBe(1);
    expect(overlapping.lifetimeProgress.deviceCursors[deviceKey(DEVICE)]).toMatchObject({ lastSessionId: 50 });
    expect(overlapping.recentHistory.map((session) => session.id)).toEqual(["manual-1"]);

    const evening = await app.storage.saveDeviceSessionsWithLifetime(DEVICE, [record(51, new Date(2026, 9, 6, 20, 0).getTime())]);
    expect(evening.importedCount).toBe(1);
    expect(evening.supersededManualCount).toBe(0);
    expect(evening.lifetimeProgress.attemptedSessions).toBe(2);

    const approximate = await app.storage.saveDeviceSessionsWithLifetime(DEVICE, [record(52, manualStart + 30_000, "approximate")]);
    expect(approximate.importedCount).toBe(1);
    expect(approximate.lifetimeProgress.attemptedSessions).toBe(3);
  });
});
