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

export const ADVENTURE_ZONES: AdventureZone[] = [
  {
    id: "bubble-bay",
    name: "Baia delle Bolle",
    subtitle: "Il primo approdo, pieno di schiuma brillante.",
    unlockAtSessions: 0,
    accent: "#2D7FF9",
    soft: "#E7F1FF",
  },
  {
    id: "fresh-forest",
    name: "Foresta Fresca",
    subtitle: "Foglie profumate e sentieri verdi.",
    unlockAtSessions: 2,
    accent: "#2E9B67",
    soft: "#E6F7EE",
  },
  {
    id: "spark-mountain",
    name: "Monte Splendente",
    subtitle: "Una vetta luminosa che premia la costanza.",
    unlockAtSessions: 5,
    accent: "#E76A2C",
    soft: "#FFF0E7",
  },
  {
    id: "crystal-lake",
    name: "Lago Cristallino",
    subtitle: "Acqua limpida, gemme e nuovi incontri.",
    unlockAtSessions: 8,
    accent: "#7357C7",
    soft: "#F0ECFF",
  },
  {
    id: "smile-valley",
    name: "Valle del Sorriso",
    subtitle: "La valle segreta dei Brushlings più rari.",
    unlockAtSessions: 12,
    accent: "#B98A00",
    soft: "#FFF8D9",
  },
];

export function isAdventureZoneUnlocked(zone: AdventureZone, completedSessions: number): boolean {
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
