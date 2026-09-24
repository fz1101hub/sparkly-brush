import type { ComponentProps } from "react";
import type MaterialIcons from "@expo/vector-icons/MaterialIcons";

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

export const CUSTOMIZATION_ITEMS: CustomizationItem[] = [
  {
    id: "bubble-room",
    category: "habitat",
    name: "Stanza delle Bolle",
    description: "La casetta iniziale, luminosa e piena di bollicine.",
    cost: 0,
    icon: "opacity",
    accent: "#2457D6",
    soft: "#E7F1FF",
  },
  {
    id: "fresh-garden",
    category: "habitat",
    name: "Giardino Fresco",
    description: "Un angolo verde con foglie, erba e profumo di menta.",
    cost: 28,
    icon: "nature",
    accent: "#2E9B67",
    soft: "#E6F7EE",
  },
  {
    id: "sunset-camp",
    category: "habitat",
    name: "Campo del Tramonto",
    description: "Un rifugio caldo per riposarsi dopo una grande avventura.",
    cost: 48,
    icon: "wb-sunny",
    accent: "#E76A2C",
    soft: "#FFF0E7",
  },
  {
    id: "moon-cove",
    category: "habitat",
    name: "Cala Lunare",
    description: "Un habitat tranquillo che brilla sotto le stelle.",
    cost: 72,
    icon: "dark-mode",
    accent: "#7357C7",
    soft: "#F0ECFF",
  },
  {
    id: "blue-scarf",
    category: "accessory",
    name: "Foulard Splash",
    description: "Un piccolo foulard da esploratore.",
    cost: 18,
    icon: "waves",
    accent: "#2457D6",
    soft: "#E7F1FF",
  },
  {
    id: "leaf-crown",
    category: "accessory",
    name: "Corona di Foglie",
    description: "Per Brushlings che amano sentirsi re della foresta.",
    cost: 26,
    icon: "eco",
    accent: "#2E9B67",
    soft: "#E6F7EE",
  },
  {
    id: "star-glasses",
    category: "accessory",
    name: "Occhiali Stellari",
    description: "Brillano quando una missione è completata.",
    cost: 38,
    icon: "star",
    accent: "#B98A00",
    soft: "#FFF8D9",
  },
  {
    id: "smile-cushion",
    category: "decor",
    name: "Cuscino Sorriso",
    description: "Un cuscino morbido per la tana.",
    cost: 20,
    icon: "sentiment-very-satisfied",
    accent: "#E76A2C",
    soft: "#FFF0E7",
  },
  {
    id: "mint-plant",
    category: "decor",
    name: "Pianta di Menta",
    description: "Una piantina sempre fresca vicino al lettino.",
    cost: 24,
    icon: "local-florist",
    accent: "#2E9B67",
    soft: "#E6F7EE",
  },
  {
    id: "star-mobile",
    category: "decor",
    name: "Mobile di Stelle",
    description: "Piccole stelle sospese per la buonanotte.",
    cost: 34,
    icon: "auto-awesome",
    accent: "#7357C7",
    soft: "#F0ECFF",
  },
];

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

  if (item.category === "habitat") {
    return { ...state, equippedHabitatId: item.id };
  }
  if (item.category === "accessory") {
    return { ...state, equippedAccessoryId: item.id };
  }
  return { ...state, equippedDecorId: item.id };
}
