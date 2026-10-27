import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => new Map<string, string>());
const restoreBrushlingState = vi.hoisted(() => vi.fn(async () => undefined));
const saveAppPreferences = vi.hoisted(() => vi.fn(async () => undefined));
const saveParentRewards = vi.hoisted(() => vi.fn(async () => undefined));
const saveVillage = vi.hoisted(() => vi.fn(async () => undefined));
const saveBraces = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { storage.set(key, value); }),
    removeItem: vi.fn(async (key: string) => { storage.delete(key); }),
  },
}));
vi.mock("@/lib/brushling-storage", () => ({ getBrushlingStorage: () => ({ restoreBrushlingState }) }));
vi.mock("@/lib/preferences", () => ({ getPreferencesStorage: () => ({ saveAppPreferences }) }));
vi.mock("@/lib/parent-rewards", () => ({ getParentRewardsStorage: () => ({ saveParentRewards }) }));
vi.mock("@/lib/village", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/village")>()),
  getVillageStorage: () => ({ save: saveVillage }),
}));
vi.mock("@/lib/braces", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/braces")>()),
  getBracesStorage: () => ({ save: saveBraces }),
}));

import { DEFAULT_BRACES } from "@/lib/braces";
import { DEFAULT_VILLAGE } from "@/lib/village";
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
    parentGateEnabled: false,
  },
  parentRewards: [],
  village: { ...DEFAULT_VILLAGE, cards: ["body-enamel"] },
  braces: DEFAULT_BRACES,
};

const next: RestoreSnapshot = {
  ...previous,
  profile: { selectedId: "spriggo", hasChosenStarter: true },
  preferences: { ...previous.preferences, musicEnabled: true },
  village: { ...DEFAULT_VILLAGE, cards: ["body-enamel", "history-addis"], visits: 2 },
  braces: { ...DEFAULT_BRACES, enabled: true, type: "aligners", careDays: ["2026-10-26"] },
};

describe("application restore journal", () => {
  beforeEach(() => {
    storage.clear();
    restoreBrushlingState.mockClear();
    saveAppPreferences.mockClear();
    saveParentRewards.mockClear();
    saveVillage.mockClear();
    saveBraces.mockClear();
  });

  it("ripristina lo snapshot precedente se SQLite non ha committato", async () => {
    await beginApplicationRestore(previous, next);
    await recoverApplicationRestore(null);

    expect(restoreBrushlingState).toHaveBeenCalledWith(previous.profile, previous.customization);
    expect(saveAppPreferences).toHaveBeenCalledWith(previous.preferences);
    expect(saveVillage).toHaveBeenCalledWith(previous.village);
    expect(saveBraces).toHaveBeenCalledWith(previous.braces);
    expect(storage.size).toBe(0);
  });

  it("completa lo snapshot nuovo se SQLite ha committato lo stesso token", async () => {
    const id = await beginApplicationRestore(previous, next);
    await recoverApplicationRestore(id);

    expect(restoreBrushlingState).toHaveBeenCalledWith(next.profile, next.customization);
    expect(saveAppPreferences).toHaveBeenCalledWith(next.preferences);
    expect(saveVillage).toHaveBeenCalledWith(next.village);
    expect(saveBraces).toHaveBeenCalledWith(next.braces);
    expect(storage.size).toBe(0);
  });

  it("un journal scritto prima del villaggio lascia villaggio e apparecchio come sono", async () => {
    const { village: _village, braces: _braces, ...older } = previous;
    const id = await beginApplicationRestore(older as RestoreSnapshot, older as RestoreSnapshot);
    await recoverApplicationRestore(id);

    expect(restoreBrushlingState).toHaveBeenCalledWith(previous.profile, previous.customization);
    expect(saveVillage).not.toHaveBeenCalled();
    expect(saveBraces).not.toHaveBeenCalled();
    expect(storage.size).toBe(0);
  });
});
