import type { FamilyBackupFile } from "@/lib/family-backup-format";

/** Web: the family file needs the complete SQLite backup, made only by the iOS and Android app. */
export const familyBackupAvailable = false;
const unavailable = "Il backup di famiglia è disponibile nell’app iOS e Android";

export async function exportFamilyBackup(_dialogTitle: string, _defaultName: string): Promise<{ children: number; sessions: number }> {
  throw new Error(unavailable);
}

export async function pickFamilyBackup(): Promise<FamilyBackupFile | null> {
  throw new Error(unavailable);
}

export async function restoreFamilyBackup(_backup: FamilyBackupFile, _defaultName: string): Promise<string[]> {
  throw new Error(unavailable);
}

export type AutoBackupSettings = { enabled: boolean; lastAt: number | null; directoryUri: string | null };
export async function loadAutoBackup(): Promise<AutoBackupSettings> {
  return { enabled: false, lastAt: null, directoryUri: null };
}
export async function saveAutoBackup(_settings: AutoBackupSettings): Promise<void> {}
export async function runAutoBackupIfDue(_now: number, _defaultName: string): Promise<boolean> {
  return false;
}
export async function chooseAutoBackupFolder(): Promise<string | null> {
  throw new Error(unavailable);
}
