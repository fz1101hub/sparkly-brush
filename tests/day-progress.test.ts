import { describe, expect, it, vi } from "vitest";

import type { BrushSession } from "@/lib/brush-types";
import {
  currentCompletedDayStreak,
  dayDifference,
  localDateKey,
  longestCompletedDayStreak,
  routineSlot,
  sameLocalDay,
} from "@/lib/day-progress";

function completed(id: string, date: Date): BrushSession {
  return {
    id,
    startedAt: date.getTime(),
    durationSeconds: 120,
    targetSeconds: 120,
    completed: true,
    source: "manual",
  };
}

describe("day progress utilities", () => {
  it("classifica in modo univoco le fasce della routine", () => {
    const at = (hour: number, minute: number) => new Date(2026, 8, 23, hour, minute).getTime();
    expect(routineSlot(at(4, 59))).toBe("none");
    expect(routineSlot(at(5, 0))).toBe("morning");
    expect(routineSlot(at(11, 59))).toBe("morning");
    expect(routineSlot(at(12, 0))).toBe("none");
    expect(routineSlot(at(17, 59))).toBe("none");
    expect(routineSlot(at(18, 0))).toBe("evening");
  });

  it("calcola differenze tra date civili senza dipendere dalla durata DST", () => {
    expect(dayDifference("2026-03-28", "2026-03-29")).toBe(1);
    expect(dayDifference("2026-10-24", "2026-10-25")).toBe(1);
    expect(dayDifference("2026-12-31", "2027-01-01")).toBe(1);
  });

  it("distingue serie corrente e record storico", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 23, 12));
    const history = [
      completed("a", new Date(2026, 8, 10, 8)),
      completed("b", new Date(2026, 8, 11, 8)),
      completed("c", new Date(2026, 8, 12, 8)),
      completed("d", new Date(2026, 8, 22, 8)),
      completed("e", new Date(2026, 8, 23, 8)),
    ];
    expect(longestCompletedDayStreak(history)).toBe(3);
    expect(currentCompletedDayStreak(history)).toBe(2);
    expect(localDateKey(history[4].startedAt)).toBe("2026-09-23");
    expect(sameLocalDay(history[4].startedAt, new Date(2026, 8, 23, 22).getTime())).toBe(true);
    vi.useRealTimers();
  });
});
