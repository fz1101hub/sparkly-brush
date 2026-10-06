import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BrushSession, StoredDeviceSession } from "@/lib/brush-types";

const storage = vi.hoisted(() => new Map<string, string>());

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      storage.delete(key);
    }),
    multiRemove: vi.fn(async (keys: string[]) => {
      keys.forEach((key) => storage.delete(key));
    }),
  },
}));

import {
  loadHistoryBundle,
  saveDeviceFallbackWithLifetime,
  saveDeviceSessionsWithLifetime,
} from "@/lib/brush-storage";

const DEVICE = "audit-web-brush";
const HOUR = 3_600_000;
const startedAt = new Date(2026, 8, 30, 20).getTime();

function stored(sessionId: number, timestamp: number): StoredDeviceSession {
  return {
    sessionId,
    startedAt: timestamp,
    timeConfidence: "reconstructed",
    durationSeconds: 120,
    targetSeconds: 120,
    mode: "clean",
    intensity: "media",
  };
}

function fallback(timestamp: number): BrushSession {
  return {
    id: `ble-live:${DEVICE}:${timestamp}`,
    startedAt: timestamp,
    timeConfidence: "exact",
    rewardPolicy: "completed-only",
    durationSeconds: 120,
    targetSeconds: 120,
    completed: true,
    source: "device",
  };
}

async function prepareFallback(): Promise<void> {
  await saveDeviceSessionsWithLifetime(DEVICE, [
    stored(41, startedAt - 24 * HOUR),
  ]);
  await saveDeviceFallbackWithLifetime(DEVICE, fallback(startedAt));
}

describe("audit storage web fallback assignments", () => {
  beforeEach(() => storage.clear());

  it("M3: preassegna il fallback B al record 43 una sola volta quando 42/A precede B nello stesso batch", async () => {
    await prepareFallback();

    const result = await saveDeviceSessionsWithLifetime(DEVICE, [
      { ...stored(42, startedAt - 12 * HOUR), timeConfidence: "approximate" },
      { ...stored(43, startedAt), timeConfidence: "approximate" },
    ]);

    expect(result.importedCount).toBe(2);
    expect(result.lifetimeProgress).toMatchObject({
      attemptedSessions: 3,
      completedSessions: 3,
    });
    expect(result.lifetimeProgress.pendingDeviceFallbacks).toEqual({});
    expect(result.recentHistory).toHaveLength(3);
    expect(
      result.recentHistory.some((session) =>
        session.id.startsWith("ble-live:"),
      ),
    ).toBe(false);
  });

  it("M2: un record 42/A tardivo non consuma B e il record 43/B di un batch successivo lo riconcilia", async () => {
    await prepareFallback();

    const afterOlderRecord = await saveDeviceSessionsWithLifetime(DEVICE, [
      stored(42, startedAt - 12 * HOUR),
    ]);
    expect(afterOlderRecord.lifetimeProgress).toMatchObject({
      attemptedSessions: 3,
      completedSessions: 3,
    });
    expect(
      Object.values(afterOlderRecord.lifetimeProgress.pendingDeviceFallbacks),
    ).toHaveLength(1);
    expect(
      Object.values(
        afterOlderRecord.lifetimeProgress.pendingDeviceFallbacks,
      )[0],
    ).toMatchObject({
      expectedSessionId: 43,
      hasInterveningProgress: false,
    });

    const afterFallbackRecord = await saveDeviceSessionsWithLifetime(DEVICE, [
      stored(43, startedAt),
    ]);
    expect(afterFallbackRecord.lifetimeProgress).toMatchObject({
      attemptedSessions: 3,
      completedSessions: 3,
    });
    expect(afterFallbackRecord.lifetimeProgress.pendingDeviceFallbacks).toEqual(
      {},
    );
    expect(afterFallbackRecord.recentHistory).toHaveLength(3);
    expect(
      afterFallbackRecord.recentHistory.some((session) =>
        session.id.startsWith("ble-live:"),
      ),
    ).toBe(false);

    const persisted = await loadHistoryBundle();
    expect(persisted.lifetimeProgress).toMatchObject({
      attemptedSessions: 3,
      completedSessions: 3,
    });
  });
});
