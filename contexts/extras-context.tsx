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

import type { BrushlingId } from "@/lib/brushlings";
import { DEFAULT_EXTRAS, getExtrasStorage, normalizeExtras, type Extras } from "@/lib/extras";

type ExtrasContextValue = {
  ready: boolean;
  extras: Extras;
  /** A change computed from the latest saved record; shown once saved. */
  apply: (change: (previous: Extras) => Extras) => Promise<void>;
  /** Replaces the whole record with a backup's (restore and its rollback). */
  restoreExtras: (extras: Extras) => Promise<void>;
};

const ExtrasContext = createContext<ExtrasContextValue | null>(null);

/** Small per-child settings and records (streak days, session length, creature names…). */
export function ExtrasProvider({ children }: PropsWithChildren) {
  // Captured at mount: a late write after a child switch must stay in this child's records.
  const store = useRef(getExtrasStorage());
  const [extras, setExtras] = useState<Extras>(DEFAULT_EXTRAS);
  const [ready, setReady] = useState(false);
  const current = useRef<Extras>(DEFAULT_EXTRAS);
  const writes = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    void store.current
      .load()
      .catch(() => ({ ...DEFAULT_EXTRAS }))
      .then((loaded) => {
        if (!active) return;
        current.current = loaded;
        setExtras(loaded);
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const apply = useCallback((change: (previous: Extras) => Extras) => {
    const operation = writes.current.catch(() => undefined).then(async () => {
      const next = normalizeExtras(change(current.current));
      await store.current.save(next);
      current.current = next;
      setExtras(next);
    });
    writes.current = operation;
    return operation;
  }, []);
  const restoreExtras = useCallback((restored: Extras) => apply(() => restored), [apply]);

  const value = useMemo(() => ({ ready, extras, apply, restoreExtras }), [apply, extras, ready, restoreExtras]);
  return <ExtrasContext.Provider value={value}>{children}</ExtrasContext.Provider>;
}

export function useExtras(): ExtrasContextValue {
  const value = useContext(ExtrasContext);
  if (!value) throw new Error("useExtras deve essere usato dentro ExtrasProvider");
  return value;
}

/** The name the child gave the creature, or its own name (also outside the provider). */
export function useCreatureName(id: BrushlingId, fallback: string): string {
  return useContext(ExtrasContext)?.extras.creatureNames[id] ?? fallback;
}

/** The custom name only, or undefined (also outside the provider). */
export function useOptionalCreatureName(id: BrushlingId): string | undefined {
  return useContext(ExtrasContext)?.extras.creatureNames[id];
}

/** Seconds of a timer session chosen by the parent (120 outside the provider). */
export function useSessionSeconds(): number {
  return useContext(ExtrasContext)?.extras.sessionSeconds ?? DEFAULT_EXTRAS.sessionSeconds;
}
