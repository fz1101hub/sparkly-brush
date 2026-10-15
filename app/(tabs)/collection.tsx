import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { BrushlingAvatar } from "@/components/brushling-avatar";
import { ScreenContainer } from "@/components/screen-container";
import { useBrushling } from "@/contexts/brushling-context";
import { useColors } from "@/hooks/use-colors";
import {
  BRUSHLINGS,
  STARTER_IDS,
  getEvolution,
  getEvolutionIndex,
  getNextEvolution,
} from "@/lib/brushlings";

export default function CollectionScreen() {
  const colors = useColors();
  const router = useRouter();
  const { selectedId, selected, stats, walletCoins, customization, selectBrushling } = useBrushling();
  const starters = BRUSHLINGS.filter((creature) => STARTER_IDS.includes(creature.id));

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
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{walletCoins}</Text>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>monete disponibili</Text>
          </View>
          <View style={styles.summaryItem}>
            <MaterialIcons name="local-fire-department" size={22} color="#E76A2C" />
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{stats.currentStreakDays}</Text>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>serie attuale</Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/(tabs)/habitat")}
          style={({ pressed }) => [
            styles.habitatCard,
            { backgroundColor: colors.primarySoft, borderColor: selected.accent },
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.habitatIcon, { backgroundColor: colors.primarySoft }]}>
            <MaterialIcons name="home" size={28} color={selected.accent} />
          </View>
          <View style={styles.habitatCopy}>
            <Text style={[styles.habitatEyebrow, { color: colors.primary }]}>LA TANA</Text>
            <Text style={[styles.habitatTitle, { color: colors.foreground }]}>Personalizza la casa</Text>
            <Text style={[styles.habitatText, { color: colors.muted }]}>
              {customization.ownedIds.length} oggetti posseduti · {walletCoins} monete da spendere
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={25} color={colors.muted} />
        </Pressable>

        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Le tre famiglie starter</Text>
          <Text style={[styles.sectionCopy, { color: colors.muted }]}>
            Bloopi, Spriggo e Flarello cambiano forma ai livelli 3 e 6. Le evoluzioni dipendono dai progressi reali di spazzolamento.
          </Text>
        </View>

        <View style={styles.familyStack}>
          {starters.map((creature) => {
            const currentIndex = getEvolutionIndex(creature, stats.level);
            return (
              <View
                key={creature.id}
                style={[styles.familyCard, { backgroundColor: colors.primarySoft, borderColor: creature.accent }]}
              >
                <View style={styles.familyHeader}>
                  <View>
                    <Text style={[styles.familyElement, { color: colors.primary }]}>{creature.element}</Text>
                    <Text style={[styles.familyTitle, { color: colors.foreground }]}>{creature.name}</Text>
                  </View>
                  <Text style={[styles.familyCurrent, { color: colors.primary }]}>
                    Forma {currentIndex + 1}/3
                  </Text>
                </View>

                <View style={styles.evolutionRow}>
                  {creature.evolutions.map((evolution, index) => {
                    const unlocked = stats.level >= evolution.unlockLevel;
                    return (
                      <View key={evolution.name} style={styles.evolutionStep}>
                        <View style={{ opacity: unlocked ? 1 : 0.42 }}>
                          <BrushlingAvatar creature={creature} size={78} level={evolution.unlockLevel} stageIndex={index} />
                        </View>
                        <Text
                          style={[
                            styles.evolutionName,
                            { color: unlocked ? colors.foreground : colors.muted },
                          ]}
                        >
                          {evolution.name}
                        </Text>
                        <Text style={[styles.evolutionLevel, { color: unlocked ? colors.primary : colors.muted }]}>
                          {unlocked ? "Sbloccata" : `Lv ${evolution.unlockLevel}`}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
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
            const currentEvolution = getEvolution(creature, stats.level);
            const nextEvolution = getNextEvolution(creature, stats.level);

            return (
              <View
                key={creature.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: unlocked ? colors.primarySoft : colors.surface,
                    borderColor: selected ? creature.accent : colors.border,
                    opacity: unlocked ? 1 : 0.68,
                  },
                ]}
              >
                <View style={styles.avatarWrap}>
                  <BrushlingAvatar creature={creature} size={104} level={stats.level} />
                  {!unlocked ? (
                    <View style={styles.lockBadge}>
                      <MaterialIcons name="lock" size={18} color="#FFFFFF" />
                    </View>
                  ) : null}
                </View>

                <Text style={[styles.name, { color: colors.foreground }]}>{currentEvolution.name}</Text>
                <Text style={[styles.element, { color: colors.primary }]}>
                  {creature.element} · {currentEvolution.title}
                </Text>
                <Text style={[styles.tagline, { color: colors.muted }]} numberOfLines={3}>
                  {nextEvolution
                    ? `Prossima evoluzione: ${nextEvolution.name} al livello ${nextEvolution.unlockLevel}.`
                    : creature.tagline}
                </Text>

                <Pressable
                  accessibilityRole="button"
                  disabled={!unlocked || selected}
                  onPress={() => void selectBrushling(creature.id)}
                  style={({ pressed }) => [
                    styles.selectButton,
                    {
                      backgroundColor: selected ? creature.accent : unlocked ? colors.surface : colors.primarySoft,
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

        <View style={[styles.tipCard, { backgroundColor: colors.primarySoft, borderColor: "#DCE3FF" }]}>
          <MaterialIcons name="tips-and-updates" size={22} color={colors.primary} />
          <Text style={[styles.tipText, { color: colors.foreground }]}>
            Ogni sessione completa vale 60 XP. Al livello 3 lo starter raggiunge la seconda forma; al livello 6 raggiunge la forma finale.
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
  habitatCard: {
    borderWidth: 2,
    borderRadius: 23,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  habitatIcon: { width: 52, height: 52, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  habitatCopy: { flex: 1 },
  habitatEyebrow: { fontSize: 9, lineHeight: 13, fontWeight: "900", letterSpacing: 0.8 },
  habitatTitle: { fontSize: 16, lineHeight: 21, fontWeight: "900" },
  habitatText: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  sectionTitle: { fontSize: 22, lineHeight: 28, fontWeight: "900" },
  sectionCopy: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  familyStack: { gap: 12 },
  familyCard: { borderWidth: 2, borderRadius: 26, padding: 15 },
  familyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  familyElement: { fontSize: 10, lineHeight: 14, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1 },
  familyTitle: { fontSize: 20, lineHeight: 25, fontWeight: "900" },
  familyCurrent: { fontSize: 11, lineHeight: 16, fontWeight: "900" },
  evolutionRow: { flexDirection: "row", justifyContent: "space-between", gap: 6, marginTop: 12 },
  evolutionStep: { flex: 1, alignItems: "center" },
  evolutionName: { fontSize: 12, lineHeight: 16, fontWeight: "900", marginTop: 6, textAlign: "center" },
  evolutionLevel: { fontSize: 9, lineHeight: 13, fontWeight: "800", textAlign: "center" },
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
  element: { fontSize: 10, lineHeight: 15, fontWeight: "900", textAlign: "center" },
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

