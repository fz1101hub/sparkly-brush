import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { DesignText as Text } from "@/components/design-text";

import { AppHeader } from "@/components/app-header";
import { BrushlingAvatar } from "@/components/brushling-avatar";
import { ScreenContainer } from "@/components/screen-container";
import {
  LIGHT_CARD_FOREGROUND,
  LIGHT_CARD_MUTED,
  readableAccent,
} from "@/constants/accessibility-colors";
import { useBrushling } from "@/contexts/brushling-context";
import { useI18n } from "@/contexts/locale-context";
import { useAsyncAction } from "@/hooks/use-async-action";
import { useColors } from "@/hooks/use-colors";
import {
  BRUSHLINGS,
  STARTER_IDS,
  getEvolution,
  getEvolutionIndex,
  getNextEvolution,
  localizeBrushling,
} from "@/lib/brushlings";

export default function CollectionScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t, formatNumber } = useI18n();
  const runAction = useAsyncAction();
  const {
    selectedId,
    selected,
    stats,
    walletCoins,
    customization,
    selectBrushling,
  } = useBrushling();
  const selectedCreature = localizeBrushling(selected, t);
  const starters = BRUSHLINGS.filter((creature) =>
    STARTER_IDS.includes(creature.id),
  ).map((creature) => localizeBrushling(creature, t));

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          eyebrow={t("game.collection.eyebrow")}
          title={t("world.title")}
        />

        <View style={styles.worldLinks}>
          {([
            { title: t("world.exploreLink"), route: "/(tabs)/explore", testID: "world-explore" },
            { title: t("world.missionsLink"), route: "/(tabs)/missions", testID: "world-missions" },
          ] as const).map((item) => (
            <Pressable
              key={item.route}
              testID={item.testID}
              accessibilityRole="button"
              onPress={() => router.push(item.route)}
              style={({ pressed }) => [styles.worldLink, { backgroundColor: colors.primarySoft }, pressed && styles.pressed]}
            >
              <Text style={[styles.worldLinkText, { color: colors.foreground }]}>{item.title}</Text>
            </Pressable>
          ))}
        </View>

        <View
          style={[
            styles.summaryCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.summaryItem}>
            <MaterialIcons
              name="auto-awesome"
              size={22}
              color={colors.primary}
            />
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              {t("game.collection.level", { level: stats.level })}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>
              {t("game.collection.totalXp", { xp: formatNumber(stats.xp) })}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <MaterialIcons name="stars" size={22} color="#B98A00" />
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              {formatNumber(walletCoins)}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>
              {t("game.collection.availableCoins")}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <MaterialIcons
              name="local-fire-department"
              size={22}
              color="#E76A2C"
            />
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              {formatNumber(stats.currentStreakDays)}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>
              {t("game.collection.currentStreak")}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("game.collection.openHabitat")}
          onPress={() => router.push("/(tabs)/habitat")}
          style={({ pressed }) => [
            styles.habitatCard,
            {
              backgroundColor: selectedCreature.soft,
              borderColor: selectedCreature.accent,
            },
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.habitatIcon, { backgroundColor: "#FFFFFFAA" }]}>
            <MaterialIcons
              name="home"
              size={28}
              color={readableAccent(selectedCreature.accent)}
            />
          </View>
          <View style={styles.habitatCopy}>
            <Text
              style={[
                styles.habitatEyebrow,
                { color: readableAccent(selectedCreature.accent) },
              ]}
            >
              {t("game.collection.habitatEyebrow")}
            </Text>
            <Text
              style={[styles.habitatTitle, { color: LIGHT_CARD_FOREGROUND }]}
            >
              {t("game.collection.habitatTitle")}
            </Text>
            <Text style={[styles.habitatText, { color: LIGHT_CARD_MUTED }]}>
              {t("game.collection.habitatSummary", {
                items: formatNumber(customization.ownedIds.length),
                coins: formatNumber(walletCoins),
              })}
            </Text>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={25}
            color={LIGHT_CARD_MUTED}
          />
        </Pressable>

        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {t("game.collection.starterFamilies")}
          </Text>
          <Text style={[styles.sectionCopy, { color: colors.muted }]}>
            {t("game.collection.starterFamiliesDescription")}
          </Text>
        </View>

        <View style={styles.familyStack}>
          {starters.map((creature) => {
            const currentIndex = getEvolutionIndex(creature, stats.level);
            return (
              <View
                key={creature.id}
                style={[
                  styles.familyCard,
                  {
                    backgroundColor: creature.soft,
                    borderColor: creature.accent,
                  },
                ]}
              >
                <View style={styles.familyHeader}>
                  <View>
                    <Text
                      style={[
                        styles.familyElement,
                        { color: readableAccent(creature.accent) },
                      ]}
                    >
                      {creature.element}
                    </Text>
                    <Text
                      style={[
                        styles.familyTitle,
                        { color: LIGHT_CARD_FOREGROUND },
                      ]}
                    >
                      {creature.name}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.familyCurrent,
                      { color: readableAccent(creature.accent) },
                    ]}
                  >
                    {t("game.collection.formProgress", {
                      current: currentIndex + 1,
                    })}
                  </Text>
                </View>

                <View style={styles.evolutionRow}>
                  {creature.evolutions.map((evolution, index) => {
                    const unlocked = stats.level >= evolution.unlockLevel;
                    return (
                      <View key={evolution.name} style={styles.evolutionStep}>
                        <View style={{ opacity: unlocked ? 1 : 0.42 }}>
                          <BrushlingAvatar
                            creature={creature}
                            size={78}
                            level={evolution.unlockLevel}
                            stageIndex={index}
                            showLevelBadge={false}
                          />
                        </View>
                        <Text
                          style={[
                            styles.evolutionName,
                            {
                              color: unlocked
                                ? LIGHT_CARD_FOREGROUND
                                : LIGHT_CARD_MUTED,
                            },
                          ]}
                        >
                          {evolution.name}
                        </Text>
                        <Text
                          style={[
                            styles.evolutionLevel,
                            {
                              color: unlocked
                                ? readableAccent(creature.accent)
                                : LIGHT_CARD_MUTED,
                            },
                          ]}
                        >
                          {unlocked
                            ? t("game.collection.unlocked")
                            : t("game.collection.level", {
                                level: evolution.unlockLevel,
                              })}
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
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {t("game.collection.chooseCompanion")}
          </Text>
          <Text style={[styles.sectionCopy, { color: colors.muted }]}>
            {t("game.collection.chooseCompanionDescription")}
          </Text>
        </View>

        <View style={styles.grid}>
          {BRUSHLINGS.map((baseCreature) => {
            const creature = localizeBrushling(baseCreature, t);
            const unlocked = stats.unlockedIds.includes(creature.id);
            const isSelected = selectedId === creature.id;
            const currentEvolution = getEvolution(creature, stats.level);
            const nextEvolution = getNextEvolution(creature, stats.level);
            const buttonLabel = isSelected
              ? t("game.collection.inTeam")
              : unlocked
                ? t("game.collection.choose")
                : t("game.collection.afterSessions", {
                    sessions: creature.unlockAtCompletedSessions,
                  });

            return (
              <View
                key={creature.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: unlocked ? creature.soft : colors.surface,
                    borderColor: isSelected ? creature.accent : colors.border,
                  },
                ]}
              >
                <View style={styles.avatarWrap}>
                  <BrushlingAvatar
                    creature={creature}
                    size={104}
                    level={stats.level}
                  />
                  {!unlocked ? (
                    <View style={styles.lockBadge}>
                      <MaterialIcons name="lock" size={18} color="#FFFFFF" />
                    </View>
                  ) : null}
                </View>

                <Text
                  style={[
                    styles.name,
                    {
                      color: unlocked
                        ? LIGHT_CARD_FOREGROUND
                        : colors.foreground,
                    },
                  ]}
                >
                  {currentEvolution.name}
                </Text>
                <Text
                  style={[
                    styles.element,
                    {
                      color: unlocked
                        ? readableAccent(creature.accent)
                        : colors.muted,
                    },
                  ]}
                >
                  {creature.element} · {currentEvolution.title}
                </Text>
                <Text
                  style={[
                    styles.tagline,
                    { color: unlocked ? LIGHT_CARD_MUTED : colors.muted },
                  ]}
                  numberOfLines={3}
                >
                  {nextEvolution
                    ? t("game.collection.nextEvolution", {
                        name: nextEvolution.name,
                        level: nextEvolution.unlockLevel,
                      })
                    : creature.tagline}
                </Text>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    unlocked
                      ? t("game.collection.selectCreature", {
                          name: creature.name,
                        })
                      : t("game.collection.lockedCreature", {
                          name: creature.name,
                          sessions: creature.unlockAtCompletedSessions,
                        })
                  }
                  disabled={!unlocked || isSelected}
                  onPress={() => runAction(selectBrushling(creature.id))}
                  style={({ pressed }) => [
                    styles.selectButton,
                    {
                      backgroundColor: isSelected
                        ? readableAccent(creature.accent)
                        : unlocked
                          ? colors.surface
                          : "#E7E9EF",
                      borderColor: isSelected
                        ? readableAccent(creature.accent)
                        : colors.border,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.selectButtonText,
                      { color: isSelected ? "#FFFFFF" : colors.foreground },
                    ]}
                  >
                    {buttonLabel}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        <View
          style={[
            styles.tipCard,
            { backgroundColor: "#F4F6FF", borderColor: "#DCE3FF" },
          ]}
        >
          <MaterialIcons
            name="tips-and-updates"
            size={22}
            color={colors.primary}
          />
          <Text style={[styles.tipText, { color: colors.foreground }]}>
            {t("game.collection.tip")}
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  worldLinks: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  worldLink: { flex: 1, minWidth: 140, minHeight: 54, borderRadius: 20, padding: 14, justifyContent: "center" },
  worldLinkText: { fontSize: 16, lineHeight: 22, fontWeight: "900", textAlign: "center" },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 120,
    gap: 18,
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    flexDirection: "row",
    gap: 10,
  },
  summaryItem: { flex: 1, alignItems: "center", gap: 3 },
  summaryValue: { fontSize: 19, lineHeight: 24, fontWeight: "900" },
  summaryLabel: {
    fontSize: 10,
    lineHeight: 14,
    textAlign: "center",
    fontWeight: "700",
  },
  habitatCard: {
    borderWidth: 2,
    borderRadius: 23,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  habitatIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  habitatCopy: { flex: 1 },
  habitatEyebrow: {
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  habitatTitle: { fontSize: 16, lineHeight: 21, fontWeight: "900" },
  habitatText: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  sectionTitle: { fontSize: 22, lineHeight: 28, fontWeight: "900" },
  sectionCopy: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  familyStack: { gap: 12 },
  familyCard: { borderWidth: 2, borderRadius: 26, padding: 15 },
  familyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  familyElement: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  familyTitle: { fontSize: 20, lineHeight: 25, fontWeight: "900" },
  familyCurrent: { fontSize: 11, lineHeight: 16, fontWeight: "900" },
  evolutionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
    marginTop: 12,
  },
  evolutionStep: { flex: 1, alignItems: "center" },
  evolutionName: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    marginTop: 6,
    textAlign: "center",
  },
  evolutionLevel: {
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "800",
    textAlign: "center",
  },
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
  element: {
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "900",
    textAlign: "center",
  },
  tagline: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    minHeight: 48,
    marginTop: 5,
  },
  selectButton: {
    width: "100%",
    minHeight: 44,
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  selectButtonText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    textAlign: "center",
  },
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
