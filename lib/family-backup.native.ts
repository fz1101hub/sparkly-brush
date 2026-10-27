import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { createBackupManifest, parseBackupManifest, type BrushlingsBackupManifest } from "@/lib/backup";
import { getBracesStorage } from "@/lib/braces";
import { getBrushStorage } from "./brush-storage.native";
import { getBrushlingStorage } from "@/lib/brushling-storage";
import { getExtrasStorage } from "@/lib/extras";
import {
  FAMILY_BACKUP_EXTENSION,
  FAMILY_BACKUP_FORMAT,
  mergeFamilyProfiles,
  parseFamilyBackup,
  type FamilyBackupChild,
  type FamilyBackupFile,
} from "@/lib/family-backup-format";
import { loadFamilyProfiles, saveFamilyProfiles } from "@/lib/family-profiles";
import { getParentRewardsStorage } from "@/lib/parent-rewards";
import { getPreferencesStorage } from "@/lib/preferences";
import { DEFAULT_REMINDERS, getReminderService } from "@/lib/reminders";
import { getRestoreStorage, type RestoreSnapshot } from "@/lib/restore-journal";
import { getThemeStorage } from "@/lib/theme-storage";
import { getVillageStorage } from "@/lib/village";

export const familyBackupAvailable = true;

/** Everything one child has, read from that child's stores (also when another child is active). */
async function loadSnapshot(profileId: string): Promise<RestoreSnapshot> {
  const brushling = getBrushlingStorage(profileId);
  const [profile, customization, preferences, parentRewards, village, braces, themeId, reminders, extras] = await Promise.all([
    brushling.loadBrushlingProfile(),
    brushling.loadCustomizationState(),
    getPreferencesStorage(profileId).loadAppPreferences(),
    getParentRewardsStorage(profileId).loadParentRewards(),
    getVillageStorage(profileId).load(),
    getBracesStorage(profileId).load(),
    getThemeStorage(profileId).loadThemeId(),
    getReminderService(profileId).load().catch(() => ({ ...DEFAULT_REMINDERS })),
    getExtrasStorage(profileId).load(),
  ]);
  return { profile, customization, preferences, parentRewards, village, braces, themeId, reminders, extras };
}

async function profileManifest(profileId: string): Promise<BrushlingsBackupManifest> {
  const snapshot = await loadSnapshot(profileId);
  const { lifetimeProgress } = await getBrushStorage(profileId).loadHistoryBundle();
  return createBackupManifest(snapshot.profile, snapshot.customization, lifetimeProgress, Date.now(), {
    preferences: snapshot.preferences,
    parentRewards: snapshot.parentRewards,
    village: snapshot.village,
    braces: snapshot.braces,
    themeId: snapshot.themeId,
    reminders: snapshot.reminders,
    extras: snapshot.extras,
  });
}

/** The family file's text: each child's complete backup, made one after the other. */
export async function buildFamilyBackup(defaultName: string): Promise<FamilyBackupFile> {
  const family = await loadFamilyProfiles(defaultName);
  const children: FamilyBackupChild[] = [];
  for (const profile of family.profiles) {
    const manifest = await profileManifest(profile.id);
    const made = await getBrushStorage(profile.id).createCompleteBackupDatabase(JSON.stringify(manifest), `sparkly-family-${profile.id}.brushlings`);
    const file = new File(made.uri);
    try {
      children.push({ profileId: profile.id, name: profile.name, sessionCount: made.sessionCount, database: await file.base64() });
    } finally {
      if (file.exists) file.delete();
    }
  }
  return { format: FAMILY_BACKUP_FORMAT, version: 1, createdAt: Date.now(), profiles: family.profiles, children };
}

const dayKey = (timestamp: number) => new Date(timestamp).toISOString().slice(0, 10);

export async function exportFamilyBackup(dialogTitle: string, defaultName: string): Promise<{ children: number; sessions: number }> {
  const backup = await buildFamilyBackup(defaultName);
  // Kept until the next start, like the single backups: the receiving app may still be reading it.
  const file = new File(Paths.cache, `sparkly-share-famiglia-${dayKey(backup.createdAt)}.${FAMILY_BACKUP_EXTENSION}`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(backup));
  let handed = false;
  try {
    if (!(await Sharing.isAvailableAsync())) throw new Error("La condivisione file non è disponibile su questo dispositivo");
    await Sharing.shareAsync(file.uri, { mimeType: "application/json", UTI: "public.json", dialogTitle });
    handed = true;
  } finally {
    if (!handed && file.exists) file.delete();
  }
  return { children: backup.children.length, sessions: backup.children.reduce((sum, child) => sum + child.sessionCount, 0) };
}

export async function pickFamilyBackup(): Promise<FamilyBackupFile | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ["application/json", "application/octet-stream", "*/*"], copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.[0]) return null;
  const picked = new File(result.assets[0].uri);
  try {
    return parseFamilyBackup(await picked.text());
  } finally {
    if (picked.exists) picked.delete();
  }
}

/**
 * Restores every child of the file, one at a time, with the same journal as a single restore: if
 * the phone stops halfway, each child comes back either as before or as in the file. The caller
 * restarts the app afterwards, so every screen reads the restored data.
 */
export async function restoreFamilyBackup(backup: FamilyBackupFile, defaultName: string): Promise<string[]> {
  const { family, restored } = mergeFamilyProfiles(await loadFamilyProfiles(defaultName), backup);
  await saveFamilyProfiles(family);
  for (const child of backup.children.filter((item) => restored.includes(item.profileId))) {
    const storage = getBrushStorage(child.profileId);
    const journal = getRestoreStorage(child.profileId);
    const temporary = new File(Paths.cache, `sparkly-import-family-${child.profileId}.brushlings`);
    if (temporary.exists) temporary.delete();
    temporary.create();
    temporary.write(child.database, { encoding: "base64" });
    const inspection = await storage.inspectCompleteBackupDatabase(temporary.uri);
    const manifest = parseBackupManifest(inspection.manifestJson);
    const previous = await loadSnapshot(child.profileId);
    const next: RestoreSnapshot = {
      profile: manifest.profile,
      customization: manifest.customization,
      preferences: manifest.preferences,
      parentRewards: manifest.parentRewards,
      village: manifest.village ?? previous.village,
      braces: manifest.braces ?? previous.braces,
      themeId: manifest.themeId ?? previous.themeId,
      reminders: manifest.reminders ?? previous.reminders,
      extras: manifest.extras ?? previous.extras,
    };
    const restoreId = await journal.beginApplicationRestore(previous, next);
    await storage.restoreCompleteBackupDatabase(inspection.uri, restoreId);
    // The database now carries this restore: the journal applies the file's settings and closes.
    await journal.recoverApplicationRestore(restoreId);
  }
  return restored;
}

/**
 * Automatic weekly backup (voce 44), with no server: the family file is written in the app's
 * documents (the last four are kept; on iOS they show in the Files app) and, on Android, also in a
 * folder the parent chose once (for example one synced with Google Drive).
 */
export const AUTO_BACKUP_KEY = "brushlings.auto-backup.v1";
export const AUTO_BACKUP_EVERY_MS = 7 * 86_400_000;
const KEEP_AUTO_BACKUPS = 4;
export type AutoBackupSettings = { enabled: boolean; lastAt: number | null; directoryUri: string | null };

export async function loadAutoBackup(): Promise<AutoBackupSettings> {
  try {
    const raw = await AsyncStorage.getItem(AUTO_BACKUP_KEY);
    const value = raw ? (JSON.parse(raw) as Partial<AutoBackupSettings>) : {};
    return {
      enabled: value.enabled === true,
      lastAt: typeof value.lastAt === "number" ? value.lastAt : null,
      directoryUri: typeof value.directoryUri === "string" ? value.directoryUri : null,
    };
  } catch {
    return { enabled: false, lastAt: null, directoryUri: null };
  }
}

export async function saveAutoBackup(settings: AutoBackupSettings): Promise<void> {
  await AsyncStorage.setItem(AUTO_BACKUP_KEY, JSON.stringify(settings));
}

export async function chooseAutoBackupFolder(): Promise<string | null> {
  const directory = await Directory.pickDirectoryAsync();
  return directory?.uri ?? null;
}

export async function runAutoBackupIfDue(now: number, defaultName: string): Promise<boolean> {
  const settings = await loadAutoBackup();
  if (!settings.enabled || (settings.lastAt !== null && now - settings.lastAt < AUTO_BACKUP_EVERY_MS)) return false;
  const text = JSON.stringify(await buildFamilyBackup(defaultName));
  const name = `famiglia-${dayKey(now)}.${FAMILY_BACKUP_EXTENSION}`;
  const folder = new Directory(Paths.document, "backup");
  if (!folder.exists) folder.create();
  const file = new File(folder, name);
  if (file.exists) file.delete();
  file.create();
  file.write(text);
  const old = folder.list()
    .filter((entry): entry is File => entry instanceof File && entry.name.endsWith(`.${FAMILY_BACKUP_EXTENSION}`))
    .sort((first, second) => second.name.localeCompare(first.name))
    .slice(KEEP_AUTO_BACKUPS);
  old.forEach((entry) => entry.delete());
  if (settings.directoryUri) {
    try {
      const copy = new Directory(settings.directoryUri).createFile(name, "application/json");
      copy.write(text);
    } catch {
      // The chosen folder is gone or no longer allowed: the copy in the app's documents stays.
    }
  }
  await saveAutoBackup({ ...settings, lastAt: now });
  return true;
}
