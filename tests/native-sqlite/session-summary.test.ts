import { describe, expect, it } from "vitest";
import type { BrushSession } from "@/lib/brush-types";
import { createLifetimeProgress } from "@/lib/lifetime-progress";
import { loadStorage, simulateRestart } from "./harness";

function history(): BrushSession[] {
  return Array.from({ length: 400 }, (_, index) => ({
    id: `report-${index}`,
    startedAt: new Date(2025, 0, 1 + Math.floor(index / 2), index % 2 ? 20 : 8).getTime(),
    durationSeconds: 120, targetSeconds: 120, completed: true,
    source: "manual", timeConfidence: "exact", rewardPolicy: "completed-only",
  }));
}

describe("streaming summaries of the real SQLite archive", () => {
  it("counts all 400 rows and applies a reward creation cutoff after a process restart", async () => {
    const app = await loadStorage();
    const sessions = history();
    await app.storage.replaceHistoryWithLifetime(sessions);
    const restarted = await simulateRestart();
    expect((await restarted.storage.loadHistory()).length).toBe(120);
    const all = await restarted.storage.summarizeSessions(0);
    expect(all.completedSessions).toBe(400);
    expect(all.perfectDays).toBe(200);
    expect(all.longestStreakDays).toBe(200);
    expect(all.historyComplete).toBe(true);
    // At noon on day 151: morning before creation cannot make the first perfect day.
    const cutoff = new Date(2025, 0, 151, 12).getTime();
    const sinceCreation = await restarted.storage.summarizeSessions(cutoff);
    expect(sinceCreation.completedSessions).toBe(99);
    expect(sinceCreation.perfectDays).toBe(49);
    expect(sinceCreation.longestStreakDays).toBe(50);
  });

  it("reports partial legacy archives truthfully and never fabricates missing calendar days", async () => {
    const app = await loadStorage();
    const sessions = history();
    await app.storage.replaceHistoryWithLifetime(sessions.slice(-120), createLifetimeProgress(sessions));
    const summary = await app.storage.summarizeSessions(0);
    expect(summary.completedSessions).toBe(120);
    expect(summary.historyComplete).toBe(false);
    expect(summary.perfectDays).toBe(60);
  });

  it("keeps siblings isolated and rejects invalid intervals", async () => {
    const app = await loadStorage();
    const first = app.storage.getBrushStorage("report-first");
    const second = app.storage.getBrushStorage("report-second");
    await first.replaceHistoryWithLifetime(history());
    expect((await second.summarizeSessions(0)).completedSessions).toBe(0);
    await expect(first.summarizeSessions(Number.NaN)).rejects.toThrow();
    await expect(first.summarizeSessions(20, 10)).rejects.toThrow();
  });
});
