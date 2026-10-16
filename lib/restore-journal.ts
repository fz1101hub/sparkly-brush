

import {
  getBrushlingStorage,
  type BrushlingProfile,
} from "@/lib/brushling-storage";
import type { CustomizationState } from "@/lib/customization";
import type { ParentReward } from "@/lib/parent-rewards";
import { getParentRewardsStorage } from "@/lib/parent-rewards";
import type { AppPreferences } from "@/lib/preferences";
import { getPreferencesStorage } from "@/lib/preferences";
import { createProfileStorage, createProfileStore } from "@/lib/profile-scope";


export type RestoreSnapshot = {
  profile: BrushlingProfile;
  customization: CustomizationState;
  preferences: AppPreferences;
  parentRewards: ParentReward[];
};

type ApplicationRestoreJournal = {
  version: 1;
  id: string;
  previous: RestoreSnapshot;
  next: RestoreSnapshot;
};
function buildProfileStorage(profileId: string) {
  const AsyncStorage = createProfileStorage(profileId);
  const { restoreBrushlingState } = getBrushlingStorage(profileId);
  const { saveParentRewards } = getParentRewardsStorage(profileId);
  const { saveAppPreferences } = getPreferencesStorage(profileId);


  const APPLICATION_RESTORE_JOURNAL_KEY = "sparkly-brush.application-restore.v1";

  async function applySnapshot(snapshot: RestoreSnapshot): Promise<void> {
    await restoreBrushlingState(snapshot.profile, snapshot.customization);
    await saveAppPreferences(snapshot.preferences);
    await saveParentRewards(snapshot.parentRewards);
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
