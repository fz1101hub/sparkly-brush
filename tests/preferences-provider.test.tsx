import React, { act } from "react";
import { createRoot } from "test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
const data = vi.hoisted(() => new Map<string, string>());
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => data.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      data.set(key, value);
    }),
  },
}));
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  PreferencesProvider,
  usePreferences,
} from "@/contexts/preferences-context";
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
beforeEach(() => {
  data.clear();
  vi.clearAllMocks();
});

describe("durable preferences", () => {
  it("keeps two rapid changes instead of overwriting one with stale state", async () => {
    let value!: ReturnType<typeof usePreferences>;
    function Probe() {
      value = usePreferences();
      return null;
    }
    const renderer = createRoot();
    await act(async () => {
      renderer.render(
        <PreferencesProvider>
          <Probe />
        </PreferencesProvider>,
      );
    });
    await act(async () => {
      await Promise.all([
        value.setPreference("soundsEnabled", false),
        value.setPreference("musicEnabled", true),
      ]);
    });
    expect(value.preferences.soundsEnabled).toBe(false);
    expect(value.preferences.musicEnabled).toBe(true);
    expect(JSON.parse(data.get("sparkly-brush.preferences.v1")!)).toMatchObject(
      { soundsEnabled: false, musicEnabled: true },
    );
    await act(async () => renderer.unmount());
  });
  it("keeps the visible preference when its write fails and permits retry", async () => {
    let value!: ReturnType<typeof usePreferences>;
    function Probe() {
      value = usePreferences();
      return null;
    }
    const renderer = createRoot();
    await act(async () => {
      renderer.render(
        <PreferencesProvider>
          <Probe />
        </PreferencesProvider>,
      );
    });
    vi.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error("Full"));
    await act(async () => {
      await expect(value.setPreference("soundsEnabled", false)).rejects.toThrow(
        "Full",
      );
    });
    expect(value.preferences.soundsEnabled).toBe(true);
    await act(async () => {
      await value.setPreference("soundsEnabled", false);
    });
    expect(value.preferences.soundsEnabled).toBe(false);
    await act(async () => renderer.unmount());
  });
});
