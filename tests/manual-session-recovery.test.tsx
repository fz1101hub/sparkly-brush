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
  Platform: { OS: "web" },
  AppState: { addEventListener: () => ({ remove: () => undefined }) },
}));
vi.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Light: "light" },
  NotificationFeedbackType: { Success: "success" },
  impactAsync: vi.fn(async () => undefined),
  notificationAsync: vi.fn(async () => undefined),
}));

import { BrushProvider, useBrush } from "@/contexts/brush-context";
import { FamilyContext, type FamilyContextValue } from "@/contexts/family-context-value";
import { getBrushStorage } from "@/lib/brush-storage";
import type { BleClientEvents, ScanTarget, SonicareClient } from "@/lib/brush-types";
import { MANUAL_SESSION_KEY } from "@/lib/manual-session-storage";
import { setActiveProfileId } from "@/lib/profile-scope";
import { TOOTHBRUSH_OWNERS_KEY } from "@/lib/toothbrush-profile";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

class FakeClient implements SonicareClient {
  events: BleClientEvents;
  initialize = vi.fn(async () => undefined);
  scanAndConnect = vi.fn(async (_target?: ScanTarget) => undefined);
  disconnect = vi.fn(async () => undefined);
  syncStoredSessionsSince = vi.fn(async () => []);
  destroy = vi.fn();

  constructor(events: BleClientEvents) {
    this.events = events;
  }
}

type BrushValue = ReturnType<typeof useBrush>;

async function mount(family?: Partial<FamilyContextValue>) {
  const probe: { value: BrushValue | null; client: FakeClient | null } = { value: null, client: null };
  function Probe() {
    probe.value = useBrush();
    return null;
  }
  const renderer = createRoot();
  const tree = (
    <BrushProvider
      clientFactory={(events) => {
        probe.client = new FakeClient(events);
        return probe.client;
      }}
    >
      <Probe />
    </BrushProvider>
  );
  await act(async () => {
    renderer.render(
      family
        ? <FamilyContext.Provider value={family as FamilyContextValue}>{tree}</FamilyContext.Provider>
        : tree,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return {
    get value(): BrushValue {
      if (!probe.value) throw new Error("not rendered");
      return probe.value;
    },
    get client(): FakeClient {
      if (!probe.client) throw new Error("no client");
      return probe.client;
    },
    unmount: () => act(async () => renderer.unmount()),
  };
}

function journal() {
  const raw = memory.get(MANUAL_SESSION_KEY);
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
}

let now = new Date(2026, 9, 20, 8).getTime();

beforeEach(() => {
  memory.clear();
  setActiveProfileId("primary");
  now = new Date(2026, 9, 20, 8).getTime();
  vi.spyOn(Date, "now").mockImplementation(() => now);
});

afterEach(() => {
  vi.restoreAllMocks();
  setActiveProfileId("primary");
});

async function advance(seconds: number) {
  now += seconds * 1_000;
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1_050));
  });
}

describe("guided session journal (PR #10 on this branch)", () => {
  it("writes the checkpoint before the timer runs and offers the paused seconds after a restart", async () => {
    const first = await mount();
    await act(async () => first.value.startManual());
    expect(first.value.manualActive).toBe(true);
    expect(journal()).toMatchObject({ version: 1, elapsedSeconds: 0, demo: false });

    await advance(40);
    await act(async () => first.value.pauseManual());
    expect(first.value.manualActive).toBe(false);
    expect(first.value.recoveredManualSession?.elapsedSeconds).toBe(40);
    await first.unmount();

    // Hours later: the time with the app closed is not credited.
    now += 3 * 3_600_000;
    const second = await mount();
    expect(second.value.manualRecoveryReady).toBe(true);
    expect(second.value.recoveredManualSession?.elapsedSeconds).toBe(40);
    await act(async () => second.value.startManual());
    expect(second.value.manualActive).toBe(false);
    expect(second.value.manualSaveError).toContain("Riprendi o salva");

    const recoveredId = second.value.recoveredManualSession?.id;
    expect(recoveredId).toMatch(/^manual-/);
    await act(async () => second.value.resumeManual());
    expect(second.value.manualActive).toBe(true);
    expect(second.value.activeElapsed).toBe(40);
    await advance(30);
    await act(async () => second.value.stopManual());

    const history = (await getBrushStorage("primary").loadHistoryBundle()).recentHistory;
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ durationSeconds: 70, completed: false, source: "manual" });
    expect(history[0].id).toBe(recoveredId);
    expect(journal()).toBeNull();
    await second.unmount();
  });

  it("discards a paused session and then allows a new one", async () => {
    const brush = await mount();
    await act(async () => brush.value.startManual());
    await advance(12);
    await act(async () => brush.value.pauseManual());
    await act(async () => brush.value.discardManualRecovery());
    expect(brush.value.recoveredManualSession).toBeNull();
    expect(journal()).toBeNull();
    await act(async () => brush.value.startManual());
    expect(brush.value.manualActive).toBe(true);
    await brush.unmount();
  });

  it("waits for the parent before overwriting an unreadable journal", async () => {
    memory.set(MANUAL_SESSION_KEY, "{damaged");
    const brush = await mount();
    expect(brush.value.historyReady).toBe(true);
    expect(brush.value.manualRecoveryReady).toBe(false);
    expect(brush.value.manualSaveError).toContain("non è leggibile");
    await act(async () => brush.value.startManual());
    expect(brush.value.manualActive).toBe(false);
    expect(memory.get(MANUAL_SESSION_KEY)).toBe("{damaged");
    await act(async () => brush.value.discardManualRecovery());
    await act(async () => brush.value.startManual());
    expect(brush.value.manualActive).toBe(true);
    await brush.unmount();
  });

  it("moves the earlier pending-session record into the journal", async () => {
    const startedAt = new Date(2026, 9, 19, 20).getTime();
    memory.set("sparkly-brush.manual.pending.v1", JSON.stringify({
      id: `manual-${startedAt}`,
      startedAt,
      rewardPolicy: "completed-only",
      durationSeconds: 50,
      targetSeconds: 120,
      completed: false,
      source: "manual",
    }));
    const brush = await mount();
    expect(brush.value.hasPendingManualSession).toBe(true);
    expect(memory.has("sparkly-brush.manual.pending.v1")).toBe(false);
    await act(async () => brush.value.retryManualSession());
    expect((await getBrushStorage("primary").loadHistory()).map((s) => s.id)).toEqual([`manual-${startedAt}`]);
    expect(journal()).toBeNull();
    await brush.unmount();
  });

  it("keeps demo and real seconds apart while a session is open", async () => {
    const brush = await mount();
    await act(async () => brush.value.startManual());
    await expect(brush.value.setDemoMode(true)).rejects.toMatchObject({ key: "brush.error.finishSessionFirst" });
    expect(brush.value.demoMode).toBe(false);
    await brush.unmount();
  });
});

describe("profile switch guard", () => {
  it("refuses to switch child while a session runs and disconnects otherwise", async () => {
    let guard: (() => Promise<void>) | null = null;
    const brush = await mount({
      registerGuard: (next) => {
        guard = next;
        return () => {
          guard = null;
        };
      },
    });
    expect(guard).not.toBeNull();
    await act(async () => brush.value.startManual());
    await expect(guard!()).rejects.toMatchObject({ key: "family.switch.error.sessionActive" });
    await advance(10);
    await act(async () => brush.value.stopManual());
    await act(async () => guard!());
    expect(brush.client.disconnect).toHaveBeenCalled();
    await brush.unmount();
    expect(guard).toBeNull();
  });
});

describe("handles that belong to a sibling", () => {
  it("never scans for a sibling's handle and claims the one it connects", async () => {
    memory.set(TOOTHBRUSH_OWNERS_KEY, JSON.stringify({ "device:sibling-handle": "child-b" }));
    const brush = await mount();
    brush.client.scanAndConnect.mockImplementation(async (target?: ScanTarget) => {
      await target?.claim?.("own-handle");
      brush.client.events.onDevice({ id: "own-handle", name: "Sonicare", model: "HX6322" });
    });
    await act(async () => brush.value.connect());
    const target = brush.client.scanAndConnect.mock.calls[0][0];
    expect(target).toMatchObject({ mode: "any", excludedDeviceIds: ["sibling-handle"] });
    expect(JSON.parse(memory.get(TOOTHBRUSH_OWNERS_KEY)!)).toEqual({
      "device:sibling-handle": "child-b",
      "device:own-handle": "primary",
    });

    // Changing handle keeps the old one with this child: its records are this child's sessions.
    brush.client.scanAndConnect.mockImplementation(async (next?: ScanTarget) => {
      await next?.claim?.("new-handle");
      brush.client.events.onDevice({ id: "new-handle", name: "Sonicare", model: "HX6322" });
    });
    await act(async () => brush.value.connect({ replaceHandle: true }));
    expect(brush.client.scanAndConnect.mock.calls[1][0]).toMatchObject({ mode: "replace", currentDeviceId: "own-handle" });
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(JSON.parse(memory.get(TOOTHBRUSH_OWNERS_KEY)!)).toEqual({
      "device:sibling-handle": "child-b",
      "device:own-handle": "primary",
      "device:new-handle": "primary",
    });
    await brush.unmount();
  });

  it("does not connect when it cannot tell which child owns each handle", async () => {
    memory.set(TOOTHBRUSH_OWNERS_KEY, "{damaged");
    const brush = await mount();
    await act(async () => brush.value.connect());
    expect(brush.client.scanAndConnect).not.toHaveBeenCalled();
    expect(brush.value.logs[0]?.translationKey).toBe("device.error.ownersUnreadable");
    await brush.unmount();
  });
});
