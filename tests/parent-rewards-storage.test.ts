import { describe, expect, it } from "vitest";

import {
  MAX_PARENT_REWARD_TITLE_LENGTH,
  MAX_PARENT_REWARDS,
  normalizeParentRewards,
} from "@/lib/parent-rewards";

describe("normalizeParentRewards", () => {
  it("scarta i premi malformati e riporta nei limiti quelli validi", () => {
    const rewards = normalizeParentRewards([
      { id: "a", title: " Gelato ", requirement: "streak", target: 3.7, createdAt: 10, deliveredAt: null },
      { id: "b", title: "x".repeat(100), requirement: "completed-sessions", target: 1, createdAt: "no", deliveredAt: "ieri" },
      { id: "", title: "Senza id", requirement: "streak", target: 1 },
      { id: "c", title: "   ", requirement: "streak", target: 1 },
      { id: "d", title: "Target zero", requirement: "perfect-days", target: 0 },
      { id: "e", title: "Requisito ignoto", requirement: "coins", target: 1 },
      null,
      "stringa",
    ]);
    expect(rewards).toEqual([
      { id: "a", title: "Gelato", requirement: "streak", target: 3, createdAt: 10, deliveredAt: null },
      {
        id: "b",
        title: "x".repeat(MAX_PARENT_REWARD_TITLE_LENGTH),
        requirement: "completed-sessions",
        target: 1,
        createdAt: 0,
        deliveredAt: null,
      },
    ]);
  });

  it("non supera il limite condiviso con i backup", () => {
    const many = Array.from({ length: MAX_PARENT_REWARDS + 5 }, (_, index) => ({
      id: `r${index}`,
      title: `Premio ${index}`,
      requirement: "streak",
      target: 1,
      createdAt: index,
      deliveredAt: null,
    }));
    expect(normalizeParentRewards(many)).toHaveLength(MAX_PARENT_REWARDS);
    expect(normalizeParentRewards("nope")).toEqual([]);
  });
});
