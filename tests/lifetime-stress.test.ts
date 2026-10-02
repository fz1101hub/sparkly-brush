import { describe, expect, it } from "vitest";

import type { BrushSession } from "@/lib/brush-types";
import {
  applySessionToLifetime,
  createEmptyLifetimeProgress,
  createLifetimeProgress,
} from "@/lib/lifetime-progress";

const TWENTY_YEARS_OF_SESSIONS = 14_610;
const STARTED_AT = Date.UTC(2020, 0, 1, 6);

function generatedSession(index: number): BrushSession {
  return {
    id: `stress-${index}`,
    startedAt: STARTED_AT + index * 43_200_000,
    timeConfidence: "approximate",
    rewardPolicy: "completed-only",
    durationSeconds: 120,
    targetSeconds: 120,
    completed: true,
    source: index % 2 === 0 ? "device" : "manual",
    deviceSessionId: index % 2 === 0 ? index & 0xffff : undefined,
  };
}

describe("lifetime multi-year stress", () => {
  it("accumula vent'anni di sessioni senza conservare lo storico nel test", () => {
    let progress = createEmptyLifetimeProgress();

    for (let index = 0; index < TWENTY_YEARS_OF_SESSIONS; index += 1) {
      progress = applySessionToLifetime(progress, generatedSession(index));
    }

    expect(progress.attemptedSessions).toBe(TWENTY_YEARS_OF_SESSIONS);
    expect(progress.completedSessions).toBe(TWENTY_YEARS_OF_SESSIONS);
    expect(progress.totalBrushingSeconds).toBe(TWENTY_YEARS_OF_SESSIONS * 120);
    expect(progress.rewardedBrushingSeconds).toBe(TWENTY_YEARS_OF_SESSIONS * 120);
    expect(progress.xp).toBe(TWENTY_YEARS_OF_SESSIONS * 60);
    expect(Object.values(progress.itemCounts).reduce((total, count) => total + count, 0))
      .toBe(TWENTY_YEARS_OF_SESSIONS);
    expect(progress.activeDateKey).toBeNull();
    expect(progress.perfectDays).toBe(0);
  });

  it("produce lo stesso risultato tra replay incrementale e replay ordinato", () => {
    const sample = Array.from({ length: 1_000 }, (_, index) => generatedSession(index));
    let incremental = createEmptyLifetimeProgress();
    for (const item of sample) incremental = applySessionToLifetime(incremental, item);

    expect(createLifetimeProgress([...sample].reverse())).toEqual(incremental);
  });
});
