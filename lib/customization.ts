import type { ComponentProps } from "react";
import type MaterialIcons from "@expo/vector-icons/MaterialIcons";

import {
  translateDynamic,
  type TranslationKey,
  type TranslationParams,
} from "@/lib/i18n";

export type CustomizationCategory = "habitat" | "accessory" | "decor";
export type CustomizationItemId =
  | "bubble-room"
  | "fresh-garden"
  | "sunset-camp"
  | "moon-cove"
  | "blue-scarf"
  | "leaf-crown"
  | "star-glasses"
  | "smile-cushion"
  | "mint-plant"
  | "star-mobile";

export type CustomizationItem = {
  id: CustomizationItemId;
  category: CustomizationCategory;
  name: string;
  description: string;
  cost: number;
  icon: ComponentProps<typeof MaterialIcons>["name"];
  accent: string;
  soft: string;
};

export type CustomizationPurchase = {
  itemId: CustomizationItemId;
  pricePaid: number;
  purchasedAt: number;
};
export type CustomizationState = {
  ownedIds: CustomizationItemId[];
  purchaseLedger: CustomizationPurchase[];
  equippedHabitatId: CustomizationItemId;
  equippedAccessoryId: CustomizationItemId | null;
  equippedDecorId: CustomizationItemId | null;
};

type Translator = (key: TranslationKey, params?: TranslationParams) => string;
type CustomizationTextKeys = {
  name: TranslationKey;
  description: TranslationKey;
};

export const CUSTOMIZATION_TEXT_KEYS = {
  "bubble-room": {
    name: "game.customization.bubble-room.name",
    description: "game.customization.bubble-room.description",
  },
  "fresh-garden": {
    name: "game.customization.fresh-garden.name",
    description: "game.customization.fresh-garden.description",
  },
  "sunset-camp": {
    name: "game.customization.sunset-camp.name",
    description: "game.customization.sunset-camp.description",
  },
  "moon-cove": {
    name: "game.customization.moon-cove.name",
    description: "game.customization.moon-cove.description",
  },
  "blue-scarf": {
    name: "game.customization.blue-scarf.name",
    description: "game.customization.blue-scarf.description",
  },
  "leaf-crown": {
    name: "game.customization.leaf-crown.name",
    description: "game.customization.leaf-crown.description",
  },
  "star-glasses": {
    name: "game.customization.star-glasses.name",
    description: "game.customization.star-glasses.description",
  },
  "smile-cushion": {
    name: "game.customization.smile-cushion.name",
    description: "game.customization.smile-cushion.description",
  },
  "mint-plant": {
    name: "game.customization.mint-plant.name",
    description: "game.customization.mint-plant.description",
  },
  "star-mobile": {
    name: "game.customization.star-mobile.name",
    description: "game.customization.star-mobile.description",
  },
} as const satisfies Record<CustomizationItemId, CustomizationTextKeys>;

const text = (key: TranslationKey) => translateDynamic("it", key);
const localized = (id: CustomizationItemId) => ({
  name: text(CUSTOMIZATION_TEXT_KEYS[id].name),
  description: text(CUSTOMIZATION_TEXT_KEYS[id].description),
});

export const CUSTOMIZATION_ITEMS: CustomizationItem[] = [
  {
    id: "bubble-room",
    category: "habitat",
    ...localized("bubble-room"),
    cost: 0,
    icon: "opacity",
    accent: "#2457D6",
    soft: "#E7F1FF",
  },
  {
    id: "fresh-garden",
    category: "habitat",
    ...localized("fresh-garden"),
    cost: 28,
    icon: "nature",
    accent: "#2E9B67",
    soft: "#E6F7EE",
  },
  {
    id: "sunset-camp",
    category: "habitat",
    ...localized("sunset-camp"),
    cost: 48,
    icon: "wb-sunny",
    accent: "#E76A2C",
    soft: "#FFF0E7",
  },
  {
    id: "moon-cove",
    category: "habitat",
    ...localized("moon-cove"),
    cost: 72,
    icon: "dark-mode",
    accent: "#7357C7",
    soft: "#F0ECFF",
  },
  {
    id: "blue-scarf",
    category: "accessory",
    ...localized("blue-scarf"),
    cost: 18,
    icon: "waves",
    accent: "#2457D6",
    soft: "#E7F1FF",
  },
  {
    id: "leaf-crown",
    category: "accessory",
    ...localized("leaf-crown"),
    cost: 26,
    icon: "eco",
    accent: "#2E9B67",
    soft: "#E6F7EE",
  },
  {
    id: "star-glasses",
    category: "accessory",
    ...localized("star-glasses"),
    cost: 38,
    icon: "star",
    accent: "#B98A00",
    soft: "#FFF8D9",
  },
  {
    id: "smile-cushion",
    category: "decor",
    ...localized("smile-cushion"),
    cost: 20,
    icon: "sentiment-very-satisfied",
    accent: "#E76A2C",
    soft: "#FFF0E7",
  },
  {
    id: "mint-plant",
    category: "decor",
    ...localized("mint-plant"),
    cost: 24,
    icon: "local-florist",
    accent: "#2E9B67",
    soft: "#E6F7EE",
  },
  {
    id: "star-mobile",
    category: "decor",
    ...localized("star-mobile"),
    cost: 34,
    icon: "auto-awesome",
    accent: "#7357C7",
    soft: "#F0ECFF",
  },
];

export function localizeCustomizationItem(
  item: CustomizationItem,
  t: Translator,
): CustomizationItem {
  const keys: CustomizationTextKeys = CUSTOMIZATION_TEXT_KEYS[item.id];
  return { ...item, name: t(keys.name), description: t(keys.description) };
}

export const DEFAULT_CUSTOMIZATION_STATE: CustomizationState = {
  ownedIds: ["bubble-room"],
  purchaseLedger: [],
  equippedHabitatId: "bubble-room",
  equippedAccessoryId: null,
  equippedDecorId: null,
};

export function getCustomizationItem(id: CustomizationItemId | null): CustomizationItem | null {
  if (!id) return null;
  return CUSTOMIZATION_ITEMS.find((item) => item.id === id) ?? null;
}

export function isCustomizationItemId(value: string): value is CustomizationItemId {
  return CUSTOMIZATION_ITEMS.some((item) => item.id === value);
}

export function normalizePurchaseLedger(
  value: unknown,
  ownedIds: CustomizationItemId[],
): CustomizationPurchase[] {
  const byItem = new Map<CustomizationItemId, CustomizationPurchase>();
  if (Array.isArray(value)) {
    value.forEach((candidate) => {
      if (!candidate || typeof candidate !== "object") return;
      const entry = candidate as Partial<CustomizationPurchase>;
      if (
        typeof entry.itemId !== "string"
        || !isCustomizationItemId(entry.itemId)
        || !ownedIds.includes(entry.itemId)
        || typeof entry.pricePaid !== "number"
        || !Number.isFinite(entry.pricePaid)
        || entry.pricePaid < 0
        || typeof entry.purchasedAt !== "number"
        || !Number.isFinite(entry.purchasedAt)
        || entry.purchasedAt < 0
      ) return;
      byItem.set(entry.itemId, {
        itemId: entry.itemId,
        pricePaid: Math.floor(entry.pricePaid),
        purchasedAt: Math.floor(entry.purchasedAt),
      });
    });
  }
  ownedIds.forEach((itemId) => {
    const item = getCustomizationItem(itemId);
    if (!item || item.cost === 0 || byItem.has(itemId)) return;
    byItem.set(itemId, { itemId, pricePaid: item.cost, purchasedAt: 0 });
  });
  return ownedIds.flatMap((itemId) => byItem.get(itemId) ?? []);
}

export function spentCoins(state: CustomizationState): number {
  return normalizePurchaseLedger(state.purchaseLedger, state.ownedIds)
    .reduce((total, purchase) => total + purchase.pricePaid, 0);
}

export function availableCoins(totalEarnedCoins: number, state: CustomizationState): number {
  return Math.max(0, totalEarnedCoins - spentCoins(state));
}

/**
 * Clearing the history also clears every coin it earned. Items already bought stay owned, but
 * their price no longer counts against future earnings: otherwise the wallet would show 0 while
 * new sessions silently repaid the old purchases. Entries are kept (price 0) because a missing
 * entry is re-created at full price by normalizePurchaseLedger.
 */
export function settlePurchasesAfterHistoryReset(state: CustomizationState): CustomizationState {
  return {
    ...state,
    purchaseLedger: normalizePurchaseLedger(state.purchaseLedger, state.ownedIds)
      .map((purchase) => ({ ...purchase, pricePaid: 0 })),
  };
}

export function purchaseCustomization(
  state: CustomizationState,
  itemId: CustomizationItemId,
  totalEarnedCoins: number,
): CustomizationState | null {
  if (state.ownedIds.includes(itemId)) return state;
  const item = getCustomizationItem(itemId);
  if (!item || availableCoins(totalEarnedCoins, state) < item.cost) return null;
  return {
    ...state,
    ownedIds: [...state.ownedIds, itemId],
    purchaseLedger: [
      ...normalizePurchaseLedger(state.purchaseLedger, state.ownedIds),
      { itemId, pricePaid: item.cost, purchasedAt: Date.now() },
    ],
  };
}

export function equipCustomization(
  state: CustomizationState,
  itemId: CustomizationItemId,
): CustomizationState | null {
  if (!state.ownedIds.includes(itemId)) return null;
  const item = getCustomizationItem(itemId);
  if (!item) return null;
  if (item.category === "habitat")
    return { ...state, equippedHabitatId: item.id };
  if (item.category === "accessory")
    return { ...state, equippedAccessoryId: item.id };
  return { ...state, equippedDecorId: item.id };
}
