import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BrushSession, StoredDeviceSession } from "@/lib/brush-types";

const memory = vi.hoisted(() => new Map<string, string>());
const nativeState = vi.hoisted(() => ({
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
  metadata: new Map<string, string>(),
  opened: 0,
  closed: 0,
  fileDirectories: [] as string[],
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => memory.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      memory.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      memory.delete(key);
    }),
    multiRemove: vi.fn(async (keys: string[]) => {
      keys.forEach((key) => memory.delete(key));
    }),
  },
}));

vi.mock("expo-file-system", () => ({
  Directory: class {
    exists = false;
    list() {
      return [];
    }
  },
  File: class {
    exists = false;
    name = "audit.sqlite";
    size = 0;
    uri: string;
    parentDirectory = { uri: "file:///cache/" };
    constructor(directory: string, name?: string) {
      nativeState.fileDirectories.push(directory);
      this.uri = `${directory}/${name ?? "audit.sqlite"}`;
    }
  },
  Paths: { cache: { uri: "file:///cache/" } },
}));

const fakeDatabase = {
  execAsync: vi.fn(async () => undefined),
  closeAsync: vi.fn(async () => {
    nativeState.closed += 1;
  }),
  withExclusiveTransactionAsync: vi.fn(
    async (operation: (database: typeof fakeDatabase) => Promise<void>) => {
      await operation(fakeDatabase);
    },
  ),
  getAllAsync: vi.fn(async (sql: string) => {
    if (sql.startsWith("PRAGMA table_info(sessions)")) {
      return [{ name: "time_confidence" }, { name: "reward_policy" }];
    }
    if (sql.includes("ORDER BY started_at DESC")) {
      return [...nativeState.sessions].sort(
        (a, b) => b.started_at - a.started_at || b.id.localeCompare(a.id),
      );
    }
    return [];
  }),
  getEachAsync: vi.fn(() => ({
    async *[Symbol.asyncIterator]() {
      for (const row of [...nativeState.sessions].sort(
        (a, b) => a.started_at - b.started_at || a.id.localeCompare(b.id),
      ))
        yield row;
    },
  })),
  getFirstAsync: vi.fn(async (sql: string, ...args: unknown[]) => {
    if (sql.includes("COUNT(*) AS count FROM sessions"))
      return { count: nativeState.sessions.length };
    if (sql.includes("MAX(started_at) AS max_started_at")) {
      return {
        max_started_at: nativeState.sessions.length
          ? Math.max(...nativeState.sessions.map((row) => row.started_at))
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
    if (sql.startsWith("DELETE FROM sessions WHERE id = ?")) {
      const initial = nativeState.sessions.length;
      nativeState.sessions = nativeState.sessions.filter(
        (row) => row.id !== args[0],
      );
      return { changes: initial - nativeState.sessions.length };
    }
    if (sql.includes("INSERT OR IGNORE INTO sessions")) {
      const id = String(args[0]);
      if (nativeState.sessions.some((row) => row.id === id))
        return { changes: 0 };
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
    if (sql.includes("INSERT INTO metadata")) {
      nativeState.metadata.set(
        String(args[0]),
        args.length > 1 ? String(args[1]) : "true",
      );
      return { changes: 1 };
    }
    if (sql === "DELETE FROM sessions") {
      nativeState.sessions = [];
      return { changes: 1 };
    }
    return { changes: 1 };
  }),
};

const sqlite = vi.hoisted(() => ({
  defaultDatabaseDirectory: "/data/user/0/com.sparkly.brush/databases",
  openDatabaseAsync: vi.fn(async () => {
    nativeState.opened += 1;
    return fakeDatabase;
  }),
  backupDatabaseAsync: vi.fn(async () => undefined),
  deleteDatabaseAsync: vi.fn(async () => undefined),
}));

vi.mock("expo-sqlite", () => sqlite);

const DEVICE = "audit-native-brush";
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

async function prepareFallback() {
  const storage = await import("@/lib/brush-storage.native");
  await storage.saveDeviceSessionsWithLifetime(DEVICE, [
    stored(41, startedAt - 24 * HOUR),
  ]);
  await storage.saveDeviceFallbackWithLifetime(DEVICE, fallback(startedAt));
  return storage;
}

function resetState() {
  vi.resetModules();
  memory.clear();
  nativeState.sessions = [];
  nativeState.metadata.clear();
  nativeState.opened = 0;
  nativeState.closed = 0;
  nativeState.fileDirectories = [];
  vi.clearAllMocks();
}

describe("audit storage native fallback assignments", () => {
  beforeEach(resetState);

  it("M3: riconcilia B una volta quando il batch contiene prima il record storico 42/A", async () => {
    const storage = await prepareFallback();
    const result = await storage.saveDeviceSessionsWithLifetime(DEVICE, [
      { ...stored(42, startedAt - 12 * HOUR), timeConfidence: "approximate" },
      { ...stored(43, startedAt), timeConfidence: "approximate" },
    ]);

    expect(result.importedCount).toBe(2);
    expect(result.lifetimeProgress).toMatchObject({
      attemptedSessions: 3,
      completedSessions: 3,
    });
    expect(result.lifetimeProgress.pendingDeviceFallbacks).toEqual({});
    expect(nativeState.sessions).toHaveLength(3);
    expect(
      nativeState.sessions.some((row) => row.id.startsWith("ble-live:")),
    ).toBe(false);
  });

  it("M2: conserva B dopo [42/A] tardivo e lo riconcilia solo al successivo [43/B]", async () => {
    const storage = await prepareFallback();
    const afterOlderRecord = await storage.saveDeviceSessionsWithLifetime(
      DEVICE,
      [stored(42, startedAt - 12 * HOUR)],
    );
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

    const afterFallbackRecord = await storage.saveDeviceSessionsWithLifetime(
      DEVICE,
      [stored(43, startedAt)],
    );
    expect(afterFallbackRecord.lifetimeProgress).toMatchObject({
      attemptedSessions: 3,
      completedSessions: 3,
    });
    expect(afterFallbackRecord.lifetimeProgress.pendingDeviceFallbacks).toEqual(
      {},
    );
    expect(nativeState.sessions).toHaveLength(3);
    expect(
      nativeState.sessions.some((row) => row.id.startsWith("ble-live:")),
    ).toBe(false);
  });

  it("G1: accetta source demo solo nella history demo AsyncStorage e non apre SQLite", async () => {
    const { loadDemoHistory, saveDemoSession } =
      await import("@/lib/brush-storage.native");
    const demo = {
      ...fallback(startedAt),
      id: "demo-native",
      source: "demo" as const,
    };

    await saveDemoSession(demo);
    expect(await loadDemoHistory()).toEqual([demo]);
    expect(sqlite.openDatabaseAsync).not.toHaveBeenCalled();
  });

  it("S1: usa file:// per il path Android del rollback, chiude l'apertura parziale e permette un nuovo tentativo", async () => {
    memory.set("sparkly-brush.restore-in-progress.v1", "true");
    const storage = await import("@/lib/brush-storage.native");

    await expect(storage.loadHistoryBundle()).rejects.toThrow(
      "copia di sicurezza non disponibile",
    );
    expect(nativeState.fileDirectories).toContain(
      "file:///data/user/0/com.sparkly.brush/databases",
    );
    expect(nativeState.closed).toBe(1);

    memory.delete("sparkly-brush.restore-in-progress.v1");
    await expect(storage.loadHistoryBundle()).resolves.toMatchObject({
      recentHistory: [],
    });
    expect(sqlite.openDatabaseAsync).toHaveBeenCalledTimes(2);
  });
});
