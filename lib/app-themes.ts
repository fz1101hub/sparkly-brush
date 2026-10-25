import type { TranslationKey } from "@/lib/i18n";

export type AppThemeId = "adventure" | "arcade" | "cosmos" | "garden" | "bubbles" | "underwater";

export type AppThemePalette = {
  primary: string; primaryText: string; primarySoft: string;
  background: string; surface: string; foreground: string; muted: string; border: string;
  success: string; warning: string; error: string;
};

export type AppTheme = {
  id: AppThemeId;
  scheme: "light" | "dark"; colors: AppThemePalette;
};

export const DEFAULT_THEME_ID: AppThemeId = "adventure";
export const APP_THEMES: readonly AppTheme[] = [
  {
    id: "adventure", scheme: "light",
    colors: { primary: "#176F65", primaryText: "#FFFFFF", primarySoft: "#E0F2EB", background: "#FAF8EF", surface: "#FFFFFF", foreground: "#153B38", muted: "#516E67", border: "#CEDDD4", success: "#136B4D", warning: "#95500F", error: "#B82B47" },
  },
  {
    id: "arcade", scheme: "dark",
    colors: { primary: "#D1FA45", primaryText: "#18233C", primarySoft: "#293849", background: "#11172F", surface: "#1C2544", foreground: "#F8FAFF", muted: "#BAC5E3", border: "#45577D", success: "#85E4BF", warning: "#FFCA83", error: "#FF9AAD" },
  },
  {
    id: "cosmos", scheme: "dark",
    colors: { primary: "#FFCB9E", primaryText: "#33213F", primarySoft: "#49324F", background: "#221B36", surface: "#322743", foreground: "#FFF8F0", muted: "#D0BFD9", border: "#665273", success: "#A6E0C4", warning: "#FFD18D", error: "#FFA5B6" },
  },
  {
    id: "garden", scheme: "light",
    colors: { primary: "#286542", primaryText: "#FFFFFF", primarySoft: "#E7EFDA", background: "#FAF9E9", surface: "#FFFFFF", foreground: "#253E2E", muted: "#586E53", border: "#D3DEC3", success: "#246540", warning: "#8C590B", error: "#B52F46" },
  },
  {
    id: "bubbles", scheme: "light",
    colors: { primary: "#BD3E38", primaryText: "#FFFFFF", primarySoft: "#FFEBE6", background: "#EEF9FC", surface: "#FFFFFF", foreground: "#143C50", muted: "#476A7B", border: "#C4E1EA", success: "#146D60", warning: "#92530B", error: "#B82C4D" },
  },
  {
    id: "underwater", scheme: "dark",
    colors: { primary: "#91E6CD", primaryText: "#093B40", primarySoft: "#194F54", background: "#082F39", surface: "#103F49", foreground: "#F2FFFC", muted: "#B0D6D8", border: "#3A727C", success: "#98E7B9", warning: "#FFD09C", error: "#FFA5B5" },
  },
];

export function isAppThemeId(value: unknown): value is AppThemeId {
  return typeof value === "string" && APP_THEMES.some((theme) => theme.id === value);
}
export function getAppTheme(value: unknown): AppTheme {
  return APP_THEMES.find((theme) => theme.id === value) ?? APP_THEMES[0];
}

type ThemeTranslate = (key: TranslationKey) => string;

/** Name, description and headlines are translated: they live in the catalogs as theme.<id>.*. */
export function themeText(id: AppThemeId, t: ThemeTranslate) {
  return {
    name: t(`theme.${id}.name`),
    description: t(`theme.${id}.description`),
    headline: t(`theme.${id}.headline`),
    homeHeadline: t(`theme.${id}.homeHeadline`).split("\n"),
  };
}
