import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

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
import { useColors } from "@/hooks/use-colors";
import {
  getBrushling,
  getEvolution,
  localizeBrushling,
} from "@/lib/brushlings";
import {
  COLLECTIBLE_ITEMS,
  EGG_DEFINITIONS,
  localizeCollectibleItem,
  localizeEggDefinition,
} from "@/lib/game-inventory";

export default function RewardsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t, formatNumber } = useI18n();
  const { inventory, walletCoins } = useBrushling();
  const sessionWord = (count: number) =>
    t(
      count === 1
        ? "game.explore.sessionSingular"
        : "game.explore.sessionPlural",
    );
  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("game.rewards.backLabel")}
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <MaterialIcons
              name="arrow-back"
              size={22}
              color={LIGHT_CARD_FOREGROUND}
            />
          </Pressable>
          <View style={styles.headerWrap}>
            <AppHeader
              eyebrow={t("game.rewards.eyebrow")}
              title={t("game.rewards.title")}
              connected={false}
            />
          </View>
        </View>
        <View
          style={[
            styles.hero,
            { backgroundColor: "#FFF8E8", borderColor: "#F2D588" },
          ]}
        >
          <MaterialIcons name="stars" size={34} color="#B98A00" />
          <View style={styles.heroCopy}>
            <Text style={[styles.heroTitle, { color: LIGHT_CARD_FOREGROUND }]}>
              {t("game.rewards.completedAdventures", {
                count: formatNumber(inventory.completedSessions),
              })}
            </Text>
            <Text style={[styles.heroText, { color: LIGHT_CARD_MUTED }]}>
              {t("game.rewards.heroDescription")}
            </Text>
          </View>
        </View>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {t("game.rewards.foundItems")}
          </Text>
          <Text style={[styles.sectionCopy, { color: colors.muted }]}>
            {t("game.rewards.foundItemsDescription")}
          </Text>
        </View>
        <View style={styles.itemGrid}>
          {COLLECTIBLE_ITEMS.map((definition) => {
            const item = localizeCollectibleItem(definition, t);
            const count = inventory.itemCounts[item.id];
            return (
              <View
                key={item.id}
                style={[
                  styles.itemCard,
                  {
                    backgroundColor: count > 0 ? item.soft : colors.surface,
                    borderColor: count > 0 ? item.accent : colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.itemIcon,
                    {
                      backgroundColor:
                        count > 0 ? readableAccent(item.accent) : "#8C93A3",
                    },
                  ]}
                >
                  <MaterialIcons name={item.icon} size={25} color="#FFFFFF" />
                </View>
                <Text
                  style={[
                    styles.itemName,
                    {
                      color:
                        count > 0 ? LIGHT_CARD_FOREGROUND : colors.foreground,
                    },
                  ]}
                >
                  {item.name}
                </Text>
                <Text
                  style={[
                    styles.itemCount,
                    {
                      color:
                        count > 0 ? readableAccent(item.accent) : colors.muted,
                    },
                  ]}
                >
                  {count > 0
                    ? `x${formatNumber(count)}`
                    : t("game.rewards.unknownItem")}
                </Text>
                <Text
                  style={[
                    styles.itemDescription,
                    { color: count > 0 ? LIGHT_CARD_MUTED : colors.muted },
                  ]}
                  numberOfLines={3}
                >
                  {count > 0
                    ? item.description
                    : t("game.rewards.continueToDiscoverItem")}
                </Text>
              </View>
            );
          })}
        </View>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {t("game.rewards.mysteryEggs")}
          </Text>
          <Text style={[styles.sectionCopy, { color: colors.muted }]}>
            {t("game.rewards.mysteryEggsDescription")}
          </Text>
        </View>
        <View style={styles.eggStack}>
          {EGG_DEFINITIONS.map((definition) => {
            const egg = inventory.eggs.find(
              (candidate) => candidate.id === definition.id,
            )!;
            const localizedEgg = localizeEggDefinition(egg, t);
            const creature = localizeBrushling(
              getBrushling(definition.brushlingId),
              t,
            );
            const evolution = getEvolution(creature, 1);
            const progressWidth =
              `${Math.round(egg.progress * 100)}%` as `${number}%`;
            return (
              <View
                key={egg.id}
                style={[
                  styles.eggCard,
                  {
                    backgroundColor: egg.found ? egg.soft : colors.surface,
                    borderColor: egg.hatched
                      ? creature.accent
                      : egg.found
                        ? egg.accent
                        : colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.eggVisual,
                    { backgroundColor: egg.found ? "#FFFFFFAA" : "#ECEEF3" },
                  ]}
                >
                  {egg.hatched ? (
                    <BrushlingAvatar creature={creature} size={92} level={1} />
                  ) : (
                    <MaterialIcons
                      name={egg.found ? "egg" : "lock"}
                      size={52}
                      color={egg.found ? readableAccent(egg.accent) : "#7D8494"}
                    />
                  )}
                </View>
                <View style={styles.eggCopy}>
                  <Text
                    style={[
                      styles.eggEyebrow,
                      {
                        color: egg.found
                          ? readableAccent(egg.accent)
                          : colors.muted,
                      },
                    ]}
                  >
                    {egg.hatched
                      ? t("game.rewards.hatched")
                      : egg.found
                        ? t("game.rewards.incubating")
                        : t("game.rewards.notFound")}
                  </Text>
                  <Text
                    style={[
                      styles.eggName,
                      {
                        color: egg.found
                          ? LIGHT_CARD_FOREGROUND
                          : colors.foreground,
                      },
                    ]}
                  >
                    {egg.hatched
                      ? evolution.name
                      : egg.found
                        ? localizedEgg.name
                        : t("game.rewards.mysteryEgg")}
                  </Text>
                  <Text
                    style={[
                      styles.eggDescription,
                      { color: egg.found ? LIGHT_CARD_MUTED : colors.muted },
                    ]}
                  >
                    {egg.hatched
                      ? t("game.rewards.brushlingJoined", {
                          name: evolution.name,
                        })
                      : egg.found
                        ? localizedEgg.description
                        : t("game.rewards.eggFoundAfter", {
                            count: formatNumber(egg.foundAtCompletedSessions),
                          })}
                  </Text>
                  {egg.found && !egg.hatched ? (
                    <>
                      <View
                        style={[
                          styles.progressTrack,
                          { backgroundColor: "#FFFFFFAA" },
                        ]}
                      >
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: progressWidth,
                              backgroundColor: readableAccent(egg.accent),
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={[
                          styles.progressText,
                          { color: LIGHT_CARD_MUTED },
                        ]}
                      >
                        {t("game.rewards.sessionsUntilHatch", {
                          count: formatNumber(egg.sessionsRemaining),
                          sessionWord: sessionWord(egg.sessionsRemaining),
                        })}
                      </Text>
                    </>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("game.rewards.goToHabitatLabel")}
          onPress={() => router.push("/(tabs)/habitat")}
          style={({ pressed }) => [
            styles.footerCard,
            { backgroundColor: "#F4F6FF", borderColor: "#DCE3FF" },
            pressed && styles.pressed,
          ]}
        >
          <MaterialIcons
            name="home"
            size={22}
            color={readableAccent("#2457D6")}
          />
          <View style={styles.footerCopy}>
            <Text
              style={[styles.footerTitle, { color: LIGHT_CARD_FOREGROUND }]}
            >
              {t("game.rewards.goToHabitat")}
            </Text>
            <Text style={[styles.footerText, { color: LIGHT_CARD_MUTED }]}>
              {t("game.rewards.habitatCoins", {
                coins: formatNumber(walletCoins),
              })}
            </Text>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={24}
            color={LIGHT_CARD_MUTED}
          />
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 80,
    gap: 18,
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerWrap: { flex: 1 },
  hero: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 15,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  heroCopy: { flex: 1 },
  heroTitle: { fontSize: 17, lineHeight: 22, fontWeight: "900" },
  heroText: { fontSize: 11, lineHeight: 17, marginTop: 3 },
  sectionTitle: { fontSize: 22, lineHeight: 28, fontWeight: "900" },
  sectionCopy: { fontSize: 12, lineHeight: 18, marginTop: 3 },
  itemGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  itemCard: {
    width: "48%",
    minHeight: 184,
    borderWidth: 1.5,
    borderRadius: 21,
    padding: 13,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  itemName: { fontSize: 14, lineHeight: 19, fontWeight: "900", marginTop: 9 },
  itemCount: { fontSize: 13, lineHeight: 18, fontWeight: "900", marginTop: 1 },
  itemDescription: { fontSize: 10, lineHeight: 15, marginTop: 5 },
  eggStack: { gap: 12 },
  eggCard: {
    borderWidth: 2,
    borderRadius: 24,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  eggVisual: {
    width: 102,
    height: 102,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  eggCopy: { flex: 1 },
  eggEyebrow: {
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  eggName: { fontSize: 17, lineHeight: 22, fontWeight: "900", marginTop: 2 },
  eggDescription: { fontSize: 10, lineHeight: 15, marginTop: 3 },
  progressTrack: {
    height: 8,
    borderRadius: 99,
    overflow: "hidden",
    marginTop: 9,
  },
  progressFill: { height: "100%", borderRadius: 99 },
  progressText: {
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "800",
    marginTop: 4,
  },
  footerCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  footerCopy: { flex: 1 },
  footerTitle: { fontSize: 13, lineHeight: 18, fontWeight: "900" },
  footerText: { fontSize: 10, lineHeight: 15, fontWeight: "600", marginTop: 2 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
});
