import AsyncStorage from "@react-native-async-storage/async-storage";
import { PRIMARY_PROFILE_ID } from "@/lib/profile-scope";

const KEY = "brushlings.toothbrush-profiles.v1";
let queue: Promise<void> = Promise.resolve();

// Stored BLE history belongs to one child; sharing a cursor would mix their rewards.
export function claimToothbrush(
  deviceId: string,
  profileId: string,
): Promise<void> {
  const operation = queue.then(async () => {
    const raw = await AsyncStorage.getItem(KEY);
    const owners: Record<string, string> = raw ? JSON.parse(raw) : {};
    if (
      !owners ||
      typeof owners !== "object" ||
      Array.isArray(owners) ||
      Object.values(owners).some((value) => typeof value !== "string")
    )
      throw new Error("Associazioni dello spazzolino non leggibili");
    const deviceKey = `device:${deviceId}`;
    const legacyRaw = await AsyncStorage.getItem("sparkly-brush.device.v1");
    const legacy = legacyRaw
      ? (JSON.parse(legacyRaw) as { id?: string })
      : null;
    const owner =
      owners[deviceKey] ??
      (legacy?.id === deviceId ? PRIMARY_PROFILE_ID : undefined);
    if (owner && owner !== profileId) {
      throw new Error(
        "Questo spazzolino appartiene a un altro profilo. Passa a quel profilo per sincronizzarlo; qui puoi usare il timer manuale.",
      );
    }
    if (owners[deviceKey] !== profileId) {
      owners[deviceKey] = profileId;
      await AsyncStorage.setItem(KEY, JSON.stringify(owners));
    }
  });
  queue = operation.catch(() => {});
  return operation;
}
