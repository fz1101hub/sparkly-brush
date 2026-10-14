import React, { act } from "react";
import { createRoot } from "test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AppPreferences } from "@/lib/preferences";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  defaults: {
    onboardingCompleted: false,
    soundsEnabled: true,
    musicEnabled: true,
    hapticsEnabled: true,
    language: "system",
    parentGateEnabled: false,
  } as AppPreferences,
  load: vi.fn(),
  save: vi.fn(async () => undefined),
}));

vi.mock("@/lib/preferences", () => ({
  DEFAULT_APP_PREFERENCES: mocks.defaults,
  loadAppPreferences: mocks.load,
  saveAppPreferences: mocks.save,
}));

import {
  PreferencesProvider,
  usePreferences,
} from "@/contexts/preferences-context";

describe("PreferencesProvider hydration race", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("non sovrascrive una scelta effettuata mentre il caricamento iniziale è pendente", async () => {
    let resolveLoad!: (value: AppPreferences) => void;
    mocks.load.mockReturnValue(
      new Promise<AppPreferences>((resolve) => {
        resolveLoad = resolve;
      }),
    );

    let current: AppPreferences = mocks.defaults;
    let ready = false;
    let chooseEnglish: () => Promise<void> = async () => undefined;
    function Probe() {
      const value = usePreferences();
      current = value.preferences;
      ready = value.ready;
      chooseEnglish = () => value.setPreference("language", "en");
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
    expect(ready).toBe(false);

    await act(async () => chooseEnglish());
    expect(current.language).toBe("en");

    await act(async () => {
      resolveLoad(mocks.defaults);
      await Promise.resolve();
    });

    expect(ready).toBe(true);
    expect(current.language).toBe("en");
    expect(mocks.save).toHaveBeenCalledWith({
      ...mocks.defaults,
      language: "en",
    });
    await act(async () => renderer.unmount());
  });
});
