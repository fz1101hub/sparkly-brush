/**
 * "Elimina storico" must not make the handle hand over again the sessions the family just
 * deleted: the sync cursor survives while every counter and pending fallback is reset.
 */
import { describe, expect, it } from "vitest";

import type { StoredDeviceSession } from "@/lib/brush-types";
import { deviceKey } from "@/lib/lifetime-progress";

import { loadStorage, simulateRestart } from "./harness";

const DEVICE = "24:E5:AA:00:00:03";

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

describe("Elimina storico su SQLite reale", () => {
  it("azzera sessioni e progressi ma conserva il cursore del manico anche dopo un riavvio", async () => {
    const app = await loadStorage();
    await app.storage.initializeHistoryStorage();
    await app.storage.saveDeviceSessionsWithLifetime(DEVICE, [record(41, new Date(2026, 9, 6, 8).getTime())]);

    await app.storage.clearHistory();

    const next = await simulateRestart();
    const bundle = await next.storage.loadHistoryBundle();
    expect(bundle.recentHistory).toEqual([]);
    expect(bundle.lifetimeProgress.attemptedSessions).toBe(0);
    expect(bundle.lifetimeProgress.deviceCursors[deviceKey(DEVICE)]).toMatchObject({ lastSessionId: 41 });
    expect(bundle.lifetimeProgress.pendingDeviceFallbacks).toEqual({});

    const again = await next.storage.saveDeviceSessionsWithLifetime(DEVICE, [record(41, new Date(2026, 9, 6, 8).getTime())]);
    expect(again.importedCount).toBe(0);
  });
});
