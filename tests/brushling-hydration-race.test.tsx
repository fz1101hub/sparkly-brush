import React, { act } from "react";
import { createRoot } from "test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_CUSTOMIZATION_STATE } from "@/lib/customization";
import type { BrushSession } from "@/lib/brush-types";
import {
  applySessionToLifetime,
  createEmptyLifetimeProgress,
  type LifetimeProgressEvent,
} from "@/lib/lifetime-progress";
import type { BrushlingId } from "@/lib/brushlings";
import { TestLocaleProvider } from "@/tests/helpers/test-locale-provider";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  brushState: {
    history: [] as BrushSession[],
    lifetimeProgress: null as unknown,
    progressEvent: null as LifetimeProgressEvent | null,
    historyReady: false,
    demoMode: false,
  },
  loadProfile: vi.fn(),
  loadCustomization: vi.fn(),
  saveSelected: vi.fn(),
  saveStarter: vi.fn(),
}));

vi.mock("@/contexts/brush-context", () => ({
  useBrush: () => mocks.brushState,
}));
vi.mock("react-native", () => ({
  AppState: { addEventListener: () => ({ remove: () => undefined }) },
}));
vi.mock("@/lib/brushling-storage", () => ({
  loadBrushlingProfile: mocks.loadProfile,
  loadCustomizationState: mocks.loadCustomization,
  saveSelectedBrushling: mocks.saveSelected,
  saveCustomizationState: vi.fn(),
  saveStarterSelection: mocks.saveStarter,
  restoreBrushlingState: vi.fn(),
}));

import { BrushlingProvider, useBrushling } from "@/contexts/brushling-context";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function verifyUnlockedSelectionSurvivesProfileFirst(
  selectedId: BrushlingId,
  completedSessions: number,
) {
  const profile = deferred<{
    selectedId: BrushlingId;
    hasChosenStarter: boolean;
  }>();
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
    observed = {
      selectedId: value.selectedId,
      profileReady: value.profileReady,
    };
    return null;
  }

  const renderer = createRoot();
  await act(async () => {
    renderer.render(
      <TestLocaleProvider>
        <BrushlingProvider>
          <Probe />
        </BrushlingProvider>
      </TestLocaleProvider>,
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
    renderer.render(
      <TestLocaleProvider>
        <BrushlingProvider>
          <Probe />
        </BrushlingProvider>
      </TestLocaleProvider>,
    );
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

  it("non riapre un premio già gestito durante il restore; accredita la sessione successiva", async () => {
    mocks.loadProfile.mockResolvedValue({
      selectedId: "bloopi",
      hasChosenStarter: true,
    });
    mocks.loadCustomization.mockResolvedValue(DEFAULT_CUSTOMIZATION_STATE);
    const before = createEmptyLifetimeProgress();
    mocks.brushState.historyReady = true;
    mocks.brushState.lifetimeProgress = before;
    const first: BrushSession = {
      id: "manual-before-restore",
      startedAt: Date.now() - 120_000,
      durationSeconds: 120,
      targetSeconds: 120,
      completed: true,
      source: "manual",
    };
    const second: BrushSession = {
      ...first,
      id: "manual-after-restore",
      startedAt: Date.now(),
    };
    let current!: ReturnType<typeof useBrushling>;
    function Probe() {
      current = useBrushling();
      return null;
    }
    const renderer = createRoot();
    const render = async () =>
      act(async () =>
        renderer.render(
          <TestLocaleProvider>
            <BrushlingProvider>
              <Probe />
            </BrushlingProvider>
          </TestLocaleProvider>,
        ),
      );

    await render();
    mocks.brushState.progressEvent = {
      session: first,
      before,
      after: applySessionToLifetime(before, first),
    };
    await render();
    expect(current.reward).not.toBeNull();
    await act(async () => current.dismissReward());
    expect(current.reward).toBeNull();

    await act(async () => current.setRestoreInProgress(true));
    await act(async () =>
      current.restoreFromBackup(
        { selectedId: "spriggo", hasChosenStarter: true },
        DEFAULT_CUSTOMIZATION_STATE,
      ),
    );
    expect(current.reward).toBeNull();
    mocks.brushState.progressEvent = null;
    await render();
    await act(async () => current.setRestoreInProgress(false));
    expect(current.reward).toBeNull();

    mocks.brushState.progressEvent = {
      session: second,
      before,
      after: applySessionToLifetime(before, second),
    };
    await render();
    expect(current.reward).not.toBeNull();
    await act(async () => renderer.unmount());
  });
});

describe("scelta dello starter in modalità demo", () => {
  it("viene salvata nel profilo anche se la demo è attiva", async () => {
    vi.clearAllMocks();
    mocks.loadProfile.mockResolvedValue({ selectedId: "bloopi", hasChosenStarter: false });
    mocks.loadCustomization.mockResolvedValue(DEFAULT_CUSTOMIZATION_STATE);
    mocks.brushState.lifetimeProgress = createEmptyLifetimeProgress();
    mocks.brushState.historyReady = true;
    mocks.brushState.demoMode = true;
    let chooseStarter!: ReturnType<typeof useBrushling>["chooseStarter"];
    function Probe() {
      chooseStarter = useBrushling().chooseStarter;
      return null;
    }
    const renderer = createRoot();
    await act(async () => {
      renderer.render(
        <TestLocaleProvider>
          <BrushlingProvider>
            <Probe />
          </BrushlingProvider>
        </TestLocaleProvider>,
      );
    });

    await act(async () => {
      await chooseStarter("spriggo");
    });

    expect(mocks.saveStarter).toHaveBeenCalledWith("spriggo");
    mocks.brushState.demoMode = false;
    await act(async () => renderer.unmount());
  });
});
