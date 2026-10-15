import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_THEME_ID, isAppThemeId, type AppThemeId } from "@/lib/app-themes";

// Appearance is device-local and independent of game state and backups.
export const THEME_STORAGE_KEY = "brushlings.appearance.v1";

export async function loadThemeId(): Promise<AppThemeId> {
  try {
    const value = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    return isAppThemeId(value) ? value : DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}
export async function saveThemeId(themeId: AppThemeId): Promise<void> {
  if (!isAppThemeId(themeId)) throw new Error("Tema non disponibile");
  await AsyncStorage.setItem(THEME_STORAGE_KEY, themeId);
}
