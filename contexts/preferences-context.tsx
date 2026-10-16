import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState , useRef } from "react";
import { getPreferencesStorage, DEFAULT_APP_PREFERENCES, type AppPreferences } from "@/lib/preferences";

type PreferencesContextValue = {
  preferences: AppPreferences;
  ready: boolean;
  saving: boolean;
  setPreference: <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  restorePreferences: (preferences: AppPreferences) => Promise<void>;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: PropsWithChildren) {
  const storage = useRef(getPreferencesStorage());
  const [preferences, setPreferences] = useState(DEFAULT_APP_PREFERENCES);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const current = useRef(DEFAULT_APP_PREFERENCES);
  const writes = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);

  useEffect(() => {
    void storage.current.loadAppPreferences()
      .then(value => { current.current = value; setPreferences(value); })
      .finally(() => setReady(true));
  }, []);

  const update = useCallback((transform: (value: AppPreferences) => AppPreferences) => {
    pending.current += 1;
    setSaving(true);
    const operation = writes.current.catch(() => {}).then(async () => {
      const next = transform(current.current);
      await storage.current.saveAppPreferences(next);
      current.current = next;
      setPreferences(next);
    }).finally(() => { pending.current -= 1; setSaving(pending.current > 0); });
    writes.current = operation;
    return operation;
  }, []);

  const setPreference = useCallback(<K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => update(previous => ({ ...previous, [key]: value })), [update]);
  const completeOnboarding = useCallback(() => update(previous => ({ ...previous, onboardingCompleted: true })), [update]);
  const restorePreferences = useCallback((restored: AppPreferences) => update(() => restored), [update]);

  const value = useMemo(() => ({ preferences, ready, saving, setPreference, completeOnboarding, restorePreferences }), [
    completeOnboarding,
    preferences,
    ready,
    saving,
    restorePreferences,
    setPreference,
  ]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function useOptionalPreferences() { return useContext(PreferencesContext); }

export function usePreferences(): PreferencesContextValue {
  const value = useOptionalPreferences();
  if (!value) throw new Error("usePreferences deve essere usato dentro PreferencesProvider");
  return value;
}
