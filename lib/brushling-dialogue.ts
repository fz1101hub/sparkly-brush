import type { BrushlingId } from "@/lib/brushlings";
import {
  translateDynamic,
  type TranslationKey,
  type TranslationParams,
} from "@/lib/i18n";

export type DialogueContext =
  "idle" | "morning" | "evening" | "brushing" | "reward";
type Translator = (key: TranslationKey, params?: TranslationParams) => string;

type DialogueKeyMap = Record<
  BrushlingId,
  Record<DialogueContext, readonly [TranslationKey, TranslationKey]>
>;

export const BRUSHLING_DIALOGUE_KEYS: DialogueKeyMap = {
  bloopi: {
    idle: ["game.dialogue.bloopi.idle.0", "game.dialogue.bloopi.idle.1"],
    morning: [
      "game.dialogue.bloopi.morning.0",
      "game.dialogue.bloopi.morning.1",
    ],
    evening: [
      "game.dialogue.bloopi.evening.0",
      "game.dialogue.bloopi.evening.1",
    ],
    brushing: [
      "game.dialogue.bloopi.brushing.0",
      "game.dialogue.bloopi.brushing.1",
    ],
    reward: ["game.dialogue.bloopi.reward.0", "game.dialogue.bloopi.reward.1"],
  },
  spriggo: {
    idle: ["game.dialogue.spriggo.idle.0", "game.dialogue.spriggo.idle.1"],
    morning: [
      "game.dialogue.spriggo.morning.0",
      "game.dialogue.spriggo.morning.1",
    ],
    evening: [
      "game.dialogue.spriggo.evening.0",
      "game.dialogue.spriggo.evening.1",
    ],
    brushing: [
      "game.dialogue.spriggo.brushing.0",
      "game.dialogue.spriggo.brushing.1",
    ],
    reward: [
      "game.dialogue.spriggo.reward.0",
      "game.dialogue.spriggo.reward.1",
    ],
  },
  flarello: {
    idle: ["game.dialogue.flarello.idle.0", "game.dialogue.flarello.idle.1"],
    morning: [
      "game.dialogue.flarello.morning.0",
      "game.dialogue.flarello.morning.1",
    ],
    evening: [
      "game.dialogue.flarello.evening.0",
      "game.dialogue.flarello.evening.1",
    ],
    brushing: [
      "game.dialogue.flarello.brushing.0",
      "game.dialogue.flarello.brushing.1",
    ],
    reward: [
      "game.dialogue.flarello.reward.0",
      "game.dialogue.flarello.reward.1",
    ],
  },
  voltuff: {
    idle: ["game.dialogue.voltuff.idle.0", "game.dialogue.voltuff.idle.1"],
    morning: [
      "game.dialogue.voltuff.morning.0",
      "game.dialogue.voltuff.morning.1",
    ],
    evening: [
      "game.dialogue.voltuff.evening.0",
      "game.dialogue.voltuff.evening.1",
    ],
    brushing: [
      "game.dialogue.voltuff.brushing.0",
      "game.dialogue.voltuff.brushing.1",
    ],
    reward: [
      "game.dialogue.voltuff.reward.0",
      "game.dialogue.voltuff.reward.1",
    ],
  },
  moonbit: {
    idle: ["game.dialogue.moonbit.idle.0", "game.dialogue.moonbit.idle.1"],
    morning: [
      "game.dialogue.moonbit.morning.0",
      "game.dialogue.moonbit.morning.1",
    ],
    evening: [
      "game.dialogue.moonbit.evening.0",
      "game.dialogue.moonbit.evening.1",
    ],
    brushing: [
      "game.dialogue.moonbit.brushing.0",
      "game.dialogue.moonbit.brushing.1",
    ],
    reward: [
      "game.dialogue.moonbit.reward.0",
      "game.dialogue.moonbit.reward.1",
    ],
  },
};

export function getBrushlingDialogueKey(
  id: BrushlingId,
  context: DialogueContext,
  completedSessions: number,
  level: number,
  timestamp: number = Date.now(),
): TranslationKey {
  const lines = BRUSHLING_DIALOGUE_KEYS[id][context];
  const date = new Date(timestamp);
  const seed = date.getDate() + date.getMonth() * 31 + completedSessions * 3 + level;
  return lines[Math.abs(seed) % lines.length];
}

export function getBrushlingDialogue(
  id: BrushlingId,
  context: DialogueContext,
  completedSessions: number,
  level: number,
  timestamp: number = Date.now(),
  t?: Translator,
): string {
  const key = getBrushlingDialogueKey(
    id,
    context,
    completedSessions,
    level,
    timestamp,
  );
  return t ? t(key) : translateDynamic("it", key);
}

export function inferDialogueContext(
  isActive: boolean,
  timestamp: number = Date.now(),
): DialogueContext {
  if (isActive) return "brushing";
  const hour = new Date(timestamp).getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 18) return "evening";
  return "idle";
}