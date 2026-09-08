import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";

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

  useEffect(() => {
    void loadAppPreferences()
      .then(setPreferences)
      .finally(() => setReady(true));
  }, []);

  const setPreference = useCallback(async <K extends keyof AppPreferences>(
    key: K,
    value: AppPreferences[K],
  ) => {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    await saveAppPreferences(next);
  }, [preferences]);

  const completeOnboarding = useCallback(async () => {
    const next = { ...preferences, onboardingCompleted: true };
    setPreferences(next);
    await saveAppPreferences(next);
  }, [preferences]);

  const restorePreferences = useCallback(async (restored: AppPreferences) => {
    setPreferences(restored);
    await saveAppPreferences(restored);
  }, []);

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