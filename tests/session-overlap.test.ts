import { describe, expect, it } from "vitest";

import { sessionsOverlap } from "@/lib/session-overlap";

const minute = 60_000;

describe("sessionsOverlap", () => {
  it("riconosce la stessa spazzolata anche con orologi leggermente diversi", () => {
    const manual = { startedAt: 10 * minute, durationSeconds: 120 };
    expect(sessionsOverlap(manual, { startedAt: 10 * minute + 20_000, durationSeconds: 118 })).toBe(true);
    expect(sessionsOverlap(manual, { startedAt: 8 * minute + 30_000, durationSeconds: 120 })).toBe(true);
    expect(sessionsOverlap(manual, { startedAt: 13 * minute, durationSeconds: 120 })).toBe(true);
  });

  it("distingue due spazzolate separate", () => {
    const manual = { startedAt: 10 * minute, durationSeconds: 120 };
    expect(sessionsOverlap(manual, { startedAt: 15 * minute, durationSeconds: 120 })).toBe(false);
    expect(sessionsOverlap(manual, { startedAt: 4 * minute, durationSeconds: 120 })).toBe(false);
    expect(sessionsOverlap(manual, { startedAt: 15 * minute, durationSeconds: 120 }, 0)).toBe(false);
  });
});
