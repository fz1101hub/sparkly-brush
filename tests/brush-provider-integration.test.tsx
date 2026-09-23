import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BleClientEvents, BrushSession, SonicareClient, StoredDeviceSession } from "@/lib/brush-types";
import { applySessionToLifetime, createEmptyLifetimeProgress } from "@/lib/lifetime-progress";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  saveDevice: vi.fn(),
  saveFallback: vi.fn(),
  saveSession: vi.fn(),
  saveLastDevice: vi.fn(),
}));

vi.mock("react-native", () => ({ Platform: { OS: "web" } }));
vi.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Light: "light" },
  NotificationFeedbackType: { Success: "success" },
  impactAsync: vi.fn(),
  notificationAsync: vi.fn(),
}));
vi.mock("@/lib/brush-storage", async () => {
  const { createEmptyLifetimeProgress } = await import("@/lib/lifetime-progress");
  return {
    loadHistoryBundle: vi.fn(async () => ({ recentHistory: [], lifetimeProgress: createEmptyLifetimeProgress() })),
    loadDemoHistory: vi.fn(async () => []),
    loadDemoMode: vi.fn(async () => false),
    saveDeviceFallbackWithLifetime: mocks.saveFallback,
    saveDeviceSessionWithLifetime: mocks.saveDevice,
    saveLastDevice: mocks.saveLastDevice,
    clearDemoHistory: vi.fn(),
    clearHistory: vi.fn(),
    replaceDemoHistory: vi.fn(async () => []),
    replaceHistoryWithLifetime: vi.fn(),
    saveDemoMode: vi.fn(),
    saveDemoSession: vi.fn(),
    saveSessionWithLifetime: mocks.saveSession,
  };
});

import { BrushProvider, useBrush } from "@/contexts/brush-context";

class FakeClient implements SonicareClient {
  events: BleClientEvents;
  initialize = vi.fn(async () => undefined);
  scanAndConnect = vi.fn(async () => undefined);
  disconnect = vi.fn(async () => undefined);
  syncLatestSession = vi.fn<() => Promise<StoredDeviceSession | null>>();
  destroy = vi.fn();

  constructor(events: BleClientEvents) {
    this.events = events;
  }
}

describe("BrushProvider BLE integration", () => {
  beforeEach(() => vi.clearAllMocks());

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
    mocks.saveDevice.mockResolvedValue({
      recentHistory: [persistedSession],
      lifetimeProgress: after,
      event: { session: persistedSession, before, after },
    });

    let observed: { realHistory: BrushSession[]; completedSessions: number; disconnect: () => Promise<void> } = {
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

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <BrushProvider clientFactory={factory} syncDelayMs={450}><Probe /></BrushProvider>,
      );
      await Promise.resolve();
    });
    const client = holder.client!;
    expect(client).toBeDefined();
    client.syncLatestSession.mockResolvedValue(stored);

    await act(async () => {
      client.events.onDevice({ id: "kids-brush", name: "Sonicare4Kids", model: "HX6322/04" });
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

    expect(client.syncLatestSession).toHaveBeenCalledTimes(1);
    expect(mocks.saveDevice).toHaveBeenCalledWith("kids-brush", stored);
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
    mocks.saveFallback.mockImplementation(async (_deviceId: string, session: BrushSession) => {
      const before = createEmptyLifetimeProgress();
      const after = applySessionToLifetime(before, session);
      return {
        recentHistory: [session],
        lifetimeProgress: after,
        event: { session, before, after },
      };
    });

    let observed: { realHistory: BrushSession[] } = { realHistory: [] };
    function Probe() {
      const value = useBrush();
      observed = { realHistory: value.realHistory };
      return null;
    }

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <BrushProvider clientFactory={factory} syncDelayMs={450}><Probe /></BrushProvider>,
      );
      await Promise.resolve();
    });
    const client = holder.client!;

    await act(async () => {
      client.events.onDevice({ id: "kids-brush", name: "Sonicare4Kids", model: "HX6322/04" });
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

    expect(client.syncLatestSession).not.toHaveBeenCalled();
    expect(mocks.saveFallback).toHaveBeenCalledWith("kids-brush", expect.objectContaining({
      id: `ble-live:kids-brush:${endedAt - 30_000}`,
      durationSeconds: 30,
      source: "device",
    }));
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
    mocks.saveFallback.mockImplementation((_deviceId: string, session: BrushSession) => new Promise((resolve) => {
      const before = createEmptyLifetimeProgress();
      const after = applySessionToLifetime(before, session);
      releaseFallback = () => resolve({
        recentHistory: [session],
        lifetimeProgress: after,
        event: { session, before, after },
      });
    }));

    let disconnect: () => Promise<void> = async () => undefined;
    function Probe() {
      disconnect = useBrush().disconnect;
      return null;
    }

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <BrushProvider clientFactory={factory} syncDelayMs={450}><Probe /></BrushProvider>,
      );
      await Promise.resolve();
    });
    const client = holder.client!;
    client.syncLatestSession.mockImplementation(() => new Promise(() => undefined));
    await act(async () => {
      client.events.onDevice({ id: "kids-brush", name: "Sonicare4Kids", model: "HX6322/04" });
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
    expect(client.syncLatestSession).toHaveBeenCalledTimes(1);

    releaseFallback();
    await act(async () => disconnectPromise);
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
    mocks.saveFallback.mockImplementation(async (_deviceId: string, session: BrushSession) => ({
      recentHistory: [session],
      lifetimeProgress: applySessionToLifetime(createEmptyLifetimeProgress(), session),
      event: null,
    }));

    let disconnect: () => Promise<void> = async () => undefined;
    function Probe() {
      disconnect = useBrush().disconnect;
      return null;
    }

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <BrushProvider clientFactory={factory} syncDelayMs={450}><Probe /></BrushProvider>,
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
      client.events.onDevice({ id: "kids-brush", name: "Sonicare4Kids", model: "HX6322/04" });
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

  it("serializza due stop ravvicinati senza sovrascrivere la prima sessione pendente", async () => {
    vi.useFakeTimers();
    const firstEndedAt = new Date(2026, 8, 23, 10).getTime();
    vi.setSystemTime(firstEndedAt);
    const holder: { client?: FakeClient } = {};
    const factory = (events: BleClientEvents) => {
      holder.client = new FakeClient(events);
      return holder.client;
    };
    let releaseFirstSync!: (value: StoredDeviceSession | null) => void;
    const secondStored: StoredDeviceSession = {
      sessionId: 102,
      durationSeconds: 40,
      targetSeconds: 120,
      mode: "clean",
      intensity: "media",
    };
    mocks.saveFallback.mockImplementation(async (_deviceId: string, session: BrushSession) => ({
      recentHistory: [session],
      lifetimeProgress: applySessionToLifetime(createEmptyLifetimeProgress(), session),
      event: null,
    }));
    mocks.saveDevice.mockResolvedValue({
      recentHistory: [],
      lifetimeProgress: createEmptyLifetimeProgress(),
      event: null,
    });

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <BrushProvider clientFactory={factory} syncDelayMs={450}>{null}</BrushProvider>,
      );
      await Promise.resolve();
    });
    const client = holder.client!;
    client.syncLatestSession
      .mockImplementationOnce(() => new Promise((resolve) => {
        releaseFirstSync = resolve;
      }))
      .mockResolvedValueOnce(secondStored);

    await act(async () => {
      client.events.onDevice({ id: "kids-brush", name: "Sonicare4Kids", model: "HX6322/04" });
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
    expect(client.syncLatestSession).toHaveBeenCalledTimes(1);

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
      releaseFirstSync(null);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mocks.saveFallback).toHaveBeenCalledTimes(1);
    expect(client.syncLatestSession).toHaveBeenCalledTimes(2);
    expect(mocks.saveDevice).toHaveBeenCalledWith("kids-brush", secondStored);
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

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <BrushProvider clientFactory={factory}><Probe /></BrushProvider>,
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
});
