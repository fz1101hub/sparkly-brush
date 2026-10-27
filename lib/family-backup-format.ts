import { MAX_FAMILY_PROFILES, type ChildProfile, type FamilyProfiles } from "@/lib/family-profiles";
import { PRIMARY_PROFILE_ID } from "@/lib/profile-scope";

/**
 * The whole family in one file (voce 69): each child's complete backup (the same SQLite file a
 * single-child backup makes) with the list of profiles. Restoring it brings back every child.
 */
export const FAMILY_BACKUP_FORMAT = "brushlings-family";
export const FAMILY_BACKUP_EXTENSION = "brushlings-family";

export type FamilyBackupChild = { profileId: string; name: string; sessionCount: number; database: string };
export type FamilyBackupFile = {
  format: typeof FAMILY_BACKUP_FORMAT;
  version: 1;
  createdAt: number;
  profiles: ChildProfile[];
  children: FamilyBackupChild[];
};

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

export function parseFamilyBackup(text: string): FamilyBackupFile {
  let value: Partial<FamilyBackupFile>;
  try {
    value = JSON.parse(text) as Partial<FamilyBackupFile>;
  } catch {
    throw new Error("File di famiglia illeggibile");
  }
  if (value?.format !== FAMILY_BACKUP_FORMAT || value.version !== 1 || !Array.isArray(value.profiles) || !Array.isArray(value.children)) {
    throw new Error("Non è un backup di famiglia");
  }
  const profiles = value.profiles.filter((profile): profile is ChildProfile =>
    Boolean(profile) && typeof profile.id === "string" && /^[a-z0-9-]{1,64}$/.test(profile.id)
    && typeof profile.name === "string" && profile.name.trim().length > 0 && Number.isFinite(profile.createdAt));
  const ids = new Set(profiles.map((profile) => profile.id));
  const children = value.children.filter((child): child is FamilyBackupChild =>
    Boolean(child) && typeof child.profileId === "string" && ids.has(child.profileId)
    && typeof child.database === "string" && child.database.length > 0 && BASE64.test(child.database)
    && Number.isInteger(child.sessionCount) && child.sessionCount >= 0);
  if (!children.length || new Set(children.map((child) => child.profileId)).size !== children.length) {
    throw new Error("Backup di famiglia senza bambini validi");
  }
  return {
    format: FAMILY_BACKUP_FORMAT,
    version: 1,
    createdAt: Number.isFinite(value.createdAt) ? Number(value.createdAt) : 0,
    profiles,
    children: children.map((child) => ({ ...child, name: profiles.find((profile) => profile.id === child.profileId)!.name })),
  };
}

/**
 * The family after the restore: the children of the file come back with their ids and names; the
 * ones only on this phone stay, as long as the family does not grow past its limit.
 */
export function mergeFamilyProfiles(current: FamilyProfiles, backup: FamilyBackupFile): { family: FamilyProfiles; restored: string[] } {
  const profiles = [...current.profiles];
  const restored: string[] = [];
  for (const child of backup.children) {
    const fromFile = backup.profiles.find((profile) => profile.id === child.profileId)!;
    const index = profiles.findIndex((profile) => profile.id === child.profileId);
    if (index >= 0) profiles[index] = { ...profiles[index], name: fromFile.name };
    else if (profiles.length < MAX_FAMILY_PROFILES) profiles.push({ ...fromFile });
    else continue;
    restored.push(child.profileId);
  }
  if (!profiles.some((profile) => profile.id === PRIMARY_PROFILE_ID)) {
    throw new Error("Il profilo principale manca");
  }
  return { family: { ...current, profiles }, restored };
}
