import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BrushSession } from "@/lib/brush-types";
import {
  applySessionToLifetime,
  createLifetimeProgress,
  deviceKey,
  markPendingDeviceFallback,
} from "@/lib/lifetime-progress";

const nativeState = vi.hoisted(() => ({
  metadata: new Map<string, string>(),
  sessions: [] as Array<{
    id: string;
    started_at: number;
    time_confidence: string;
    reward_policy: string;
    duration_seconds: number;
    target_seconds: number;
    completed: number;
    source: "manual" | "device";
    device_session_id: number | null;
  }>,
  ledgerSessionIds: [] as string[],
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => undefined),
    removeItem: vi.fn(async () => undefined),
    multiRemove: vi.fn(async () => undefined),
  },
}));

vi.mock("expo-file-system", () => ({
  Directory: class {
    exists = false;
    list() { return []; }
  },
  File: class {
    exists = false;
  },
  Paths: { cache: "file:///cache" },
}));

const fakeDatabase = {
  execAsync: vi.fn(async () => undefined),
  closeAsync: vi.fn(async () => undefined),
  withExclusiveTransactionAsync: vi.fn(async (operation: (database: typeof fakeDatabase) => Promise<void>) => {
    await operation(fakeDatabase);
  }),
  getAllAsync: vi.fn(async (sql: string) => {
    if (sql.startsWith("PRAGMA table_info(sessions)")) {
      return [{ name: "time_confidence" }, { name: "reward_policy" }];
    }
    if (sql.includes("ORDER BY started_at DESC")) {
      return [...nativeState.sessions]
        .sort((first, second) => second.started_at - first.started_at || second.id.localeCompare(first.id))
        .slice(0, 120);
    }
    if (sql.includes("ORDER BY started_at ASC")) {
      return [...nativeState.sessions]
        .sort((first, second) => first.started_at - second.started_at || first.id.localeCompare(second.id));
    }
    return [];
  }),
  getEachAsync: vi.fn(() => ({
    async *[Symbol.asyncIterator]() {
      for (const row of [...nativeState.sessions].sort((first, second) => (
        first.started_at - second.started_at || first.id.localeCompare(second.id)
      ))) yield row;
    },
  })),
  getFirstAsync: vi.fn(async (sql: string, ...args: unknown[]) => {
    if (sql.includes("COUNT(*) AS count FROM sessions")) return { count: nativeState.sessions.length };
    if (sql.includes("MAX(started_at) AS max_started_at")) {
      return {
        max_started_at: nativeState.sessions.length
          ? Math.max(...nativeState.sessions.map((session) => session.started_at))
          : null,
      };
    }
    if (sql.includes("FROM metadata WHERE key = ?")) {
      const value = nativeState.metadata.get(String(args[0]));
      return value === undefined ? null : { value };
    }
    return null;
  }),
  runAsync: vi.fn(async (sql: string, ...args: unknown[]) => {
    if (sql.startsWith("DELETE FROM reward_ledger WHERE session_id = ?")) {
      nativeState.ledgerSessionIds = nativeState.ledgerSessionIds.filter((id) => id !== args[0]);
      return { changes: 1 };
    }
    if (sql.startsWith("DELETE FROM sessions WHERE id = ?")) {
      const before = nativeState.sessions.length;
      nativeState.sessions = nativeState.sessions.filter((session) => session.id !== args[0]);
      return { changes: before - nativeState.sessions.length };
    }
    if (sql.includes("INSERT OR IGNORE INTO sessions")) {
      const id = String(args[0]);
      if (nativeState.sessions.some((session) => session.id === id)) return { changes: 0 };
      nativeState.sessions.push({
        id,
        started_at: Number(args[1]),
        time_confidence: String(args[2]),
        reward_policy: String(args[3]),
        duration_seconds: Number(args[4]),
        target_seconds: Number(args[5]),
        completed: Number(args[6]),
        source: args[7] as "manual" | "device",
        device_session_id: args[8] === null ? null : Number(args[8]),
      });
      return { changes: 1 };
    }
    if (sql.includes("INSERT OR IGNORE INTO reward_ledger")) {
      nativeState.ledgerSessionIds.push(String(args[1]));
      return { changes: 1 };
    }
    if (sql.includes("INSERT INTO metadata")) {
      const key = String(args[0]);
      const value = args.length > 1 ? String(args[1]) : "true";
      nativeState.metadata.set(key, value);
      return { changes: 1 };
    }
    if (sql === "DELETE FROM reward_ledger") {
      nativeState.ledgerSessionIds = [];
      return { changes: 1 };
    }
    return { changes: 0 };
  }),
};

vi.mock("expo-sqlite", () => ({
  defaultDatabaseDirectory: "file:///sqlite",
  openDatabaseAsync: vi.fn(async () => fakeDatabase),
  backupDatabaseAsync: vi.fn(async () => undefined),
  deleteDatabaseAsync: vi.fn(async () => undefined),
}));

function completeSession(index: number): BrushSession {
  return {
    id: `legacy-${index}`,
    startedAt: new Date(2024, 0, 1 + index, 8).getTime(),
    durationSeconds: 120,
    targetSeconds: 120,
    completed: true,
    source: "manual",
  };
}

describe("native SQLite partial lifetime reconciliation", () => {
  beforeEach(() => {
    nativeState.metadata.clear();
    nativeState.sessions = [];
    nativeState.ledgerSessionIds = [];
    vi.clearAllMocks();
  });

  it("preserva la baseline lifetime non materializzata sostituendo un fallback BLE", async () => {
    const baseline = createLifetimeProgress(
      Array.from({ length: 365 }, (_, index) => completeSession(index)),
    );
    const startedAt = new Date(2026, 8, 23, 8).getTime();
    const fallback: BrushSession = {
      id: `ble-live:brush-a:${startedAt}`,
      startedAt,
      rewardPolicy: "completed-only",
      durationSeconds: 120,
      targetSeconds: 120,
      completed: true,
      source: "device",
    };
    const withFallback = markPendingDeviceFallback(
      applySessionToLifetime(baseline, fallback),
      "brush-a",
      fallback,
      baseline,
    );
    nativeState.metadata.set("lifetime-progress", JSON.stringify(withFallback));
    nativeState.metadata.set("history-complete", "false");
    nativeState.metadata.set("reward-ledger-backfilled-v1", "true");
    nativeState.sessions.push({
      id: fallback.id,
      started_at: fallback.startedAt,
      time_confidence: "exact",
      reward_policy: "completed-only",
      duration_seconds: fallback.durationSeconds,
      target_seconds: fallback.targetSeconds,
      completed: 1,
      source: "device",
      device_session_id: null,
    });
    nativeState.ledgerSessionIds.push(fallback.id);

    const { saveDeviceSessionsWithLifetime } = await import("@/lib/brush-storage.native");
    const result = await saveDeviceSessionsWithLifetime("brush-a", [{
      sessionId: 42,
      startedAt,
      timeConfidence: "reconstructed",
      durationSeconds: 120,
      targetSeconds: 120,
      mode: "clean",
      intensity: "media",
    }]);

    expect(result.importedCount).toBe(1);
    expect(result.event).toBeNull();
    expect(result.lifetimeProgress.attemptedSessions).toBe(366);
    expect(result.lifetimeProgress.completedSessions).toBe(366);
    expect(result.lifetimeProgress.xp).toBe(baseline.xp + 60);
    // The record is the newest session: it keeps the day, mission and streak credit the live
    // fallback earned, exactly once (it replaces the fallback, it does not add to it).
    expect(withFallback.dailyBonusCoins).toBeGreaterThan(baseline.dailyBonusCoins);
    expect(result.lifetimeProgress.dailyBonusCoins).toBe(withFallback.dailyBonusCoins);
    expect(result.lifetimeProgress.perfectDays).toBe(withFallback.perfectDays);
    expect(result.lifetimeProgress.currentStreakDays).toBe(withFallback.currentStreakDays);
    expect(result.lifetimeProgress.longestStreakDays).toBe(withFallback.longestStreakDays);
    expect(result.lifetimeProgress.deviceCursors[deviceKey("brush-a")].lastSessionId).toBe(42);
    expect(nativeState.sessions).toHaveLength(1);
    expect(nativeState.sessions[0].id).not.toBe(fallback.id);
    expect(fakeDatabase.getEachAsync).not.toHaveBeenCalled();
  });

  it("riconcilia un fallback first-use tardivo senza doppio accredito", async () => {
    const startedAt = new Date(2026, 8, 23, 9).getTime();
    const {
      saveDeviceFallbackWithLifetime,
      saveDeviceSessionsWithLifetime,
    } = await import("@/lib/brush-storage.native");
    await saveDeviceFallbackWithLifetime("brush-first-native", {
      id: `ble-live:brush-first-native:${startedAt}`,
      startedAt,
      rewardPolicy: "completed-only",
      durationSeconds: 120,
      targetSeconds: 120,
      completed: true,
      source: "device",
    });

    const result = await saveDeviceSessionsWithLifetime("brush-first-native", [{
      sessionId: 1,
      startedAt: startedAt + 10 * 60_000,
      timeConfidence: "approximate",
      durationSeconds: 120,
      targetSeconds: 120,
      mode: "clean",
      intensity: "media",
    }]);

    expect(result.lifetimeProgress.completedSessions).toBe(1);
    expect(result.lifetimeProgress.xp).toBe(60);
    expect(nativeState.sessions).toHaveLength(1);
    expect(nativeState.sessions[0].started_at).toBe(startedAt);
  });
});
