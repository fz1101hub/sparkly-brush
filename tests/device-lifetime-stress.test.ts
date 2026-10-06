import { describe, expect, it } from "vitest";

import type { BrushSession } from "@/lib/brush-types";
import {
  allocateDeviceSessionIdentity,
  createEmptyLifetimeProgress,
  deviceKey,
  forgetDeviceSessionState,
  markPendingDeviceFallback,
} from "@/lib/lifetime-progress";

function fallbackSession(index: number): BrushSession {
  return {
    id: `fallback-${index}`,
    startedAt: Date.UTC(2026, 0, 1) + index * 1_000,
    timeConfidence: "exact",
    rewardPolicy: "completed-only",
    durationSeconds: 120,
    targetSeconds: 120,
    completed: true,
    source: "manual",
  };
}

describe("device lifetime stress", () => {
  it("mantiene cursori e identità recenti entro i limiti compatti", () => {
    let progress = createEmptyLifetimeProgress();

    for (let device = 0; device < 40; device += 1) {
      const rawId = device % 2 === 0
        ? `AA:BB:CC:DD:EE:${String(device).padStart(2, "0")}`
        : `550e8400-e29b-41d4-a716-${String(device).padStart(12, "0")}`;
      for (let session = 0; session < 40; session += 1) {
        progress = allocateDeviceSessionIdentity(progress, rawId, session).progress;
      }
    }

    expect(Object.keys(progress.deviceCursors).length).toBeLessThanOrEqual(32);
    for (const cursor of Object.values(progress.deviceCursors)) {
      expect(cursor.recentIdentities.length).toBeLessThanOrEqual(32);
      expect(cursor.previousEpochRecentSessionIds.length).toBeLessThanOrEqual(32);
    }
    expect(JSON.stringify(progress)).not.toContain("AA:BB:CC");
    expect(JSON.stringify(progress)).not.toContain("550e8400-e29b");
  });

  it("gestisce rollover, reset e coda fallback senza doppi slot illimitati", () => {
    let progress = createEmptyLifetimeProgress();
    const rawDeviceId = "AA:BB:CC:DD:EE:FF";

    for (const sessionId of [65_534, 65_535, 0, 1]) {
      const allocation = allocateDeviceSessionIdentity(progress, rawDeviceId, sessionId);
      expect(allocation.duplicate).toBe(false);
      progress = allocation.progress;
    }
    expect(progress.deviceCursors[deviceKey(rawDeviceId)]).toMatchObject({
      epoch: 1,
      lastSessionId: 1,
    });

    progress = forgetDeviceSessionState(progress, rawDeviceId);
    const afterReset = allocateDeviceSessionIdentity(progress, rawDeviceId, 0);
    expect(afterReset.duplicate).toBe(false);
    expect(afterReset.progress.deviceCursors[deviceKey(rawDeviceId)]).toMatchObject({
      epoch: 2,
      lastSessionId: 0,
      acceptNextSession: false,
    });

    progress = afterReset.progress;
    for (let index = 0; index < 40; index += 1) {
      progress = markPendingDeviceFallback(
        progress,
        rawDeviceId,
        fallbackSession(index),
        progress,
      );
    }
    expect(Object.keys(progress.pendingDeviceFallbacks)).toHaveLength(32);
  });
});
