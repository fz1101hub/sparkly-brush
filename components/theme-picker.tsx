import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import { ThemeScene } from "@/components/theme-scene";
import { useI18n } from "@/contexts/locale-context";
import { APP_THEMES, themeText, type AppThemeId } from "@/lib/app-themes";
import { useThemeContext } from "@/lib/theme-provider";

/** Six looks for the same adventure (from PR #10); each child keeps their own. */
export function ThemePicker() {
  const { theme, setTheme } = useThemeContext();
  const { t } = useI18n();
  const [pending, setPending] = useState<AppThemeId | null>(null);
  const [failed, setFailed] = useState(false);
  const colors = theme.colors;
  async function choose(id: AppThemeId) {
    if (pending || id === theme.id) return;
    setPending(id);
    setFailed(false);
    try {
      await setTheme(id);
    } catch {
      setFailed(true);
    } finally {
      setPending(null);
    }
  }
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={[styles.heading, { color: colors.foreground }]}>
        {t("themePicker.title")}
      </Text>
      <Text style={[styles.copy, { color: colors.muted }]}>{t("themePicker.copy")}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={t("themePicker.groupLabel")} style={styles.grid}>
        {APP_THEMES.map((item) => {
          const selected = theme.id === item.id;
          const text = themeText(item.id, t);
          return (
            <Pressable
              key={item.id}
              testID={`theme-${item.id}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled: pending !== null }}
              aria-checked={selected}
              accessibilityLabel={`${text.name}. ${text.description}`}
              disabled={pending !== null}
              onPress={() => void choose(item.id)}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: item.colors.surface, borderColor: selected ? colors.primary : colors.border },
                pressed && styles.pressed,
              ]}
            >
              <ThemeScene themeId={item.id} style={styles.preview}>
                <View style={[styles.swatch, { backgroundColor: item.colors.primary }]} />
              </ThemeScene>
              <View style={styles.caption}>
                <Text style={[styles.name, { color: item.colors.foreground }]}>{text.name}</Text>
                {pending === item.id ? (
                  <ActivityIndicator color={item.colors.primary} />
                ) : selected ? (
                  <MaterialIcons name="check-circle" size={24} color={item.colors.primary} />
                ) : null}
              </View>
              <Text style={[styles.description, { color: item.colors.muted }]}>{text.description}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text accessibilityLiveRegion="polite" style={[styles.copy, { color: failed ? colors.error : colors.muted }]}>
        {failed
          ? t("themePicker.saveFailed")
          : t("themePicker.active", { name: themeText(theme.id, t).name })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  heading: { fontSize: 24, lineHeight: 31, fontWeight: "900" },
  copy: { fontSize: 14, lineHeight: 21 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: { flexBasis: "47%", flexGrow: 1, minWidth: 138, borderWidth: 2, borderRadius: 22, overflow: "hidden", paddingBottom: 12 },
  preview: { height: 150, borderRadius: 0, alignItems: "flex-end", justifyContent: "flex-end", padding: 10 },
  swatch: { height: 12, width: 42, borderRadius: 6 },
  caption: { paddingHorizontal: 12, paddingTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4 },
  name: { flex: 1, fontSize: 17, lineHeight: 23, fontWeight: "800" },
  description: { paddingHorizontal: 12, marginTop: 6, fontSize: 13, lineHeight: 19 },
  pressed: { opacity: 0.8 },
});
