export const MAX_POST_RESET_SESSION_ID = 16;

export function assertSafePostResetSessions(input: {
  resetBaselineSessionId: number | null | undefined;
  sessionIds: number[];
}): void {
  if (input.sessionIds.length === 0) return;
  const baseline = input.resetBaselineSessionId;
  if (typeof baseline !== "number" || !Number.isInteger(baseline) || baseline < 0 || baseline > 65_535) {
    throw new Error("Stato del reset BLE non valido: dimentica e reimposta nuovamente il manico");
  }
  if (input.sessionIds.some((sessionId) => (
    !Number.isInteger(sessionId)
    || sessionId < 0
    || sessionId > MAX_POST_RESET_SESSION_ID
  ))) {
    throw new Error("Il manico conserva ancora uno storico precedente: esegui prima il reset di fabbrica");
  }
  const latest = input.sessionIds.at(-1) ?? 0;
  if (baseline <= MAX_POST_RESET_SESSION_ID && latest >= baseline) {
    throw new Error("Il contatore BLE non risulta azzerato: esegui prima il reset di fabbrica");
  }
}
