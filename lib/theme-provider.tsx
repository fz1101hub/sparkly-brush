import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useFonts } from "expo-font";
import { ActivityIndicator, View } from "react-native";
import { colorScheme as nativewindColorScheme, vars } from "nativewind";

import { type ColorScheme, type ThemeColorPalette } from "@/constants/theme";
import { DEFAULT_THEME_ID, getAppTheme, type AppTheme, type AppThemeId, type AppThemePalette } from "@/lib/app-themes";
import { translateDynamic } from "@/lib/i18n";
import { getDeviceLocale } from "@/lib/locale";
import { getThemeStorage } from "@/lib/theme-storage";
import { highContrastColors } from "@/lib/contrast";

type ThemeContextValue = {
  theme: AppTheme;
  colors: ThemeColorPalette & AppThemePalette;
  colorScheme: ColorScheme;
  ready: boolean;
  setTheme: (id: AppThemeId) => Promise<void>;
};
const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Each family profile has its own theme (light or dark is part of the theme). The provider is
 * keyed by profile in the root layout, so it reads the active profile's choice when it mounts.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [fontsReady, fontsError] = useFonts({
    BrushlingsDisplay: require("@/assets/fonts/BrushlingsRound-Bold.ttf"),
    BrushlingsBody: require("@/assets/fonts/Nunito-700.ttf"),
    BrushlingsBlack: require("@/assets/fonts/Nunito-900.ttf"),
  });
  const storage = useRef(getThemeStorage());
  const [themeId, setThemeId] = useState<AppThemeId>(DEFAULT_THEME_ID);
  const [ready, setReady] = useState(false);
  const writes = useRef<Promise<void>>(Promise.resolve());
  const theme = getAppTheme(themeId);

  useEffect(() => {
    let mounted = true;
    void storage.current.loadThemeId().then((id) => {
      if (mounted) {
        setThemeId(id);
        setReady(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const setTheme = useCallback((id: AppThemeId) => {
    // Serialize writes so quick successive choices cannot persist out of order.
    const next = writes.current.catch(() => undefined).then(async () => {
      await storage.current.saveThemeId(id);
      setThemeId(id);
    });
    writes.current = next;
    return next;
  }, []);

  const colors = useMemo(() => ({
    ...theme.colors,
    text: theme.colors.foreground,
    tint: theme.colors.primary,
    icon: theme.colors.muted,
    tabIconDefault: theme.colors.muted,
    tabIconSelected: theme.colors.primary,
  }), [theme]);

  useEffect(() => {
    nativewindColorScheme.set(theme.scheme);
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.dataset.theme = theme.id;
      root.classList.toggle("dark", theme.scheme === "dark");
      Object.entries(theme.colors).forEach(([token, value]) => {
        root.style.setProperty("--color-" + token, value);
      });
    }
  }, [theme]);

  const themeVariables = useMemo(() => vars(Object.fromEntries(
    Object.entries(theme.colors).map(([name, value]) => ["color-" + name, value]),
  )), [theme]);
  const value = useMemo(
    () => ({ theme, colors, colorScheme: theme.scheme, ready, setTheme }),
    [theme, colors, ready, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1, backgroundColor: colors.background }, themeVariables]}>
        {ready && (fontsReady || fontsError) ? (
          children
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            {/* Outside the locale provider: the device language is the best available guess. */}
            <ActivityIndicator
              accessibilityLabel={translateDynamic(getDeviceLocale(), "theme.loading")}
              color={colors.primary}
            />
          </View>
        )}
      </View>
    </ThemeContext.Provider>
  );
}

/** The same theme with high-contrast colours (voce 74), for everything rendered inside. */
export function ThemeOverride({ highContrast, children }: { highContrast: boolean; children: React.ReactNode }) {
  const context = useThemeContext();
  const value = useMemo(
    () => (highContrast ? { ...context, colors: highContrastColors(context.colors, context.colorScheme) } : context),
    [context, highContrast],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useThemeContext must be used within ThemeProvider");
  return context;
}

/** For components that also render outside the provider, such as isolated tests. */
export function useOptionalThemeContext(): ThemeContextValue | null {
  return useContext(ThemeContext);
}
