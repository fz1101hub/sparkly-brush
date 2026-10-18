import type { BrushSession } from "@/lib/brush-types";
import { createProfileStorage, createProfileStore } from "@/lib/profile-scope";

export const MANUAL_SESSION_KEY = "sparkly-brush.manual-session.v1";
export type ManualCheckpoint = {
  version: 1;
  id: string;
  startedAt: number;
  elapsedSeconds: number;
  demo: boolean;
  pending?: BrushSession;
};

export function parseManualCheckpoint(
  raw: string | null,
): ManualCheckpoint | null {
  if (!raw) return null;
  const value = JSON.parse(raw) as ManualCheckpoint;
  if (
    value?.version !== 1 ||
    typeof value.id !== "string" ||
    value.id.length > 120 ||
    !Number.isFinite(value.startedAt) ||
    value.startedAt <= 0 ||
    !Number.isInteger(value.elapsedSeconds) ||
    value.elapsedSeconds < 0 ||
    value.elapsedSeconds > 120 ||
    typeof value.demo !== "boolean"
  ) {
    throw new Error(
      "La sessione interrotta non è leggibile. I progressi già salvati sono al sicuro.",
    );
  }
  if (
    value.pending &&
    (value.pending.id !== value.id ||
      value.pending.startedAt !== value.startedAt ||
      value.pending.durationSeconds !== value.elapsedSeconds ||
      value.pending.targetSeconds !== 120 ||
      value.pending.source !== (value.demo ? "demo" : "manual") ||
      value.pending.rewardPolicy !== "completed-only" ||
      value.pending.completed !== value.elapsedSeconds >= 108)
  ) {
    throw new Error("La sessione da recuperare non è valida");
  }
  return value;
}

export const getManualSessionStorage = createProfileStore((id: string) => {
  const storage = createProfileStorage(id);
  let writes: Promise<void> = Promise.resolve();
  const queue = <T>(operation: () => Promise<T>) => {
    const result = writes.then(operation, operation);
    writes = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
  return {
    load: () =>
      queue(async () =>
        parseManualCheckpoint(await storage.getItem(MANUAL_SESSION_KEY)),
      ),
    save: (checkpoint: ManualCheckpoint) =>
      queue(() =>
        storage.setItem(MANUAL_SESSION_KEY, JSON.stringify(checkpoint)),
      ),
    clear: () => queue(() => storage.removeItem(MANUAL_SESSION_KEY)),
  };
});
