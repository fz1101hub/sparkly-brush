import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { BrushlingAvatar } from "@/components/brushling-avatar";
import { ScreenContainer } from "@/components/screen-container";
import { useBrushling } from "@/contexts/brushling-context";
import { useColors } from "@/hooks/use-colors";
import { BRUSHLINGS } from "@/lib/brushlings";

export default function CollectionScreen() {
  const colors = useColors();
  const { selectedId, stats, selectBrushling } = useBrushling();

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader eyebrow="Brushlings" title="La tua squadra" connected={false} />

        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.summaryItem}>
            <MaterialIcons name="auto-awesome" size={22} color={colors.primary} />
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>Lv {stats.level}</Text>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>{stats.xp} XP totali</Text>
          </View>
          <View style={styles.summaryItem}>
            <MaterialIcons name="stars" size={22} color="#B98A00" />
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{stats.coins}</Text>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>monete sorriso</Text>
          </View>
          <View style={styles.summaryItem}>
            <MaterialIcons name="local-fire-department" size={22} color="#E76A2C" />
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{stats.streakDays}</Text>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>giorni di serie</Text>
          </View>
        </View>

        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Scegli il compagno</Text>
          <Text style={[styles.sectionCopy, { color: colors.muted }]}>
            Le prime tre creature sono disponibili subito. Le altre si sbloccano completando sessioni da due minuti.
          </Text>
        </View>

        <View style={styles.grid}>
          {BRUSHLINGS.map((creature) => {
            const unlocked = stats.unlockedIds.includes(creature.id);
            const selected = selectedId === creature.id;
            return (
              <View
                key={creature.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: unlocked ? creature.soft : colors.surface,
                    borderColor: selected ? creature.accent : colors.border,
                    opacity: unlocked ? 1 : 0.68,
                  },
                ]}
              >
                <View style={styles.avatarWrap}>
                  <BrushlingAvatar creature={creature} size={104} />
                  {!unlocked ? (
                    <View style={styles.lockBadge}>
                      <MaterialIcons name="lock" size={18} color="#FFFFFF" />
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.name, { color: colors.foreground }]}>{creature.name}</Text>
                <Text style={[styles.element, { color: creature.accent }]}>{creature.element}</Text>
                <Text style={[styles.tagline, { color: colors.muted }]} numberOfLines={3}>
                  {creature.tagline}
                </Text>

                <Pressable
                  accessibilityRole="button"
                  disabled={!unlocked || selected}
                  onPress={() => void selectBrushling(creature.id)}
                  style={({ pressed }) => [
                    styles.selectButton,
                    {
                      backgroundColor: selected ? creature.accent : unlocked ? colors.surface : "#E7E9EF",
                      borderColor: selected ? creature.accent : colors.border,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.selectButtonText, { color: selected ? "#FFFFFF" : colors.foreground }]}>
                    {selected
                      ? "In squadra"
                      : unlocked
                        ? "Scegli"
                        : `Dopo ${creature.unlockAtCompletedSessions} sessioni`}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        <View style={[styles.tipCard, { backgroundColor: "#F4F6FF", borderColor: "#DCE3FF" }]}>
          <MaterialIcons name="tips-and-updates" size={22} color={colors.primary} />
          <Text style={[styles.tipText, { color: colors.foreground }]}>
            Ogni sessione completa vale 60 XP. Anche una sessione interrotta dà un piccolo contributo, così il gioco premia il tentativo senza sostituire l'obiettivo dei due minuti.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 120, gap: 18 },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    flexDirection: "row",
    gap: 10,
  },
  summaryItem: { flex: 1, alignItems: "center", gap: 3 },
  summaryValue: { fontSize: 19, lineHeight: 24, fontWeight: "900" },
  summaryLabel: { fontSize: 10, lineHeight: 14, textAlign: "center", fontWeight: "700" },
  sectionTitle: { fontSize: 22, lineHeight: 28, fontWeight: "900" },
  sectionCopy: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    width: "48%",
    borderWidth: 2,
    borderRadius: 24,
    padding: 14,
    alignItems: "center",
  },
  avatarWrap: { position: "relative" },
  lockBadge: {
    position: "absolute",
    right: -3,
    bottom: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#596174",
  },
  name: { fontSize: 18, lineHeight: 23, fontWeight: "900", marginTop: 10 },
  element: { fontSize: 11, lineHeight: 16, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 },
  tagline: { fontSize: 11, lineHeight: 16, textAlign: "center", minHeight: 48, marginTop: 5 },
  selectButton: {
    width: "100%",
    minHeight: 40,
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  selectButtonText: { fontSize: 12, lineHeight: 16, fontWeight: "900", textAlign: "center" },
  pressed: { opacity: 0.84, transform: [{ scale: 0.98 }] },
  tipCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 15,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  tipText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: "600" },
});
