import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({
  value: null as string | null,
  getItem: vi.fn(async () => storage.value),
  setItem: vi.fn(async (_key: string, value: string) => {
    storage.value = value;
  }),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: storage.getItem,
    setItem: storage.setItem,
    multiSet: vi.fn(async () => undefined),
  },
}));

describe("brushling storage migrations", () => {
  beforeEach(() => {
    storage.value = null;
    vi.clearAllMocks();
  });

  it("persiste il ledger acquisti ricostruito da un inventario legacy", async () => {
    storage.value = JSON.stringify({
      ownedIds: ["bubble-room", "blue-scarf"],
      equippedHabitatId: "bubble-room",
      equippedAccessoryId: "blue-scarf",
      equippedDecorId: null,
    });
    const { loadCustomizationState } = await import("@/lib/brushling-storage");

    const migrated = await loadCustomizationState();

    expect(migrated.purchaseLedger).toEqual([
      { itemId: "blue-scarf", pricePaid: 18, purchasedAt: 0 },
    ]);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(JSON.parse(storage.value ?? "{}").purchaseLedger).toEqual(migrated.purchaseLedger);
  });
});
