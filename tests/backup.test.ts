import { describe, expect, it } from "vitest";

import { createBackup, parseBackup, serializeBackup } from "@/lib/backup";
import { DEFAULT_CUSTOMIZATION_STATE } from "@/lib/customization";
import type { BrushSession } from "@/lib/brush-types";

const session: BrushSession = {
  id: "real-1",
  startedAt: new Date(2026, 8, 8, 8).getTime(),
  durationSeconds: 120,
  targetSeconds: 120,
  completed: true,
  source: "manual",
};

describe("portable Brushlings backup", () => {
  it("round-trips the child game state", () => {
    const backup = createBackup(
      [session],
      { selectedId: "spriggo", hasChosenStarter: true },
      DEFAULT_CUSTOMIZATION_STATE,
      123456,
    );

    const restored = parseBackup(serializeBackup(backup));
    expect(restored.profile.selectedId).toBe("spriggo");
    expect(restored.history).toHaveLength(1);
    expect(restored.createdAt).toBe(123456);
  });

  it("rejects malformed or unsupported backup codes", () => {
    expect(() => parseBackup("hello")).toThrow();
    expect(() => parseBackup("BRUSHLINGS-BACKUP-1:{\"version\":2}")).toThrow();
  });
});