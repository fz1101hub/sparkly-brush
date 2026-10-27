import { describe, expect, it } from "vitest";

import {
  normalizeParentRewards,
  parentRewardProgress,
  parentRewardProgressFromMetrics,
  type ParentReward,
} from "@/lib/parent-rewards";
import type { BrushSession } from "@/lib/brush-types";

function session(id: string, day: number, hour: number): BrushSession {
  return {
    id,
    startedAt: new Date(2026, 8, day, hour).getTime(),
    durationSeconds: 120,
    targetSeconds: 120,
    completed: true,
    source: "manual",
  };
}

describe("parent custom rewards", () => {
  it("unlocks a completed-session reward", () => {
    const reward: ParentReward = {
      id: "r", title: "Film insieme", requirement: "completed-sessions", target: 3, createdAt: 0, deliveredAt: null,
    };
    const progress = parentRewardProgress(reward, [session("a", 1, 8), session("b", 2, 8), session("c", 3, 8)]);
    expect(progress.unlocked).toBe(true);
    expect(progress.progress).toBe(3);
  });

  it("counts perfect morning-evening days", () => {
    const reward: ParentReward = {
      id: "r", title: "Gelato", requirement: "perfect-days", target: 2, createdAt: 0, deliveredAt: null,
    };
    const history = [session("a", 1, 8), session("b", 1, 20), session("c", 2, 8), session("d", 2, 20)];
    expect(parentRewardProgress(reward, history).unlocked).toBe(true);
  });

  it("con la base di partenza conta solo le spazzolate fatte dopo la creazione del premio", () => {
    const reward: ParentReward = {
      id: "r", title: "Parco", requirement: "completed-sessions", target: 10, createdAt: 0, deliveredAt: null,
      baseline: { completedSessions: 20, perfectDays: 5, dayKey: "2026-10-20" },
    };
    const metrics = { completedSessions: 24, perfectDays: 7, longestStreakDays: 12 };
    expect(parentRewardProgressFromMetrics(reward, metrics)).toMatchObject({ progress: 4, unlocked: false });
    expect(parentRewardProgressFromMetrics({ ...reward, requirement: "perfect-days", target: 2 }, metrics)).toMatchObject({ progress: 2, unlocked: true });
    // Without a baseline (rewards created before) everything counts, as before.
    expect(parentRewardProgressFromMetrics({ ...reward, baseline: undefined }, metrics).unlocked).toBe(true);
  });

  it("la serie conta solo i giorni dalla creazione e il traguardo raggiunto resta", () => {
    const reward: ParentReward = {
      id: "r", title: "Pizza", requirement: "streak", target: 5, createdAt: 0, deliveredAt: null,
      baseline: { completedSessions: 0, perfectDays: 0, dayKey: "2026-10-24" },
    };
    const metrics = { completedSessions: 30, perfectDays: 0, longestStreakDays: 30, currentStreakDays: 30, lastCompletedDateKey: "2026-10-27" };
    expect(parentRewardProgressFromMetrics(reward, metrics)).toMatchObject({ progress: 4, unlocked: false });
    expect(parentRewardProgressFromMetrics(reward, { ...metrics, lastCompletedDateKey: "2026-10-28" }).unlocked).toBe(true);
    const reached = { ...reward, reachedAt: 1 };
    expect(parentRewardProgressFromMetrics(reached, { ...metrics, currentStreakDays: 0 })).toMatchObject({ progress: 5, unlocked: true });
  });

  it("conserva base e data del traguardo e scarta quelle non valide", () => {
    const [kept, dropped] = normalizeParentRewards([
      { id: "a", title: "A", requirement: "streak", target: 3, createdAt: 1, deliveredAt: null, baseline: { completedSessions: 2, perfectDays: 1, dayKey: "2026-10-27" }, reachedAt: 5 },
      { id: "b", title: "B", requirement: "streak", target: 3, createdAt: 1, deliveredAt: null, baseline: { completedSessions: -1, perfectDays: 1, dayKey: "x" } },
    ]);
    expect(kept).toMatchObject({ baseline: { completedSessions: 2, perfectDays: 1, dayKey: "2026-10-27" }, reachedAt: 5 });
    expect(dropped.baseline).toBeUndefined();
  });
});
