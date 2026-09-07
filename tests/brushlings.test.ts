import { describe, expect, it } from "vitest";

import {
  computeBrushlingStats,
  computeSessionReward,
  getBrushling,
  getEvolution,
  getEvolutionIndex,
  getNextEvolution,
} from "@/lib/brushlings";
import type { BrushSession } from "@/lib/brush-types";

const completeSession = (id: string, startedAt: number): BrushSession => ({
  id,
  startedAt,
  durationSeconds: 120,
  targetSeconds: 120,
  completed: true,
  source: "manual",
});

describe("Brushlings progression", () => {
  it("awards XP but keeps Voltuff locked before its egg hatches", () => {
    const now = Date.now();
    const history = [
      completeSession("a", now),
      completeSession("b", now - 1000),
      completeSession("c", now - 2000),
    ];

    const stats = computeBrushlingStats(history);

    expect(stats.completedSessions).toBe(3);
    expect(stats.xp).toBe(180);
    expect(stats.level).toBe(2);
    expect(stats.unlockedIds).not.toContain("voltuff");
    expect(stats.unlockedIds).not.toContain("moonbit");
  });

  it("unlocks Voltuff on the fifth complete session and Moonbit on the tenth", () => {
    const now = Date.now();
    const fiveSessions = Array.from({ length: 5 }, (_, index) =>
      completeSession(`v-${index}`, now + index * 1000),
    );
    const tenSessions = Array.from({ length: 10 }, (_, index) =>
      completeSession(`m-${index}`, now + index * 1000),
    );

    expect(computeBrushlingStats(fiveSessions).unlockedIds).toContain("voltuff");
    expect(computeBrushlingStats(fiveSessions).unlockedIds).not.toContain("moonbit");
    expect(computeBrushlingStats(tenSessions).unlockedIds).toContain("moonbit");
  });

  it("gives partial XP without counting an interrupted session as complete", () => {
    const history: BrushSession[] = [{
      id: "partial",
      startedAt: Date.now(),
      durationSeconds: 60,
      targetSeconds: 120,
      completed: false,
      source: "manual",
    }];

    const stats = computeBrushlingStats(history);

    expect(stats.completedSessions).toBe(0);
    expect(stats.xp).toBe(10);
    expect(stats.level).toBe(1);
  });

  it("creates a session reward and detects an evolution", () => {
    const now = Date.now();
    const history = [
      completeSession("new", now),
      completeSession("c", now - 1000),
      completeSession("b", now - 2000),
      completeSession("a", now - 3000),
    ];

    const reward = computeSessionReward(history, "new", "bloopi");

    expect(reward).not.toBeNull();
    expect(reward?.xpEarned).toBe(60);
    expect(reward?.coinsEarned).toBe(14);
    expect(reward?.previousLevel).toBe(2);
    expect(reward?.level).toBe(3);
    expect(reward?.evolvedFrom).toBe("Bloopi");
    expect(reward?.evolvedTo).toBe("Bubblio");
  });

  it("evolves each starter at levels 3 and 6", () => {
    const bloopi = getBrushling("bloopi");

    expect(getEvolutionIndex(bloopi, 1)).toBe(0);
    expect(getEvolution(bloopi, 1).name).toBe("Bloopi");
    expect(getEvolution(bloopi, 3).name).toBe("Bubblio");
    expect(getEvolution(bloopi, 6).name).toBe("Ondalux");
    expect(getNextEvolution(bloopi, 3)?.name).toBe("Ondalux");
    expect(getNextEvolution(bloopi, 6)).toBeNull();
  });
});
