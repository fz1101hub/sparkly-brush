import { describe, expect, it } from "vitest";

import { createParentChallenge, isParentAnswer } from "@/lib/parent-gate";

describe("parent gate challenge", () => {
  it("usa solo fattori da 3 a 9 e accetta soltanto il prodotto esatto", () => {
    const low = createParentChallenge(() => 0);
    const high = createParentChallenge(() => 0.999_999);
    expect(low).toEqual({ first: 3, second: 3, answer: 9 });
    expect(high).toEqual({ first: 9, second: 9, answer: 81 });
    const challenge = createParentChallenge(() => 0.5);
    expect(challenge.first * challenge.second).toBe(challenge.answer);
    expect(isParentAnswer(challenge, ` ${challenge.answer} `)).toBe(true);
    expect(isParentAnswer(challenge, String(challenge.answer + 1))).toBe(false);
    expect(isParentAnswer(challenge, "")).toBe(false);
    expect(isParentAnswer(challenge, "1e2")).toBe(false);
  });
});
