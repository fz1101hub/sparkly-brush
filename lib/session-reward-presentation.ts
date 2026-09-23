import type { BrushlingReward } from "./brushlings";

export type SessionCelebrationKind = "double" | "evolution" | "hatch" | "completed" | "attempt";

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
