import { describe, expect, it } from "vitest";

import { compareBackupContents } from "@/lib/backup-comparison";
import { DEFAULT_CUSTOMIZATION_STATE } from "@/lib/customization";
import { createEmptyLifetimeProgress } from "@/lib/lifetime-progress";

function snapshot(
  attempted: number,
  completed: number,
  brushling: "bloopi" | "spriggo" = "bloopi",
) {
  return {
    profile: { selectedId: brushling, hasChosenStarter: true },
    customization: DEFAULT_CUSTOMIZATION_STATE,
    parentRewards: [],
    lifetimeProgress: {
      ...createEmptyLifetimeProgress(),
      attemptedSessions: attempted,
      completedSessions: completed,
    },
  };
}

describe("backup comparison before replacement", () => {
  it("does not confuse lifetime progress with the 120 consultable legacy rows", () => {
    const current = snapshot(400, 365);
    const legacy = snapshot(200, 180, "spriggo");
    const comparison = compareBackupContents(current, legacy, 120, false);

    expect(comparison.current.attemptedSessions).toBe(400);
    expect(comparison.incoming.attemptedSessions).toBe(200);
    expect(comparison.incoming.completedSessions).toBe(180);
    expect(comparison.incomingRows).toBe(120);
    expect(comparison.historyComplete).toBe(false);
    expect(comparison.lowerLifetimeProgress).toBe(true);
    expect(comparison.incoming.brushling).toBe("spriggo");
  });

  it("uses the verified file row count and detects lower completed progress separately", () => {
    const current = snapshot(20, 18);
    const file = snapshot(30, 15);
    const comparison = compareBackupContents(current, file, 30, true);

    expect(comparison.historyComplete).toBe(true);
    expect(comparison.incomingRows).toBe(30);
    expect(comparison.lowerLifetimeProgress).toBe(true);
  });

  it("reports equal or greater lifetime totals without promising identical histories or merging", () => {
    const current = snapshot(20, 18);
    const incoming = snapshot(20, 18, "spriggo");
    expect(compareBackupContents(current, incoming, 20, true)).toMatchObject({
      lowerLifetimeProgress: false,
      current: { brushling: "bloopi" },
      incoming: { brushling: "spriggo" },
    });
    expect(
      compareBackupContents(current, snapshot(35, 30), 35, true)
        .lowerLifetimeProgress,
    ).toBe(false);
  });

  it("reads only bounded metadata, even when the archive represents decades of sessions", () => {
    const current = snapshot(14_610, 14_000);
    const incoming = snapshot(20_000, 19_500);
    Object.defineProperty(incoming, "history", {
      get: () => {
        throw new Error("do not load the session archive");
      },
    });
    expect(
      compareBackupContents(current, incoming, 20_000, true),
    ).toMatchObject({
      incomingRows: 20_000,
      lowerLifetimeProgress: false,
      incoming: { attemptedSessions: 20_000, completedSessions: 19_500 },
    });
  });
});
