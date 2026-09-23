import { describe, expect, it } from "vitest";

import { parentRewardProgress, type ParentReward } from "@/lib/parent-rewards";
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
});