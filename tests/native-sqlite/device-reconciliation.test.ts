/**
 * Live-fallback ↔ handle-record reconciliation on the real SQLite storage, including an app
 * restart between the brushing and the sync. Regression tests for audit finding M3 (2026-09-30):
 * a record that predates the live brushing must not make the live fallback unreconcilable.
 */
import { describe, expect, it } from "vitest";

import type { BrushSession, StoredDeviceSession } from "@/lib/brush-types";

import { loadStorage, simulateRestart, withRawDatabase } from "./harness";

const DEVICE = "24:E5:AA:00:00:02";
const HOUR = 3_600_000;

function record(sessionId: number, startedAt: number, durationSeconds = 120): StoredDeviceSession {
  return {
    sessionId,
    startedAt,
    timeConfidence: "reconstructed",
    durationSeconds,
    targetSeconds: 120,
    mode: "clean",
    intensity: "media",
  };
}

/** What the provider saves at the stop of a live brushing, before the handle files its record. */
function liveFallback(startedAt: number, durationSeconds = 120): BrushSession {
  return {
    id: `ble-live:${DEVICE}:${startedAt}`,
    startedAt,
    rewardPolicy: "completed-only",
    durationSeconds,
    targetSeconds: 120,
    completed: durationSeconds >= 108,
    source: "device",
  };
}

function rawSessions(): { id: string; source: string; device_session_id: number | null }[] {
  return withRawDatabase("sparkly-brush.sqlite", (db) => db
    .prepare("SELECT id, source, device_session_id FROM sessions ORDER BY started_at")
    .all() as { id: string; source: string; device_session_id: number | null }[]);
}

describe("device fallback reconciliation on real SQLite", () => {
  it("replaces the live fallback with the handle's record of the same brushing, across a restart", async () => {
    const t0 = new Date(2026, 8, 28, 8, 0, 0).getTime();
    const app = await loadStorage();
    await app.storage.initializeHistoryStorage();
    await app.storage.saveDeviceSessionsWithLifetime(DEVICE, [record(41, t0 - 24 * HOUR)]);
    await app.storage.saveDeviceFallbackWithLifetime(DEVICE, liveFallback(t0));

    const next = await simulateRestart();
    const result = await next.storage.saveDeviceSessionsWithLifetime(DEVICE, [record(42, t0)]);

    expect({
      attempted: result.lifetimeProgress.attemptedSessions,
      completed: result.lifetimeProgress.completedSessions,
    }).toEqual({ attempted: 2, completed: 2 });
    const rows = rawSessions();
    expect(rows.map((row) => row.device_session_id)).toEqual([41, 42]);
    expect(rows.some((row) => row.id.startsWith("ble-live:"))).toBe(false);
  });

  it("counts the live brushing once when an offline record precedes its own record", async () => {
    const t0 = new Date(2026, 8, 28, 8, 0, 0).getTime();
    const app = await loadStorage();
    await app.storage.initializeHistoryStorage();
    await app.storage.saveDeviceSessionsWithLifetime(DEVICE, [record(41, t0 - 24 * HOUR)]);
    // Morning: brushed without the app (record 42, not seen yet).
    // Evening: brushed with the app; the Kids handle files record 43 late → live fallback.
    const evening = t0 + 12 * HOUR;
    await app.storage.saveDeviceFallbackWithLifetime(DEVICE, liveFallback(evening));

    const result = await app.storage.saveDeviceSessionsWithLifetime(DEVICE, [record(42, t0), record(43, evening)]);

    expect({
      attempted: result.lifetimeProgress.attemptedSessions,
      completed: result.lifetimeProgress.completedSessions,
      xp: result.lifetimeProgress.xp,
    }).toEqual({ attempted: 3, completed: 3, xp: 180 });
    expect(rawSessions().map((row) => row.device_session_id)).toEqual([41, 42, 43]);
  });

  it("counts the live brushing once when an accidental press shifts the handle counter", async () => {
    const t0 = new Date(2026, 8, 28, 20, 0, 0).getTime();
    const app = await loadStorage();
    await app.storage.initializeHistoryStorage();
    await app.storage.saveDeviceSessionsWithLifetime(DEVICE, [record(41, t0 - 24 * HOUR)]);
    // The app ignores presses shorter than 5 s, the handle still files them (record 42).
    await app.storage.saveDeviceFallbackWithLifetime(DEVICE, liveFallback(t0));

    const result = await app.storage.saveDeviceSessionsWithLifetime(DEVICE, [record(42, t0 - 60_000, 2), record(43, t0)]);

    expect({
      attempted: result.lifetimeProgress.attemptedSessions,
      completed: result.lifetimeProgress.completedSessions,
    }).toEqual({ attempted: 3, completed: 2 });
    expect(rawSessions().map((row) => row.device_session_id)).toEqual([41, 42, 43]);
  });
});
