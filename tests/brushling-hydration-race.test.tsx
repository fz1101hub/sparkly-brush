import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_CUSTOMIZATION_STATE } from "@/lib/customization";
import { createEmptyLifetimeProgress } from "@/lib/lifetime-progress";
import type { BrushlingId } from "@/lib/brushlings";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  brushState: {
    history: [],
    lifetimeProgress: null as unknown,
    progressEvent: null,
    historyReady: false,
    demoMode: false,
  },
  loadProfile: vi.fn(),
  loadCustomization: vi.fn(),
  saveSelected: vi.fn(),
  saveCustomization: vi.fn(),
}));

vi.mock("@/contexts/brush-context", () => ({ useBrush: () => mocks.brushState }));
vi.mock("@/lib/brushling-storage", () => {
 const storage = {
  loadBrushlingProfile: mocks.loadProfile,
  loadCustomizationState: mocks.loadCustomization,
  saveSelectedBrushling: mocks.saveSelected,
  saveCustomizationState: mocks.saveCustomization,
  saveStarterSelection: vi.fn(),
  restoreBrushlingState: vi.fn(),
 };
 return { ...storage, getBrushlingStorage: () => storage };
});

import { BrushlingProvider, useBrushling } from "@/contexts/brushling-context";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

async function verifyUnlockedSelectionSurvivesProfileFirst(selectedId: BrushlingId, completedSessions: number) {
  const profile = deferred<{ selectedId: BrushlingId; hasChosenStarter: boolean }>();
  mocks.loadProfile.mockReturnValue(profile.promise);
  mocks.loadCustomization.mockResolvedValue(DEFAULT_CUSTOMIZATION_STATE);
  const initialProgress = createEmptyLifetimeProgress();
  mocks.brushState.lifetimeProgress = initialProgress;
  mocks.brushState.historyReady = false;

  let observed: { selectedId: BrushlingId; profileReady: boolean } = {
    selectedId: "bloopi",
    profileReady: false,
  };
  function Probe() {
    const value = useBrushling();
    observed = { selectedId: value.selectedId, profileReady: value.profileReady };
    return null;
  }

  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <BrushlingProvider><Probe /></BrushlingProvider>,
    );
  });
  await act(async () => {
    profile.resolve({ selectedId, hasChosenStarter: true });
    await profile.promise;
  });

  expect(observed).toEqual({ selectedId, profileReady: true });
  expect(mocks.saveSelected).not.toHaveBeenCalled();

  mocks.brushState.lifetimeProgress = {
    ...initialProgress,
    attemptedSessions: completedSessions,
    completedSessions,
    xp: completedSessions * 60,
  };
  mocks.brushState.historyReady = true;
  await act(async () => {
    renderer.update(<BrushlingProvider><Probe /></BrushlingProvider>);
  });

  expect(observed.selectedId).toBe(selectedId);
  expect(mocks.saveSelected).not.toHaveBeenCalled();
  await act(async () => renderer.unmount());
}

describe("BrushlingProvider hydration race", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.brushState.history = [];
    mocks.brushState.progressEvent = null;
    mocks.brushState.demoMode = false;
  });

  it("non sostituisce Voltuff quando il profilo arriva prima dello storico", async () => {
    await verifyUnlockedSelectionSurvivesProfileFirst("voltuff", 5);
  });

  it("non sostituisce Moonbit quando il profilo arriva prima dello storico", async () => {
    await verifyUnlockedSelectionSurvivesProfileFirst("moonbit", 10);
  });
  it("serializes purchases against the latest balance and preserves it after failed writes", async () => {
    mocks.loadProfile.mockResolvedValue({ selectedId: "bloopi", hasChosenStarter: true });
    mocks.loadCustomization.mockResolvedValue(DEFAULT_CUSTOMIZATION_STATE);
    mocks.saveCustomization.mockResolvedValue(undefined);
    mocks.brushState.historyReady = true;
    mocks.brushState.lifetimeProgress = { ...createEmptyLifetimeProgress(), dailyBonusCoins: 30 };
    let value!: ReturnType<typeof useBrushling>;
    function Probe() { value = useBrushling(); return null; }
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<BrushlingProvider><Probe /></BrushlingProvider>); });
    const before = value.walletCoins;
    expect(before).toBe(30);
    mocks.saveCustomization.mockRejectedValueOnce(new Error("Disk full"));
    await act(async () => { await expect(value.buyCustomization("blue-scarf")).rejects.toThrow("Disk full"); });
    expect(value.walletCoins).toBe(before);
    expect(value.customization.ownedIds).not.toContain("blue-scarf");
    let results!: string[];
    await act(async () => { results = await Promise.all([value.buyCustomization("blue-scarf"), value.buyCustomization("fresh-garden")]); });
    expect(results).toEqual(["purchased", "insufficient"]);
    expect(value.walletCoins).toBe(12);
    expect(value.customization.ownedIds).toContain("blue-scarf");
    expect(value.customization.ownedIds).not.toContain("fresh-garden");
    await act(async () => renderer.unmount());
  });

});

