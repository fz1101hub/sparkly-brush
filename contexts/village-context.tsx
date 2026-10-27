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

import { AppState } from "react-native";

import { useBrush } from "@/contexts/brush-context";
import { useI18n } from "@/contexts/locale-context";
import { useCurrentDayTimestamp } from "@/hooks/use-current-day";
import { defaultLearningLanguage } from "@/lib/learning/tooth-names";
import { contentLocale, type ContentLocale } from "@/lib/locale-types";
import {
  DEFAULT_VILLAGE,
  energyStatus,
  getVillageStorage,
  isVillageAsleep,
  normalizeVillage,
  spendEnergy as spendEnergyState,
  withCard,
  type EnergyStatus,
  type VillageState,
} from "@/lib/village";

type VillageContextValue = {
  ready: boolean;
  state: VillageState;
  energy: EnergyStatus;
  /** The language the tooth-name games teach: the child's choice, or one different from the app's. */
  learningLanguage: ContentLocale;
  /** Pays one activity; false when today's energy is used up. */
  spendEnergy: () => Promise<boolean>;
  collectCard: (id: string) => Promise<void>;
  update: (change: Partial<VillageState>) => Promise<void>;
  /** A change computed from the latest saved state (lost teeth, bubbles, trophies…). */
  apply: (change: (previous: VillageState) => VillageState) => Promise<void>;
  /** Evening rest: between bedtime and the morning the games that cost energy are closed. */
  asleep: boolean;
  /** Replaces the whole village with a backup's (restore and its rollback). */
  restoreVillage: (state: VillageState) => Promise<void>;
};

const VillageContext = createContext<VillageContextValue | null>(null);

/** The Brushling village of the active child: energy, quiz cards and game progress. */
export function VillageProvider({ children }: PropsWithChildren) {
  // Captured at mount: a late write after a child switch must stay in this child's records.
  const store = useRef(getVillageStorage());
  const { history } = useBrush();
  const { locale } = useI18n();
  const today = useCurrentDayTimestamp();
  const [state, setState] = useState<VillageState>(DEFAULT_VILLAGE);
  const [ready, setReady] = useState(false);
  const current = useRef<VillageState>(DEFAULT_VILLAGE);
  const historyRef = useRef(history);
  const writes = useRef<Promise<unknown>>(Promise.resolve());
  // Minute clock for the evening rest (the day timestamp alone does not see bedtime come).
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = setInterval(tick, 60_000);
    const subscription = AppState.addEventListener("change", (appState) => {
      if (appState === "active") tick();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    let active = true;
    void store.current
      .load()
      .then((loaded) => {
        if (!active) return;
        current.current = loaded;
        setState(loaded);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  /** Writes one change at a time, on the latest state; shown only once saved. */
  const commit = useCallback(<T,>(change: (previous: VillageState) => { next: VillageState; result: T }) => {
    const operation = writes.current.catch(() => undefined).then(async () => {
      const { next, result } = change(current.current);
      if (next !== current.current) {
        const normalized = normalizeVillage(next);
        await store.current.save(normalized);
        current.current = normalized;
        setState(normalized);
      }
      return result;
    });
    writes.current = operation;
    return operation;
  }, []);

  const spendEnergy = useCallback(
    () =>
      commit((previous) => {
        const next = spendEnergyState(previous, historyRef.current, Date.now());
        return next ? { next, result: true } : { next: previous, result: false };
      }),
    [commit],
  );
  const collectCard = useCallback(
    (id: string) => commit((previous) => ({ next: withCard(previous, id), result: undefined })),
    [commit],
  );
  const update = useCallback(
    (change: Partial<VillageState>) => commit((previous) => ({ next: { ...previous, ...change }, result: undefined })),
    [commit],
  );
  const apply = useCallback(
    (change: (previous: VillageState) => VillageState) => commit((previous) => ({ next: change(previous), result: undefined })),
    [commit],
  );
  const restoreVillage = useCallback(
    (restored: VillageState) => commit(() => ({ next: { ...restored }, result: undefined })),
    [commit],
  );

  const value = useMemo<VillageContextValue>(
    () => ({
      ready,
      state,
      energy: energyStatus(state, history, today),
      learningLanguage:
        state.learningLanguage && state.learningLanguage !== contentLocale(locale) ? state.learningLanguage : defaultLearningLanguage(contentLocale(locale)),
      spendEnergy,
      collectCard,
      update,
      apply,
      asleep: isVillageAsleep(state, now),
      restoreVillage,
    }),
    [apply, collectCard, history, locale, now, ready, restoreVillage, spendEnergy, state, today, update],
  );

  return <VillageContext.Provider value={value}>{children}</VillageContext.Provider>;
}

export function useVillage(): VillageContextValue {
  const value = useContext(VillageContext);
  if (!value) throw new Error("useVillage deve essere usato dentro VillageProvider");
  return value;
}
