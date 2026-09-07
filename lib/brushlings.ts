import type { BrushSession } from "@/lib/brush-types";

export type BrushlingId = "bloopi" | "spriggo" | "flarello" | "voltuff" | "moonbit";

export type BrushlingDefinition = {
  id: BrushlingId;
  name: string;
  element: "Acqua" | "Natura" | "Fuoco" | "Energia" | "Notte";
  accent: string;
  soft: string;
  unlockAtCompletedSessions: number;
  tagline: string;
};

export type BrushlingGameStats = {
  xp: number;
  level: number;
  levelProgress: number;
  coins: number;
  completedSessions: number;
  todayCompletedSessions: number;
  streakDays: number;
  unlockedIds: BrushlingId[];
};

export const BRUSHLINGS: BrushlingDefinition[] = [
  {
    id: "bloopi",
    name: "Bloopi",
    element: "Acqua",
    accent: "#2D7FF9",
    soft: "#E7F1FF",
    unlockAtCompletedSessions: 0,
    tagline: "Trasforma ogni zona in una cascata di bolle pulite.",
  },
  {
    id: "spriggo",
    name: "Spriggo",
    element: "Natura",
    accent: "#2E9B67",
    soft: "#E6F7EE",
    unlockAtCompletedSessions: 0,
    tagline: "Cresce insieme alle tue buone abitudini.",
  },
  {
    id: "flarello",
    name: "Flarello",
    element: "Fuoco",
    accent: "#E76A2C",
    soft: "#FFF0E7",
    unlockAtCompletedSessions: 0,
    tagline: "Accende l'energia quando mancano pochi secondi.",
  },
  {
    id: "voltuff",
    name: "Voltuff",
    element: "Energia",
    accent: "#B98A00",
    soft: "#FFF8D9",
    unlockAtCompletedSessions: 3,
    tagline: "Si carica con le sessioni complete e le serie positive.",
  },
  {
    id: "moonbit",
    name: "Moonbit",
    element: "Notte",
    accent: "#7357C7",
    soft: "#F0ECFF",
    unlockAtCompletedSessions: 7,
    tagline: "Il compagno delle spazzolate della buonanotte.",
  },
];

export const DEFAULT_BRUSHLING_ID: BrushlingId = "bloopi";
export const XP_PER_LEVEL = 120;

export function getBrushling(id: BrushlingId): BrushlingDefinition {
  return BRUSHLINGS.find((item) => item.id === id) ?? BRUSHLINGS[0];
}

export function isBrushlingId(value: string): value is BrushlingId {
  return BRUSHLINGS.some((item) => item.id === value);
}

function startOfLocalDay(timestamp: number): Date {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameLocalDay(a: number, b: number): boolean {
  const first = new Date(a);
  const second = new Date(b);
  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate();
}

function computeStreak(history: BrushSession[]): number {
  const completedDays = new Set(
    history
      .filter((session) => session.completed)
      .map((session) => startOfLocalDay(session.startedAt).getTime()),
  );

  if (completedDays.size === 0) return 0;

  let cursor = startOfLocalDay(Date.now());
  if (!completedDays.has(cursor.getTime())) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (completedDays.has(cursor.getTime())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function computeBrushlingStats(history: BrushSession[]): BrushlingGameStats {
  const completed = history.filter((session) => session.completed);
  const completedSessions = completed.length;
  const incompleteXp = history
    .filter((session) => !session.completed && session.durationSeconds >= 5)
    .reduce((total, session) => total + Math.min(20, Math.floor(session.durationSeconds / 6)), 0);
  const xp = completedSessions * 60 + incompleteXp;
  const totalSeconds = history.reduce((total, session) => total + Math.max(0, session.durationSeconds), 0);
  const level = 1 + Math.floor(xp / XP_PER_LEVEL);
  const levelProgress = (xp % XP_PER_LEVEL) / XP_PER_LEVEL;
  const todayCompletedSessions = completed.filter((session) => isSameLocalDay(session.startedAt, Date.now())).length;
  const unlockedIds = BRUSHLINGS
    .filter((brushling) => completedSessions >= brushling.unlockAtCompletedSessions)
    .map((brushling) => brushling.id);

  return {
    xp,
    level,
    levelProgress,
    coins: completedSessions * 12 + Math.floor(totalSeconds / 60),
    completedSessions,
    todayCompletedSessions,
    streakDays: computeStreak(history),
    unlockedIds,
  };
}
