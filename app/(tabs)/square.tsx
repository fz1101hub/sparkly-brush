import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { StyleSheet, View, type DimensionValue } from "react-native";

import { CelebrationBurst } from "@/components/celebration-burst";
import { DesignText as Text } from "@/components/design-text";
import { VillageButton, VillageCard, VillageScreen, villageStyles } from "@/components/village-ui";
import { useBrush } from "@/contexts/brush-context";
import { useI18n } from "@/contexts/locale-context";
import { useVillage } from "@/contexts/village-context";
import { useCurrentDayTimestamp } from "@/hooks/use-current-day";
import { useColors } from "@/hooks/use-colors";
import type { TranslationKey } from "@/lib/i18n";
import { BOSS_HP, bossHits, weekKey } from "@/lib/village";
import { currentEvent, nextEvent } from "@/lib/village-events";

/**
 * «Piazza del villaggio»: the plaque monster of the week, beaten by brushing (one hit for each
 * completed session from Monday to Sunday), and the square's events with a tip.
 */
export default function SquareScreen() {
  const colors = useColors();
  const { t, formatDate } = useI18n();
  const { history } = useBrush();
  const village = useVillage();
  const today = useCurrentDayTimestamp();
  const hits = Math.min(BOSS_HP, bossHits(history, today));
  const left = BOSS_HP - hits;
  const week = weekKey(today);
  const defeated = left === 0;
  const collected = village.state.bossWeeks.includes(week);
  const event = currentEvent(today);
  const upcoming = nextEvent(today);

  return (
    <VillageScreen testID="square-screen" eyebrow={t("village.title")} title={t("village.square.title")}>
      <CelebrationBurst active={collected} />
      <VillageCard>
        <View style={villageStyles.row}>
          <Text accessible={false} importantForAccessibility="no" style={styles.monster}>
            {defeated ? "🎉" : "👾"}
          </Text>
          <View style={styles.copy}>
            <Text accessibilityRole="header" style={[villageStyles.title, { color: colors.foreground }]}>{t("square.bossTitle")}</Text>
            <Text style={[villageStyles.small, { color: colors.muted }]}>{t("square.bossText", { hp: BOSS_HP })}</Text>
          </View>
        </View>
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={t("square.bossHp")}
          accessibilityValue={{ min: 0, max: BOSS_HP, now: left }}
          style={[styles.track, { backgroundColor: "#E6E9F0" }]}
        >
          <View style={[styles.fill, { width: `${Math.round((left / BOSS_HP) * 100)}%` as DimensionValue }]} />
        </View>
        <Text testID="square-boss-status" style={[villageStyles.body, { color: colors.foreground, fontWeight: "800" }]}>
          {defeated ? t("square.bossDefeated") : t("square.bossLeft", { count: left })}
        </Text>
        {defeated && !collected ? (
          <VillageButton
            testID="square-trophy"
            icon="emoji-events"
            label={t("square.collect")}
            onPress={() => void village.apply((state) => (state.bossWeeks.includes(week) ? state : { ...state, bossWeeks: [...state.bossWeeks, week] }))}
          />
        ) : null}
        <Text testID="square-trophies" style={[villageStyles.small, { color: colors.muted }]}>
          {t("square.trophies", { count: village.state.bossWeeks.length })}
        </Text>
      </VillageCard>

      <VillageCard>
        <View style={villageStyles.row}>
          <MaterialIcons accessible={false} name="celebration" size={26} color={colors.foreground} />
          <Text accessibilityRole="header" style={[villageStyles.title, { color: colors.foreground, flex: 1 }]}>{t("square.eventsTitle")}</Text>
        </View>
        {event ? (
          <>
            <Text testID="square-event" style={[villageStyles.body, { color: colors.foreground, fontWeight: "800" }]}>
              {t(`square.event.${event.id}.title` as TranslationKey)}
            </Text>
            <Text style={[villageStyles.body, { color: colors.foreground }]}>{t(`square.event.${event.id}.tip` as TranslationKey)}</Text>
          </>
        ) : (
          <Text testID="square-next-event" style={[villageStyles.body, { color: colors.foreground }]}>
            {t("square.nextEvent", {
              name: t(`square.event.${upcoming.event.id}.title` as TranslationKey),
              date: formatDate(upcoming.starts, { day: "numeric", month: "long" }),
            })}
          </Text>
        )}
      </VillageCard>
    </VillageScreen>
  );
}

const styles = StyleSheet.create({
  monster: { fontSize: 48, lineHeight: 58 },
  copy: { flex: 1, minWidth: 160 },
  track: { height: 14, borderRadius: 7, overflow: "hidden" },
  fill: { height: 14, borderRadius: 7, backgroundColor: "#7C3AED" },
});
