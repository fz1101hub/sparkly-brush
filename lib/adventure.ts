import {
  translateDynamic,
  type TranslationKey,
  type TranslationParams,
} from "@/lib/i18n";

export type AdventureZoneId =
  | "bubble-bay"
  | "fresh-forest"
  | "spark-mountain"
  | "crystal-lake"
  | "smile-valley";

export type AdventureZone = {
  id: AdventureZoneId;
  name: string;
  subtitle: string;
  unlockAtSessions: number;
  accent: string;
  soft: string;
};

type Translator = (key: TranslationKey, params?: TranslationParams) => string;
type AdventureTextKeys = { name: TranslationKey; subtitle: TranslationKey };

export const ADVENTURE_ZONE_TEXT_KEYS = {
  "bubble-bay": {
    name: "game.adventure.bubble-bay.name",
    subtitle: "game.adventure.bubble-bay.subtitle",
  },
  "fresh-forest": {
    name: "game.adventure.fresh-forest.name",
    subtitle: "game.adventure.fresh-forest.subtitle",
  },
  "spark-mountain": {
    name: "game.adventure.spark-mountain.name",
    subtitle: "game.adventure.spark-mountain.subtitle",
  },
  "crystal-lake": {
    name: "game.adventure.crystal-lake.name",
    subtitle: "game.adventure.crystal-lake.subtitle",
  },
  "smile-valley": {
    name: "game.adventure.smile-valley.name",
    subtitle: "game.adventure.smile-valley.subtitle",
  },
} as const satisfies Record<AdventureZoneId, AdventureTextKeys>;

const text = (key: TranslationKey) => translateDynamic("it", key);

export const ADVENTURE_ZONES: AdventureZone[] = [
  {
    id: "bubble-bay",
    name: text(ADVENTURE_ZONE_TEXT_KEYS["bubble-bay"].name),
    subtitle: text(ADVENTURE_ZONE_TEXT_KEYS["bubble-bay"].subtitle),
    unlockAtSessions: 0,
    accent: "#2457D6",
    soft: "#E7F1FF",
  },
  {
    id: "fresh-forest",
    name: text(ADVENTURE_ZONE_TEXT_KEYS["fresh-forest"].name),
    subtitle: text(ADVENTURE_ZONE_TEXT_KEYS["fresh-forest"].subtitle),
    unlockAtSessions: 2,
    accent: "#2E9B67",
    soft: "#E6F7EE",
  },
  {
    id: "spark-mountain",
    name: text(ADVENTURE_ZONE_TEXT_KEYS["spark-mountain"].name),
    subtitle: text(ADVENTURE_ZONE_TEXT_KEYS["spark-mountain"].subtitle),
    unlockAtSessions: 5,
    accent: "#E76A2C",
    soft: "#FFF0E7",
  },
  {
    id: "crystal-lake",
    name: text(ADVENTURE_ZONE_TEXT_KEYS["crystal-lake"].name),
    subtitle: text(ADVENTURE_ZONE_TEXT_KEYS["crystal-lake"].subtitle),
    unlockAtSessions: 8,
    accent: "#7357C7",
    soft: "#F0ECFF",
  },
  {
    id: "smile-valley",
    name: text(ADVENTURE_ZONE_TEXT_KEYS["smile-valley"].name),
    subtitle: text(ADVENTURE_ZONE_TEXT_KEYS["smile-valley"].subtitle),
    unlockAtSessions: 12,
    accent: "#B98A00",
    soft: "#FFF8D9",
  },
];

export function localizeAdventureZone(
  zone: AdventureZone,
  t: Translator,
): AdventureZone {
  const keys: AdventureTextKeys = ADVENTURE_ZONE_TEXT_KEYS[zone.id];
  return { ...zone, name: t(keys.name), subtitle: t(keys.subtitle) };
}

export function isAdventureZoneUnlocked(
  zone: AdventureZone,
  completedSessions: number,
): boolean {
  return completedSessions >= zone.unlockAtSessions;
}

export function getCurrentAdventureZone(completedSessions: number): AdventureZone {
  return [...ADVENTURE_ZONES]
    .reverse()
    .find((zone) => isAdventureZoneUnlocked(zone, completedSessions))
    ?? ADVENTURE_ZONES[0];
}

export function getNextAdventureZone(completedSessions: number): AdventureZone | null {
  return ADVENTURE_ZONES.find((zone) => !isAdventureZoneUnlocked(zone, completedSessions)) ?? null;
}

export function sessionsUntilZone(zone: AdventureZone, completedSessions: number): number {
  return Math.max(0, zone.unlockAtSessions - completedSessions);
}
