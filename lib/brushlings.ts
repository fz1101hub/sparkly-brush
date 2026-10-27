import type { BrushSession } from "@/lib/brush-types";
import { currentCompletedDayStreak, sameLocalDay } from "@/lib/day-progress";
import {
  translateDynamic,
  type TranslationKey,
  type TranslationParams,
} from "@/lib/i18n";

export type BrushlingId =
  "bloopi" | "spriggo" | "flarello" | "voltuff" | "moonbit";

export type BrushlingEvolution = {
  name: string;
  unlockLevel: number;
  title: string;
};

export type BrushlingDefinition = {
  id: BrushlingId;
  name: string;
  element: string;
  accent: string;
  textAccent: string;
  soft: string;
  unlockAtCompletedSessions: number;
  tagline: string;
  evolutions: BrushlingEvolution[];
};

export type BrushlingGameStats = {
  xp: number;
  level: number;
  levelProgress: number;
  coins: number;
  completedSessions: number;
  todayCompletedSessions: number;
  currentStreakDays: number;
  unlockedIds: BrushlingId[];
};

export type BrushlingReward = {
  sessionId: string;
  completed: boolean;
  xpEarned: number;
  coinsEarned: number;
  previousLevel: number;
  level: number;
  evolvedFrom?: string;
  evolvedTo?: string;
};

type Translator = (key: TranslationKey, params?: TranslationParams) => string;

type BrushlingTextKeys = {
  element: TranslationKey;
  tagline: TranslationKey;
  evolutionTitles: Record<number, TranslationKey>;
};

const defaultText = (key: TranslationKey) => translateDynamic("it", key);

export const BRUSHLING_TEXT_KEYS = {
  bloopi: {
    element: "game.brushling.bloopi.element",
    tagline: "game.brushling.bloopi.tagline",
    evolutionTitles: {
      1: "game.brushling.bloopi.evolution.1.title",
      3: "game.brushling.bloopi.evolution.3.title",
      6: "game.brushling.bloopi.evolution.6.title",
    },
  },
  spriggo: {
    element: "game.brushling.spriggo.element",
    tagline: "game.brushling.spriggo.tagline",
    evolutionTitles: {
      1: "game.brushling.spriggo.evolution.1.title",
      3: "game.brushling.spriggo.evolution.3.title",
      6: "game.brushling.spriggo.evolution.6.title",
    },
  },
  flarello: {
    element: "game.brushling.flarello.element",
    tagline: "game.brushling.flarello.tagline",
    evolutionTitles: {
      1: "game.brushling.flarello.evolution.1.title",
      3: "game.brushling.flarello.evolution.3.title",
      6: "game.brushling.flarello.evolution.6.title",
    },
  },
  voltuff: {
    element: "game.brushling.voltuff.element",
    tagline: "game.brushling.voltuff.tagline",
    evolutionTitles: { 1: "game.brushling.voltuff.evolution.1.title" },
  },
  moonbit: {
    element: "game.brushling.moonbit.element",
    tagline: "game.brushling.moonbit.tagline",
    evolutionTitles: { 1: "game.brushling.moonbit.evolution.1.title" },
  },
} as const satisfies Record<BrushlingId, BrushlingTextKeys>;

export const BRUSHLINGS: BrushlingDefinition[] = [
  {
    id: "bloopi",
    name: "Bloopi",
    element: defaultText(BRUSHLING_TEXT_KEYS.bloopi.element),
    accent: "#2457D6",
    textAccent: "#173F9F",
    soft: "#E7F1FF",
    unlockAtCompletedSessions: 0,
    tagline: defaultText(BRUSHLING_TEXT_KEYS.bloopi.tagline),
    evolutions: [
      {
        name: "Bloopi",
        unlockLevel: 1,
        title: defaultText(BRUSHLING_TEXT_KEYS.bloopi.evolutionTitles[1]),
      },
      {
        name: "Bubblio",
        unlockLevel: 3,
        title: defaultText(BRUSHLING_TEXT_KEYS.bloopi.evolutionTitles[3]),
      },
      {
        name: "Ondalux",
        unlockLevel: 6,
        title: defaultText(BRUSHLING_TEXT_KEYS.bloopi.evolutionTitles[6]),
      },
    ],
  },
  {
    id: "spriggo",
    name: "Spriggo",
    element: defaultText(BRUSHLING_TEXT_KEYS.spriggo.element),
    accent: "#2E9B67",
    textAccent: "#17633F",
    soft: "#E6F7EE",
    unlockAtCompletedSessions: 0,
    tagline: defaultText(BRUSHLING_TEXT_KEYS.spriggo.tagline),
    evolutions: [
      {
        name: "Spriggo",
        unlockLevel: 1,
        title: defaultText(BRUSHLING_TEXT_KEYS.spriggo.evolutionTitles[1]),
      },
      {
        name: "Germillo",
        unlockLevel: 3,
        title: defaultText(BRUSHLING_TEXT_KEYS.spriggo.evolutionTitles[3]),
      },
      {
        name: "Floraviva",
        unlockLevel: 6,
        title: defaultText(BRUSHLING_TEXT_KEYS.spriggo.evolutionTitles[6]),
      },
    ],
  },
  {
    id: "flarello",
    name: "Flarello",
    element: defaultText(BRUSHLING_TEXT_KEYS.flarello.element),
    accent: "#E76A2C",
    textAccent: "#A33E0A",
    soft: "#FFF0E7",
    unlockAtCompletedSessions: 0,
    tagline: defaultText(BRUSHLING_TEXT_KEYS.flarello.tagline),
    evolutions: [
      {
        name: "Flarello",
        unlockLevel: 1,
        title: defaultText(BRUSHLING_TEXT_KEYS.flarello.evolutionTitles[1]),
      },
      {
        name: "Braciolo",
        unlockLevel: 3,
        title: defaultText(BRUSHLING_TEXT_KEYS.flarello.evolutionTitles[3]),
      },
      {
        name: "Solfiamma",
        unlockLevel: 6,
        title: defaultText(BRUSHLING_TEXT_KEYS.flarello.evolutionTitles[6]),
      },
    ],
  },
  {
    id: "voltuff",
    name: "Voltuff",
    element: defaultText(BRUSHLING_TEXT_KEYS.voltuff.element),
    accent: "#B98A00",
    textAccent: "#6F5100",
    soft: "#FFF8D9",
    unlockAtCompletedSessions: 5,
    tagline: defaultText(BRUSHLING_TEXT_KEYS.voltuff.tagline),
    evolutions: [
      {
        name: "Voltuff",
        unlockLevel: 1,
        title: defaultText(BRUSHLING_TEXT_KEYS.voltuff.evolutionTitles[1]),
      },
    ],
  },
  {
    id: "moonbit",
    name: "Moonbit",
    element: defaultText(BRUSHLING_TEXT_KEYS.moonbit.element),
    accent: "#7357C7",
    textAccent: "#51369C",
    soft: "#F0ECFF",
    unlockAtCompletedSessions: 10,
    tagline: defaultText(BRUSHLING_TEXT_KEYS.moonbit.tagline),
    evolutions: [
      {
        name: "Moonbit",
        unlockLevel: 1,
        title: defaultText(BRUSHLING_TEXT_KEYS.moonbit.evolutionTitles[1]),
      },
    ],
  },
];

export function localizeBrushling(
  creature: BrushlingDefinition,
  t: Translator,
): BrushlingDefinition {
  const keys: BrushlingTextKeys = BRUSHLING_TEXT_KEYS[creature.id];
  return {
    ...creature,
    element: t(keys.element),
    tagline: t(keys.tagline),
    evolutions: creature.evolutions.map((item) => ({
      ...item,
      title: t(keys.evolutionTitles[item.unlockLevel]),
    })),
  };
}

export const STARTER_IDS: BrushlingId[] = ["bloopi", "spriggo", "flarello"];
export const DEFAULT_BRUSHLING_ID: BrushlingId = "bloopi";
export const XP_PER_LEVEL = 120;

export function getBrushling(id: BrushlingId): BrushlingDefinition {
  return BRUSHLINGS.find((item) => item.id === id) ?? BRUSHLINGS[0];
}

export function isBrushlingId(value: string): value is BrushlingId {
  return BRUSHLINGS.some((item) => item.id === value);
}

export function getEvolutionIndex(
  creature: BrushlingDefinition,
  level: number,
): number {
  let current = 0;
  creature.evolutions.forEach((item, index) => {
    if (level >= item.unlockLevel) current = index;
  });
  return current;
}

export function getEvolution(
  creature: BrushlingDefinition,
  level: number,
): BrushlingEvolution {
  return creature.evolutions[getEvolutionIndex(creature, level)];
}

export function getNextEvolution(
  creature: BrushlingDefinition,
  level: number,
): BrushlingEvolution | null {
  return creature.evolutions.find((item) => item.unlockLevel > level) ?? null;
}

export function computeBrushlingStats(
  history: BrushSession[],
  timestamp: number = Date.now(),
): BrushlingGameStats {
  const completed = history.filter((session) => session.completed);
  const completedSessions = completed.length;
  const incompleteXp = history
    .filter(
      (session) =>
        !session.completed &&
        session.rewardPolicy !== "completed-only" &&
        session.durationSeconds >= 5,
    )
    .reduce(
      (total, session) =>
        total + Math.min(20, Math.floor(session.durationSeconds / 6)),
      0,
    );
  const xp = completedSessions * 60 + incompleteXp;
  const rewardedSeconds = history
    .filter(
      (session) =>
        session.completed || session.rewardPolicy !== "completed-only",
    )
    .reduce(
      (total, session) => total + Math.max(0, session.durationSeconds),
      0,
    );
  const level = 1 + Math.floor(xp / XP_PER_LEVEL);
  const levelProgress = (xp % XP_PER_LEVEL) / XP_PER_LEVEL;
  const todayCompletedSessions = completed.filter((session) =>
    sameLocalDay(session.startedAt, timestamp),
  ).length;
  const unlockedIds = BRUSHLINGS.filter(
    (brushling) => completedSessions >= brushling.unlockAtCompletedSessions,
  ).map((brushling) => brushling.id);

  return {
    xp,
    level,
    levelProgress,
    coins: completedSessions * 12 + Math.floor(rewardedSeconds / 60),
    completedSessions,
    todayCompletedSessions,
    currentStreakDays: currentCompletedDayStreak(history, timestamp),
    unlockedIds,
  };
}

export function computeSessionReward(
  history: BrushSession[],
  sessionId: string,
  selectedId: BrushlingId,
): BrushlingReward | null {
  const session = history.find((item) => item.id === sessionId);
  if (!session) return null;

  const beforeHistory = history.filter((item) => item.id !== sessionId);
  const before = computeBrushlingStats(beforeHistory);
  const after = computeBrushlingStats(history);
  const creature = getBrushling(selectedId);
  const beforeEvolution = getEvolution(creature, before.level);
  const afterEvolution = getEvolution(creature, after.level);
  const evolved = beforeEvolution.name !== afterEvolution.name;

  return {
    sessionId,
    completed: session.completed,
    xpEarned: Math.max(0, after.xp - before.xp),
    coinsEarned: Math.max(0, after.coins - before.coins),
    previousLevel: before.level,
    level: after.level,
    evolvedFrom: evolved ? beforeEvolution.name : undefined,
    evolvedTo: evolved ? afterEvolution.name : undefined,
  };
}
