import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BrushSession } from "@/lib/brush-types";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getBrushStorage } from "@/lib/brush-storage";
import { getBrushlingStorage } from "@/lib/brushling-storage";
import {
  getPreferencesStorage,
  DEFAULT_APP_PREFERENCES,
} from "@/lib/preferences";
import { getThemeStorage } from "@/lib/theme-storage";
import {
  FAMILY_KEY,
  loadFamilyProfiles,
  validateProfileName,
} from "@/lib/family-profiles";
import { setActiveProfileId } from "@/lib/profile-scope";
import { claimToothbrush } from "@/lib/toothbrush-profile";
import {
  getManualSessionStorage,
  parseManualCheckpoint,
} from "@/lib/manual-session";

function session(id: string): BrushSession {
  return {
    id,
    startedAt: new Date(2026, 9, 16, 8).getTime(),
    durationSeconds: 120,
    targetSeconds: 120,
    completed: true,
    source: "manual",
    rewardPolicy: "completed-only",
  };
}
beforeEach(() => {
  data.clear();
  vi.clearAllMocks();
  setActiveProfileId("primary");
});
afterEach(() => {
  setActiveProfileId("primary");
});

describe("independent family archives", () => {
  it("preserves legacy keys in the primary profile while new children start empty", async () => {
    data.set("sparkly-brush.brushling.selected.v1", "spriggo");
    data.set("sparkly-brush.brushling.starter-chosen.v1", "true");
    const family = await loadFamilyProfiles();
    expect(family.activeId).toBe("primary");
    expect(
      (await getBrushlingStorage("primary").loadBrushlingProfile()).selectedId,
    ).toBe("spriggo");
    expect(
      (await getBrushlingStorage("child-new").loadBrushlingProfile())
        .hasChosenStarter,
    ).toBe(false);
    await getBrushStorage("primary").saveSessionWithLifetime(
      session("old-progress"),
    );
    expect(
      (await getBrushStorage("child-new").loadHistoryBundle()).lifetimeProgress
        .completedSessions,
    ).toBe(0);
    expect(
      (await getBrushStorage("primary").loadHistoryBundle()).lifetimeProgress
        .completedSessions,
    ).toBe(1);
    expect(data.get("sparkly-brush.brushling.selected.v1")).toBe("spriggo");
  });

  it("keeps theme, sound preferences, creature and rewards separate", async () => {
    await getPreferencesStorage("primary").saveAppPreferences({
      ...DEFAULT_APP_PREFERENCES,
      soundsEnabled: false,
    });
    await getThemeStorage("primary").saveThemeId("garden");
    await getThemeStorage("child-b").saveThemeId("cosmos");
    await getBrushlingStorage("child-b").saveStarterSelection("spriggo");
    await Promise.all([
      getBrushStorage("primary").saveSessionWithLifetime(session("a")),
      getBrushStorage("child-b").saveSessionWithLifetime(session("b")),
    ]);
    expect(
      (await getPreferencesStorage("child-b").loadAppPreferences())
        .soundsEnabled,
    ).toBe(true);
    expect(await getThemeStorage("primary").loadThemeId()).toBe("garden");
    expect(await getThemeStorage("child-b").loadThemeId()).toBe("cosmos");
    expect(
      (await getBrushlingStorage("primary").loadBrushlingProfile())
        .hasChosenStarter,
    ).toBe(false);
    expect(
      (await getBrushStorage("primary").loadHistory()).map((s) => s.id),
    ).toEqual(["a"]);
    expect(
      (await getBrushStorage("child-b").loadHistory()).map((s) => s.id),
    ).toEqual(["b"]);
  });

  it("finishes a delayed write in its original profile after the active profile changes", async () => {
    let release!: () => void;
    let entered!: () => void;
    const waiting = new Promise<void>((resolve) => {
      entered = resolve;
    });
    vi.mocked(AsyncStorage.setItem).mockImplementationOnce(
      async (key, value) => {
        entered();
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        data.set(key, value);
      },
    );
    const saving = getThemeStorage("primary").saveThemeId("arcade");
    await waiting;
    setActiveProfileId("child-race");
    await getThemeStorage().saveThemeId("underwater");
    release();
    await saving;
    expect(await getThemeStorage("primary").loadThemeId()).toBe("arcade");
    expect(await getThemeStorage("child-race").loadThemeId()).toBe(
      "underwater",
    );
  });

  it("protects an unreadable family registry rather than replacing it", async () => {
    data.set(FAMILY_KEY, "{damaged");
    await expect(loadFamilyProfiles()).rejects.toThrow();
    expect(data.get(FAMILY_KEY)).toBe("{damaged");
    expect(() => validateProfileName("  ", [])).toThrow();
    expect(() =>
      validateProfileName("emma", [{ id: "x", name: "Emma", createdAt: 1 }]),
    ).toThrow(/già/);
  });

  it("prevents a second child from importing the same handle's stored sessions", async () => {
    await claimToothbrush("handle-1", "primary");
    await expect(claimToothbrush("handle-1", "child-b")).rejects.toThrow(
      /altro profilo/,
    );
    await expect(
      claimToothbrush("handle-2", "child-b"),
    ).resolves.toBeUndefined();
    await expect(
      claimToothbrush("handle-1", "primary"),
    ).resolves.toBeUndefined();
  });

  it("keeps a previously paired legacy handle attached to the primary child", async () => {
    data.set(
      "sparkly-brush.device.v1",
      JSON.stringify({ id: "legacy-handle" }),
    );
    await expect(claimToothbrush("legacy-handle", "child-b")).rejects.toThrow(
      /altro profilo/,
    );
  });
});

describe("durable manual checkpoint", () => {
  it("restores elapsed work without counting time while the app was closed", async () => {
    const saved = {
      version: 1 as const,
      id: "manual-1",
      startedAt: 1000,
      elapsedSeconds: 42,
      demo: false,
    };
    await getManualSessionStorage("primary").save(saved);
    expect(await getManualSessionStorage("primary").load()).toEqual(saved);
    expect(await getManualSessionStorage("child-b").load()).toBeNull();
  });
  it("serializes late checkpoints before clearing a completed session", async () => {
    const store = getManualSessionStorage("primary");
    await Promise.all([
      store.save({
        version: 1,
        id: "x",
        startedAt: 1000,
        elapsedSeconds: 20,
        demo: false,
      }),
      store.clear(),
    ]);
    expect(await store.load()).toBeNull();
  });
  it("rejects malformed elapsed time and an inconsistent pending reward", () => {
    expect(() =>
      parseManualCheckpoint(
        JSON.stringify({
          version: 1,
          id: "x",
          startedAt: 1,
          elapsedSeconds: 900,
          demo: false,
        }),
      ),
    ).toThrow();
    expect(() =>
      parseManualCheckpoint(
        JSON.stringify({
          version: 1,
          id: "x",
          startedAt: 1,
          elapsedSeconds: 5,
          demo: false,
          pending: { ...session("x"), startedAt: 1, durationSeconds: 5 },
        }),
      ),
    ).toThrow();
  });
});
