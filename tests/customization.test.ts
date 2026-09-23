import { describe, expect, it } from "vitest";

import {
  DEFAULT_CUSTOMIZATION_STATE,
  availableCoins,
  equipCustomization,
  purchaseCustomization,
  spentCoins,
} from "@/lib/customization";

describe("Brushlings customization economy", () => {
  it("starts with the free habitat and does not spend coins", () => {
    expect(DEFAULT_CUSTOMIZATION_STATE.ownedIds).toEqual(["bubble-room"]);
    expect(spentCoins(DEFAULT_CUSTOMIZATION_STATE)).toBe(0);
    expect(availableCoins(40, DEFAULT_CUSTOMIZATION_STATE)).toBe(40);
  });

  it("buys an item only when enough smile coins are available", () => {
    const denied = purchaseCustomization(DEFAULT_CUSTOMIZATION_STATE, "fresh-garden", 20);
    expect(denied).toBeNull();

    const purchased = purchaseCustomization(DEFAULT_CUSTOMIZATION_STATE, "fresh-garden", 40);
    expect(purchased?.ownedIds).toContain("fresh-garden");
    expect(purchased ? availableCoins(40, purchased) : -1).toBe(12);
  });

  it("equips only owned customization items", () => {
    expect(equipCustomization(DEFAULT_CUSTOMIZATION_STATE, "leaf-crown")).toBeNull();

    const purchased = purchaseCustomization(DEFAULT_CUSTOMIZATION_STATE, "blue-scarf", 30)!;
    const equipped = equipCustomization(purchased, "blue-scarf");

    expect(equipped?.equippedAccessoryId).toBe("blue-scarf");
  });
});
