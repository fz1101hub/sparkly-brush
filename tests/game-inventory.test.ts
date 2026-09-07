import { describe, expect, it } from "vitest";

import {
  computeGameInventory,
  computeSessionDiscovery,
  getItemForCompletedSessionNumber,
} from "@/lib/game-inventory";
import type { BrushSession } from "@/lib/brush-types";

const complete = (id: string, startedAt: number): BrushSession => ({
  id,
  startedAt,
  durationSeconds: 120,
  targetSeconds: 120,
  completed: true,
  source: "manual",
});

describe("Brushlings inventory", () => {
  it("finds zone items as complete sessions advance", () => {
    expect(getItemForCompletedSessionNumber(1).id).toBe("bubble-pearl");
    expect(getItemForCompletedSessionNumber(2).id).toBe("fresh-leaf");
    expect(getItemForCompletedSessionNumber(5).id).toBe("spark-crystal");
    expect(getItemForCompletedSessionNumber(8).id).toBe("moon-shard");
    expect(getItemForCompletedSessionNumber(12).id).toBe("smile-star");
  });

  it("finds and hatches the Voltuff egg at the configured milestones", () => {
    const now = Date.now();
    const history = Array.from({ length: 5 }, (_, index) =>
      complete(`s-${index + 1}`, now + index * 1000),
    );

    const inventory = computeGameInventory(history);
    const sparkEgg = inventory.eggs.find((egg) => egg.id === "spark-egg");

    expect(sparkEgg?.found).toBe(true);
    expect(sparkEgg?.hatched).toBe(true);
    expect(inventory.hatchedBrushlingIds).toContain("voltuff");

    const discovery = computeSessionDiscovery(history, "s-5");
    expect(discovery?.eggHatched?.brushlingId).toBe("voltuff");
    expect(discovery?.item.id).toBe("spark-crystal");
  });

  it("keeps the Moonbit egg incubating between sessions eight and ten", () => {
    const now = Date.now();
    const history = Array.from({ length: 9 }, (_, index) =>
      complete(`s-${index + 1}`, now + index * 1000),
    );

    const inventory = computeGameInventory(history);
    const moonEgg = inventory.eggs.find((egg) => egg.id === "moon-egg");

    expect(moonEgg?.found).toBe(true);
    expect(moonEgg?.hatched).toBe(false);
    expect(moonEgg?.sessionsRemaining).toBe(1);
  });
});
