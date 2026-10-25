import AsyncStorage from "@react-native-async-storage/async-storage";

import { LocalizedError } from "@/lib/localized-error";
import { PRIMARY_PROFILE_ID } from "@/lib/profile-scope";

/**
 * Which child each handle belongs to (from PR #10). A handle's stored history and sync cursor
 * belong to one child: syncing it into a sibling's profile would mix their rewards.
 * Family-wide on purpose, unlike the per-profile "paired handle".
 */
export const TOOTHBRUSH_OWNERS_KEY = "brushlings.toothbrush-profiles.v1";
/** Handle paired before family profiles existed: it belongs to the primary profile. */
const LEGACY_PRIMARY_DEVICE_KEY = "sparkly-brush.device.v1";

let queue: Promise<unknown> = Promise.resolve();
function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = queue.then(operation, operation);
  queue = result.catch(() => undefined);
  return result;
}

const ownerKey = (deviceId: string) => `device:${deviceId}`;

async function readOwners(): Promise<Record<string, string>> {
  const raw = await AsyncStorage.getItem(TOOTHBRUSH_OWNERS_KEY);
  let owners: unknown = {};
  try {
    owners = raw ? JSON.parse(raw) : {};
  } catch {
    throw new LocalizedError("device.error.ownersUnreadable");
  }
  if (
    !owners
    || typeof owners !== "object"
    || Array.isArray(owners)
    || Object.values(owners).some((value) => typeof value !== "string")
  ) {
    throw new LocalizedError("device.error.ownersUnreadable");
  }
  const result = { ...(owners as Record<string, string>) };
  const legacyRaw = await AsyncStorage.getItem(LEGACY_PRIMARY_DEVICE_KEY);
  if (legacyRaw) {
    try {
      const legacy = JSON.parse(legacyRaw) as { id?: unknown };
      if (typeof legacy?.id === "string" && !result[ownerKey(legacy.id)]) {
        result[ownerKey(legacy.id)] = PRIMARY_PROFILE_ID;
      }
    } catch {
      // A damaged legacy record only loses the implicit ownership.
    }
  }
  return result;
}

/** Device ids that belong to other children: scans for this profile must not pick them. */
export function devicesOwnedByOthers(profileId: string): Promise<string[]> {
  return serialize(async () => Object.entries(await readOwners())
    .filter(([, owner]) => owner !== profileId)
    .map(([key]) => key.slice("device:".length)));
}

/** Makes the handle this child's, unless it already belongs to a sibling. */
export function claimToothbrush(deviceId: string, profileId: string): Promise<void> {
  return serialize(async () => {
    const owners = await readOwners();
    const owner = owners[ownerKey(deviceId)];
    if (owner && owner !== profileId) {
      throw new LocalizedError("device.error.handleOwnedByOtherProfile");
    }
    if (owner === profileId) return;
    const stored = await AsyncStorage.getItem(TOOTHBRUSH_OWNERS_KEY);
    const next = { ...(stored ? (JSON.parse(stored) as Record<string, string>) : {}), [ownerKey(deviceId)]: profileId };
    await AsyncStorage.setItem(TOOTHBRUSH_OWNERS_KEY, JSON.stringify(next));
  });
}

/** After "forget" or "change handle": the handle can be paired again, also by a sibling. */
export function releaseToothbrush(deviceId: string, profileId: string): Promise<void> {
  return serialize(async () => {
    const stored = await AsyncStorage.getItem(TOOTHBRUSH_OWNERS_KEY);
    const owners = stored ? (JSON.parse(stored) as Record<string, string>) : {};
    const key = ownerKey(deviceId);
    // The implicit legacy ownership disappears with the primary profile's paired-handle record.
    if (owners[key] !== profileId) return;
    delete owners[key];
    await AsyncStorage.setItem(TOOTHBRUSH_OWNERS_KEY, JSON.stringify(owners));
  });
}
