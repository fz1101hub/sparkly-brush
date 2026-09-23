import { describe, expect, it } from "vitest";

import type { BrushSession } from "@/lib/brush-types";
import { reconcileLegacyProgress } from "@/lib/legacy-migration";
import { createLifetimeProgress } from "@/lib/lifetime-progress";

function session(id: string, startedAt: number): BrushSession {
  return {
    id,
    startedAt,
    durationSeconds: 120,
    targetSeconds: 120,
    completed: true,
    source: "manual",
  };
}

describe("legacy migration reconciliation", () => {
  it("unisce il blob lifetime stale con le sessioni v2 recenti e preserva gli aggregati più nuovi", () => {
    const oldRows = [session("old-1", 1), session("old-2", 2)];
    const newerRow = session("new-v2", 3);
    const progressV2 = createLifetimeProgress([...oldRows, newerRow]);

    const result = reconcileLegacyProgress(oldRows, [newerRow], [], progressV2);

    expect(result.history.map((item) => item.id)).toEqual(["new-v2", "old-2", "old-1"]);
    expect(result.progress.attemptedSessions).toBe(3);
    expect(result.historyComplete).toBe(true);
  });

  it("mantiene la baseline v2 e marca parziale quando non tutte le righe sono disponibili", () => {
    const availableRows = [session("recent-1", 10), session("recent-2", 11)];
    const progressV2 = {
      ...createLifetimeProgress(availableRows),
      attemptedSessions: 365,
      completedSessions: 365,
    };

    const result = reconcileLegacyProgress([], availableRows, [], progressV2);

    expect(result.history).toHaveLength(2);
    expect(result.progress.attemptedSessions).toBe(365);
    expect(result.historyComplete).toBe(false);
  });
});
