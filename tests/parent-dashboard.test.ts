import { describe, expect, it } from "vitest";

import { computeParentDashboard } from "@/lib/parent-dashboard";
import type { BrushSession } from "@/lib/brush-types";

function session(
  id: string,
  day: number,
  hour: number,
  completed = true,
  source: "manual" | "device" = "device",
): BrushSession {
  return {
    id,
    startedAt: new Date(2026, 8, day, hour).getTime(),
    durationSeconds: completed ? 120 : 60,
    targetSeconds: 120,
    completed,
    source,
  };
}

describe("parent dashboard analytics", () => {
  it("summarizes morning and evening adherence over seven days", () => {
    const history = [
      session("m1", 7, 8),
      session("e1", 7, 20),
      session("m2", 8, 8),
      session("partial", 8, 14, false, "manual"),
    ];

    const dashboard = computeParentDashboard(history, new Date(2026, 8, 8, 21).getTime());

    expect(dashboard.days).toHaveLength(7);
    expect(dashboard.completedRoutineSlots).toBe(3);
    expect(dashboard.totalRoutineSlots).toBe(14);
    expect(dashboard.completedSessions).toBe(3);
    expect(dashboard.attemptedSessions).toBe(4);
    expect(dashboard.daysWithBoth).toBe(1);
    expect(dashboard.deviceSessions).toBe(3);
    expect(dashboard.manualSessions).toBe(1);
  });
});
