import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFERENCES_KEY = "sparkly-brush.preferences.v1";

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

export async function loadAppPreferences(): Promise<AppPreferences> {
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

export async function saveAppPreferences(preferences: AppPreferences): Promise<void> {
  await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
}