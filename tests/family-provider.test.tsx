import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const data = vi.hoisted(() => new Map<string, string>());
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => data.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      data.set(key, value);
    }),
  },
}));
vi.mock("react-native", () => ({
  ActivityIndicator: "ActivityIndicator",
  Pressable: "Pressable",
  Text: "Text",
  View: "View",
}));
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FamilyProvider, useFamily } from "@/contexts/family-context";
import { FAMILY_KEY } from "@/lib/family-profiles";
import { getActiveProfileId, setActiveProfileId } from "@/lib/profile-scope";
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
beforeEach(() => {
  data.clear();
  vi.clearAllMocks();
  setActiveProfileId("primary");
});
afterEach(() => {
  setActiveProfileId("primary");
});

async function mount() {
  let value!: ReturnType<typeof useFamily>;
  function Probe() {
    value = useFamily();
    return null;
  }
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <FamilyProvider>
        <Probe />
      </FamilyProvider>,
    );
  });
  return {
    get value() {
      return value;
    },
    renderer,
  };
}

describe("family transitions", () => {
  it("creates and selects an independent child, then returns to the original profile", async () => {
    const probe = await mount();
    data.set("sparkly-brush.progress.v2", "original progress");
    await act(async () => {
      await probe.value.addProfile("  Emma  ");
    });
    expect(probe.value.active.name).toBe("Emma");
    expect(getActiveProfileId()).toBe(probe.value.active.id);
    expect(probe.value.homeRequested).toBe(true);
    expect(data.get("sparkly-brush.progress.v2")).toBe("original progress");
    expect(JSON.parse(data.get(FAMILY_KEY)!)).toMatchObject({
      activeId: probe.value.active.id,
    });
    await act(async () => {
      await probe.value.switchProfile("primary");
    });
    expect(getActiveProfileId()).toBe("primary");
    expect(probe.value.active.name).toBe("Il mio sorriso");
    await act(async () => probe.renderer.unmount());
  });
  it("does not switch data scope if saving the registry fails", async () => {
    const probe = await mount();
    await act(async () => {
      await probe.value.addProfile("Emma");
    });
    const previousId = probe.value.active.id;
    vi.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error("Full"));
    await act(async () => {
      await expect(probe.value.switchProfile("primary")).rejects.toThrow(
        "Full",
      );
    });
    expect(getActiveProfileId()).toBe(previousId);
    expect(probe.value.active.id).toBe(previousId);
    expect(probe.value.busy).toBe(false);
    await act(async () => probe.renderer.unmount());
  });
  it("honors a session guard before touching the registry", async () => {
    const probe = await mount();
    const guard = vi.fn(async () => {
      throw new Error("Session in progress");
    });
    const remove = probe.value.registerGuard(guard);
    const before = data.get(FAMILY_KEY);
    await act(async () => {
      await expect(probe.value.addProfile("Emma")).rejects.toThrow(
        "Session in progress",
      );
    });
    expect(data.get(FAMILY_KEY)).toBe(before);
    expect(probe.value.profiles).toHaveLength(1);
    remove();
    await act(async () => {
      await probe.value.renameProfile("primary", "Alex");
    });
    expect(probe.value.active.name).toBe("Alex");
    await act(async () => probe.renderer.unmount());
  });
});
