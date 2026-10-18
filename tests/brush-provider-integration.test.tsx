import React from "react";
import * as Haptics from "expo-haptics";
import { PreferencesProvider, usePreferences } from "@/contexts/preferences-context";
import TestRenderer, { act } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BleClientEvents, BrushSession, SonicareClient, StoredDeviceSession } from "@/lib/brush-types";
import { applySessionToLifetime, createEmptyLifetimeProgress } from "@/lib/lifetime-progress";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  journal: new Map<string, string>(),
  os: "web",
  forgetDevice: vi.fn(),
  saveDeviceBatch: vi.fn(),
  saveFallback: vi.fn(),
  saveDemo: vi.fn(),
  saveSession: vi.fn(),
  saveLastDevice: vi.fn(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({ default: {
  getItem: vi.fn(async (key: string) => mocks.journal.get(key) ?? null),
  setItem: vi.fn(async (key: string, value: string) => { mocks.journal.set(key, value); }),
  removeItem: vi.fn(async (key: string) => { mocks.journal.delete(key); }),
} }));

vi.mock("react-native", () => ({ Platform: { get OS() { return mocks.os; } }, AppState: { addEventListener: vi.fn(() => ({ remove: vi.fn() })) } }));
vi.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Light: "light" },
  NotificationFeedbackType: { Success: "success" },
  impactAsync: vi.fn(async () => {}),
  notificationAsync: vi.fn(async () => {}),
}));
vi.mock("@/lib/brush-storage", async () => {
  const { createEmptyLifetimeProgress } = await import("@/lib/lifetime-progress");
  const storage = {
    loadHistoryBundle: vi.fn(async () => ({ recentHistory: [], lifetimeProgress: createEmptyLifetimeProgress() })),
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
  return { ...storage, getBrushStorage: () => storage };
});

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
    mocks.journal.clear();
    mocks.os = "web";
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
    mocks.saveFallback.mockReset().mockResolvedValue({ recentHistory: [], lifetimeProgress: empty, event: null });
    mocks.saveDemo.mockReset().mockResolvedValue([]);
    mocks.saveSession.mockReset().mockResolvedValue({ recentHistory: [], lifetimeProgress: empty, event: null });
    mocks.saveLastDevice.mockReset().mockResolvedValue(undefined);
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
    client.syncStoredSessionsSince.mockResolvedValue([stored]);

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

    expect(client.syncStoredSessionsSince).toHaveBeenCalledTimes(1);
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

    expect(client.syncStoredSessionsSince).not.toHaveBeenCalled();
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
    client.syncStoredSessionsSince.mockImplementation(() => new Promise(() => undefined));
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
    expect(client.syncStoredSessionsSince).toHaveBeenCalledTimes(1);

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
    let releaseFirstSync!: (value: StoredDeviceSession[]) => void;
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
    mocks.saveDeviceBatch.mockResolvedValue({
      recentHistory: [],
      lifetimeProgress: createEmptyLifetimeProgress(),
      event: null,
      importedCount: 1,
    });

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <BrushProvider clientFactory={factory} syncDelayMs={450}>{null}</BrushProvider>,
      );
      await Promise.resolve();
    });
    const client = holder.client!;
    client.syncStoredSessionsSince
      .mockImplementationOnce(() => new Promise((resolve) => {
        releaseFirstSync = resolve;
      }))
      .mockResolvedValueOnce([secondStored]);

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

    expect(mocks.saveFallback).toHaveBeenCalledTimes(1);
    expect(client.syncStoredSessionsSince).toHaveBeenCalledTimes(2);
    expect(mocks.saveDeviceBatch).toHaveBeenCalledWith("kids-brush", [secondStored]);
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

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <BrushProvider clientFactory={factory}><Probe /></BrushProvider>,
      );
      await Promise.resolve();
    });
    await act(async () => { await startManual(); });
    vi.setSystemTime(startedAt + 45_000);
    await act(async () => stopManual());

    expect(mocks.saveSession).toHaveBeenCalledWith(expect.objectContaining({
      startedAt,
      durationSeconds: 45,
      completed: false,
      source: "manual",
    }));
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

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <BrushProvider clientFactory={(events) => new FakeClient(events)}><Probe /></BrushProvider>,
      );
      await Promise.resolve();
    });
    await act(async () => { await startManual(); });
    vi.setSystemTime(startedAt + 45_000);
    await act(async () => stopManual());

    expect(pending).toBe(true);
    expect(error).toBe("storage non disponibile");
    expect(history).toEqual([]);

    await act(async () => retryManualSession());
    expect(mocks.saveSession).toHaveBeenCalledTimes(2);
    expect(pending).toBe(false);
    expect(error).toBeNull();
    expect(history).toHaveLength(1);
    await act(async () => renderer.unmount());
    vi.useRealTimers();
  });

  it("conserva e riprova una sessione demo completata automaticamente", async () => {
    vi.useFakeTimers();
    const startedAt = new Date(2026, 8, 23, 12).getTime();
    vi.setSystemTime(startedAt);
    mocks.saveDemo
      .mockRejectedValueOnce(new Error("demo storage non disponibile"))
      .mockImplementationOnce(async (session: BrushSession) => [session]);

    let setDemoMode: (enabled: boolean) => Promise<void> = async () => undefined;
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

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <BrushProvider clientFactory={(events) => new FakeClient(events)}><Probe /></BrushProvider>,
      );
      await Promise.resolve();
    });
    await act(async () => setDemoMode(true));
    await act(async () => { await startManual(); });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
      await Promise.resolve();
    });

    expect(pending).toBe(true);
    expect(error).toBe("demo storage non disponibile");
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

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <BrushProvider clientFactory={factory}><Probe /></BrushProvider>,
      );
      await Promise.resolve();
    });
    const client = holder.client!;
    await act(async () => {
      client.events.onDevice({ id: "kids-brush", name: "Sonicare4Kids", model: "HX6322/04" });
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
    mocks.forgetDevice.mockImplementationOnce(() => new Promise((resolve) => {
      completeForget = () => resolve({
        recentHistory: [],
        lifetimeProgress: createEmptyLifetimeProgress(),
      });
    }));

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

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <BrushProvider clientFactory={factory}><Probe /></BrushProvider>,
      );
      await Promise.resolve();
    });
    const client = holder.client!;
    await act(async () => {
      client.events.onDevice({ id: "brush-a", name: "Sonicare4Kids", model: "HX6322/04" });
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
      client.events.onDevice({ id: "brush-b", name: "Sonicare4Kids", model: "HX6322/04" });
      completeForget();
      await forgetPromise;
    });

    expect(activeDeviceId).toBe("brush-b");
    expect(forgetting).toBe(false);
    expect(mocks.saveLastDevice).toHaveBeenLastCalledWith(expect.objectContaining({ id: "brush-b" }));
    await act(async () => renderer.unmount());
  });
  it("recovers a paused checkpoint after remount without counting closed-app time", async () => {
    vi.useFakeTimers();
    const startedAt = new Date(2026, 9, 16, 8).getTime();
    vi.setSystemTime(startedAt);
    let value!: ReturnType<typeof useBrush>;
    function Probe() { value = useBrush(); return null; }
    const factory = (events: BleClientEvents) => new FakeClient(events);
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<BrushProvider clientFactory={factory}><Probe /></BrushProvider>); });
    await act(async () => { await value.startManual(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(42000); });
    await act(async () => renderer.unmount());
    vi.setSystemTime(startedAt + 600000);
    await act(async () => { renderer = TestRenderer.create(<BrushProvider clientFactory={factory}><Probe /></BrushProvider>); });
    expect(value.manualActive).toBe(false);
    expect(value.recoveredManualSession?.elapsedSeconds).toBe(42);
    await act(async () => { await value.resumeManual(); });
    expect(value.activeElapsed).toBe(42);
    await act(async () => { await vi.advanceTimersByTimeAsync(78000); });
    expect(mocks.saveSession).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ startedAt, durationSeconds: 120, completed: true }));
    expect(value.hasPendingManualSession).toBe(false);
    expect(mocks.journal.has("sparkly-brush.manual-session.v1")).toBe(false);
    await act(async () => renderer.unmount());
    vi.useRealTimers();
  });

  it("recovers a completed but unsaved session after remount and retries the same identity", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 16, 8));
    let value!: ReturnType<typeof useBrush>;
    function Probe() { value = useBrush(); return null; }
    const factory = (events: BleClientEvents) => new FakeClient(events);
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<BrushProvider clientFactory={factory}><Probe /></BrushProvider>); });
    mocks.saveSession.mockRejectedValueOnce(new Error("Disk full"));
    await act(async () => { await value.startManual(); await vi.advanceTimersByTimeAsync(45000); });
    await act(async () => { await value.stopManual(); });
    expect(value.hasPendingManualSession).toBe(true);
    const savedId = mocks.saveSession.mock.calls[0][0].id;
    await act(async () => renderer.unmount());
    await act(async () => { renderer = TestRenderer.create(<BrushProvider clientFactory={factory}><Probe /></BrushProvider>); });
    expect(value.hasPendingManualSession).toBe(true);
    await act(async () => { await value.retryManualSession(); });
    expect(mocks.saveSession.mock.calls[1][0].id).toBe(savedId);
    expect(value.hasPendingManualSession).toBe(false);
    await act(async () => renderer.unmount());
    vi.useRealTimers();
  });

  it("pauses a manual timer when the physical handle starts and blocks mode changes until recovery is resolved", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 16, 8));
    let value!: ReturnType<typeof useBrush>;
    let client!: FakeClient;
    function Probe() { value = useBrush(); return null; }
    const factory = (events: BleClientEvents) => { client = new FakeClient(events); return client; };
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<BrushProvider clientFactory={factory}><Probe /></BrushProvider>); });
    await act(async () => { await value.startManual(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(23000); });
    await act(async () => { client.events.onLiveData({ handleState: 2, isBrushing: true, elapsedSeconds: 1, routineSeconds: 120, mode: "clean", intensity: "media" }); });
    expect(value.manualActive).toBe(false);
    expect(value.recoveredManualSession?.elapsedSeconds).toBe(23);
    await expect(value.setDemoMode(true)).rejects.toThrow("Termina e salva");
    await act(async () => { await vi.advanceTimersByTimeAsync(120000); await value.resumeManual(); });
    expect(value.manualActive).toBe(false);
    expect(value.recoveredManualSession?.elapsedSeconds).toBe(23);
    expect(mocks.saveSession).not.toHaveBeenCalled();
    await act(async () => renderer.unmount());
    vi.useRealTimers();
  });

  it("respects disabled haptics and still connects when native haptic feedback rejects", async () => {
    mocks.os = "android";
    mocks.journal.set("sparkly-brush.preferences.v1", JSON.stringify({ onboardingCompleted: true, hapticsEnabled: false }));
    let brush!: ReturnType<typeof useBrush>;
    let preferences!: ReturnType<typeof usePreferences>;
    let client!: FakeClient;
    function Probe() { brush = useBrush(); preferences = usePreferences(); return null; }
    const factory = (events: BleClientEvents) => { client = new FakeClient(events); return client; };
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<PreferencesProvider><BrushProvider clientFactory={factory}><Probe /></BrushProvider></PreferencesProvider>); });
    await act(async () => { await brush.startManual(); });
    expect(brush.manualActive).toBe(true);
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    await act(async () => { await brush.stopManual(); await preferences.setPreference("hapticsEnabled", true); });
    vi.mocked(Haptics.impactAsync).mockRejectedValueOnce(new Error("Haptics unavailable"));
    await act(async () => { await brush.connect(); });
    expect(Haptics.impactAsync).toHaveBeenCalledOnce();
    expect(client.scanAndConnect).toHaveBeenCalledOnce();
    await act(async () => renderer.unmount());
  });

});

