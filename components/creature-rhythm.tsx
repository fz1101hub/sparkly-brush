import { StyleSheet, View } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import { useBrush } from "@/contexts/brush-context";
import { useBrushling } from "@/contexts/brushling-context";
import { useOptionalCreatureName } from "@/contexts/extras-context";
import { useI18n } from "@/contexts/locale-context";
import { useMinuteClock } from "@/hooks/use-minute-clock";
import { isEvening, isMorning, sameLocalDay } from "@/lib/day-progress";
import { seasonAt, SEASONS } from "@/lib/seasons";

export type CreatureMood = "sleepy" | "asleep" | "awake";

/**
 * The creature wakes up and goes to sleep (voce 21): sleepy in the morning until the child brushes,
 * asleep in its den after the evening brushing, with warm dark colours. Also the den's decoration
 * of the season (voce 15).
 */
export function useCreatureMood(): CreatureMood {
  const { history, demoMode } = useBrush();
  const now = useMinuteClock();
  const today = history.filter((session) => session.completed && sameLocalDay(session.startedAt, now));
  if (demoMode) return "awake";
  if (isMorning(now) && !today.some((session) => isMorning(session.startedAt))) return "sleepy";
  if (isEvening(now) && today.some((session) => isEvening(session.startedAt))) return "asleep";
  return "awake";
}

export function CreatureRhythm() {
  const { t } = useI18n();
  const { selected } = useBrushling();
  const name = useOptionalCreatureName(selected.id) ?? selected.name;
  const mood = useCreatureMood();
  const now = useMinuteClock();
  const season = seasonAt(now);
  if (mood === "awake" && !season) return null;
  const asleep = mood === "asleep";
  return (
    <View testID="creature-rhythm" style={[styles.card, asleep ? styles.night : styles.day]}>
      {mood !== "awake" ? (
        <Text testID={`creature-${mood}`} style={[styles.text, { color: asleep ? "#FFE8C7" : "#17213A" }]}>
          {asleep ? `🌙 ${t("rhythm.asleep", { name })}` : `😴 ${t("rhythm.sleepy", { name })}`}
        </Text>
      ) : null}
      {season ? (
        <Text testID="den-season" style={[styles.text, { color: asleep ? "#FFE8C7" : "#17213A" }]}>
          {SEASONS[season].decoration} {t("season.decoration", { season: t(`season.${season}`) })}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 14, gap: 6 },
  day: { backgroundColor: "#FFF4C9" },
  night: { backgroundColor: "#3A2618" },
  text: { fontSize: 15, lineHeight: 22, fontWeight: "700" },
});
