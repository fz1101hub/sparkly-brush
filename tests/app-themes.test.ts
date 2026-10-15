import { beforeEach, describe, expect, it, vi } from "vitest";
const storage = vi.hoisted(() => new Map<string, string>());
const failWrite = vi.hoisted(() => ({ value: false }));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      if (failWrite.value) throw new Error("disk full");
      storage.set(key, value);
    }),
  },
}));
import { APP_THEMES, DEFAULT_THEME_ID, getAppTheme, isAppThemeId } from "@/lib/app-themes";
import { loadThemeId, saveThemeId, THEME_STORAGE_KEY } from "@/lib/theme-storage";

function luminance(hex: string) {
  const channels = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(first: string, second: string) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe("ordinary themes", () => {
  beforeEach(() => { storage.clear(); failWrite.value = false; });
  it("offers only the six selected ordinary themes", () => {
    expect(APP_THEMES.map((theme) => theme.id)).toEqual(["adventure", "arcade", "cosmos", "garden", "bubbles", "underwater"]);
    expect(getAppTheme("seasonal")).toBe(getAppTheme(DEFAULT_THEME_ID));
    expect(isAppThemeId({ id: "arcade" })).toBe(false);
  });
  it.each(APP_THEMES)("keeps readable text and buttons in $name", ({ colors }) => {
    for (const background of [colors.surface, colors.background, colors.primarySoft]) {
      expect(contrast(colors.foreground, background)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(colors.muted, background)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(colors.primaryText, colors.primary)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.primary, colors.surface)).toBeGreaterThanOrEqual(3);
  });
  it("migrates a device with no theme to Avventura without modifying game preferences", async () => {
    storage.set("sparkly-brush.preferences.v1", '{"soundsEnabled":false}');
    expect(await loadThemeId()).toBe("adventure");
    expect(storage.get("sparkly-brush.preferences.v1")).toBe('{"soundsEnabled":false}');
    expect(storage.has(THEME_STORAGE_KEY)).toBe(false);
  });
  it.each(APP_THEMES)("persists and reloads $name", async ({ id }) => {
    await saveThemeId(id);
    expect(await loadThemeId()).toBe(id);
  });
  it.each(["unknown", "null", '{"id":"arcade"}', ""])("falls back safely for invalid persisted value %s", async (raw) => {
    storage.set(THEME_STORAGE_KEY, raw);
    expect(await loadThemeId()).toBe("adventure");
  });
  it("propagates a save failure without replacing the persisted choice", async () => {
    await saveThemeId("cosmos");
    failWrite.value = true;
    await expect(saveThemeId("garden")).rejects.toThrow("disk full");
    expect(await loadThemeId()).toBe("cosmos");
  });
});
