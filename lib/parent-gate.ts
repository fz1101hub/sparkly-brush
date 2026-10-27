/** How long a solved challenge keeps the parent areas open before asking again. */
export const PARENT_GATE_UNLOCK_MS = 5 * 60_000;

export type ParentChallenge = { first: number; second: number; answer: number };

/** A single-digit multiplication (3–9 × 3–9): quick for a parent, out of reach for a small child. */
export function createParentChallenge(random: () => number = Math.random): ParentChallenge {
  const pick = () => 3 + Math.min(6, Math.max(0, Math.floor(random() * 7)));
  const first = pick();
  const second = pick();
  return { first, second, answer: first * second };
}

export function isParentAnswer(challenge: ParentChallenge, input: string): boolean {
  const trimmed = input.trim();
  return /^\d{1,3}$/.test(trimmed) && Number.parseInt(trimmed, 10) === challenge.answer;
}
