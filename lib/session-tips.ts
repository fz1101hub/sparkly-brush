import { localDateKey } from "@/lib/day-progress";
import { QUIZ_QUESTIONS } from "@/lib/learning/quiz-content";
import type { SupportedLocale } from "@/lib/locale-types";

/**
 * Small helpers around a session (lotto 2): the surface to brush inside each zone (voce 55), the
 * surprise extra step of the day (voce 56) and the «Lo sapevi?» fact after a session (voce 23).
 */

/** Outside, inside, then the chewing surface: a third of each zone each (10 s in a 30 s zone). */
export type Surface = "outer" | "inner" | "chewing";
const SURFACES: readonly Surface[] = ["outer", "inner", "chewing"];

export function surfaceAt(elapsedSeconds: number, targetSeconds: number): Surface {
  const zone = targetSeconds / 4;
  const within = Math.max(0, elapsedSeconds) % zone;
  return SURFACES[Math.min(2, Math.floor(within / (zone / 3)))];
}

/** The extra step of the day: the same for the whole day, a different one the next day. */
export const EXTRA_STEPS = ["tongue", "backTeeth", "gumLine", "innerFront", "slowCircles", "spit"] as const;
export type ExtraStep = (typeof EXTRA_STEPS)[number];

function dayNumber(now: number): number {
  const [year, month, day] = localDateKey(now).split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

export function extraStepOf(now: number): ExtraStep {
  return EXTRA_STEPS[dayNumber(now) % EXTRA_STEPS.length];
}

/** A different quiz fact after each session, in the app language. */
export function didYouKnow(sessionNumber: number, locale: SupportedLocale): string {
  const question = QUIZ_QUESTIONS[Math.abs(Math.floor(sessionNumber)) % QUIZ_QUESTIONS.length];
  return question.text[locale].fact;
}
