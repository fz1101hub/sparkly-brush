import AsyncStorage from "@react-native-async-storage/async-storage";

import { LocalizedError } from "@/lib/localized-error";
import { PRIMARY_PROFILE_ID } from "@/lib/profile-scope";

export const FAMILY_KEY = "brushlings.family.v1";
export const MAX_FAMILY_PROFILES = 8;
export const MAX_PROFILE_NAME_LENGTH = 24;
export type ChildProfile = { id: string; name: string; createdAt: number };
export type FamilyProfiles = {
  version: 1;
  activeId: string;
  profiles: ChildProfile[];
};

export function validateProfileName(
  name: string,
  profiles: ChildProfile[],
  excludingId?: string,
): string {
  const clean = name.trim().replace(/\s+/g, " ");
  if (!clean || [...clean].length > MAX_PROFILE_NAME_LENGTH)
    throw new LocalizedError("family.profile.error.nameLength", { max: MAX_PROFILE_NAME_LENGTH });
  if (
    profiles.some(
      (p) =>
        p.id !== excludingId &&
        p.name.toLocaleLowerCase() === clean.toLocaleLowerCase(),
    )
  ) {
    throw new LocalizedError("family.profile.error.nameTaken");
  }
  return clean;
}

/** @param defaultName name of the first profile when the family was never saved (translated). */
export async function loadFamilyProfiles(defaultName: string): Promise<FamilyProfiles> {
  const raw = await AsyncStorage.getItem(FAMILY_KEY);
  if (!raw) {
    const family: FamilyProfiles = {
      version: 1,
      activeId: PRIMARY_PROFILE_ID,
      profiles: [
        {
          id: PRIMARY_PROFILE_ID,
          name: defaultName,
          createdAt: Date.now(),
        },
      ],
    };
    return family;
  }
  let value: FamilyProfiles;
  try {
    value = JSON.parse(raw) as FamilyProfiles;
  } catch {
    throw new LocalizedError("family.profile.error.unreadable");
  }
  if (
    value?.version !== 1 ||
    !Array.isArray(value.profiles) ||
    value.profiles.length < 1 ||
    value.profiles.length > MAX_FAMILY_PROFILES ||
    value.profiles.some(
      (p) =>
        !p ||
        !/^[a-z0-9-]{1,64}$/.test(p.id) ||
        typeof p.name !== "string" ||
        !p.name.trim() ||
        [...p.name].length > MAX_PROFILE_NAME_LENGTH ||
        !Number.isFinite(p.createdAt),
    ) ||
    new Set(value.profiles.map((p) => p.id)).size !== value.profiles.length ||
    !value.profiles.some((p) => p.id === PRIMARY_PROFILE_ID) ||
    !value.profiles.some((p) => p.id === value.activeId)
  ) {
    throw new LocalizedError("family.profile.error.unreadable");
  }
  return value;
}

export async function saveFamilyProfiles(value: FamilyProfiles): Promise<void> {
  await AsyncStorage.setItem(FAMILY_KEY, JSON.stringify(value));
}
