import type { ComponentProps } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

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

export type CustomizationState = {
  ownedIds: CustomizationItemId[];
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
    accent: "#2D7FF9",
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
    accent: "#2D7FF9",
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

export function spentCoins(state: CustomizationState): number {
  return state.ownedIds.reduce((total, id) => {
    const item = getCustomizationItem(id);
    return total + (item?.cost ?? 0);
  }, 0);
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
