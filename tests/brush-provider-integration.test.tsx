import React, { act } from "react";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { createRoot } from "test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  BleClientEvents,
  BrushSession,
  SonicareClient,
  StoredDeviceSession,
} from "@/lib/brush-types";
import {
  applySessionToLifetime,
  createEmptyLifetimeProgress,
} from "@/lib/lifetime-progress";
import { TestLocaleProvider } from "@/tests/helpers/test-locale-provider";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  forgetDevice: vi.fn(),
  saveDeviceBatch: vi.fn(),
  saveFallback: vi.fn(),
  saveDemo: vi.fn(),
  saveSession: vi.fn(),
  saveLastDevice: vi.fn(),
  loadPendingManual: vi.fn(),
  savePendingManual: vi.fn(),
  clearPendingManual: vi.fn(),
  hapticsEnabled: true,
}));

vi.mock("react-native", () => ({ Platform: { OS: "web" } }));
vi.mock("@/contexts/preferences-context", () => ({
  useOptionalPreferences: () => ({
    preferences: { hapticsEnabled: mocks.hapticsEnabled },
  }),
}));
vi.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Light: "light" },
  NotificationFeedbackType: { Success: "success" },
  impactAsync: vi.fn(),
  notificationAsync: vi.fn(),
}));
vi.mock("@/lib/brush-storage", async () => {
  const { createEmptyLifetimeProgress } =
    await import("@/lib/lifetime-progress");
  return {
    loadHistoryBundle: vi.fn(async () => ({
      recentHistory: [],
      lifetimeProgress: createEmptyLifetimeProgress(),
    })),
    loadDemoHistory: vi.fn(async () => []),
    loadDemoMode: vi.fn(async () => false),
    forgetDeviceWithLifetime: mocks.forgetDevice,
    saveDeviceFallbackWithLifetime: mocks.saveFallback,
    saveDeviceSessionsWithLifetime: mocks.saveDeviceBatch,
    saveLastDevice: mocks.saveLastDevice,
    clearDemoHistory: vi.fn(),
    clearHistory: vi.fn(),
    replaceDemoHistory: vi.fn(async () => []),
    replaceHistoryWithLifetime: vi.fn(),
    saveDemoMode: vi.fn(),
    saveDemoSession: mocks.saveDemo,
    saveSessionWithLifetime: mocks.saveSession,
  };
});
vi.mock("@/lib/manual-session-storage", () => ({
  loadPendingManualSession: mocks.loadPendingManual,
  savePendingManualSession: mocks.savePendingManual,
  clearPendingManualSession: mocks.clearPendingManual,
}));

import { BrushProvider, useBrush } from "@/contexts/brush-context";

class FakeClient implements SonicareClient {
  events: BleClientEvents;
  initialize = vi.fn(async () => undefined);
  scanAndConnect = vi.fn(async () => undefined);
  disconnect = vi.fn(async () => undefined);
  syncStoredSessionsSince = vi.fn<SonicareClient["syncStoredSessionsSince"]>();
  destroy = vi.fn();

  constructor(events: BleClientEvents) {
    this.events = events;
  }
}

describe("BrushProvider BLE integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hapticsEnabled = true;
    Object.assign(Platform, { OS: "web" });
    const empty = createEmptyLifetimeProgress();
    mocks.forgetDevice.mockReset().mockResolvedValue({
      recentHistory: [],
      lifetimeProgress: empty,
    });
    mocks.saveDeviceBatch.mockReset().mockResolvedValue({
      recentHistory: [],
      lifetimeProgress: empty,
      event: null,
      importedCount: 0,
    });
    mocks.saveFallback.mockReset().mockResolvedValue({
      recentHistory: [],
      lifetimeProgress: empty,
      event: null,
    });
    mocks.saveDemo.mockReset().mockResolvedValue([]);
    mocks.saveSession.mockReset().mockResolvedValue({
      recentHistory: [],
      lifetimeProgress: empty,
      event: null,
    });
    mocks.saveLastDevice.mockReset().mockResolvedValue(undefined);
    mocks.loadPendingManual.mockReset().mockResolvedValue(null);
    mocks.savePendingManual.mockReset().mockResolvedValue(undefined);
    mocks.clearPendingManual.mockReset().mockResolvedValue(undefined);
  });

  it("rispetta Vibrazione spenta per connessione, timer e completamento su Android", async () => {
    const start = new Date(2026, 9, 1, 8).getTime();
    const clock = vi.spyOn(Date, "now").mockReturnValue(start);
    Object.assign(Platform, { OS: "android" });
    mocks.hapticsEnabled = false;
    let brush: ReturnType<typeof useBrush> | null = null;
    function Probe() {
      brush = useBrush();
      return null;
    }
    const renderer = createRoot();
    try {
      await act(async () => {
        renderer.render(
          <TestLocaleProvider>
            <BrushProvider clientFactory={(events) => new FakeClient(events)}>
              <Probe />
            </BrushProvider>
          </TestLocaleProvider>,
        );
        await Promise.resolve();
      });
      await act(async () => {
        await brush!.connect();
      });
      act(() => brush!.startManual());
      clock.mockReturnValue(start + 120_000);
      await act(async () => {
        await brush!.stopManual();
      });

      expect(mocks.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({ completed: true }),
      );
      expect(Haptics.impactAsync).not.toHaveBeenCalled();
      expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    } finally {
      await act(async () => renderer.unmount());
      clock.mockRestore();
      Object.assign(Platform, { OS: "web" });
    }
  });

  it("cambia lingua senza ricreare il client BLE", async () => {
    const holder: { client?: FakeClient } = {};
    const factory = vi.fn((events: BleClientEvents) => {
      holder.client = new FakeClient(events);
      return holder.client;
    });
    let statusMessage = "";
    function Probe() {
      statusMessage = useBrush().statusMessage;
      return null;
    }

    const renderer = createRoot();
    await act(async () => {
      renderer.render(
        <TestLocaleProvider locale="it">
          <BrushProvider clientFactory={factory}>
            <Probe />
          </BrushProvider>
        </TestLocaleProvider>,
      );
      await Promise.resolve();
    });
    act(() =>
      holder.client?.events.onStatus(
        "scanning",
        "Accendi lo spazzolino e tienilo vicino",
      ),
    );
    expect(statusMessage).toBe("Accendi lo spazzolino e tienilo vicino");

    await act(async () => {
      renderer.render(
        <TestLocaleProvider locale="en">
          <BrushProvider clientFactory={factory}>
            <Probe />
          </BrushProvider>
        </TestLocaleProvider>,
      );
    });

    expect(statusMessage).toBe("Turn on the toothbrush and keep it nearby");
    expect(factory).toHaveBeenCalledTimes(1);
    expect(holder.client?.destroy).not.toHaveBeenCalled();
    await act(async () => renderer.unmount());
  });

  it("salva una sessione terminata dal manico e aggiorna storico e progressione", async () => {
    vi.useFakeTimers();
    const holder: { client?: FakeClient } = {};
    const factory = (events: BleClientEvents) => {
      holder.client = new FakeClient(events);
      return holder.client;
    };
    const stored: StoredDeviceSession = {
      sessionId: 42,
      durationSeconds: 120,
      targetSeconds: 120,
      mode: "clean",
      intensity: "media",
    };
    const persistedSession = {
      id: "device:kids-brush:42",
      deviceSessionId: 42,
      startedAt: new Date(2026, 8, 23, 8).getTime(),
      durationSeconds: 120,
      targetSeconds: 120,
      completed: true,
      source: "device" as const,
    };
    const before = createEmptyLifetimeProgress();
    const after = applySessionToLifetime(before, persistedSession);
    mocks.saveDeviceBatch.mockResolvedValue({
      recentHistory: [persistedSession],
      lifetimeProgress: after,
      event: { session: persistedSession, before, after },
      importedCount: 1,
    });

    let observed: {
      realHistory: BrushSession[];
      completedSessions: number;
      disconnect: () => Promise<void>;
    } = {
      realHistory: [],
      completedSessions: 0,
      disconnect: async () => undefined,
    };
    function Probe() {
      const value = useBrush();
      observed = {
        realHistory: value.realHistory,
        completedSessions: value.lifetimeProgress.completedSessions,
        disconnect: value.disconnect,
      };
      return null;
    }

    const renderer = createRoot();
    await act(async () => {
      renderer.render(
        <BrushProvider clientFactory={factory} syncDelayMs={450}>
          <Probe />
        </BrushProvider>,
      );
      await Promise.resolve();
    });
    const client = holder.client!;
    expect(client).toBeDefined();
    client.syncStoredSessionsSince.mockResolvedValue([stored]);

    await act(async () => {
      client.events.onDevice({
        id: "kids-brush",
        name: "Sonicare4Kids",
        model: "HX6322/04",
      });
      client.events.onLiveData({
        handleState: 2,
        isBrushing: true,
        elapsedSeconds: 120,
        routineSeconds: 120,
        mode: "clean",
        intensity: "media",
      });
      client.events.onLiveData({
        handleState: 1,
        isBrushing: false,
        elapsedSeconds: 120,
        routineSeconds: 120,
        mode: "clean",
        intensity: "media",
      });
      await vi.runAllTimersAsync();
    });

    expect(client.syncStoredSessionsSince).toHaveBeenCalledTimes(1);
    expect(mocks.saveFallback).toHaveBeenCalledTimes(1);
    expect(mocks.saveDeviceBatch).toHaveBeenCalledWith("kids-brush", [stored]);
    expect(observed.realHistory).toEqual([persistedSession]);
    expect(observed.completedSessions).toBe(1);
    await act(async () => renderer.unmount());
    expect(client.destroy).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("salva i dati live se il manico si disconnette prima della sync differita", async () => {
    vi.useFakeTimers();
    const endedAt = new Date(2026, 8, 23, 9, 30).getTime();
    vi.setSystemTime(endedAt);
    const holder: { client?: FakeClient } = {};
    const factory = (events: BleClientEvents) => {
      holder.client = new FakeClient(events);
      return holder.client;
    };
    mocks.saveFallback.mockImplementation(
      async (_deviceId: string, session: BrushSession) => {
        const before = createEmptyLifetimeProgress();
        const after = applySessionToLifetime(before, session);
        return {
          recentHistory: [session],
          lifetimeProgress: after,
          event: { session, before, after },
        };
      },
    );

    let observed: { realHistory: BrushSession[] } = { realHistory: [] };
    function Probe() {
      const value = useBrush();
      observed = { realHistory: value.realHistory };
      return null;
    }

    const renderer = createRoot();
    await act(async () => {
      renderer.render(
        <BrushProvider clientFactory={factory} syncDelayMs={450}>
          <Probe />
        </BrushProvider>,
      );
      await Promise.resolve();
    });
    const client = holder.client!;

    await act(async () => {
      client.events.onDevice({
        id: "kids-brush",
        name: "Sonicare4Kids",
        model: "HX6322/04",
      });
      client.events.onLiveData({
        handleState: 2,
        isBrushing: true,
        elapsedSeconds: 30,
        routineSeconds: 120,
        mode: "clean",
        intensity: "media",
      });
      client.events.onDevice(null);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(client.syncStoredSessionsSince).not.toHaveBeenCalled();
    expect(mocks.saveFallback).toHaveBeenCalledWith(
      "kids-brush",
      expect.objectContaining({
        id: `ble-live:kids-brush:${endedAt - 30_000}`,
        durationSeconds: 30,
        source: "device",
      }),
    );
    expect(observed.realHistory).toHaveLength(1);
    await act(async () => renderer.unmount());
    vi.useRealTimers();
  });

  it("chiude subito la GATT e persiste il fallback senza attendere una sync bloccata", async () => {
    vi.useFakeTimers();
    const holder: { client?: FakeClient } = {};
    const factory = (events: BleClientEvents) => {
      holder.client = new FakeClient(events);
      return holder.client;
    };
    let releaseFallback!: () => void;
    mocks.saveFallback.mockImplementation(
      (_deviceId: string, session: BrushSession) =>
        new Promise((resolve) => {
          const before = createEmptyLifetimeProgress();
          const after = applySessionToLifetime(before, session);
          releaseFallback = () =>
            resolve({
              recentHistory: [session],
              lifetimeProgress: after,
              event: { session, before, after },
            });
        }),
    );

    let disconnect: () => Promise<void> = async () => undefined;
    function Probe() {
      disconnect = useBrush().disconnect;
      return null;
    }

    const renderer = createRoot();
    await act(async () => {
      renderer.render(
        <BrushProvider clientFactory={factory} syncDelayMs={450}>
          <Probe />
        </BrushProvider>,
      );
      await Promise.resolve();
    });
    const client = holder.client!;
    client.syncStoredSessionsSince.mockImplementation(
      () => new Promise(() => undefined),
    );
    await act(async () => {
      client.events.onDevice({
        id: "kids-brush",
        name: "Sonicare4Kids",
        model: "HX6322/04",
      });
      client.events.onLiveData({
        handleState: 2,
        isBrushing: true,
        elapsedSeconds: 45,
        routineSeconds: 120,
        mode: "clean",
        intensity: "media",
      });
      client.events.onLiveData({
        handleState: 1,
        isBrushing: false,
        elapsedSeconds: 45,
        routineSeconds: 120,
        mode: "clean",
        intensity: "media",
      });
      await vi.runAllTimersAsync();
    });

    let disconnectPromise!: Promise<void>;
    await act(async () => {
      disconnectPromise = disconnect();
      await Promise.resolve();
    });
    expect(client.disconnect).toHaveBeenCalledTimes(1);
    expect(client.syncStoredSessionsSince).not.toHaveBeenCalled();

    releaseFallback();
    await act(async () => disconnectPromise);
    expect(client.syncStoredSessionsSince).not.toHaveBeenCalled();
    await act(async () => renderer.unmount());
    vi.useRealTimers();
  });

  it("salva un solo fallback quando disconnect emette stop live e device null", async () => {
    vi.useFakeTimers();
    const endedAt = new Date(2026, 8, 23, 9, 45).getTime();
    vi.setSystemTime(endedAt);
    const holder: { client?: FakeClient } = {};
    const factory = (events: BleClientEvents) => {
      holder.client = new FakeClient(events);
      return holder.client;
    };
    mocks.saveFallback.mockImplementation(
      async (_deviceId: string, session: BrushSession) => ({
        recentHistory: [session],
        lifetimeProgress: applySessionToLifetime(
          createEmptyLifetimeProgress(),
          session,
        ),
        event: null,
      }),
    );

    let disconnect: () => Promise<void> = async () => undefined;
    function Probe() {
      disconnect = useBrush().disconnect;
      return null;
    }

    const renderer = createRoot();
    await act(async () => {
      renderer.render(
        <BrushProvider clientFactory={factory} syncDelayMs={450}>
          <Probe />
        </BrushProvider>,
      );
      await Promise.resolve();
    });
    const client = holder.client!;
    client.disconnect.mockImplementation(async () => {
      await Promise.resolve();
      client.events.onLiveData({
        handleState: 1,
        isBrushing: false,
        elapsedSeconds: 0,
        routineSeconds: 120,
        mode: "clean",
        intensity: "media",
      });
      client.events.onDevice(null);
    });

    await act(async () => {
      client.events.onDevice({
        id: "kids-brush",
        name: "Sonicare4Kids",
        model: "HX6322/04",
      });
      client.events.onLiveData({
        handleState: 2,
        isBrushing: true,
        elapsedSeconds: 30,
        routineSeconds: 120,
        mode: "clean",
        intensity: "media",
      });
      await disconnect();
    });

    expect(mocks.saveFallback).toHaveBeenCalledTimes(1);
    await act(async () => renderer.unmount());
    vi.useRealTimers();
  });

  it("attende il teardown BLE prima del flush e non duplica un fallback già salvabile", async () => {
    vi.useFakeTimers();
    const endedAt = new Date(2026, 8, 23, 9, 50).getTime();
    vi.setSystemTime(endedAt);
    const holder: { client?: FakeClient } = {};
    const factory = (events: BleClientEvents) => {
      holder.client = new FakeClient(events);
      return holder.client;
    };
    mocks.saveFallback.mockImplementation(
      async (_deviceId: string, session: BrushSession) => ({
        recentHistory: [session],
        lifetimeProgress: applySessionToLifetime(
          createEmptyLifetimeProgress(),
          session,
        ),
        event: null,
      }),
    );

    let disconnect: () => Promise<void> = async () => undefined;
    function Probe() {
      disconnect = useBrush().disconnect;
      return null;
    }

    const renderer = createRoot();
    await act(async () => {
      renderer.render(
        <BrushProvider clientFactory={factory} syncDelayMs={450}>
          <Probe />
        </BrushProvider>,
      );
      await Promise.resolve();
    });
    const client = holder.client!;
    client.disconnect.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
      client.events.onLiveData({
        handleState: 1,
        isBrushing: false,
        elapsedSeconds: 0,
        routineSeconds: 120,
        mode: "clean",
        intensity: "media",
      });
      client.events.onDevice(null);
    });

    act(() => {
      client.events.onDevice({
        id: "kids-brush",
        name: "Sonicare4Kids",
        model: "HX6322/04",
      });
      client.events.onLiveData({
        handleState: 2,
        isBrushing: true,
        elapsedSeconds: 30,
        routineSeconds: 120,
        mode: "clean",
        intensity: "media",
      });
    });
    let operation!: Promise<void>;
    await act(async () => {
      operation = disconnect();
      await vi.advanceTimersByTimeAsync(1_000);
      await operation;
    });

    expect(mocks.saveFallback).toHaveBeenCalledTimes(1);
    await act(async () => renderer.unmount());
    vi.useRealTimers();
  });

  it("serializza due stop ravvicinati senza sovrascrivere la prima sessione pendente", async () => {
    vi.useFakeTimers();
    const firstEndedAt = new Date(2026, 8, 23, 10).getTime();
    vi.setSystemTime(firstEndedAt);
    const holder: { client?: FakeClient } = {};
    const factory = (events: BleClientEvents) => {
      holder.client = new FakeClient(events);
      return holder.client;
    };
    let releaseFirstSync!: (value: StoredDeviceSession[]) => void;
    const secondStored: StoredDeviceSession = {
      sessionId: 102,
      durationSeconds: 40,
      targetSeconds: 120,
      mode: "clean",
      intensity: "media",
    };
    mocks.saveFallback.mockImplementation(
      async (_deviceId: string, session: BrushSession) => ({
        recentHistory: [session],
        lifetimeProgress: applySessionToLifetime(
          createEmptyLifetimeProgress(),
          session,
        ),
        event: null,
      }),
    );
    mocks.saveDeviceBatch.mockResolvedValue({
      recentHistory: [],
      lifetimeProgress: createEmptyLifetimeProgress(),
      event: null,
      importedCount: 1,
    });

    const renderer = createRoot();
    await act(async () => {
      renderer.render(
        <BrushProvider clientFactory={factory} syncDelayMs={450}>
          {null}
        </BrushProvider>,
      );
      await Promise.resolve();
    });
    const client = holder.client!;
    client.syncStoredSessionsSince
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            releaseFirstSync = resolve;
          }),
      )
      .mockResolvedValueOnce([secondStored]);

    await act(async () => {
      client.events.onDevice({
        id: "kids-brush",
        name: "Sonicare4Kids",
        model: "HX6322/04",
      });
      client.events.onLiveData({
        handleState: 2,
        isBrushing: true,
        elapsedSeconds: 30,
        routineSeconds: 120,
        mode: "clean",
        intensity: "media",
      });
      client.events.onLiveData({
        handleState: 1,
        isBrushing: false,
        elapsedSeconds: 30,
        routineSeconds: 120,
        mode: "clean",
        intensity: "media",
      });
      await vi.advanceTimersByTimeAsync(450);
    });
    expect(client.syncStoredSessionsSince).toHaveBeenCalledTimes(1);

    vi.setSystemTime(firstEndedAt + 60_000);
    await act(async () => {
      client.events.onLiveData({
        handleState: 2,
        isBrushing: true,
        elapsedSeconds: 40,
        routineSeconds: 120,
        mode: "clean",
        intensity: "media",
      });
      client.events.onLiveData({
        handleState: 1,
        isBrushing: false,
        elapsedSeconds: 40,
        routineSeconds: 120,
        mode: "clean",
        intensity: "media",
      });
      await vi.advanceTimersByTimeAsync(450);
      releaseFirstSync([]);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mocks.saveFallback).toHaveBeenCalledTimes(2);
    expect(client.syncStoredSessionsSince).toHaveBeenCalledTimes(2);
    expect(mocks.saveDeviceBatch).toHaveBeenCalledWith("kids-brush", [
      secondStored,
    ]);
    await act(async () => renderer.unmount());
    vi.useRealTimers();
  });

  it("deriva la durata manuale dal clock anche se i timer JS restano sospesi", async () => {
    vi.useFakeTimers();
    const startedAt = new Date(2026, 8, 23, 11).getTime();
    vi.setSystemTime(startedAt);
    const holder: { client?: FakeClient } = {};
    const factory = (events: BleClientEvents) => {
      holder.client = new FakeClient(events);
      return holder.client;
    };
    mocks.saveSession.mockImplementation(async (session: BrushSession) => {
      const before = createEmptyLifetimeProgress();
      const after = applySessionToLifetime(before, session);
      return {
        recentHistory: [session],
        lifetimeProgress: after,
        event: { session, before, after },
      };
    });

    let startManual: () => void = () => undefined;
    let stopManual: () => Promise<void> = async () => undefined;
    function Probe() {
      const value = useBrush();
      startManual = value.startManual;
      stopManual = value.stopManual;
      return null;
    }

    const renderer = createRoot();
    await act(async () => {
      renderer.render(
        <BrushProvider clientFactory={factory}>
          <Probe />
        </BrushProvider>,
      );
      await Promise.resolve();
    });
    act(() => startManual());
    vi.setSystemTime(startedAt + 45_000);
    await act(async () => stopManual());

    expect(mocks.saveSession).toHaveBeenCalledWith(
      expect.objectContaining({
        startedAt,
        durationSeconds: 45,
        completed: false,
        source: "manual",
      }),
    );
    await act(async () => renderer.unmount());
    vi.useRealTimers();
  });

  it("conserva e riprova una sessione manuale reale quando lo storage fallisce", async () => {
    vi.useFakeTimers();
    const startedAt = new Date(2026, 8, 23, 11, 30).getTime();
    vi.setSystemTime(startedAt);
    mocks.saveSession
      .mockRejectedValueOnce(new Error("storage non disponibile"))
      .mockImplementationOnce(async (session: BrushSession) => {
        const before = createEmptyLifetimeProgress();
        const after = applySessionToLifetime(before, session);
        return {
          recentHistory: [session],
          lifetimeProgress: after,
          event: { session, before, after },
        };
      });

    let startManual: () => void = () => undefined;
    let stopManual: () => Promise<void> = async () => undefined;
    let retryManualSession: () => Promise<void> = async () => undefined;
    let pending = false;
    let error: string | null = null;
    let history: BrushSession[] = [];
    function Probe() {
      const value = useBrush();
      startManual = value.startManual;
      stopManual = value.stopManual;
      retryManualSession = value.retryManualSession;
      pending = value.hasPendingManualSession;
      error = value.manualSaveError;
      history = value.realHistory;
      return null;
    }

    const renderer = createRoot();
    await act(async () => {
      renderer.render(
        <BrushProvider clientFactory={(events) => new FakeClient(events)}>
          <Probe />
        </BrushProvider>,
      );
      await Promise.resolve();
    });
    act(() => startManual());
    vi.setSystemTime(startedAt + 45_000);
    await act(async () => stopManual());

    expect(pending).toBe(true);
    expect(error).toBe("Sessione guidata non salvata");
    expect(history).toEqual([]);
    expect(mocks.savePendingManual).toHaveBeenCalledTimes(1);
    expect(mocks.clearPendingManual).not.toHaveBeenCalled();

    await act(async () => retryManualSession());
    expect(mocks.saveSession).toHaveBeenCalledTimes(2);
    expect(pending).toBe(false);
    expect(error).toBeNull();
    expect(history).toHaveLength(1);
    expect(mocks.clearPendingManual).toHaveBeenCalledTimes(1);
    await act(async () => renderer.unmount());
    vi.useRealTimers();
  });

  it("ripristina al mount una sessione manuale rimasta da salvare", async () => {
    const pendingSession: BrushSession = {
      id: "manual-recovered",
      startedAt: new Date(2026, 8, 23, 11, 45).getTime(),
      rewardPolicy: "completed-only",
      durationSeconds: 45,
      targetSeconds: 120,
      completed: false,
      source: "manual",
    };
    mocks.loadPendingManual.mockResolvedValue(pendingSession);
    mocks.saveSession.mockImplementation(async (session: BrushSession) => ({
      recentHistory: [session],
      lifetimeProgress: applySessionToLifetime(
        createEmptyLifetimeProgress(),
        session,
      ),
      event: null,
    }));

    let retryManualSession: () => Promise<void> = async () => undefined;
    let pending = false;
    let error: string | null = null;
    function Probe() {
      const value = useBrush();
      retryManualSession = value.retryManualSession;
      pending = value.hasPendingManualSession;
      error = value.manualSaveError;
      return null;
    }

    const renderer = createRoot();
    await act(async () => {
      renderer.render(
        <BrushProvider clientFactory={(events) => new FakeClient(events)}>
          <Probe />
        </BrushProvider>,
      );
      await Promise.resolve();
    });
    expect(pending).toBe(true);
    expect(error).toContain("sessione precedente");

    await act(async () => retryManualSession());
    expect(mocks.saveSession).toHaveBeenCalledWith(pendingSession);
    expect(mocks.clearPendingManual).toHaveBeenCalledTimes(1);
    expect(pending).toBe(false);
    await act(async () => renderer.unmount());
  });

  it("conserva e riprova una sessione demo completata automaticamente", async () => {
    vi.useFakeTimers();
    const startedAt = new Date(2026, 8, 23, 12).getTime();
    vi.setSystemTime(startedAt);
    mocks.saveDemo
      .mockRejectedValueOnce(new Error("demo storage non disponibile"))
      .mockImplementationOnce(async (session: BrushSession) => [session]);

    let setDemoMode: (enabled: boolean) => Promise<void> = async () =>
      undefined;
    let startManual: () => void = () => undefined;
    let retryManualSession: () => Promise<void> = async () => undefined;
    let pending = false;
    let error: string | null = null;
    let history: BrushSession[] = [];
    function Probe() {
      const value = useBrush();
      setDemoMode = value.setDemoMode;
      startManual = value.startManual;
      retryManualSession = value.retryManualSession;
      pending = value.hasPendingManualSession;
      error = value.manualSaveError;
      history = value.history;
      return null;
    }

    const renderer = createRoot();
    await act(async () => {
      renderer.render(
        <BrushProvider clientFactory={(events) => new FakeClient(events)}>
          <Probe />
        </BrushProvider>,
      );
      await Promise.resolve();
    });
    await act(async () => setDemoMode(true));
    act(() => startManual());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
      await Promise.resolve();
    });

    expect(pending).toBe(true);
    expect(error).toBe("Sessione guidata non salvata");
    expect(history).toEqual([]);

    await act(async () => retryManualSession());
    expect(mocks.saveDemo).toHaveBeenCalledTimes(2);
    expect(pending).toBe(false);
    expect(error).toBeNull();
    expect(history).toHaveLength(1);
    await act(async () => renderer.unmount());
    vi.useRealTimers();
  });

  it("annulla anche una scansione in corso prima di attivare la demo", async () => {
    const holder: { client?: FakeClient } = {};
    const factory = (events: BleClientEvents) => {
      holder.client = new FakeClient(events);
      return holder.client;
    };
    let enableDemo: () => Promise<void> = async () => undefined;
    function Probe() {
      const value = useBrush();
      enableDemo = () => value.setDemoMode(true);
      return null;
    }

    const renderer = createRoot();
    await act(async () => {
      renderer.render(
        <BrushProvider clientFactory={factory}>
          <Probe />
        </BrushProvider>,
      );
      await Promise.resolve();
    });
    const client = holder.client!;
    await act(async () => {
      client.events.onStatus("scanning", "Ricerca in corso");
      await enableDemo();
    });

    expect(client.disconnect).toHaveBeenCalledTimes(1);
    await act(async () => renderer.unmount());
  });

  it("dimentica il solo manico collegato dopo aver chiuso la GATT", async () => {
    const holder: { client?: FakeClient } = {};
    const factory = (events: BleClientEvents) => {
      holder.client = new FakeClient(events);
      return holder.client;
    };
    let forget: () => Promise<void> = async () => undefined;
    function Probe() {
      forget = useBrush().forgetToothbrush;
      return null;
    }

    const renderer = createRoot();
    await act(async () => {
      renderer.render(
        <BrushProvider clientFactory={factory}>
          <Probe />
        </BrushProvider>,
      );
      await Promise.resolve();
    });
    const client = holder.client!;
    await act(async () => {
      client.events.onDevice({
        id: "kids-brush",
        name: "Sonicare4Kids",
        model: "HX6322/04",
      });
      await forget();
    });

    expect(client.disconnect).toHaveBeenCalledTimes(1);
    expect(mocks.forgetDevice).toHaveBeenCalledWith("kids-brush");
    await act(async () => renderer.unmount());
  });

  it("non cancella un nuovo manico collegato mentre il reset precedente è ancora in corso", async () => {
    const holder: { client?: FakeClient } = {};
    const factory = (events: BleClientEvents) => {
      holder.client = new FakeClient(events);
      return holder.client;
    };
    let completeForget!: () => void;
    mocks.forgetDevice.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          completeForget = () =>
            resolve({
              recentHistory: [],
              lifetimeProgress: createEmptyLifetimeProgress(),
            });
        }),
    );

    let forget: () => Promise<void> = async () => undefined;
    let activeDeviceId: string | null = null;
    let forgetting = false;
    function Probe() {
      const value = useBrush();
      forget = value.forgetToothbrush;
      activeDeviceId = value.device?.id ?? null;
      forgetting = value.isForgettingToothbrush;
      return null;
    }

    const renderer = createRoot();
    await act(async () => {
      renderer.render(
        <BrushProvider clientFactory={factory}>
          <Probe />
        </BrushProvider>,
      );
      await Promise.resolve();
    });
    const client = holder.client!;
    await act(async () => {
      client.events.onDevice({
        id: "brush-a",
        name: "Sonicare4Kids",
        model: "HX6322/04",
      });
      await Promise.resolve();
    });

    let forgetPromise!: Promise<void>;
    await act(async () => {
      forgetPromise = forget();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(forgetting).toBe(true);

    await act(async () => {
      client.events.onDevice({
        id: "brush-b",
        name: "Sonicare4Kids",
        model: "HX6322/04",
      });
      completeForget();
      await forgetPromise;
    });

    expect(activeDeviceId).toBe("brush-b");
    expect(forgetting).toBe(false);
    expect(mocks.saveLastDevice).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "brush-b" }),
    );
    await act(async () => renderer.unmount());
  });

  it("mantiene il picco di durata quando il timer BLE torna a zero prima dello stop", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 23, 12).getTime());
    const clientHolder: { current?: FakeClient } = {};
    const renderer = createRoot();
    await act(async () => {
      renderer.render(
        <BrushProvider
          clientFactory={(events) => {
            clientHolder.current = new FakeClient(events);
            return clientHolder.current;
          }}
          syncDelayMs={1}
        />,
      );
      await Promise.resolve();
    });
    const client = clientHolder.current!;
    client.syncStoredSessionsSince.mockRejectedValue(
      new Error("record non ancora pronto"),
    );
    const live = (isBrushing: boolean, elapsedSeconds: number) =>
      client.events.onLiveData({
        handleState: isBrushing ? 2 : 1,
        isBrushing,
        elapsedSeconds,
        routineSeconds: 120,
        mode: "clean",
        intensity: "media",
      });
    await act(async () => {
      client.events.onDevice({
        id: "kids-brush",
        name: "Sonicare4Kids",
        model: "HX6322/04",
      });
      live(true, 120);
      live(true, 0);
      live(false, 0);
      await vi.runAllTimersAsync();
    });
    expect(mocks.saveFallback).toHaveBeenCalledTimes(1);
    expect(mocks.saveFallback).toHaveBeenCalledWith(
      "kids-brush",
      expect.objectContaining({
        durationSeconds: 120,
        completed: true,
      }),
    );
    expect(client.syncStoredSessionsSince).toHaveBeenCalledTimes(1);
    await act(async () => renderer.unmount());
    vi.useRealTimers();
  });

  it("salva il live anche quando il batch allo stop contiene solo una sessione precedente", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 23, 12).getTime());
    const clientHolder: { current?: FakeClient } = {};
    const renderer = createRoot();
    await act(async () => {
      renderer.render(
        <BrushProvider
          clientFactory={(events) => {
            clientHolder.current = new FakeClient(events);
            return clientHolder.current;
          }}
          syncDelayMs={1}
        />,
      );
      await Promise.resolve();
    });
    const client = clientHolder.current!;
    const oldRecord: StoredDeviceSession = {
      sessionId: 42,
      startedAt: Date.now() - 60_000,
      timeConfidence: "reconstructed",
      durationSeconds: 120,
      targetSeconds: 120,
      mode: "clean",
      intensity: "media",
    };
    client.syncStoredSessionsSince
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([oldRecord]);
    const live = (isBrushing: boolean, elapsedSeconds: number) =>
      client.events.onLiveData({
        handleState: isBrushing ? 2 : 1,
        isBrushing,
        elapsedSeconds,
        routineSeconds: 120,
        mode: "clean",
        intensity: "media",
      });
    await act(async () => {
      client.events.onDevice({
        id: "kids-brush",
        name: "Sonicare4Kids",
        model: "HX6322/04",
      });
      live(true, 120);
      live(false, 120);
      await vi.runAllTimersAsync();
    });
    vi.setSystemTime(Date.now() + 180_000);
    await act(async () => {
      live(true, 118);
      live(false, 118);
      await vi.runAllTimersAsync();
    });
    expect(mocks.saveFallback).toHaveBeenCalledTimes(2);
    expect(mocks.saveFallback.mock.calls[1][1]).toMatchObject({
      durationSeconds: 118,
    });
    expect(mocks.saveDeviceBatch).toHaveBeenCalledWith("kids-brush", [
      oldRecord,
    ]);
    const secondFallback = mocks.saveFallback.mock.invocationCallOrder[1];
    const olderImport = mocks.saveDeviceBatch.mock.invocationCallOrder[0];
    expect(secondFallback).toBeLessThan(olderImport);
    await act(async () => renderer.unmount());
    vi.useRealTimers();
  });

  it("annulla il manuale attivo all'avvio BLE e rifiuta uno stop manuale tardivo", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 23, 12).getTime());
    const clientHolder: { current?: FakeClient } = {};
    let startManual: () => void = () => undefined;
    let stopManual: () => Promise<void> = async () => undefined;
    let manualActive = false;
    function Probe() {
      const value = useBrush();
      startManual = value.startManual;
      stopManual = value.stopManual;
      manualActive = value.manualActive;
      return null;
    }
    const renderer = createRoot();
    await act(async () => {
      renderer.render(
        <BrushProvider
          clientFactory={(events) => {
            clientHolder.current = new FakeClient(events);
            return clientHolder.current;
          }}
          syncDelayMs={1}
        >
          <Probe />
        </BrushProvider>,
      );
      await Promise.resolve();
    });
    const client = clientHolder.current!;
    client.syncStoredSessionsSince.mockResolvedValue([]);
    const live = (isBrushing: boolean, elapsedSeconds: number) =>
      client.events.onLiveData({
        handleState: isBrushing ? 2 : 1,
        isBrushing,
        elapsedSeconds,
        routineSeconds: 120,
        mode: "clean",
        intensity: "media",
      });
    act(() => startManual());
    vi.setSystemTime(Date.now() + 2_000);
    await act(async () => {
      client.events.onDevice({
        id: "kids-brush",
        name: "Sonicare4Kids",
        model: "HX6322/04",
      });
      live(true, 118);
      live(false, 118);
    });
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    await act(async () => stopManual());
    expect(manualActive).toBe(false);
    expect(mocks.saveSession).not.toHaveBeenCalled();
    expect(mocks.saveFallback).toHaveBeenCalledTimes(1);
    await act(async () => renderer.unmount());
    vi.useRealTimers();
  });

  it("mantiene l'errore BLE specifico dopo il render e lo ritraduce cambiando lingua", async () => {
    const holder: { current?: FakeClient } = {};
    let statusMessage = "";
    function Probe() {
      statusMessage = useBrush().statusMessage;
      return null;
    }
    const factory = (events: BleClientEvents) => {
      holder.current = new FakeClient(events);
      return holder.current;
    };
    const renderer = createRoot();
    await act(async () => {
      renderer.render(
        <TestLocaleProvider locale="it">
          <BrushProvider clientFactory={factory}>
            <Probe />
          </BrushProvider>
        </TestLocaleProvider>,
      );
      await Promise.resolve();
    });
    act(() =>
      holder.current?.events.onStatus(
        "error",
        "Autorizzazione Bluetooth non concessa",
      ),
    );
    expect(statusMessage).toContain("Bluetooth");
    expect(statusMessage).not.toBe("Connessione Bluetooth non riuscita");
    await act(async () => {
      renderer.render(
        <TestLocaleProvider locale="en">
          <BrushProvider clientFactory={factory}>
            <Probe />
          </BrushProvider>
        </TestLocaleProvider>,
      );
    });
    expect(statusMessage.toLowerCase()).toContain("permission");
    await act(async () => renderer.unmount());
  });
});
