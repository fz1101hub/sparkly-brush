import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { ThemeScene } from "@/components/theme-scene";
import { APP_THEMES, type AppThemeId } from "@/lib/app-themes";
import { useThemeContext } from "@/lib/theme-provider";

export function ThemePicker() {
  const { theme, setTheme } = useThemeContext();
  const [pending, setPending] = useState<AppThemeId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const colors = theme.colors;
  async function choose(id: AppThemeId) {
    if (pending || id === theme.id) return;
    setPending(id);
    setError(null);
    try { await setTheme(id); }
    catch { setError("Non riesco a salvare il tema. Riprova: il tema precedente è ancora attivo."); }
    finally { setPending(null); }
  }
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={[styles.heading, { color: colors.foreground }]}>Scegli il tuo mondo</Text>
      <Text style={[styles.copy, { color: colors.muted }]}>Sei temi, la stessa avventura. Puoi cambiarli quando vuoi.</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="Temi dell’app" style={styles.grid}>
        {APP_THEMES.map((item) => {
          const selected = theme.id === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled: pending !== null }}
              aria-checked={selected}
              accessibilityLabel={item.name + ". " + item.description}
              disabled={pending !== null}
              onPress={() => void choose(item.id)}
              style={({ pressed }) => [styles.card, { backgroundColor: item.colors.surface, borderColor: selected ? colors.primary : colors.border }, pressed && styles.pressed]}
            >
              <ThemeScene themeId={item.id} style={styles.preview}>
                <View style={[styles.swatch, { backgroundColor: item.colors.primary }]} />
              </ThemeScene>
              <View style={styles.caption}>
                <Text style={[styles.name, { color: item.colors.foreground }]}>{item.name}</Text>
                {pending === item.id ? <ActivityIndicator color={item.colors.primary} /> : selected ? <MaterialIcons name="check-circle" size={24} color={item.colors.primary} /> : null}
              </View>
              <Text style={[styles.description, { color: item.colors.muted }]}>{item.description}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text accessibilityLiveRegion="polite" style={[styles.copy, { color: error ? colors.error : colors.muted }]}>
        {error ?? ("Tema attivo: " + theme.name + ". La scelta resta su questo dispositivo.")}
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  section: { gap: 12 }, heading: { fontSize: 24, lineHeight: 31, fontWeight: "900" },
  copy: { fontSize: 14, lineHeight: 21 }, grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: { flexBasis: "47%", flexGrow: 1, minWidth: 138, borderWidth: 2, borderRadius: 22, overflow: "hidden", paddingBottom: 12 },
  preview: { height: 150, borderRadius: 0, alignItems: "flex-end", justifyContent: "flex-end", padding: 10 },
  swatch: { height: 12, width: 42, borderRadius: 6 },
  caption: { paddingHorizontal: 12, paddingTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4 },
  name: { flex: 1, fontSize: 17, lineHeight: 23, fontWeight: "800" },
  description: { paddingHorizontal: 12, marginTop: 6, fontSize: 13, lineHeight: 19 },
  pressed: { opacity: 0.8 },
});
