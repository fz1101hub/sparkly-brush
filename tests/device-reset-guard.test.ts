import { describe, expect, it } from "vitest";

import { assertSafePostResetSessions } from "@/lib/device-reset-guard";

describe("device reset guard", () => {
  it("accetta una nuova generazione bassa dopo un contatore precedente alto", () => {
    expect(() => assertSafePostResetSessions({
      resetBaselineSessionId: 101,
      sessionIds: [1, 2, 3],
    })).not.toThrow();
  });

  it.each([
    { baseline: 101, sessions: [100, 101] },
    { baseline: 8, sessions: [7, 8] },
    { baseline: 101, sessions: [17] },
  ])("rifiuta lo storico non azzerato $sessions", ({ baseline, sessions }) => {
    expect(() => assertSafePostResetSessions({
      resetBaselineSessionId: baseline,
      sessionIds: sessions,
    })).toThrow("reset di fabbrica");
  });

  it("rifiuta una baseline mancante invece di accreditare in modo ambiguo", () => {
    expect(() => assertSafePostResetSessions({
      resetBaselineSessionId: null,
      sessionIds: [1],
    })).toThrow("Stato del reset BLE non valido");
  });
});
