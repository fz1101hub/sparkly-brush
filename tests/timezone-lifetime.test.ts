import { describe, expect, it } from "vitest";

import type { BrushSession } from "@/lib/brush-types";
import { dayDifference, localDateKey } from "@/lib/day-progress";
import {
  applySessionToLifetime,
  createEmptyLifetimeProgress,
} from "@/lib/lifetime-progress";

type TimezoneCase = {
  repeatedHour: [number, number];
  morning: number;
  evening: number;
};

const CASES: Record<string, TimezoneCase> = {
  UTC: {
    repeatedHour: [Date.UTC(2026, 0, 1, 5, 30), Date.UTC(2026, 0, 1, 6, 30)],
    morning: Date.UTC(2026, 0, 2, 6),
    evening: Date.UTC(2026, 0, 2, 18),
  },
  "America/New_York": {
    repeatedHour: [Date.UTC(2026, 10, 1, 5, 30), Date.UTC(2026, 10, 1, 6, 30)],
    morning: Date.UTC(2026, 2, 8, 10),
    evening: Date.UTC(2026, 2, 8, 22),
  },
  "Europe/Rome": {
    repeatedHour: [Date.UTC(2026, 9, 25, 0, 30), Date.UTC(2026, 9, 25, 1, 30)],
    morning: Date.UTC(2026, 2, 29, 4),
    evening: Date.UTC(2026, 2, 29, 16),
  },
  "Pacific/Kiritimati": {
    repeatedHour: [Date.UTC(2026, 0, 1, 10), Date.UTC(2026, 0, 1, 11)],
    morning: Date.UTC(2026, 0, 1, 16),
    evening: Date.UTC(2026, 0, 2, 4),
  },
};

function completedSession(id: string, startedAt: number): BrushSession {
  return {
    id,
    startedAt,
    timeConfidence: "exact",
    rewardPolicy: "completed-only",
    durationSeconds: 120,
    targetSeconds: 120,
    completed: true,
    source: "manual",
  };
}

describe(`timezone lifetime invariants (${process.env.TZ ?? "system"})`, () => {
  const fixture = CASES[process.env.TZ ?? ""] ?? CASES.UTC;

  it("considera consecutivi i giorni civili anche attraverso DST", () => {
    expect(dayDifference("2026-03-28", "2026-03-29")).toBe(1);
    expect(dayDifference("2026-10-25", "2026-10-26")).toBe(1);
  });

  it("non duplica lo streak durante l'ora ripetuta", () => {
    expect(localDateKey(fixture.repeatedHour[0])).toBe(localDateKey(fixture.repeatedHour[1]));
    let progress = createEmptyLifetimeProgress();
    progress = applySessionToLifetime(progress, completedSession("first-hour", fixture.repeatedHour[0]));
    progress = applySessionToLifetime(progress, completedSession("second-hour", fixture.repeatedHour[1]));

    expect(progress.completedSessions).toBe(2);
    expect(progress.currentStreakDays).toBe(1);
    expect(progress.longestStreakDays).toBe(1);
  });

  it("riconosce mattina e sera nello stesso giorno locale", () => {
    expect(localDateKey(fixture.morning)).toBe(localDateKey(fixture.evening));
    let progress = createEmptyLifetimeProgress();
    progress = applySessionToLifetime(progress, completedSession("morning", fixture.morning));
    progress = applySessionToLifetime(progress, completedSession("evening", fixture.evening));

    expect(progress.perfectDays).toBe(1);
    expect(progress.currentStreakDays).toBe(1);
    expect(progress.dailyBonusCoins).toBeGreaterThan(0);
  });
});
