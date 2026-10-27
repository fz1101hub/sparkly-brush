import { QUIZ_QUESTIONS, type QuizQuestion } from "@/lib/learning/quiz-content";
import { shuffle } from "@/lib/learning/shuffle";
import type { ContentLocale } from "@/lib/locale-types";

export const QUIZ_ROUND_SIZE = 3;

export type QuizLevel = 1 | 2;

/**
 * One answer as shown on screen. For «metti in ordine» questions every item is an option and its
 * key is its place in the right order ("0" first); `correct` is unused there.
 */
export type QuizOption = { key: string; label: string; correct: boolean; picture?: string };

/**
 * Questions for one round: the younger level sees only level-1 questions; questions whose card
 * is not collected yet come first, then the others, so every round can be played.
 */
export function pickQuizRound(
  collected: ReadonlySet<string>,
  level: QuizLevel,
  random: () => number = Math.random,
  questions: readonly QuizQuestion[] = QUIZ_QUESTIONS,
  size = QUIZ_ROUND_SIZE,
): QuizQuestion[] {
  const eligible = questions.filter((question) => level === 2 || question.level === 1);
  const fresh = shuffle(eligible.filter((question) => !collected.has(question.id)), random);
  const known = shuffle(eligible.filter((question) => collected.has(question.id)), random);
  return [...fresh, ...known].slice(0, size);
}

export function quizOptions(
  question: QuizQuestion,
  locale: ContentLocale,
  labels: { true: string; false: string },
  random: () => number = Math.random,
): QuizOption[] {
  if (question.kind === "order") {
    return shuffle(
      question.text[locale].items.map((label, index) => ({ key: String(index), label, correct: false })),
      random,
    );
  }
  if (question.kind === "truefalse") {
    // True first, always: the order of a yes/no question carries no hint.
    return [
      { key: "true", label: labels.true, correct: question.answer },
      { key: "false", label: labels.false, correct: !question.answer },
    ];
  }
  return shuffle(
    question.text[locale].answers.map((label, index) => ({
      key: String(index),
      label,
      correct: index === 0,
      ...(question.pictures ? { picture: question.pictures[index] } : {}),
    })),
    random,
  );
}

/** An order is right when the items were tapped from the first to the last. */
export function isRightOrder(picked: readonly string[], size: number): boolean {
  return picked.length === size && picked.every((key, index) => key === String(index));
}

export function quizQuestionById(id: string): QuizQuestion | undefined {
  return QUIZ_QUESTIONS.find((question) => question.id === id);
}
