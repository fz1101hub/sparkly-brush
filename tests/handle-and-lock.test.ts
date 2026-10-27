import { beforeEach, describe, expect, it, vi } from "vitest";

const data = vi.hoisted(() => new Map<string, string>());
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => data.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      data.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      data.delete(key);
    }),
  },
}));

import { headDaysLeft, recommendedIntensity } from "@/lib/dental-care";
import { normalizeExtras } from "@/lib/extras";
import {
  adoptDeviceCursor,
  createEmptyLifetimeProgress,
  deviceKey,
  type DeviceSessionCursor,
} from "@/lib/lifetime-progress";
import {
  createPin,
  createRecoveryChallenge,
  DEFAULT_PARENT_LOCK,
  isPinCorrect,
  loadParentLock,
  normalizeParentLock,
  PARENT_LOCK_KEY,
  saveParentLock,
} from "@/lib/parent-lock";
import { claimToothbrush, devicesOwnedByOthers, ownerOfToothbrush, transferToothbrush } from "@/lib/toothbrush-profile";

beforeEach(() => data.clear());

const cursor = (lastSessionId: number, updatedAt: number): DeviceSessionCursor => ({
  lastSessionId,
  epoch: 0,
  acceptNextSession: false,
  resetBaselineSessionId: null,
  previousEpochRecentSessionIds: [],
  recentIdentities: [`handle:0:${lastSessionId}`],
  updatedAt,
});

describe("passare il manico a un altro bambino (voce 50)", () => {
  it("il nuovo proprietario riprende dal punto dell'ultimo importato", () => {
    const empty = createEmptyLifetimeProgress();
    const adopted = adoptDeviceCursor(empty, "handle", cursor(42, 1_000));
    expect(adopted.deviceCursors[deviceKey("handle")]).toMatchObject({ lastSessionId: 42 });
    expect(empty.deviceCursors).toEqual({});
    // A newer position the child already holds (the handle was theirs more recently) stays.
    expect(adoptDeviceCursor(adopted, "handle", cursor(30, 500)).deviceCursors[deviceKey("handle")].lastSessionId).toBe(42);
    expect(adoptDeviceCursor(adopted, "handle", cursor(50, 2_000)).deviceCursors[deviceKey("handle")].lastSessionId).toBe(50);
  });

  it("cambia il proprietario e lo riconosce durante la ricerca (voce 37)", async () => {
    await claimToothbrush("handle-1", "primary");
    expect(await ownerOfToothbrush("handle-1")).toBe("primary");
    expect(await ownerOfToothbrush("unknown")).toBeNull();
    await transferToothbrush("handle-1", "child-b");
    expect(await ownerOfToothbrush("handle-1")).toBe("child-b");
    expect(await devicesOwnedByOthers("primary")).toEqual(["handle-1"]);
    await expect(claimToothbrush("handle-1", "child-b")).resolves.toBeUndefined();
    await expect(claimToothbrush("handle-1", "primary")).rejects.toThrow();
  });
});

describe("cura del manico (voci 35 e 36)", () => {
  it("conta i giorni al cambio della testina", () => {
    const now = new Date(2026, 9, 27, 9).getTime();
    expect(headDaysLeft("2026-10-27", now)).toBe(90);
    expect(headDaysLeft("2026-08-12", now)).toBe(14);
    expect(headDaysLeft("2026-07-01", now)).toBeLessThan(0);
  });

  it("salva il giorno del cambio solo se è una data", () => {
    expect(normalizeExtras({ headChangedOn: "2026-10-27" }).headChangedOn).toBe("2026-10-27");
    expect(normalizeExtras({ headChangedOn: "ieri" }).headChangedOn).toBeNull();
    expect(normalizeExtras({}).headChangedOn).toBeNull();
  });

  it("consiglia l'intensità per età", () => {
    expect(recommendedIntensity("under3")).toBe("low");
    expect(recommendedIntensity("3to6")).toBe("low");
    expect(recommendedIntensity("over6")).toBe("high");
    expect(recommendedIntensity(null)).toBeNull();
  });
});

describe("PIN dei genitori (voce 65)", () => {
  it("salva solo l'hash e riconosce il PIN giusto", async () => {
    const pin = await createPin("2468");
    expect(JSON.stringify(pin)).not.toContain("2468");
    expect(await isPinCorrect(pin, "2468")).toBe(true);
    expect(await isPinCorrect(pin, "2469")).toBe(false);
    expect(await isPinCorrect(pin, "24")).toBe(false);
    await expect(createPin("12")).rejects.toThrow();
    // Two families with the same PIN get different hashes.
    expect((await createPin("2468")).hash).not.toBe(pin.hash);
  });

  it("l'impronta vale solo con un PIN e i dati rovinati tornano al blocco con la moltiplicazione", async () => {
    expect(normalizeParentLock({ pin: null, biometrics: true })).toEqual(DEFAULT_PARENT_LOCK);
    expect(normalizeParentLock({ pin: { salt: "zz", hash: "1" } })).toEqual(DEFAULT_PARENT_LOCK);
    const pin = await createPin("135790");
    await saveParentLock({ version: 1, pin, biometrics: true });
    expect(await loadParentLock()).toEqual({ version: 1, pin, biometrics: true });
    data.set(PARENT_LOCK_KEY, "{rotto");
    expect(await loadParentLock()).toEqual(DEFAULT_PARENT_LOCK);
  });

  it("per il PIN dimenticato chiede una moltiplicazione più difficile", () => {
    for (const value of [0, 0.5, 0.999]) {
      const challenge = createRecoveryChallenge(() => value);
      expect(challenge.first).toBeGreaterThanOrEqual(12);
      expect(challenge.first).toBeLessThanOrEqual(29);
      expect(challenge.second).toBeGreaterThanOrEqual(6);
      expect(challenge.answer).toBe(challenge.first * challenge.second);
    }
  });
});
