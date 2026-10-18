import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ThemeScene } from "@/components/theme-scene";
import { AnimatedBrushling } from "@/components/animated-brushling";
import { useThemeContext } from "@/lib/theme-provider";
import type { BrushlingDefinition } from "@/lib/brushlings";

export function ThemeHomeHero({ creature, name, level, progress, morning, evening, children }: {
  creature: BrushlingDefinition; name: string; level: number; progress: number;
  morning: boolean; evening: boolean; children: ReactNode;
}) {
  const { theme, colors } = useThemeContext();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <ThemeScene themeId={theme.id} style={styles.scene}>
        <View style={[styles.level, { backgroundColor: colors.surface }]}>
          <Text style={[styles.levelText, { color: colors.foreground }]}>{name} · Livello {level}</Text>
          <View style={[styles.track, { backgroundColor: colors.border }]}>
            <View style={{ height: "100%", width: Math.min(100, Math.max(0, progress * 100)) + "%" as `${number}%`, backgroundColor: colors.primary, borderRadius: 99 }} />
          </View>
        </View>
        <View style={styles.creature}><AnimatedBrushling framed={false} creature={creature} size={120} level={level} active={false} /></View>
      </ThemeScene>
      <View style={styles.copy}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>{theme.headline}</Text>
        <View style={[styles.routine, { backgroundColor: colors.primarySoft }]}>
          <Text style={[styles.slot, { color: colors.foreground }]}>☀ Mattina {morning ? "✓" : "○"}</Text>
          <Text style={[styles.slot, { color: colors.foreground }]}>☾ Sera {evening ? "✓" : "○"}</Text>
        </View>
        {children}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 28, overflow: "hidden" },
  scene: { height: 190, borderRadius: 0, justifyContent: "flex-end", alignItems: "center" },
  level: { position: "absolute", top: 12, left: 12, right: 12, padding: 10, borderRadius: 14 },
  levelText: { fontSize: 13, lineHeight: 18, fontWeight: "800" },
  track: { height: 6, borderRadius: 99, overflow: "hidden", marginTop: 6 },
  creature: { paddingBottom: 9 },
  copy: { padding: 16, gap: 10 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: "900", textAlign: "center" },
  routine: { borderRadius: 16, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-around", padding: 12, gap: 8 },
  slot: { fontSize: 15, lineHeight: 22, fontWeight: "700" },
});
