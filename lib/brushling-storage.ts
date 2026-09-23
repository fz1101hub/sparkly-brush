import AsyncStorage from "@react-native-async-storage/async-storage";

import { DEFAULT_BRUSHLING_ID, isBrushlingId, type BrushlingId } from "@/lib/brushlings";
import {
  DEFAULT_CUSTOMIZATION_STATE,
  getCustomizationItem,
  isCustomizationItemId,
  normalizePurchaseLedger,
  type CustomizationItemId,
  type CustomizationState,
} from "@/lib/customization";

const SELECTED_BRUSHLING_KEY = "sparkly-brush.brushling.selected.v1";
const STARTER_CHOSEN_KEY = "sparkly-brush.brushling.starter-chosen.v1";
const CUSTOMIZATION_KEY = "sparkly-brush.brushling.customization.v1";

export type BrushlingProfile = {
  selectedId: BrushlingId;
  hasChosenStarter: boolean;
};

export async function loadBrushlingProfile(): Promise<BrushlingProfile> {
  try {
    const [storedId, starterChosen] = await Promise.all([
      AsyncStorage.getItem(SELECTED_BRUSHLING_KEY),
      AsyncStorage.getItem(STARTER_CHOSEN_KEY),
    ]);

    return {
      selectedId: storedId && isBrushlingId(storedId) ? storedId : DEFAULT_BRUSHLING_ID,
      hasChosenStarter: starterChosen === "true",
    };
  } catch {
    return {
      selectedId: DEFAULT_BRUSHLING_ID,
      hasChosenStarter: false,
    };
  }
}

export async function saveSelectedBrushling(id: BrushlingId): Promise<void> {
  await AsyncStorage.setItem(SELECTED_BRUSHLING_KEY, id);
}

export async function saveStarterSelection(id: BrushlingId): Promise<void> {
  await AsyncStorage.multiSet([
    [SELECTED_BRUSHLING_KEY, id],
    [STARTER_CHOSEN_KEY, "true"],
  ]);
}

function validOwnedIds(value: unknown): CustomizationItemId[] {
  if (!Array.isArray(value)) return [...DEFAULT_CUSTOMIZATION_STATE.ownedIds];

  const ids = value.filter(
    (candidate): candidate is CustomizationItemId =>
      typeof candidate === "string" && isCustomizationItemId(candidate),
  );
  if (!ids.includes("bubble-room")) ids.unshift("bubble-room");
  return [...new Set(ids)];
}

function validEquipped(
  value: unknown,
  ownedIds: CustomizationItemId[],
  category: "habitat" | "accessory" | "decor",
): CustomizationItemId | null {
  if (typeof value !== "string" || !isCustomizationItemId(value)) return null;
  if (!ownedIds.includes(value)) return null;
  return getCustomizationItem(value)?.category === category ? value : null;
}

export async function loadCustomizationState(): Promise<CustomizationState> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOMIZATION_KEY);
    if (!raw) return DEFAULT_CUSTOMIZATION_STATE;

    const parsed = JSON.parse(raw) as Partial<CustomizationState>;
    const ownedIds = validOwnedIds(parsed.ownedIds);
    const habitat = validEquipped(parsed.equippedHabitatId, ownedIds, "habitat") ?? "bubble-room";

    return {
      ownedIds,
      purchaseLedger: normalizePurchaseLedger(parsed.purchaseLedger, ownedIds),
      equippedHabitatId: habitat,
      equippedAccessoryId: validEquipped(parsed.equippedAccessoryId, ownedIds, "accessory"),
      equippedDecorId: validEquipped(parsed.equippedDecorId, ownedIds, "decor"),
    };
  } catch {
    return DEFAULT_CUSTOMIZATION_STATE;
  }
}

export async function saveCustomizationState(state: CustomizationState): Promise<void> {
  await AsyncStorage.setItem(CUSTOMIZATION_KEY, JSON.stringify(state));
}

export async function restoreBrushlingState(
  profile: BrushlingProfile,
  customization: CustomizationState,
): Promise<void> {
  await AsyncStorage.multiSet([
    [SELECTED_BRUSHLING_KEY, profile.selectedId],
    [STARTER_CHOSEN_KEY, profile.hasChosenStarter ? "true" : "false"],
    [CUSTOMIZATION_KEY, JSON.stringify(customization)],
  ]);
}
