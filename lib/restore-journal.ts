import { createProfileStorage, createProfileStore } from "@/lib/profile-scope";

import type { AppThemeId } from "@/lib/app-themes";
import { getBracesStorage, normalizeBraces, type BracesSettings } from "@/lib/braces";
import { getExtrasStorage, normalizeExtras, type Extras } from "@/lib/extras";
import { getReminderService, type ReminderSettings } from "@/lib/reminders";
import { getThemeStorage } from "@/lib/theme-storage";
import {
  getBrushlingStorage,
  type BrushlingProfile,
} from "@/lib/brushling-storage";
import type { CustomizationState } from "@/lib/customization";
import type { ParentReward } from "@/lib/parent-rewards";
import { getParentRewardsStorage } from "@/lib/parent-rewards";
import type { AppPreferences } from "@/lib/preferences";
import { getPreferencesStorage } from "@/lib/preferences";
import { getVillageStorage, normalizeVillage, type VillageState } from "@/lib/village";

export type RestoreSnapshot = {
  profile: BrushlingProfile;
  customization: CustomizationState;
  preferences: AppPreferences;
  parentRewards: ParentReward[];
  village: VillageState;
  braces: BracesSettings;
  themeId: AppThemeId;
  reminders: ReminderSettings;
  extras: Extras;
};

/** Journals written before 27 October 2026 have no village, braces, theme or reminders. */
type AddedFields = "village" | "braces" | "themeId" | "reminders" | "extras";
type StoredSnapshot = Omit<RestoreSnapshot, AddedFields> & Partial<Pick<RestoreSnapshot, AddedFields>>;

type ApplicationRestoreJournal = {
  version: 1;
  id: string;
  previous: StoredSnapshot;
  next: StoredSnapshot;
};

function buildProfileStorage(profileId: string) {
  const AsyncStorage = createProfileStorage(profileId);
  const { restoreBrushlingState } = getBrushlingStorage(profileId);
  const { saveParentRewards } = getParentRewardsStorage(profileId);
  const { saveAppPreferences } = getPreferencesStorage(profileId);
  const villageStorage = getVillageStorage(profileId);
  const bracesStorage = getBracesStorage(profileId);
  const themeStorage = getThemeStorage(profileId);
  const reminderService = getReminderService(profileId);
  const extrasStorage = getExtrasStorage(profileId);
  const APPLICATION_RESTORE_JOURNAL_KEY = "sparkly-brush.application-restore.v1";

  async function applySnapshot(snapshot: StoredSnapshot): Promise<void> {
    await restoreBrushlingState(snapshot.profile, snapshot.customization);
    await saveAppPreferences(snapshot.preferences);
    await saveParentRewards(snapshot.parentRewards);
    if (snapshot.village) await villageStorage.save(normalizeVillage(snapshot.village));
    if (snapshot.braces) await bracesStorage.save(normalizeBraces(snapshot.braces));
    if (snapshot.themeId) await themeStorage.saveThemeId(snapshot.themeId);
    // Stored only: the reminder lifecycle schedules them again when the app starts.
    if (snapshot.reminders) await reminderService.restoreSettings(snapshot.reminders);
    if (snapshot.extras) await extrasStorage.save(normalizeExtras(snapshot.extras));
  }

  async function beginApplicationRestore(
    previous: RestoreSnapshot,
    next: RestoreSnapshot,
  ): Promise<string> {
    const id = `restore-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const journal: ApplicationRestoreJournal = { version: 1, id, previous, next };
    await AsyncStorage.setItem(APPLICATION_RESTORE_JOURNAL_KEY, JSON.stringify(journal));
    return id;
  }

  async function completeApplicationRestore(id: string): Promise<void> {
    const raw = await AsyncStorage.getItem(APPLICATION_RESTORE_JOURNAL_KEY);
    if (!raw) return;
    const journal = JSON.parse(raw) as Partial<ApplicationRestoreJournal>;
    if (journal.version === 1 && journal.id === id) {
      await AsyncStorage.removeItem(APPLICATION_RESTORE_JOURNAL_KEY);
    }
  }

  async function recoverApplicationRestore(
    committedRestoreId: string | null,
  ): Promise<void> {
    const raw = await AsyncStorage.getItem(APPLICATION_RESTORE_JOURNAL_KEY);
    if (!raw) return;
    const journal = JSON.parse(raw) as ApplicationRestoreJournal;
    if (
      journal.version !== 1
      || typeof journal.id !== "string"
      || !journal.previous
      || !journal.next
    ) {
      throw new Error("Journal di ripristino non valido");
    }
    await applySnapshot(committedRestoreId === journal.id ? journal.next : journal.previous);
    await AsyncStorage.removeItem(APPLICATION_RESTORE_JOURNAL_KEY);
  }
  return { beginApplicationRestore, completeApplicationRestore, recoverApplicationRestore };
}

export const getRestoreStorage = createProfileStore(buildProfileStorage);
type ProfileStorage = ReturnType<typeof getRestoreStorage>;
export const beginApplicationRestore: ProfileStorage["beginApplicationRestore"] = (...args) => getRestoreStorage().beginApplicationRestore(...args);
export const completeApplicationRestore: ProfileStorage["completeApplicationRestore"] = (...args) => getRestoreStorage().completeApplicationRestore(...args);
export const recoverApplicationRestore: ProfileStorage["recoverApplicationRestore"] = (...args) => getRestoreStorage().recoverApplicationRestore(...args);
