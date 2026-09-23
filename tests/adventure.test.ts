import { describe, expect, it } from "vitest";

import {
  ADVENTURE_ZONES,
  getCurrentAdventureZone,
  getNextAdventureZone,
  sessionsUntilZone,
} from "@/lib/adventure";

describe("Brushlings adventure map", () => {
  it("starts at Bubble Bay and unlocks Fresh Forest after two sessions", () => {
    expect(getCurrentAdventureZone(0).id).toBe("bubble-bay");
    expect(getNextAdventureZone(0)?.id).toBe("fresh-forest");
    expect(sessionsUntilZone(ADVENTURE_ZONES[1], 0)).toBe(2);

    expect(getCurrentAdventureZone(2).id).toBe("fresh-forest");
    expect(getNextAdventureZone(2)?.id).toBe("spark-mountain");
  });

  it("finishes the current map after twelve complete sessions", () => {
    expect(getCurrentAdventureZone(12).id).toBe("smile-valley");
    expect(getNextAdventureZone(12)).toBeNull();
  });
});
