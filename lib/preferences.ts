
import { createProfileStorage, createProfileStore } from "@/lib/profile-scope";


export type AppPreferences = {
  onboardingCompleted: boolean;
  soundsEnabled: boolean;
  musicEnabled: boolean;
  hapticsEnabled: boolean;
};

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  onboardingCompleted: false,
  soundsEnabled: true,
  musicEnabled: false,
  hapticsEnabled: true,
};
function buildProfileStorage(profileId: string) {
  const AsyncStorage = createProfileStorage(profileId);

  const PREFERENCES_KEY = "sparkly-brush.preferences.v1";

  async function loadAppPreferences(): Promise<AppPreferences> {
    try {
      const raw = await AsyncStorage.getItem(PREFERENCES_KEY);
      if (!raw) return DEFAULT_APP_PREFERENCES;
      const parsed = JSON.parse(raw) as Partial<AppPreferences>;
      return {
        onboardingCompleted: parsed.onboardingCompleted === true,
        soundsEnabled: parsed.soundsEnabled !== false,
        musicEnabled: parsed.musicEnabled === true,
        hapticsEnabled: parsed.hapticsEnabled !== false,
      };
    } catch {
      return DEFAULT_APP_PREFERENCES;
    }
  }

  async function saveAppPreferences(preferences: AppPreferences): Promise<void> {
    await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  }
  return { loadAppPreferences, saveAppPreferences };
}

export const getPreferencesStorage = createProfileStore(buildProfileStorage);
type ProfileStorage = ReturnType<typeof getPreferencesStorage>;
export const loadAppPreferences: ProfileStorage["loadAppPreferences"] = (...args) => getPreferencesStorage().loadAppPreferences(...args);
export const saveAppPreferences: ProfileStorage["saveAppPreferences"] = (...args) => getPreferencesStorage().saveAppPreferences(...args);
