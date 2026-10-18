import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { expect, it, vi } from "vitest";

const data = vi.hoisted(() => new Map<string, string>());
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => data.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      data.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      data.delete(key);
    }),
    multiSet: vi.fn(async (entries: [string, string][]) => {
      entries.forEach(([key, value]) => data.set(key, value));
    }),
    multiRemove: vi.fn(async (keys: string[]) => {
      keys.forEach((key) => data.delete(key));
    }),
  },
}));
vi.mock("react-native", () => ({
  Platform: { OS: "web" },
  ActivityIndicator: "ActivityIndicator",
  Pressable: "Pressable",
  Text: "Text",
  View: "View",
}));
vi.mock("expo-haptics", () => ({}));

import { FamilyProvider, useFamily } from "@/contexts/family-context";
import { BrushProvider, useBrush } from "@/contexts/brush-context";
import { BrushlingProvider, useBrushling } from "@/contexts/brushling-context";
import {
  PreferencesProvider,
  usePreferences,
} from "@/contexts/preferences-context";
import { getBrushStorage } from "@/lib/brush-storage";
import { setActiveProfileId } from "@/lib/profile-scope";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

it("hydrates an empty child after a rewarded primary profile and restores the primary providers on return", async () => {
  setActiveProfileId("primary");
  await getBrushStorage().saveSessionWithLifetime({
    id: "primary-session",
    startedAt: Date.now(),
    durationSeconds: 120,
    targetSeconds: 120,
    completed: true,
    source: "manual",
    rewardPolicy: "completed-only",
  });
  let family!: ReturnType<typeof useFamily>;
  let brush!: ReturnType<typeof useBrush>;
  let creature!: ReturnType<typeof useBrushling>;
  let preferences!: ReturnType<typeof usePreferences>;
  function Probe() {
    brush = useBrush();
    creature = useBrushling();
    preferences = usePreferences();
    return null;
  }
  function Scope() {
    family = useFamily();
    return (
      <PreferencesProvider key={family.active.id}>
        <BrushProvider>
          <BrushlingProvider>
            <Probe />
          </BrushlingProvider>
        </BrushProvider>
      </PreferencesProvider>
    );
  }
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <FamilyProvider>
        <Scope />
      </FamilyProvider>,
    );
  });
  expect(brush.historyReady).toBe(true);
  expect(brush.lifetimeProgress.completedSessions).toBe(1);
  await act(async () => {
    await creature.chooseStarter("bloopi");
    await preferences.setPreference("soundsEnabled", false);
  });
  await act(async () => {
    await family.addProfile("Emma");
  });
  expect(family.active.name).toBe("Emma");
  expect(brush.historyReady).toBe(true);
  expect(creature.profileReady).toBe(true);
  expect(preferences.ready).toBe(true);
  expect(creature.hasChosenStarter).toBe(false);
  expect(creature.selectedId).toBe("bloopi");
  expect(brush.lifetimeProgress.completedSessions).toBe(0);
  expect(preferences.preferences.soundsEnabled).toBe(true);
  await act(async () => {
    await creature.chooseStarter("bloopi");
  });
  await act(async () => {
    await family.switchProfile("primary");
  });
  expect(creature.hasChosenStarter).toBe(true);
  expect(brush.lifetimeProgress.completedSessions).toBe(1);
  expect(preferences.preferences.soundsEnabled).toBe(false);
  await act(async () => renderer.unmount());
  setActiveProfileId("primary");
});
