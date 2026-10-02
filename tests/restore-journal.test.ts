import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => new Map<string, string>());
const restoreBrushlingState = vi.hoisted(() => vi.fn(async () => undefined));
const saveAppPreferences = vi.hoisted(() => vi.fn(async () => undefined));
const saveParentRewards = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { storage.set(key, value); }),
    removeItem: vi.fn(async (key: string) => { storage.delete(key); }),
  },
}));
vi.mock("@/lib/brushling-storage", () => ({ restoreBrushlingState }));
vi.mock("@/lib/preferences", () => ({ saveAppPreferences }));
vi.mock("@/lib/parent-rewards", () => ({ saveParentRewards }));

import {
  beginApplicationRestore,
  recoverApplicationRestore,
  type RestoreSnapshot,
} from "@/lib/restore-journal";

const previous: RestoreSnapshot = {
  profile: { selectedId: "bloopi", hasChosenStarter: true },
  customization: {
    ownedIds: ["bubble-room"],
    purchaseLedger: [],
    equippedHabitatId: "bubble-room",
    equippedAccessoryId: null,
    equippedDecorId: null,
  },
  preferences: {
    onboardingCompleted: true,
    soundsEnabled: true,
    musicEnabled: false,
    hapticsEnabled: true,
    language: "system",
  },
  parentRewards: [],
};

const next: RestoreSnapshot = {
  ...previous,
  profile: { selectedId: "spriggo", hasChosenStarter: true },
  preferences: { ...previous.preferences, musicEnabled: true },
};

describe("application restore journal", () => {
  beforeEach(() => {
    storage.clear();
    restoreBrushlingState.mockClear();
    saveAppPreferences.mockClear();
    saveParentRewards.mockClear();
  });

  it("ripristina lo snapshot precedente se SQLite non ha committato", async () => {
    await beginApplicationRestore(previous, next);
    await recoverApplicationRestore(null);

    expect(restoreBrushlingState).toHaveBeenCalledWith(previous.profile, previous.customization);
    expect(saveAppPreferences).toHaveBeenCalledWith(previous.preferences);
    expect(storage.size).toBe(0);
  });

  it("completa lo snapshot nuovo se SQLite ha committato lo stesso token", async () => {
    const id = await beginApplicationRestore(previous, next);
    await recoverApplicationRestore(id);

    expect(restoreBrushlingState).toHaveBeenCalledWith(next.profile, next.customization);
    expect(saveAppPreferences).toHaveBeenCalledWith(next.preferences);
    expect(storage.size).toBe(0);
  });
});
