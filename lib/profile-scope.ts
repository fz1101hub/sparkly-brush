import AsyncStorage from "@react-native-async-storage/async-storage";

export const PRIMARY_PROFILE_ID = "primary";
let activeProfileId = PRIMARY_PROFILE_ID;

export function getActiveProfileId(): string {
  return activeProfileId;
}
export function setActiveProfileId(id: string): void {
  if (!/^[a-z0-9-]{1,64}$/.test(id))
    throw new Error("Identità del profilo non valida");
  activeProfileId = id;
}

export function profileKey(key: string, id = activeProfileId): string {
  return id === PRIMARY_PROFILE_ID ? key : `brushlings.profile.${id}.${key}`;
}

export function profileDatabase(name: string, id: string): string {
  return id === PRIMARY_PROFILE_ID ? name : `${id}-${name}`;
}

// Each instance captures its identity. A delayed write cannot land in a newly selected profile.
export function createProfileStorage(id: string) {
  const key = (value: string) => profileKey(value, id);
  return {
    getItem: (name: string) => AsyncStorage.getItem(key(name)),
    setItem: (name: string, value: string) =>
      AsyncStorage.setItem(key(name), value),
    removeItem: (name: string) => AsyncStorage.removeItem(key(name)),
    multiSet: (entries: [string, string][]) =>
      AsyncStorage.multiSet(entries.map(([name, value]) => [key(name), value])),
    multiRemove: (names: string[]) => AsyncStorage.multiRemove(names.map(key)),
  };
}

export function createProfileStore<T>(
  factory: (id: string) => T,
): (id?: string) => T {
  const stores = new Map<string, T>();
  return (id = activeProfileId) => {
    if (!stores.has(id)) stores.set(id, factory(id));
    return stores.get(id)!;
  };
}
