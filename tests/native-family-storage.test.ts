import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { describe, expect, it, vi } from "vitest";
import type { BrushSession } from "@/lib/brush-types";
const data = vi.hoisted(() => new Map<string, string>());
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => data.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      data.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      data.delete(key);
    }),
    multiSet: vi.fn(async (entries: [string, string][]) => {
      entries.forEach(([key, value]) => data.set(key, value));
    }),
    multiRemove: vi.fn(async (keys: string[]) => {
      keys.forEach((key) => data.delete(key));
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
  },
  Paths: { cache: "file:///cache" },
}));

// Use real SQLite for queries, constraints and transactions; only bridge Expo's async API.
vi.mock("expo-sqlite", () => {
  const databases = new Map<string, ReturnType<typeof adapt>>();
  function adapt() {
    const db = new DatabaseSync(":memory:");
    const adapter = {
      execAsync: async (sql: string) => {
        db.exec(sql);
      },
      runAsync: async (sql: string, ...params: SQLInputValue[]) =>
        db.prepare(sql).run(...params),
      getAllAsync: async (sql: string, ...params: SQLInputValue[]) =>
        db.prepare(sql).all(...params),
      getFirstAsync: async (sql: string, ...params: SQLInputValue[]) =>
        db.prepare(sql).get(...params) ?? null,
      getEachAsync: (sql: string, ...params: SQLInputValue[]) => ({
        async *[Symbol.asyncIterator]() {
          for (const row of db.prepare(sql).all(...params)) yield row;
        },
      }),
      withExclusiveTransactionAsync: async (
        operation: (transaction: object) => Promise<void>,
      ) => {
        db.exec("BEGIN IMMEDIATE");
        try {
          await operation(adapter);
          db.exec("COMMIT");
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      },
      closeAsync: async () => {
        db.close();
      },
    };
    return adapter;
  }
  return {
    defaultDatabaseDirectory: "file:///sqlite",
    openDatabaseAsync: async (name: string) => {
      if (!databases.has(name)) databases.set(name, adapt());
      return databases.get(name);
    },
  };
});
import { getBrushStorage } from "@/lib/brush-storage.native";

describe("native family persistence with real SQLite", () => {
  it("migrates existing primary progress and isolates children even with identical session IDs", async () => {
    const legacy: BrushSession = {
      id: "legacy-session",
      startedAt: 100000,
      durationSeconds: 120,
      targetSeconds: 120,
      completed: true,
      source: "manual",
      rewardPolicy: "completed-only",
    };
    data.set("sparkly-brush.history.v1", JSON.stringify([legacy]));
    const primary = getBrushStorage("primary");
    const child = getBrushStorage("child-native");
    await primary.initializeHistoryStorage();
    await child.initializeHistoryStorage();
    expect(
      (await primary.loadHistoryBundle()).lifetimeProgress.completedSessions,
    ).toBe(1);
    expect(
      (await child.loadHistoryBundle()).lifetimeProgress.completedSessions,
    ).toBe(0);
    const sameId = { ...legacy, id: "shared-id", startedAt: 300000 };
    await Promise.all([
      primary.saveSessionWithLifetime(sameId),
      child.saveSessionWithLifetime(sameId),
    ]);
    expect(
      (await primary.loadHistoryBundle()).lifetimeProgress.completedSessions,
    ).toBe(2);
    expect(
      (await child.loadHistoryBundle()).lifetimeProgress.completedSessions,
    ).toBe(1);
    await child.clearHistory();
    expect(
      (await primary.loadHistoryBundle()).lifetimeProgress.completedSessions,
    ).toBe(2);
    expect(
      (await child.loadHistoryBundle()).lifetimeProgress.completedSessions,
    ).toBe(0);
  });
});
