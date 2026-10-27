import React, { act } from "react";
import { createRoot } from "test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_APP_PREFERENCES,
  type AppPreferences,
} from "@/lib/preferences";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  current: {
    preferences: {
      onboardingCompleted: false,
      soundsEnabled: true,
      musicEnabled: true,
      hapticsEnabled: true,
      language: "system" as AppPreferences["language"],
      parentGateEnabled: false,
    },
    ready: false,
    setPreference: vi.fn(async () => undefined),
  },
}));

vi.mock("@/contexts/preferences-context", () => ({
  usePreferences: () => mocks.current,
}));

import { useI18n } from "@/contexts/locale-context";
import { LocaleProvider } from "@/contexts/locale-provider";

function Probe({ observed }: { observed: string[] }) {
  const { locale, t } = useI18n();
  observed.push(`${locale}:${t("family.settings.title")}`);
  return null;
}

describe("LocaleProvider hydration", () => {
  beforeEach(() => {
    mocks.current = {
      preferences: { ...DEFAULT_APP_PREFERENCES, language: "system" },
      ready: false,
      setPreference: vi.fn(async () => undefined),
    };
  });

  it("non renderizza la lingua di sistema prima di caricare l'override persistito", async () => {
    const observed: string[] = [];
    const renderer = createRoot();

    await act(async () => {
      renderer.render(
        <LocaleProvider deviceLocale="it">
          <Probe observed={observed} />
        </LocaleProvider>,
      );
    });
    expect(observed).toEqual([]);

    mocks.current = {
      ...mocks.current,
      preferences: { ...DEFAULT_APP_PREFERENCES, language: "en" },
      ready: true,
    };
    await act(async () => {
      renderer.render(
        <LocaleProvider deviceLocale="it">
          <Probe observed={observed} />
        </LocaleProvider>,
      );
    });

    expect(observed).toEqual(["en:Settings"]);
    await act(async () => renderer.unmount());
  });
});
