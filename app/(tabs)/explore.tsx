import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { ComponentProps } from "react";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { BrushlingAvatar } from "@/components/brushling-avatar";
import { ScreenContainer } from "@/components/screen-container";
import {
  GOLD_TEXT,
  LIGHT_CARD_FOREGROUND,
  LIGHT_CARD_MUTED,
  readableAccent,
} from "@/constants/accessibility-colors";
import { useBrushling } from "@/contexts/brushling-context";
import { useI18n } from "@/contexts/locale-context";
import { useColors } from "@/hooks/use-colors";
import {
  ADVENTURE_ZONES,
  getCurrentAdventureZone,
  getNextAdventureZone,
  isAdventureZoneUnlocked,
  localizeAdventureZone,
  sessionsUntilZone,
  type AdventureZoneId,
} from "@/lib/adventure";
import {
  getBrushling,
  getEvolution,
  localizeBrushling,
} from "@/lib/brushlings";
import { EGG_DEFINITIONS, localizeEggDefinition } from "@/lib/game-inventory";

const ZONE_ICONS: Record<
  AdventureZoneId,
  ComponentProps<typeof MaterialIcons>["name"]
> = {
  "bubble-bay": "opacity",
  "fresh-forest": "nature",
  "spark-mountain": "terrain",
  "crystal-lake": "ac-unit",
  "smile-valley": "sentiment-very-satisfied",
};

export default function ExploreScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t, formatNumber } = useI18n();
  const { selected, stats, inventory, hasChosenStarter } = useBrushling();
  const selectedCreature = localizeBrushling(selected, t);
  const currentZone = localizeAdventureZone(
    getCurrentAdventureZone(stats.completedSessions),
    t,
  );
  const nextZone = getNextAdventureZone(stats.completedSessions);
  const evolution = getEvolution(selectedCreature, stats.level);

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          eyebrow={t("game.explore.eyebrow")}
          title={t("game.explore.title")}
        />
        <View
          style={[
            styles.hero,
            { backgroundColor: "#EAF6FF", borderColor: "#B8DFFF" },
          ]}
        >
          <View style={styles.heroCopy}>
            <Text style={[styles.heroEyebrow, { color: "#0B67B2" }]}>
              {t("game.explore.heroEyebrow")}
            </Text>
            <Text style={[styles.heroTitle, { color: LIGHT_CARD_FOREGROUND }]}>
              {hasChosenStarter
                ? t("game.explore.exploresWithYou", { name: evolution.name })
                : t("game.explore.chooseCompanionFirst")}
            </Text>
            <Text style={[styles.heroText, { color: LIGHT_CARD_MUTED }]}>
              {nextZone
                ? t("game.explore.sessionsUntilZone", {
                    sessions: formatNumber(
                      sessionsUntilZone(nextZone, stats.completedSessions),
                    ),
                    zone: localizeAdventureZone(nextZone, t).name,
                  })
                : t("game.explore.allZonesUnlocked")}
            </Text>
          </View>
          <BrushlingAvatar
            creature={selectedCreature}
            size={104}
            level={stats.level}
          />
        </View>
        <View
          style={[
            styles.progressCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.progressTop}>
            <View>
              <Text style={[styles.progressEyebrow, { color: colors.primary }]}>
                {t("game.explore.currentZone")}
              </Text>
              <Text
                style={[styles.progressTitle, { color: colors.foreground }]}
              >
                {currentZone.name}
              </Text>
            </View>
            <View
              style={[
                styles.sessionBadge,
                { backgroundColor: currentZone.soft },
              ]}
            >
              <MaterialIcons
                name="done-all"
                size={17}
                color={readableAccent(currentZone.accent)}
              />
              <Text
                style={[
                  styles.sessionBadgeText,
                  { color: readableAccent(currentZone.accent) },
                ]}
              >
                {t("game.explore.sessionCount", {
                  count: formatNumber(stats.completedSessions),
                })}
              </Text>
            </View>
          </View>
          <Text style={[styles.progressCopy, { color: colors.muted }]}>
            {currentZone.subtitle}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("game.explore.openRewards")}
          onPress={() => router.push("/(tabs)/rewards")}
          style={({ pressed }) => [
            styles.inventoryCard,
            { backgroundColor: "#FFF8E8", borderColor: "#F2D588" },
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.inventoryIcon}>
            <MaterialIcons name="card-giftcard" size={28} color="#B98A00" />
          </View>
          <View style={styles.inventoryCopy}>
            <Text style={[styles.inventoryEyebrow, { color: GOLD_TEXT }]}>
              {t("game.explore.inventoryEyebrow")}
            </Text>
            <Text
              style={[styles.inventoryTitle, { color: LIGHT_CARD_FOREGROUND }]}
            >
              {t("game.explore.inventoryTitle")}
            </Text>
            <Text style={[styles.inventoryText, { color: LIGHT_CARD_MUTED }]}>
              {t("game.explore.inventorySummary", {
                eggs: formatNumber(
                  inventory.eggs.filter((egg) => egg.found).length,
                ),
                brushlings: formatNumber(inventory.hatchedBrushlingIds.length),
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
            {t("game.explore.islandMap")}
          </Text>
          <Text style={[styles.sectionCopy, { color: colors.muted }]}>
            {t("game.explore.islandMapDescription")}
          </Text>
        </View>
        <View style={styles.map}>
          {ADVENTURE_ZONES.map((baseZone, index) => {
            const zone = localizeAdventureZone(baseZone, t);
            const unlocked = isAdventureZoneUnlocked(
              zone,
              stats.completedSessions,
            );
            const active = zone.id === currentZone.id;
            const remaining = sessionsUntilZone(zone, stats.completedSessions);
            const alignLeft = index % 2 === 0;
            return (
              <View key={zone.id} style={styles.mapStep}>
                {index > 0 ? (
                  <View
                    style={[
                      styles.connector,
                      {
                        backgroundColor: unlocked ? zone.accent : colors.border,
                        alignSelf: alignLeft ? "flex-start" : "flex-end",
                        marginLeft: alignLeft ? 55 : 0,
                        marginRight: alignLeft ? 0 : 55,
                      },
                    ]}
                  />
                ) : null}
                <View
                  style={[
                    styles.zoneRow,
                    { justifyContent: alignLeft ? "flex-start" : "flex-end" },
                  ]}
                >
                  <View
                    style={[
                      styles.zoneCard,
                      {
                        backgroundColor: unlocked ? zone.soft : colors.surface,
                        borderColor: active ? zone.accent : colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.zoneIcon,
                        {
                          backgroundColor: unlocked
                            ? readableAccent(zone.accent)
                            : "#80889A",
                        },
                      ]}
                    >
                      <MaterialIcons
                        name={unlocked ? ZONE_ICONS[zone.id] : "lock"}
                        size={27}
                        color="#FFFFFF"
                      />
                    </View>
                    <View style={styles.zoneCopy}>
                      <View style={styles.zoneTitleRow}>
                        <Text
                          style={[
                            styles.zoneTitle,
                            {
                              color: unlocked
                                ? LIGHT_CARD_FOREGROUND
                                : colors.foreground,
                            },
                          ]}
                        >
                          {zone.name}
                        </Text>
                        {active ? (
                          <View
                            style={[
                              styles.hereBadge,
                              { backgroundColor: readableAccent(zone.accent) },
                            ]}
                          >
                            <Text style={styles.hereText}>
                              {t("game.explore.youAreHere")}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text
                        style={[
                          styles.zoneSubtitle,
                          {
                            color: unlocked
                              ? LIGHT_CARD_MUTED
                              : colors.foreground,
                          },
                        ]}
                      >
                        {zone.subtitle}
                      </Text>
                      <Text
                        style={[
                          styles.zoneStatus,
                          {
                            color: unlocked
                              ? readableAccent(zone.accent)
                              : colors.foreground,
                          },
                        ]}
                      >
                        {unlocked
                          ? t("game.explore.zoneUnlocked")
                          : t("game.explore.zoneOpensIn", {
                              count: formatNumber(remaining),
                            })}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {t("game.explore.islandEncounters")}
          </Text>
          <Text style={[styles.sectionCopy, { color: colors.muted }]}>
            {t("game.explore.islandEncountersDescription")}
          </Text>
        </View>
        <View style={styles.encounterStack}>
          {EGG_DEFINITIONS.map((definition) => {
            const egg = inventory.eggs.find(
              (candidate) => candidate.id === definition.id,
            )!;
            const localizedEgg = localizeEggDefinition(egg, t);
            const creature = localizeBrushling(
              getBrushling(definition.brushlingId),
              t,
            );
            const eggEvolution = getEvolution(creature, 1);
            return (
              <View
                key={egg.id}
                style={[
                  styles.encounterCard,
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
                <View style={styles.encounterVisual}>
                  {egg.hatched ? (
                    <BrushlingAvatar creature={creature} size={88} level={1} />
                  ) : (
                    <View
                      style={[
                        styles.eggBubble,
                        {
                          backgroundColor: egg.found ? "#FFFFFFAA" : "#E8EAF0",
                        },
                      ]}
                    >
                      <MaterialIcons
                        name={egg.found ? "radio-button-unchecked" : "lock"}
                        size={45}
                        color={
                          egg.found ? readableAccent(egg.accent) : "#858C9B"
                        }
                      />
                    </View>
                  )}
                </View>
                <View style={styles.encounterCopy}>
                  <Text
                    style={[
                      styles.encounterEyebrow,
                      {
                        color: egg.hatched
                          ? readableAccent(creature.accent)
                          : egg.found
                            ? readableAccent(egg.accent)
                            : colors.foreground,
                      },
                    ]}
                  >
                    {egg.hatched
                      ? t("game.explore.newBrushling")
                      : egg.found
                        ? t("game.explore.eggFound")
                        : t("game.explore.secretEncounter")}
                  </Text>
                  <Text
                    style={[
                      styles.encounterTitle,
                      {
                        color: egg.found
                          ? LIGHT_CARD_FOREGROUND
                          : colors.foreground,
                      },
                    ]}
                  >
                    {egg.hatched
                      ? eggEvolution.name
                      : egg.found
                        ? localizedEgg.name
                        : t("game.explore.unknown")}
                  </Text>
                  <Text
                    style={[
                      styles.encounterText,
                      {
                        color: egg.found ? LIGHT_CARD_MUTED : colors.foreground,
                      },
                    ]}
                  >
                    {egg.hatched
                      ? t("game.explore.brushlingAvailable", {
                          name: eggEvolution.name,
                        })
                      : egg.found
                        ? t("game.explore.sessionsUntilHatch", {
                            count: formatNumber(egg.sessionsRemaining),
                          })
                        : t("game.explore.continueUntilEgg", {
                            session: formatNumber(egg.foundAtCompletedSessions),
                          })}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
        <View
          style={[
            styles.futureCard,
            { backgroundColor: "#FFF8E8", borderColor: "#F2D588" },
          ]}
        >
          <MaterialIcons name="card-giftcard" size={25} color="#B98A00" />
          <View style={styles.futureCopy}>
            <Text
              style={[styles.futureTitle, { color: LIGHT_CARD_FOREGROUND }]}
            >
              {t("game.explore.nextStepTitle")}
            </Text>
            <Text style={[styles.futureText, { color: LIGHT_CARD_MUTED }]}>
              {t("game.explore.nextStepDescription")}
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 120,
    gap: 18,
  },
  hero: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroCopy: { flex: 1 },
  heroEyebrow: {
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  heroTitle: { fontSize: 22, lineHeight: 27, fontWeight: "900", marginTop: 4 },
  heroText: { fontSize: 12, lineHeight: 18, fontWeight: "600", marginTop: 5 },
  progressCard: { borderWidth: 1, borderRadius: 22, padding: 15 },
  inventoryCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  inventoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FFFFFFAA",
    alignItems: "center",
    justifyContent: "center",
  },
  inventoryCopy: { flex: 1 },
  inventoryEyebrow: {
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  inventoryTitle: { fontSize: 16, lineHeight: 21, fontWeight: "900" },
  inventoryText: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  progressTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  progressEyebrow: {
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "900",
    letterSpacing: 1,
  },
  progressTitle: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "900",
    marginTop: 2,
  },
  progressCopy: { fontSize: 12, lineHeight: 18, marginTop: 5 },
  sessionBadge: {
    minHeight: 34,
    borderRadius: 99,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sessionBadgeText: { fontSize: 10, lineHeight: 14, fontWeight: "900" },
  sectionTitle: { fontSize: 22, lineHeight: 28, fontWeight: "900" },
  sectionCopy: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  map: { paddingVertical: 2 },
  mapStep: { width: "100%" },
  connector: { width: 4, height: 34, borderRadius: 99 },
  zoneRow: { width: "100%", flexDirection: "row" },
  zoneCard: {
    width: "88%",
    borderWidth: 2,
    borderRadius: 24,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  zoneIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  zoneCopy: { flex: 1 },
  zoneTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  zoneTitle: { fontSize: 16, lineHeight: 21, fontWeight: "900" },
  hereBadge: { borderRadius: 99, paddingHorizontal: 7, paddingVertical: 3 },
  hereText: {
    color: "#FFFFFF",
    fontSize: 8,
    lineHeight: 10,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  zoneSubtitle: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  zoneStatus: { fontSize: 10, lineHeight: 15, fontWeight: "900", marginTop: 4 },
  encounterStack: { gap: 10 },
  encounterCard: {
    borderWidth: 2,
    borderRadius: 22,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  encounterVisual: { width: 92, alignItems: "center" },
  eggBubble: {
    width: 82,
    height: 82,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  encounterCopy: { flex: 1 },
  encounterEyebrow: {
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  encounterTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900",
    marginTop: 2,
  },
  encounterText: { fontSize: 10, lineHeight: 15, marginTop: 3 },
  pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
  futureCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 15,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  futureCopy: { flex: 1 },
  futureTitle: { fontSize: 14, lineHeight: 19, fontWeight: "900" },
  futureText: { fontSize: 11, lineHeight: 17, marginTop: 3 },
});
