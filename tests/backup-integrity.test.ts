import { describe, expect, it } from "vitest";

import {
  BackupSemanticValidator,
  validateBackupSemanticState,
  type PersistedRewardLedgerEntry,
} from "@/lib/backup-integrity";
import type { BrushSession } from "@/lib/brush-types";
import {
  applySessionToLifetime,
  createEmptyLifetimeProgress,
  createLifetimeProgress,
} from "@/lib/lifetime-progress";
import { createRewardLedgerEntries } from "@/lib/reward-ledger";

const start = new Date(2026, 8, 23, 8).getTime();

function session(id: string, offset: number, completed = true): BrushSession {
  return {
    id,
    startedAt: start + offset,
    durationSeconds: completed ? 120 : 45,
    targetSeconds: 120,
    completed,
    source: "device",
  };
}

function ledgerFor(history: BrushSession[]): PersistedRewardLedgerEntry[] {
  let progress = createEmptyLifetimeProgress();
  const ledger: PersistedRewardLedgerEntry[] = [];
  for (const item of [...history].sort((a, b) => a.startedAt - b.startedAt || a.id.localeCompare(b.id))) {
    const after = applySessionToLifetime(progress, item);
    ledger.push(...createRewardLedgerEntries({ session: item, before: progress, after }));
    progress = after;
  }
  return ledger;
}

describe("backup semantic integrity", () => {
  const history = [session("first", 0), session("second", 60_000, false), session("third", 120_000)];

  it("accetta un archivio completo ricostruibile", () => {
    expect(() => validateBackupSemanticState({
      sessions: history,
      progress: createLifetimeProgress(history),
      historyComplete: true,
      ledger: ledgerFor(history),
    })).not.toThrow();
  });

  it("accetta un archivio genuino dopo il trasferimento in un altro fuso orario", () => {
    const previousTimezone = process.env.TZ;
    try {
      process.env.TZ = "Pacific/Kiritimati";
      const crossTimezoneHistory: BrushSession[] = [
        session("timezone-morning", Date.UTC(2026, 0, 1, 18, 30) - start, true),
        session("timezone-evening", Date.UTC(2026, 0, 2, 7, 30) - start, true),
      ];
      const progress = createLifetimeProgress(crossTimezoneHistory);
      const ledger = ledgerFor(crossTimezoneHistory);

      process.env.TZ = "America/Adak";
      expect(() => validateBackupSemanticState({
        sessions: crossTimezoneHistory,
        progress,
        historyComplete: true,
        ledger,
      })).not.toThrow();
    } finally {
      process.env.TZ = previousTimezone;
    }
  });

  it("rifiuta aggregati lifetime gonfiati anche se il manifest li replica", () => {
    const progress = createLifetimeProgress(history);
    expect(() => validateBackupSemanticState({
      sessions: history,
      progress: { ...progress, xp: progress.xp + 10_000 },
      historyComplete: true,
      ledger: ledgerFor(history),
    })).toThrow("aggregati lifetime");
  });

  it("rifiuta importi reward alterati mantenendo invariato il conteggio", () => {
    const ledger = ledgerFor(history);
    ledger[0] = { ...ledger[0], coins: Math.max(0, ledger[0].coins - 1) };
    expect(() => validateBackupSemanticState({
      sessions: history,
      progress: createLifetimeProgress(history),
      historyComplete: true,
      ledger,
    })).toThrow("importi o associazioni");
  });

  it("rifiuta reward associati a una sessione inesistente", () => {
    const ledger = ledgerFor(history);
    ledger[0] = { ...ledger[0], sessionId: "missing" };
    expect(() => validateBackupSemanticState({
      sessions: history,
      progress: createLifetimeProgress(history),
      historyComplete: true,
      ledger,
    })).toThrow("non è coerente");
  });

  it("accetta una baseline parziale solo se domina le righe disponibili", () => {
    const archived = history.slice(-1);
    const lifetime = createLifetimeProgress(history);
    expect(() => validateBackupSemanticState({
      sessions: archived,
      progress: lifetime,
      historyComplete: false,
      ledger: null,
    })).not.toThrow();

    expect(() => validateBackupSemanticState({
      sessions: archived,
      progress: { ...lifetime, attemptedSessions: 0, completedSessions: 1 },
      historyComplete: false,
      ledger: null,
    })).toThrow("baseline lifetime parziale");
  });

  it("valida incrementalmente un archivio esteso senza materializzarne le righe", () => {
    const validator = new BackupSemanticValidator(true, false);
    let progress = createEmptyLifetimeProgress();
    for (let index = 0; index < 10_000; index += 1) {
      const item = session(`stream-${index}`, index * 1_000, index % 3 !== 0);
      validator.beginSession(item);
      progress = applySessionToLifetime(progress, item);
    }

    expect(() => validator.finish(progress)).not.toThrow();
  });
});
