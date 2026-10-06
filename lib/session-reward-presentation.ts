import type { TranslationKey } from "@/lib/i18n";

import type { BrushlingReward } from "./brushlings";

export type SessionCelebrationKind = "double" | "evolution" | "hatch" | "completed" | "attempt";

export const SESSION_CELEBRATION_TEXT_KEYS = {
  double: {
    eyebrow: "game.reward.doubleEyebrow",
    title: "game.reward.doubleTitle",
    message: "game.reward.doubleMessage",
    action: "game.reward.discoverSurprises",
  },
  evolution: {
    eyebrow: "game.reward.evolutionEyebrow",
    title: "game.reward.evolutionTitle",
    message: "game.reward.completedMessage",
    action: "game.reward.continueAdventure",
  },
  hatch: {
    eyebrow: "game.reward.hatchEyebrow",
    title: "game.reward.hatchTitle",
    message: "game.reward.hatchMessage",
    action: "game.reward.meetFriend",
  },
  completed: {
    eyebrow: "game.reward.completedEyebrow",
    title: "game.reward.completedTitle",
    message: "game.reward.completedMessage",
    action: "game.reward.fantastic",
  },
  attempt: {
    eyebrow: "game.reward.attemptEyebrow",
    title: "game.reward.attemptTitle",
    message: "game.reward.attemptMessage",
    action: "game.reward.fantastic",
  },
} as const satisfies Record<
  SessionCelebrationKind,
  Record<"eyebrow" | "title" | "message" | "action", TranslationKey>
>;

export function sessionCelebrationKind(
  reward: BrushlingReward,
  hasHatchedCreature: boolean,
): SessionCelebrationKind {
  if (reward.evolvedTo && hasHatchedCreature) return "double";
  if (reward.evolvedTo) return "evolution";
  if (hasHatchedCreature) return "hatch";
  return reward.completed ? "completed" : "attempt";
}

export function celebrationShowsSelectedCreature(kind: SessionCelebrationKind): boolean {
  return kind === "double" || kind === "evolution" || kind === "completed" || kind === "attempt";
}
