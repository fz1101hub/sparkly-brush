import { describe, expect, it } from "vitest";

import type { BrushlingReward } from "@/lib/brushlings";
import {
  celebrationShowsSelectedCreature,
  sessionCelebrationKind,
} from "@/lib/session-reward-presentation";

const reward: BrushlingReward = {
  sessionId: "session-5",
  completed: true,
  xpEarned: 60,
  coinsEarned: 14,
  previousLevel: 2,
  level: 3,
  evolvedFrom: "Bloopi",
  evolvedTo: "Bubblio",
};

describe("session reward presentation", () => {
  it("mostra una doppia sorpresa e mantiene visibile il Brushling evoluto", () => {
    const kind = sessionCelebrationKind(reward, true);

    expect(kind).toBe("double");
    expect(celebrationShowsSelectedCreature(kind)).toBe(true);
  });

  it("mostra il nuovo Brushling quando avviene soltanto una schiusa", () => {
    const kind = sessionCelebrationKind({ ...reward, evolvedFrom: undefined, evolvedTo: undefined }, true);

    expect(kind).toBe("hatch");
    expect(celebrationShowsSelectedCreature(kind)).toBe(false);
  });
});
