import { createProfileStorage, createProfileStore, PRIMARY_PROFILE_ID } from "@/lib/profile-scope";
import { normalizeChildCare, type ChildCareSettings } from "@/lib/child-care";

import {
  isLanguagePreference,
  type LanguagePreference,
} from "@/lib/locale-types";

export type AppPreferences = {
  care?: ChildCareSettings;
  onboardingCompleted: boolean;
  soundsEnabled: boolean;
  musicEnabled: boolean;
  hapticsEnabled: boolean;
  language: LanguagePreference;
  /** Opt-in: parent areas and destructive actions ask a multiplication first. */
  parentGateEnabled: boolean;
};

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  onboardingCompleted: false,
  soundsEnabled: true,
  musicEnabled: false,
  hapticsEnabled: true,
  language: "system",
  parentGateEnabled: false,
};

/** Shared by every child of the family: the app language and the parent lock. */
type FamilySettings = Pick<AppPreferences, "language" | "parentGateEnabled">;
export const FAMILY_SETTINGS_KEY = "brushlings.family-settings.v1";

function familyStorage() {
  // Unscoped on purpose: switching child must neither change language nor bypass the lock.
  return createProfileStorage(PRIMARY_PROFILE_ID);
}

function normalizePreferences(parsed: Partial<AppPreferences>): AppPreferences {
  return {
    ...(parsed.care ? { care: normalizeChildCare(parsed.care) } : {}),
    onboardingCompleted: parsed.onboardingCompleted === true,
    soundsEnabled: parsed.soundsEnabled !== false,
    musicEnabled: parsed.musicEnabled === true,
    hapticsEnabled: parsed.hapticsEnabled !== false,
    language: isLanguagePreference(parsed.language) ? parsed.language : "system",
    parentGateEnabled: parsed.parentGateEnabled === true,
  };
}

function buildProfileStorage(profileId: string) {
  const AsyncStorage = createProfileStorage(profileId);
  const PREFERENCES_KEY = "sparkly-brush.preferences.v1";

  async function loadAppPreferences(): Promise<AppPreferences> {
    try {
      const [raw, familyRaw] = await Promise.all([
        AsyncStorage.getItem(PREFERENCES_KEY),
        familyStorage().getItem(FAMILY_SETTINGS_KEY),
      ]);
      const own = raw ? (JSON.parse(raw) as Partial<AppPreferences>) : {};
      // Before family profiles existed, language and lock lived in the primary profile's record.
      const legacyRaw = familyRaw || profileId === PRIMARY_PROFILE_ID
        ? null
        : await familyStorage().getItem(PREFERENCES_KEY);
      const legacy = legacyRaw ? (JSON.parse(legacyRaw) as Partial<AppPreferences>) : {};
      const family: Partial<FamilySettings> = familyRaw
        ? (JSON.parse(familyRaw) as Partial<FamilySettings>)
        : { language: (profileId === PRIMARY_PROFILE_ID ? own : legacy).language, parentGateEnabled: (profileId === PRIMARY_PROFILE_ID ? own : legacy).parentGateEnabled };
      return normalizePreferences({ ...own, ...family });
    } catch {
      return DEFAULT_APP_PREFERENCES;
    }
  }

  async function saveAppPreferences(preferences: AppPreferences): Promise<void> {
    const family: FamilySettings = {
      language: preferences.language,
      parentGateEnabled: preferences.parentGateEnabled,
    };
    await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    await familyStorage().setItem(FAMILY_SETTINGS_KEY, JSON.stringify(family));
  }

  return { loadAppPreferences, saveAppPreferences };
}

export const getPreferencesStorage = createProfileStore(buildProfileStorage);
type ProfileStorage = ReturnType<typeof getPreferencesStorage>;
export const loadAppPreferences: ProfileStorage["loadAppPreferences"] = (...args) => getPreferencesStorage().loadAppPreferences(...args);
export const saveAppPreferences: ProfileStorage["saveAppPreferences"] = (...args) => getPreferencesStorage().saveAppPreferences(...args);
