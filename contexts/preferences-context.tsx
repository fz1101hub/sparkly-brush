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
    let next = preferences;
    setPreferences((current) => {
      next = { ...current, [key]: value };
      return next;
    });
    await saveAppPreferences(next);
  }, [preferences]);

  const completeOnboarding = useCallback(async () => {
    let next = preferences;
    setPreferences((current) => {
      next = { ...current, onboardingCompleted: true };
      return next;
    });
    await saveAppPreferences(next);
  }, [preferences]);

  const value = useMemo(() => ({ preferences, ready, setPreference, completeOnboarding }), [
    completeOnboarding,
    preferences,
    ready,
    setPreference,
  ]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error("usePreferences deve essere usato dentro PreferencesProvider");
  return value;
}