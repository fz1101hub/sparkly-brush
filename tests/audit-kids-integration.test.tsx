import React, { act } from "react";
import { createRoot } from "test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const memory = vi.hoisted(() => new Map<string, string>());

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (key: string) => memory.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: async (key: string) => {
      memory.delete(key);
    },
    multiRemove: async (keys: string[]) => {
      keys.forEach((key) => memory.delete(key));
    },
    multiGet: async (keys: string[]) =>
      keys.map((key) => [key, memory.get(key) ?? null]),
    getAllKeys: async () => [...memory.keys()],
  },
}));
vi.mock("react-native", () => ({
  Platform: { OS: "web", Version: "18" },
  PermissionsAndroid: {
    PERMISSIONS: {},
    RESULTS: { GRANTED: "granted" },
    request: vi.fn(),
    requestMultiple: vi.fn(),
  },
}));
vi.mock("react-native-ble-plx", () => ({ BleManager: class {} }));
vi.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Light: "light" },
  NotificationFeedbackType: { Success: "success" },
  impactAsync: vi.fn(async () => undefined),
  notificationAsync: vi.fn(async () => undefined),
}));

import { BrushProvider, useBrush } from "@/contexts/brush-context";
import { saveDeviceSessionsWithLifetime } from "@/lib/brush-storage";
import type { BleClientEvents } from "@/lib/brush-types";
import { NativeSonicareClient } from "@/lib/sonicare-client.native";
import { SONICARE } from "@/lib/sonicare-uuids";
import {
  AuditHx6340KidsDevice,
  AuditKidsManager,
} from "@/tests/helpers/audit-kids-hx6340";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type BrushValue = ReturnType<typeof useBrush>;
const probe: { value: BrushValue | null } = { value: null };

function Probe() {
  probe.value = useBrush();
  return null;
}

function current(): BrushValue {
  if (!probe.value) throw new Error("BrushProvider probe was not rendered");
  return probe.value;
}

async function settle(milliseconds = 25): Promise<void> {
  await act(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
  });
}

async function mountWithCapturedKidsGatt(
  device: AuditHx6340KidsDevice,
  syncDelayMs = 0,
): Promise<() => Promise<void>> {
  probe.value = null;
  const root = createRoot();
  const factory = (events: BleClientEvents) =>
    new NativeSonicareClient(events, new AuditKidsManager(device) as never);
  await act(async () => {
    root.render(
      <BrushProvider clientFactory={factory} syncDelayMs={syncDelayMs}>
        <Probe />
      </BrushProvider>,
    );
  });
  await settle();
  return async () => {
    await act(async () => root.unmount());
    probe.value = null;
  };
}

async function connect(): Promise<void> {
  await act(async () => {
    await current().connect();
  });
  expect(current().status).toBe("connected");
}

/** Native record reads include the client’s documented 180 ms select-to-read delay. */
async function waitForStopSync(): Promise<void> {
  await settle(230);
}

function capturedRecord(stamp: number, duration = 120) {
  return { stamp, duration, target: 120 };
}

beforeEach(() => {
  memory.clear();
  probe.value = null;
});

afterEach(() => {
  vi.restoreAllMocks();
  probe.value = null;
});

describe("audit: captured HX6340 Kids GATT through NativeSonicareClient and BrushProvider", () => {
  it("first use and reconnection without 40d2 automatically import latest 288 then offline 289", async () => {
    const device = new AuditHx6340KidsDevice();
    // This fake intentionally has no 40d2 Session Count characteristic. It models
    // the published HX6340 fw 4.2.2 capture, not a physical-device test.
    device.file(288, capturedRecord(device.handleClock - 120));
    const unmount = await mountWithCapturedKidsGatt(device);

    await connect();

    expect(device.sessionCountReads).toBeGreaterThan(0);
    expect(
      current().realHistory.map((session) => session.deviceSessionId),
    ).toEqual([288]);
    expect(Object.values(current().lifetimeProgress.deviceCursors)).toEqual([
      expect.objectContaining({ lastSessionId: 288, acceptNextSession: false }),
    ]);

    await act(async () => device.emitDisconnect());
    await settle();
    device.handleClock += 180;
    device.file(289, capturedRecord(device.handleClock - 120));
    await connect();

    expect(
      current().realHistory.map((session) => session.deviceSessionId),
    ).toEqual([289, 288]);
    expect(Object.values(current().lifetimeProgress.deviceCursors)).toEqual([
      expect.objectContaining({ lastSessionId: 289, acceptNextSession: false }),
    ]);
    await unmount();
  });

  it("persists the 120-second live fallback when the captured handle resets 120 → 0 → stop and BLE stops", async () => {
    const device = new AuditHx6340KidsDevice();
    const unmount = await mountWithCapturedKidsGatt(device, 1_000);
    await connect();

    await act(async () => {
      device.brushLive(120, { wipeTimerBeforeStop: true });
      // A remote GATT stop before delayed record sync must force the durable
      // fallback; no record has been filed by the handle yet.
      device.emitDisconnect(new Error("link lost"));
    });
    await settle();

    expect(current().realHistory).toEqual([
      expect.objectContaining({
        id: expect.stringMatching(/^ble-live:/),
        durationSeconds: 120,
        completed: true,
        source: "device",
      }),
    ]);
    expect(current().lifetimeProgress.completedSessions).toBe(1);
    await unmount();
  });

  it("keeps live B when the stop sync can return only older A", async () => {
    const device = new AuditHx6340KidsDevice();
    await saveDeviceSessionsWithLifetime(device.id, [
      {
        sessionId: 41,
        startedAt: Date.now() - 7_200_000,
        timeConfidence: "reconstructed",
        durationSeconds: 120,
        targetSeconds: 120,
        mode: "clean",
        intensity: "media",
      },
    ]);
    device.file(41, capturedRecord(device.handleClock - 7_200));
    const unmount = await mountWithCapturedKidsGatt(device);
    await connect();

    // A is live but not filed yet: it is retained as a fallback.
    await act(async () => {
      device.brushLive(120, { wipeTimerBeforeStop: true });
    });
    await waitForStopSync();
    const fallbackA = current().realHistory.find((session) =>
      session.id.startsWith("ble-live:"),
    );
    expect(fallbackA).toBeDefined();

    // At B's stop the real client sees only A (42); B has not been filed yet.
    device.file(42, capturedRecord(device.handleClock - 120));
    await act(async () => {
      device.brushLive(118, { wipeTimerBeforeStop: true });
    });
    await waitForStopSync();

    expect(current().realHistory).toHaveLength(3);
    expect(current().realHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ deviceSessionId: 41 }),
        expect.objectContaining({ deviceSessionId: 42 }),
        expect.objectContaining({
          id: expect.stringMatching(/^ble-live:/),
          durationSeconds: 118,
        }),
      ]),
    );
    expect(current().lifetimeProgress.completedSessions).toBe(3);
    await unmount();
  });

  it("does not double-count A and B when both delayed records arrive after their live fallbacks", async () => {
    const device = new AuditHx6340KidsDevice();
    const wallStart = new Date(2026, 8, 30, 20, 0, 0).getTime();
    let wallNow = wallStart;
    vi.spyOn(Date, "now").mockImplementation(() => wallNow);
    device.handleClock = 50_000;

    await saveDeviceSessionsWithLifetime(device.id, [
      {
        sessionId: 41,
        startedAt: wallStart - 7_200_000,
        timeConfidence: "reconstructed",
        durationSeconds: 120,
        targetSeconds: 120,
        mode: "clean",
        intensity: "media",
      },
    ]);
    device.file(41, capturedRecord(device.handleClock - 7_200));
    const unmount = await mountWithCapturedKidsGatt(device);
    await connect();

    await act(async () => {
      device.brushLive(120, { wipeTimerBeforeStop: true });
    });
    await waitForStopSync();

    // The next live brushing is three minutes later. The physical handle has
    // still not filed either session, so both must remain durable fallbacks.
    wallNow += 180_000;
    device.handleClock += 180;
    await act(async () => {
      device.brushLive(118, { wipeTimerBeforeStop: true });
    });
    await waitForStopSync();
    expect(
      current().realHistory.filter((session) =>
        session.id.startsWith("ble-live:"),
      ),
    ).toHaveLength(2);

    // At a later sync the handle exposes both actual records. Their handle-clock
    // timestamps reconstruct to the two previous live fallback start times.
    wallNow += 180_000;
    device.handleClock += 180;
    device.file(42, capturedRecord(49_880));
    device.file(43, capturedRecord(50_062, 118));
    await act(async () => {
      await current().syncLatest();
    });

    expect(current().realHistory).toHaveLength(3);
    expect(
      current().realHistory.filter((session) =>
        session.id.startsWith("ble-live:"),
      ),
    ).toHaveLength(0);
    expect(
      current()
        .realHistory.map((session) => session.deviceSessionId)
        .sort(),
    ).toEqual([41, 42, 43]);
    expect(current().lifetimeProgress.completedSessions).toBe(3);
    await unmount();
  });

  it("cancels an active manual timer immediately when captured BLE brushing starts", async () => {
    const device = new AuditHx6340KidsDevice();
    const unmount = await mountWithCapturedKidsGatt(device);
    await connect();

    await act(async () => current().startManual());
    expect(current().manualActive).toBe(true);

    await act(async () => {
      device.brushLive(120, { wipeTimerBeforeStop: true });
    });
    expect(current().manualActive).toBe(false);
    await waitForStopSync();
    await act(async () => {
      await current().stopManual();
    });

    expect(current().realHistory).toHaveLength(1);
    expect(current().realHistory[0]).toEqual(
      expect.objectContaining({
        id: expect.stringMatching(/^ble-live:/),
        source: "device",
        durationSeconds: 120,
      }),
    );
    expect(current().lifetimeProgress.completedSessions).toBe(1);
    await unmount();
  });
});
