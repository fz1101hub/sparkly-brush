import type { BrushSession } from "@/lib/brush-types";
import {
  getCurrentAdventureZone,
  type AdventureZoneId,
} from "@/lib/adventure";
import type { BrushlingId } from "@/lib/brushlings";
import {
  translateDynamic,
  type TranslationKey,
  type TranslationParams,
} from "@/lib/i18n";

export type CollectibleItemId =
  "bubble-pearl" | "fresh-leaf" | "spark-crystal" | "moon-shard" | "smile-star";
export type CollectibleItem = {
  id: CollectibleItemId;
  name: string;
  description: string;
  zoneId: AdventureZoneId;
  icon: "opacity" | "eco" | "bolt" | "dark-mode" | "star";
  accent: string;
  soft: string;
};
export type EggId = "spark-egg" | "moon-egg";
export type EggDefinition = {
  id: EggId;
  name: string;
  description: string;
  zoneId: AdventureZoneId;
  foundAtCompletedSessions: number;
  hatchAtCompletedSessions: number;
  brushlingId: BrushlingId;
  accent: string;
  soft: string;
};
export type EggProgress = EggDefinition & {
  found: boolean;
  hatched: boolean;
  progress: number;
  sessionsRemaining: number;
};
export type GameInventory = {
  completedSessions: number;
  itemCounts: Record<CollectibleItemId, number>;
  eggs: EggProgress[];
  hatchedBrushlingIds: BrushlingId[];
};
export type SessionDiscovery = {
  sessionId: string;
  completedSessionNumber: number;
  zoneId: AdventureZoneId;
  item: CollectibleItem;
  eggFound?: EggDefinition;
  eggHatched?: EggDefinition;
};

type Translator = (key: TranslationKey, params?: TranslationParams) => string;
type ItemTextKeys = { name: TranslationKey; description: TranslationKey };

export const COLLECTIBLE_ITEM_TEXT_KEYS = {
  "bubble-pearl": {
    name: "game.inventory.bubble-pearl.name",
    description: "game.inventory.bubble-pearl.description",
  },
  "fresh-leaf": {
    name: "game.inventory.fresh-leaf.name",
    description: "game.inventory.fresh-leaf.description",
  },
  "spark-crystal": {
    name: "game.inventory.spark-crystal.name",
    description: "game.inventory.spark-crystal.description",
  },
  "moon-shard": {
    name: "game.inventory.moon-shard.name",
    description: "game.inventory.moon-shard.description",
  },
  "smile-star": {
    name: "game.inventory.smile-star.name",
    description: "game.inventory.smile-star.description",
  },
} as const satisfies Record<CollectibleItemId, ItemTextKeys>;

export const EGG_TEXT_KEYS = {
  "spark-egg": {
    name: "game.egg.spark-egg.name",
    description: "game.egg.spark-egg.description",
  },
  "moon-egg": {
    name: "game.egg.moon-egg.name",
    description: "game.egg.moon-egg.description",
  },
} as const satisfies Record<EggId, ItemTextKeys>;

const text = (key: TranslationKey) => translateDynamic("it", key);
const itemText = (id: CollectibleItemId) => ({
  name: text(COLLECTIBLE_ITEM_TEXT_KEYS[id].name),
  description: text(COLLECTIBLE_ITEM_TEXT_KEYS[id].description),
});
const eggText = (id: EggId) => ({
  name: text(EGG_TEXT_KEYS[id].name),
  description: text(EGG_TEXT_KEYS[id].description),
});

export const COLLECTIBLE_ITEMS: CollectibleItem[] = [
  {
    id: "bubble-pearl",
    ...itemText("bubble-pearl"),
    zoneId: "bubble-bay",
    icon: "opacity",
    accent: "#2457D6",
    soft: "#E7F1FF",
  },
  {
    id: "fresh-leaf",
    ...itemText("fresh-leaf"),
    zoneId: "fresh-forest",
    icon: "eco",
    accent: "#2E9B67",
    soft: "#E6F7EE",
  },
  {
    id: "spark-crystal",
    ...itemText("spark-crystal"),
    zoneId: "spark-mountain",
    icon: "bolt",
    accent: "#E76A2C",
    soft: "#FFF0E7",
  },
  {
    id: "moon-shard",
    ...itemText("moon-shard"),
    zoneId: "crystal-lake",
    icon: "dark-mode",
    accent: "#7357C7",
    soft: "#F0ECFF",
  },
  {
    id: "smile-star",
    ...itemText("smile-star"),
    zoneId: "smile-valley",
    icon: "star",
    accent: "#B98A00",
    soft: "#FFF8D9",
  },
];

export const EGG_DEFINITIONS: EggDefinition[] = [
  {
    id: "spark-egg",
    ...eggText("spark-egg"),
    zoneId: "fresh-forest",
    foundAtCompletedSessions: 3,
    hatchAtCompletedSessions: 5,
    brushlingId: "voltuff",
    accent: "#D7A900",
    soft: "#FFF7CF",
  },
  {
    id: "moon-egg",
    ...eggText("moon-egg"),
    zoneId: "crystal-lake",
    foundAtCompletedSessions: 8,
    hatchAtCompletedSessions: 10,
    brushlingId: "moonbit",
    accent: "#7357C7",
    soft: "#F0ECFF",
  },
];

export function localizeCollectibleItem(
  item: CollectibleItem,
  t: Translator,
): CollectibleItem {
  const keys: ItemTextKeys = COLLECTIBLE_ITEM_TEXT_KEYS[item.id];
  return { ...item, name: t(keys.name), description: t(keys.description) };
}

export function localizeEggDefinition(
  egg: EggDefinition,
  t: Translator,
): EggDefinition {
  const keys: ItemTextKeys = EGG_TEXT_KEYS[egg.id];
  return { ...egg, name: t(keys.name), description: t(keys.description) };
}

const ITEM_BY_ZONE = new Map<AdventureZoneId, CollectibleItem>(
  COLLECTIBLE_ITEMS.map((item) => [item.zoneId, item]),
);

function completedSessionsChronological(history: BrushSession[]): BrushSession[] {
  return history
    .filter((session) => session.completed)
    .sort((a, b) => a.startedAt - b.startedAt);
}

function emptyCounts(): Record<CollectibleItemId, number> {
  return {
    "bubble-pearl": 0,
    "fresh-leaf": 0,
    "spark-crystal": 0,
    "moon-shard": 0,
    "smile-star": 0,
  };
}

export function getItemForCompletedSessionNumber(completedSessionNumber: number): CollectibleItem {
  const zone = getCurrentAdventureZone(Math.max(0, completedSessionNumber));
  return ITEM_BY_ZONE.get(zone.id) ?? COLLECTIBLE_ITEMS[0];
}

export function computeGameInventory(history: BrushSession[]): GameInventory {
  const completed = completedSessionsChronological(history);
  const itemCounts = emptyCounts();
  completed.forEach((_, index) => {
    const item = getItemForCompletedSessionNumber(index + 1);
    itemCounts[item.id] += 1;
  });
  const eggs = EGG_DEFINITIONS.map((egg) => {
    const found = completed.length >= egg.foundAtCompletedSessions;
    const hatched = completed.length >= egg.hatchAtCompletedSessions;
    const denominator = Math.max(1, egg.hatchAtCompletedSessions - egg.foundAtCompletedSessions);
    const numerator = Math.max(
      0,
      Math.min(denominator, completed.length - egg.foundAtCompletedSessions),
    );
    return {
      ...egg,
      found,
      hatched,
      progress: found ? numerator / denominator : 0,
      sessionsRemaining: Math.max(0, egg.hatchAtCompletedSessions - completed.length),
    };
  });
  return {
    completedSessions: completed.length,
    itemCounts,
    eggs,
    hatchedBrushlingIds: eggs
      .filter((egg) => egg.hatched)
      .map((egg) => egg.brushlingId),
  };
}

export function computeSessionDiscovery(
  history: BrushSession[],
  sessionId: string,
): SessionDiscovery | null {
  const completed = completedSessionsChronological(history);
  const index = completed.findIndex((session) => session.id === sessionId);
  if (index < 0) return null;
  const completedSessionNumber = index + 1;
  const item = getItemForCompletedSessionNumber(completedSessionNumber);
  return {
    sessionId,
    completedSessionNumber,
    zoneId: item.zoneId,
    item,
    eggFound: EGG_DEFINITIONS.find(
      (egg) => egg.foundAtCompletedSessions === completedSessionNumber,
    ),
    eggHatched: EGG_DEFINITIONS.find(
      (egg) => egg.hatchAtCompletedSessions === completedSessionNumber,
    ),
  };
}
