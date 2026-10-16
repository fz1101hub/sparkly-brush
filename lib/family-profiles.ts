import AsyncStorage from "@react-native-async-storage/async-storage";
import { PRIMARY_PROFILE_ID } from "@/lib/profile-scope";

export const FAMILY_KEY = "brushlings.family.v1";
export const MAX_FAMILY_PROFILES = 8;
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
  if (!clean || [...clean].length > 24)
    throw new Error("Inserisci un nome da 1 a 24 caratteri");
  if (
    profiles.some(
      (p) =>
        p.id !== excludingId &&
        p.name.toLocaleLowerCase() === clean.toLocaleLowerCase(),
    )
  ) {
    throw new Error("Questo nome è già usato da un altro profilo");
  }
  return clean;
}

export async function loadFamilyProfiles(): Promise<FamilyProfiles> {
  const raw = await AsyncStorage.getItem(FAMILY_KEY);
  if (!raw) {
    const family: FamilyProfiles = {
      version: 1,
      activeId: PRIMARY_PROFILE_ID,
      profiles: [
        {
          id: PRIMARY_PROFILE_ID,
          name: "Il mio sorriso",
          createdAt: Date.now(),
        },
      ],
    };
    return family;
  }
  const value = JSON.parse(raw) as FamilyProfiles;
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
        [...p.name].length > 24 ||
        !Number.isFinite(p.createdAt),
    ) ||
    new Set(value.profiles.map((p) => p.id)).size !== value.profiles.length ||
    !value.profiles.some((p) => p.id === PRIMARY_PROFILE_ID) ||
    !value.profiles.some((p) => p.id === value.activeId)
  ) {
    throw new Error(
      "Non riesco a leggere i profili salvati. I dati restano sul dispositivo.",
    );
  }
  return value;
}

export async function saveFamilyProfiles(value: FamilyProfiles): Promise<void> {
  await AsyncStorage.setItem(FAMILY_KEY, JSON.stringify(value));
}
