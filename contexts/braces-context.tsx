import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useCurrentDayTimestamp } from "@/hooks/use-current-day";
import {
  careStreak,
  DEFAULT_BRACES,
  getBracesStorage,
  hadCleanWeek,
  normalizeBraces,
  showsNewSmile,
  withCareDay,
  type BracesSettings,
} from "@/lib/braces";
import { localDateKey } from "@/lib/day-progress";

type BracesContextValue = {
  ready: boolean;
  settings: BracesSettings;
  /** Braces on now: enabled and not yet removed. */
  active: boolean;
  streak: number;
  doneToday: boolean;
  cleanWeek: boolean;
  /** The two weeks after the braces came off: the creature sparkles. */
  newSmile: boolean;
  update: (change: Partial<BracesSettings>) => Promise<void>;
  recordCare: () => Promise<void>;
  /** The day the braces come off: the creature takes them off too, and the app celebrates. */
  markRemoved: () => Promise<void>;
  /** Replaces the settings with a backup's (restore and its rollback). */
  restoreBraces: (settings: BracesSettings) => Promise<void>;
};

const BracesContext = createContext<BracesContextValue | null>(null);

/** Braces mode for the active child (one record per profile). */
export function BracesProvider({ children }: PropsWithChildren) {
  // Captured at mount: a late write after a child switch must stay in this child's records.
  const store = useRef(getBracesStorage());
  const today = useCurrentDayTimestamp();
  const [settings, setSettings] = useState<BracesSettings>(DEFAULT_BRACES);
  const [ready, setReady] = useState(false);
  const current = useRef<BracesSettings>(DEFAULT_BRACES);
  const writes = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    void store.current
      .load()
      .then((loaded) => {
        if (!active) return;
        current.current = loaded;
        setSettings(loaded);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  /** Saved first, shown after: a failed write leaves the screen on what is stored. */
  const commit = useCallback((change: (previous: BracesSettings) => BracesSettings) => {
    const operation = writes.current.catch(() => undefined).then(async () => {
      const next = normalizeBraces(change(current.current));
      await store.current.save(next);
      current.current = next;
      setSettings(next);
    });
    writes.current = operation;
    return operation;
  }, []);

  const update = useCallback(
    (change: Partial<BracesSettings>) => commit((previous) => ({ ...previous, ...change })),
    [commit],
  );
  const recordCare = useCallback(() => commit((previous) => withCareDay(previous, Date.now())), [commit]);
  const markRemoved = useCallback(
    () => commit((previous) => ({ ...previous, enabled: false, removedAt: Date.now() })),
    [commit],
  );
  const restoreBraces = useCallback((restored: BracesSettings) => commit(() => restored), [commit]);

  const value = useMemo<BracesContextValue>(
    () => ({
      ready,
      settings,
      active: settings.enabled,
      streak: careStreak(settings.careDays, today),
      doneToday: settings.careDays.includes(localDateKey(today)),
      cleanWeek: hadCleanWeek(settings.careDays),
      newSmile: showsNewSmile(settings, today),
      update,
      recordCare,
      markRemoved,
      restoreBraces,
    }),
    [markRemoved, ready, recordCare, restoreBraces, settings, today, update],
  );

  return <BracesContext.Provider value={value}>{children}</BracesContext.Provider>;
}

export function useBraces(): BracesContextValue {
  const value = useContext(BracesContext);
  if (!value) throw new Error("useBraces deve essere usato dentro BracesProvider");
  return value;
}

/** The braces the child's creature wears, or null (also outside the provider, as in tests). */
export function useCreatureBraces(): Pick<BracesSettings, "type" | "elasticColor"> | null {
  const value = useContext(BracesContext);
  if (!value?.active) return null;
  return { type: value.settings.type, elasticColor: value.settings.elasticColor };
}

/** True in the two weeks after the braces came off (false outside the provider). */
export function useNewSmile(): boolean {
  return useContext(BracesContext)?.newSmile ?? false;
}
