import { describe, expect, it } from "vitest";

import type { BrushSession } from "@/lib/brush-types";
import { applySessionToLifetime, createEmptyLifetimeProgress } from "@/lib/lifetime-progress";
import { createRewardLedgerEntries } from "@/lib/reward-ledger";

function session(id: string, date: Date): BrushSession {
  return {
    id,
    startedAt: date.getTime(),
    durationSeconds: 120,
    targetSeconds: 120,
    completed: true,
    source: "manual",
  };
}

describe("reward ledger", () => {
  it("genera chiavi deterministiche e un credito base auditabile", () => {
    const before = createEmptyLifetimeProgress();
    const current = session("manual:one", new Date(2026, 8, 23, 8));
    const after = applySessionToLifetime(before, current);
    const first = createRewardLedgerEntries({ session: current, before, after });
    const replay = createRewardLedgerEntries({ session: current, before, after });

    expect(replay).toEqual(first);
    expect(first[0]).toMatchObject({
      id: "session:manual%3Aone:base",
      sessionId: "manual:one",
      kind: "session",
      coins: 14,
      xp: 60,
    });
    expect(new Set(first.map((entry) => entry.id)).size).toBe(first.length);
  });

  it("registra separatamente bonus missioni e achievement", () => {
    const morning = session("morning", new Date(2026, 8, 23, 8));
    const evening = session("evening", new Date(2026, 8, 23, 19));
    const empty = createEmptyLifetimeProgress();
    const afterMorning = applySessionToLifetime(empty, morning);
    const afterEvening = applySessionToLifetime(afterMorning, evening);
    const morningEntries = createRewardLedgerEntries({ session: morning, before: empty, after: afterMorning });
    const entries = createRewardLedgerEntries({ session: evening, before: afterMorning, after: afterEvening });

    expect(entries.map((entry) => entry.kind)).toContain("daily-missions");
    expect(entries.find((entry) => entry.kind === "daily-missions")?.coins).toBeGreaterThan(0);
    expect(morningEntries.find((entry) => entry.kind === "achievements")?.details).toContain("Primo sorriso");
  });
});
