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

import {
  DEFAULT_APP_PREFERENCES,
  type AppPreferences,
  getPreferencesStorage,
} from "@/lib/preferences";

type PreferencesContextValue = {
  preferences: AppPreferences;
  ready: boolean;
  setPreference: <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  restorePreferences: (preferences: AppPreferences) => Promise<void>;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: PropsWithChildren) {
  // Captured at mount: a late write after a child switch must stay in this child's records.
  const store = useRef(getPreferencesStorage());
  const [preferences, setPreferences] = useState(DEFAULT_APP_PREFERENCES);
  const [ready, setReady] = useState(false);
  const preferencesRef = useRef(DEFAULT_APP_PREFERENCES);
  const mutationRevisionRef = useRef(0);

  useEffect(() => {
    let active = true;
    const startingRevision = mutationRevisionRef.current;
    void store.current.loadAppPreferences()
      .then((loaded) => {
        if (!active || mutationRevisionRef.current !== startingRevision) return;
        preferencesRef.current = loaded;
        setPreferences(loaded);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const commitPreferences = useCallback(async (next: AppPreferences) => {
    const revision = ++mutationRevisionRef.current;
    const previous = preferencesRef.current;
    preferencesRef.current = next;
    setPreferences(next);
    try {
      await store.current.saveAppPreferences(next);
    } catch (error) {
      // The screen shows what is stored: a failed write goes back unless a later change replaced it.
      if (mutationRevisionRef.current === revision) {
        preferencesRef.current = previous;
        setPreferences(previous);
      }
      throw error;
    }
  }, []);

  const setPreference = useCallback(
    async <K extends keyof AppPreferences>(
      key: K,
      value: AppPreferences[K],
    ) => {
      await commitPreferences({ ...preferencesRef.current, [key]: value });
    },
    [commitPreferences],
  );

  const completeOnboarding = useCallback(async () => {
    await commitPreferences({
      ...preferencesRef.current,
      onboardingCompleted: true,
    });
  }, [commitPreferences]);

  const restorePreferences = useCallback(
    async (restored: AppPreferences) => {
      await commitPreferences(restored);
    },
    [commitPreferences],
  );

  const value = useMemo(() => ({ preferences, ready, setPreference, completeOnboarding, restorePreferences }), [
    completeOnboarding,
    preferences,
    ready,
    restorePreferences,
    setPreference,
  ]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error("usePreferences deve essere usato dentro PreferencesProvider");
  return value;
}

/** Infrastructure providers can still be mounted alone in integration tests. */
export function useOptionalPreferences(): PreferencesContextValue | null {
  return useContext(PreferencesContext);
}
