import { describe, expect, it } from "vitest";

import { computeBrushlingStats } from "@/lib/brushlings";
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
  it("awards XP and unlocks Voltuff after three complete sessions", () => {
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
    expect(stats.unlockedIds).toContain("voltuff");
    expect(stats.unlockedIds).not.toContain("moonbit");
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
});
