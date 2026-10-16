
import { DEFAULT_THEME_ID, isAppThemeId, type AppThemeId } from "@/lib/app-themes";
import { createProfileStorage, createProfileStore } from "@/lib/profile-scope";


// Appearance is device-local and independent of game state and backups.
export const THEME_STORAGE_KEY = "brushlings.appearance.v1";
function buildProfileStorage(profileId: string) {
const AsyncStorage = createProfileStorage(profileId);

async function loadThemeId(): Promise<AppThemeId> {
  try {
    const value = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    return isAppThemeId(value) ? value : DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}
async function saveThemeId(themeId: AppThemeId): Promise<void> {
  if (!isAppThemeId(themeId)) throw new Error("Tema non disponibile");
  await AsyncStorage.setItem(THEME_STORAGE_KEY, themeId);
}
return { loadThemeId, saveThemeId };
}

export const getThemeStorage = createProfileStore(buildProfileStorage);
type ProfileStorage = ReturnType<typeof getThemeStorage>;
export const loadThemeId: ProfileStorage["loadThemeId"] = (...args) => getThemeStorage().loadThemeId(...args);
export const saveThemeId: ProfileStorage["saveThemeId"] = (...args) => getThemeStorage().saveThemeId(...args);
