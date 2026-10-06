/**
 * Demo sessions live in their own AsyncStorage store on iOS/Android and never reach SQLite.
 * Regression test for audit finding G1 (2026-09-30): the native storage used to drop every
 * session with source "demo", so demo mode produced nothing on a phone.
 */
import { describe, expect, it } from "vitest";

import type { BrushSession } from "@/lib/brush-types";

import { loadStorage, simulateRestart, withRawDatabase } from "./harness";

function demoSession(id: string, startedAt: number): BrushSession {
  return {
    id,
    startedAt,
    rewardPolicy: "completed-only",
    durationSeconds: 120,
    targetSeconds: 120,
    completed: true,
    source: "demo",
  };
}

describe("demo history on the native storage", () => {
  it("keeps demo sessions across a restart without writing them to the real history", async () => {
    const morning = new Date(2026, 8, 30, 8, 0, 0).getTime();
    const app = await loadStorage();
    await app.storage.initializeHistoryStorage();

    const afterSave = await app.storage.saveDemoSession(demoSession("demo-morning", morning));
    const afterWeek = await app.storage.replaceDemoHistory([
      demoSession("demo-morning", morning),
      demoSession("demo-evening", morning + 12 * 3_600_000),
    ]);
    expect(afterSave.map((session) => session.id)).toEqual(["demo-morning"]);
    expect(afterWeek.map((session) => session.id)).toEqual(["demo-evening", "demo-morning"]);

    const next = await simulateRestart();
    expect((await next.storage.loadDemoHistory()).map((session) => session.id))
      .toEqual(["demo-evening", "demo-morning"]);
    const bundle = await next.storage.loadHistoryBundle();
    expect(bundle.recentHistory).toEqual([]);
    expect(bundle.lifetimeProgress.attemptedSessions).toBe(0);
    expect(withRawDatabase("sparkly-brush.sqlite", (db) => db
      .prepare("SELECT COUNT(*) AS count FROM sessions")
      .get())).toEqual({ count: 0 });
  });
});
