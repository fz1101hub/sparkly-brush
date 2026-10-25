import type { BrushSession } from "@/lib/brush-types";
import { LocalizedError } from "@/lib/localized-error";
import { createProfileStorage, createProfileStore } from "@/lib/profile-scope";

/** The guided timer target; the E2E build shortens it so browser tests finish quickly. */
export const MANUAL_TARGET_SECONDS = process.env.EXPO_PUBLIC_E2E === "1" ? 5 : 120;

/**
 * One record per profile for the guided timer (from PR #10): written when a session starts and
 * every second while it runs, so an app that is closed or killed can offer to resume it; once the
 * session is stopped it also carries the completed `pending` session until it is saved for good.
 */
export const MANUAL_SESSION_KEY = "sparkly-brush.manual-session.v1";
/** Earlier journal of this branch, holding only the session waiting to be saved. */
const LEGACY_PENDING_KEY = "sparkly-brush.manual.pending.v1";

export type ManualCheckpoint = {
  version: 1;
  id: string;
  startedAt: number;
  elapsedSeconds: number;
  demo: boolean;
  pending?: BrushSession;
};

function isPendingManualSession(value: unknown): value is BrushSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<BrushSession>;
  return typeof session.id === "string"
    && session.id.length > 0
    && session.id.length <= 512
    && Number.isSafeInteger(session.startedAt)
    && (session.startedAt ?? -1) >= 0
    && Number.isSafeInteger(session.durationSeconds)
    && (session.durationSeconds ?? -1) >= 5
    && (session.durationSeconds ?? 0) <= 120
    && Number.isSafeInteger(session.targetSeconds)
    && (session.targetSeconds ?? 0) > 0
    && typeof session.completed === "boolean"
    && (session.source === "manual" || session.source === "demo");
}

export function parseManualCheckpoint(raw: string | null): ManualCheckpoint | null {
  if (!raw) return null;
  let value: ManualCheckpoint;
  try {
    value = JSON.parse(raw) as ManualCheckpoint;
  } catch {
    throw new LocalizedError("brush.error.manualJournalUnreadable");
  }
  if (
    value?.version !== 1
    || typeof value.id !== "string"
    || !value.id
    || value.id.length > 512
    || !Number.isSafeInteger(value.startedAt)
    || value.startedAt <= 0
    || !Number.isInteger(value.elapsedSeconds)
    || value.elapsedSeconds < 0
    || value.elapsedSeconds > MANUAL_TARGET_SECONDS
    || typeof value.demo !== "boolean"
  ) {
    throw new LocalizedError("brush.error.manualJournalUnreadable");
  }
  // A pending session must be exactly the one the checkpoint tracked, with the reward it earned.
  if (
    value.pending
    && (!isPendingManualSession(value.pending)
      || value.pending.id !== value.id
      || value.pending.startedAt !== value.startedAt
      || value.pending.durationSeconds !== value.elapsedSeconds
      || value.pending.targetSeconds !== MANUAL_TARGET_SECONDS
      || value.pending.rewardPolicy !== "completed-only"
      || value.pending.completed !== value.elapsedSeconds >= Math.ceil(MANUAL_TARGET_SECONDS * 0.9)
      || value.pending.source !== (value.demo ? "demo" : "manual"))
  ) {
    throw new LocalizedError("brush.error.manualJournalUnreadable");
  }
  return value;
}

function checkpointFromPending(session: BrushSession): ManualCheckpoint {
  return {
    version: 1,
    id: session.id,
    startedAt: session.startedAt,
    elapsedSeconds: Math.min(MANUAL_TARGET_SECONDS, session.durationSeconds),
    demo: session.source === "demo",
    pending: session,
  };
}

export const getManualSessionStorage = createProfileStore((profileId: string) => {
  const storage = createProfileStorage(profileId);
  let writes: Promise<void> = Promise.resolve();
  const queue = <T,>(operation: () => Promise<T>) => {
    const result = writes.then(operation, operation);
    writes = result.then(() => undefined, () => undefined);
    return result;
  };

  async function readCheckpoint(): Promise<ManualCheckpoint | null> {
    const current = parseManualCheckpoint(await storage.getItem(MANUAL_SESSION_KEY));
    if (current) return current;
    const legacyRaw = await storage.getItem(LEGACY_PENDING_KEY);
    if (!legacyRaw) return null;
    try {
      const legacy: unknown = JSON.parse(legacyRaw);
      if (!isPendingManualSession(legacy)) return null;
      const migrated = parseManualCheckpoint(JSON.stringify(checkpointFromPending(legacy)));
      if (!migrated) return null;
      await storage.setItem(MANUAL_SESSION_KEY, JSON.stringify(migrated));
      await storage.removeItem(LEGACY_PENDING_KEY);
      return migrated;
    } catch {
      return null;
    }
  }

  return {
    load: () => queue(readCheckpoint),
    save: (checkpoint: ManualCheckpoint) => queue(async () => {
      parseManualCheckpoint(JSON.stringify(checkpoint));
      await storage.setItem(MANUAL_SESSION_KEY, JSON.stringify(checkpoint));
    }),
    clear: () => queue(() => storage.multiRemove([MANUAL_SESSION_KEY, LEGACY_PENDING_KEY])),
  };
});

type ManualSessionStorage = ReturnType<typeof getManualSessionStorage>;
export const loadManualCheckpoint: ManualSessionStorage["load"] = () => getManualSessionStorage().load();
export const saveManualCheckpoint: ManualSessionStorage["save"] = (checkpoint) => getManualSessionStorage().save(checkpoint);
export const clearManualCheckpoint: ManualSessionStorage["clear"] = () => getManualSessionStorage().clear();

/** The session waiting to be saved, if the last stop was interrupted before its save finished. */
export async function loadPendingManualSession(): Promise<BrushSession | null> {
  try {
    return (await loadManualCheckpoint())?.pending ?? null;
  } catch {
    return null;
  }
}

export async function savePendingManualSession(session: BrushSession): Promise<void> {
  if (!isPendingManualSession(session)) throw new LocalizedError("brush.error.manualJournalUnreadable");
  await saveManualCheckpoint(checkpointFromPending(session));
}

export async function clearPendingManualSession(): Promise<void> {
  await clearManualCheckpoint();
}
