import { describe, expect, it } from "vitest";

import {
  computeDailyMissionSummary,
  computeMissionCenter,
  computeProgressRewardDelta,
  longestCompletedDayStreak,
} from "@/lib/missions";
import type { BrushSession } from "@/lib/brush-types";

function session(id: string, year: number, month: number, day: number, hour: number): BrushSession {
  return {
    id,
    startedAt: new Date(year, month, day, hour, 0, 0).getTime(),
    durationSeconds: 120,
    targetSeconds: 120,
    completed: true,
    source: "manual",
  };
}

describe("daily missions and achievements", () => {
  it("completes morning, evening and double missions with a full day routine", () => {
    const history = [
      session("morning", 2026, 8, 8, 8),
      session("evening", 2026, 8, 8, 20),
    ];

    const summary = computeDailyMissionSummary(history, new Date(2026, 8, 8, 21).getTime());

    expect(summary.completedCount).toBe(3);
    expect(summary.allCompleted).toBe(true);
    expect(summary.earnedCoins).toBe(30);
  });

  it("adds achievement rewards only after thresholds", () => {
    const history = Array.from({ length: 5 }, (_, index) =>
      session("s-" + String(index), 2026, 8, 1 + index, 8),
    );

    const center = computeMissionCenter(history, new Date(2026, 8, 5, 12).getTime());
    const first = center.achievements.find((achievement) => achievement.id === "first-smile");
    const five = center.achievements.find((achievement) => achievement.id === "five-adventures");
    const ten = center.achievements.find((achievement) => achievement.id === "ten-adventures");

    expect(first?.unlocked).toBe(true);
    expect(five?.unlocked).toBe(true);
    expect(ten?.unlocked).toBe(false);
    expect(center.achievementBonusCoins).toBe(30);
  });

  it("detects new missions, chest and achievement rewards from a triggering session", () => {
    const history = [
      session("morning", 2026, 8, 8, 8),
      session("evening", 2026, 8, 8, 20),
    ];

    const delta = computeProgressRewardDelta(history, "evening");

    expect(delta?.missionTitles).toContain("Missione buonanotte");
    expect(delta?.missionTitles).toContain("Doppio sorriso");
    expect(delta?.chestUnlocked).toBe(true);
    expect(delta?.dailyBonusCoins).toBe(25);
    expect(delta?.achievementTitles).toEqual([]);
  });

  it("computes the longest completed-day streak", () => {
    const history = [
      session("a", 2026, 8, 1, 8),
      session("b", 2026, 8, 2, 8),
      session("c", 2026, 8, 3, 8),
      session("d", 2026, 8, 5, 8),
    ];

    expect(longestCompletedDayStreak(history)).toBe(3);
  });
});
