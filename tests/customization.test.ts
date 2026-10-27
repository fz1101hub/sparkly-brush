import { describe, expect, it } from "vitest";

import {
  DEFAULT_CUSTOMIZATION_STATE,
  availableCoins,
  equipCustomization,
  normalizePurchaseLedger,
  purchaseCustomization,
  settlePurchasesAfterHistoryReset,
  spentCoins,
  type CustomizationState,
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

  it("calcola la spesa dal prezzo registrato nel ledger acquisti", () => {
    const historical: CustomizationState = {
      ...DEFAULT_CUSTOMIZATION_STATE,
      ownedIds: ["bubble-room", "fresh-garden"],
      purchaseLedger: [{ itemId: "fresh-garden" as const, pricePaid: 7, purchasedAt: 1 }],
    };

    expect(spentCoins(historical)).toBe(7);
    expect(availableCoins(40, historical)).toBe(33);
  });

  it("dopo Cancella storico conserva gli oggetti e fa ripartire il portafoglio da zero", () => {
    const purchased = purchaseCustomization(DEFAULT_CUSTOMIZATION_STATE, "fresh-garden", 40);
    expect(purchased).not.toBeNull();
    const owned = purchased as CustomizationState;
    // History cleared: earnings drop to 0 while the purchase still costs 28 coins.
    expect(availableCoins(14, owned)).toBe(0);

    const settled = settlePurchasesAfterHistoryReset(owned);
    expect(settled.ownedIds).toEqual(owned.ownedIds);
    expect(settled.equippedHabitatId).toBe(owned.equippedHabitatId);
    expect(spentCoins(settled)).toBe(0);
    expect(availableCoins(0, settled)).toBe(0);
    expect(availableCoins(14, settled)).toBe(14);
    // The settled entry survives normalization instead of being re-created at full price.
    expect(normalizePurchaseLedger(settled.purchaseLedger, settled.ownedIds)).toEqual([
      expect.objectContaining({ itemId: "fresh-garden", pricePaid: 0 }),
    ]);
  });
});
