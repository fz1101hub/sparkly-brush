import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => new Map<string, string>());

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
  },
}));

import {
  DEFAULT_APP_PREFERENCES,
  FAMILY_SETTINGS_KEY,
  getPreferencesStorage,
  loadAppPreferences,
  saveAppPreferences,
} from "@/lib/preferences";

const PREFERENCES_KEY = "sparkly-brush.preferences.v1";

describe("app preferences locale migration", () => {
  beforeEach(() => storage.clear());

  it("segue il sistema per installazioni senza preferenze", async () => {
    await expect(loadAppPreferences()).resolves.toEqual(
      DEFAULT_APP_PREFERENCES,
    );
    expect(DEFAULT_APP_PREFERENCES.language).toBe("system");
  });

  it("migra le preferenze legacy senza lingua", async () => {
    storage.set(
      PREFERENCES_KEY,
      JSON.stringify({
        onboardingCompleted: true,
        soundsEnabled: false,
        musicEnabled: true,
        hapticsEnabled: false,
      }),
    );

    await expect(loadAppPreferences()).resolves.toMatchObject({
      onboardingCompleted: true,
      soundsEnabled: false,
      musicEnabled: true,
      hapticsEnabled: false,
      language: "system",
    });
  });

  it("preserva una lingua supportata e scarta valori sconosciuti", async () => {
    await saveAppPreferences({ ...DEFAULT_APP_PREFERENCES, language: "de" });
    await expect(loadAppPreferences()).resolves.toMatchObject({
      language: "de",
    });

    storage.set(
      PREFERENCES_KEY,
      JSON.stringify({ ...DEFAULT_APP_PREFERENCES, language: "ja" }),
    );
    storage.set(FAMILY_SETTINGS_KEY, JSON.stringify({ language: "ja" }));
    await expect(loadAppPreferences()).resolves.toMatchObject({
      language: "system",
    });
  });

  it("condivide lingua e blocco genitori tra i profili e tiene il resto per bambino", async () => {
    const child = getPreferencesStorage("child-a");
    await saveAppPreferences({ ...DEFAULT_APP_PREFERENCES, language: "fr", parentGateEnabled: true, soundsEnabled: false });
    await expect(child.loadAppPreferences()).resolves.toMatchObject({
      language: "fr",
      parentGateEnabled: true,
      soundsEnabled: true,
    });

    await child.saveAppPreferences({ ...(await child.loadAppPreferences()), language: "es", parentGateEnabled: false });
    await expect(loadAppPreferences()).resolves.toMatchObject({
      language: "es",
      parentGateEnabled: false,
      soundsEnabled: false,
    });
  });

  it("per i profili creati prima delle impostazioni di famiglia usa lingua e blocco del primo profilo", async () => {
    storage.set(PREFERENCES_KEY, JSON.stringify({ ...DEFAULT_APP_PREFERENCES, language: "de", parentGateEnabled: true }));
    await expect(getPreferencesStorage("child-b").loadAppPreferences()).resolves.toMatchObject({
      language: "de",
      parentGateEnabled: true,
    });
  });

  it("torna ai default se il JSON è corrotto", async () => {
    storage.set(PREFERENCES_KEY, "{");
    await expect(loadAppPreferences()).resolves.toEqual(
      DEFAULT_APP_PREFERENCES,
    );
  });
});
