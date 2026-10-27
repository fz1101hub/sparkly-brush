import { describe, expect, it } from "vitest";

import { BackupSemanticValidator } from "@/lib/backup-integrity";
import type { BrushSession } from "@/lib/brush-types";
import {
  applySessionToLifetime,
  createEmptyLifetimeProgress,
} from "@/lib/lifetime-progress";
import { createRewardLedgerEntries } from "@/lib/reward-ledger";

const SESSION_COUNT = 20_000;

function streamSession(index: number): BrushSession {
  return {
    id: `archive-${index}`,
    startedAt: Date.UTC(2015, 0, 1) + index * 60_000,
    timeConfidence: "approximate",
    rewardPolicy: "completed-only",
    durationSeconds: index % 5 === 0 ? 45 : 120,
    targetSeconds: 120,
    completed: index % 5 !== 0,
    source: "device",
    deviceSessionId: index & 0xffff,
  };
}

describe("streaming backup semantic validation", () => {
  it("valida un archivio pluriennale con solo stato scalare e la sessione attiva", () => {
    const validator = new BackupSemanticValidator(true, true);
    let progress = createEmptyLifetimeProgress();
    let checkpointBytes = 0;

    for (let index = 0; index < SESSION_COUNT; index += 1) {
      const session = streamSession(index);
      const before = progress;
      progress = applySessionToLifetime(before, session);
      validator.beginSession(session);
      for (const entry of createRewardLedgerEntries({ session, before, after: progress })) {
        validator.addLedgerEntry(entry);
      }
      if (index === 999) checkpointBytes = Buffer.byteLength(JSON.stringify(validator));
    }

    expect(() => validator.finish(progress)).not.toThrow();
    expect(progress.attemptedSessions).toBe(SESSION_COUNT);
    expect(progress.completedSessions).toBe(16_000);
    expect(Object.values(validator as unknown as Record<string, unknown>))
      .not.toContainEqual(expect.any(Set));
    const finalBytes = Buffer.byteLength(JSON.stringify(validator));
    expect(checkpointBytes).toBeGreaterThan(0);
    expect(finalBytes).toBeLessThanOrEqual(checkpointBytes + 256);
    expect(finalBytes).toBeLessThan(4_096);
  });
});
