import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import {
  loadFamilyProfiles,
  saveFamilyProfiles,
  validateProfileName,
  MAX_FAMILY_PROFILES,
  type FamilyProfiles,
} from "@/lib/family-profiles";
import { isRestoreOperationActive } from "@/lib/history-operation";
import { translateDynamic, type TranslationKey, type TranslationParams } from "@/lib/i18n";
import { getDeviceLocale } from "@/lib/locale";
import { isLanguagePreference, resolveLocale, type SupportedLocale } from "@/lib/locale-types";
import { errorText, LocalizedError } from "@/lib/localized-error";
import { DEFAULT_APP_PREFERENCES, FAMILY_SETTINGS_KEY, getPreferencesStorage } from "@/lib/preferences";
import { setActiveProfileId } from "@/lib/profile-scope";

import { FamilyContext } from "@/contexts/family-context-value";

export { useFamily, useOptionalFamily } from "@/contexts/family-context-value";


/** The family language, readable before any profile (and so before the locale provider). */
async function familyLocale(): Promise<SupportedLocale> {
  try {
    const raw = await AsyncStorage.getItem(FAMILY_SETTINGS_KEY);
    const language = raw ? (JSON.parse(raw) as { language?: unknown }).language : undefined;
    return resolveLocale(isLanguagePreference(language) ? language : "system", getDeviceLocale());
  } catch {
    return getDeviceLocale();
  }
}

/**
 * Local child profiles (from PR #10). The root layout remounts every provider when the active
 * profile changes, so each child sees only their own history, creatures, theme and reminders.
 */
export function FamilyProvider({ children }: { children: ReactNode }) {
  const [family, setFamily] = useState<FamilyProfiles | null>(null);
  const [busy, setBusy] = useState(false);
  const [homeRequested, setHomeRequested] = useState(false);
  const acknowledgeNavigation = useCallback(() => setHomeRequested(false), []);
  const [error, setError] = useState<unknown>(null);
  const [locale, setLocale] = useState<SupportedLocale>(getDeviceLocale);
  const current = useRef<FamilyProfiles | null>(null);
  const locked = useRef(false);
  const guards = useRef(new Set<() => Promise<void>>());
  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams) => translateDynamic(locale, key, params),
    [locale],
  );

  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void familyLocale().then(async (resolved) => {
      if (!active) return;
      setLocale(resolved);
      try {
        const value = await loadFamilyProfiles(translateDynamic(resolved, "family.profile.defaultName"));
        if (!active) return;
        setActiveProfileId(value.activeId);
        current.current = value;
        setFamily(value);
      } catch (caught) {
        if (active) setError(caught);
      }
    });
    return () => {
      active = false;
    };
  }, [attempt]);

  const registerGuard = useCallback((guard: () => Promise<void>) => {
    guards.current.add(guard);
    return () => {
      guards.current.delete(guard);
    };
  }, []);

  const change = useCallback(
    async (
      transform: (previous: FamilyProfiles) => Promise<FamilyProfiles>,
      transition: boolean,
    ) => {
      if (locked.current || !current.current) throw new LocalizedError("family.profile.error.busy");
      if (isRestoreOperationActive()) throw new LocalizedError("family.profile.error.restoreActive");
      locked.current = true;
      setBusy(true);
      try {
        if (transition) for (const guard of guards.current) await guard();
        const next = await transform(current.current);
        await saveFamilyProfiles(next);
        if (transition && next.activeId !== current.current.activeId) setHomeRequested(true);
        setActiveProfileId(next.activeId);
        current.current = next;
        setFamily(next);
      } finally {
        locked.current = false;
        setBusy(false);
      }
    },
    [],
  );

  const switchProfile = useCallback(
    (id: string) =>
      change(async (previous) => {
        if (!previous.profiles.some((p) => p.id === id)) throw new LocalizedError("family.profile.error.missing");
        return { ...previous, activeId: id };
      }, true),
    [change],
  );

  const addProfile = useCallback(
    (name: string) =>
      change(async (previous) => {
        if (previous.profiles.length >= MAX_FAMILY_PROFILES) {
          throw new LocalizedError("family.profile.error.limit", { max: MAX_FAMILY_PROFILES });
        }
        const clean = validateProfileName(name, previous.profiles);
        const id = `child-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
        // The family already saw the introduction: a new child starts from the starter choice.
        await getPreferencesStorage(id).saveAppPreferences({
          ...DEFAULT_APP_PREFERENCES,
          ...(await getPreferencesStorage(previous.activeId).loadAppPreferences()),
          onboardingCompleted: true,
          soundsEnabled: DEFAULT_APP_PREFERENCES.soundsEnabled,
          musicEnabled: DEFAULT_APP_PREFERENCES.musicEnabled,
          hapticsEnabled: DEFAULT_APP_PREFERENCES.hapticsEnabled,
        });
        return {
          ...previous,
          activeId: id,
          profiles: [...previous.profiles, { id, name: clean, createdAt: Date.now() }],
        };
      }, true),
    [change],
  );

  const renameProfile = useCallback(
    (id: string, name: string) =>
      change(async (previous) => {
        if (!previous.profiles.some((p) => p.id === id)) throw new LocalizedError("family.profile.error.missing");
        const clean = validateProfileName(name, previous.profiles, id);
        return {
          ...previous,
          profiles: previous.profiles.map((p) => (p.id === id ? { ...p, name: clean } : p)),
        };
      }, false),
    [change],
  );

  if (!family)
    return (
      <View
        style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 16, backgroundColor: "#F7F9FF" }}
      >
        {error ? (
          <>
            <Text accessibilityRole="alert" style={{ color: "#17213A", fontSize: 16, lineHeight: 22, textAlign: "center" }}>
              {errorText(error, t, "family.profile.error.unreadable")}
            </Text>
            <Pressable
              testID="family-retry"
              accessibilityRole="button"
              onPress={() => {
                setError(null);
                setAttempt((value) => value + 1);
              }}
              style={{ minHeight: 48, paddingHorizontal: 20, borderRadius: 14, backgroundColor: "#2457D6", justifyContent: "center" }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>{t("family.profile.retry")}</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator accessibilityLabel={t("family.profile.loading")} color="#2457D6" />
        )}
      </View>
    );
  const active = family.profiles.find((p) => p.id === family.activeId)!;
  return (
    <FamilyContext.Provider
      value={{
        active,
        profiles: family.profiles,
        busy,
        homeRequested,
        acknowledgeNavigation,
        switchProfile,
        addProfile,
        renameProfile,
        registerGuard,
      }}
    >
      {children}
    </FamilyContext.Provider>
  );
}
