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
  loadAppPreferences,
  saveAppPreferences,
  type AppPreferences,
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
  const [preferences, setPreferences] = useState(DEFAULT_APP_PREFERENCES);
  const [ready, setReady] = useState(false);
  const preferencesRef = useRef(DEFAULT_APP_PREFERENCES);
  const mutationRevisionRef = useRef(0);

  useEffect(() => {
    let active = true;
    const startingRevision = mutationRevisionRef.current;
    void loadAppPreferences()
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
    mutationRevisionRef.current += 1;
    preferencesRef.current = next;
    setPreferences(next);
    await saveAppPreferences(next);
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