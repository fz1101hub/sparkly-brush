import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View, type DimensionValue } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import { useBraces } from "@/contexts/braces-context";
import { useI18n } from "@/contexts/locale-context";
import { useColors } from "@/hooks/use-colors";
import { CLEAN_WEEK_DAYS } from "@/lib/braces";

/**
 * Missions of braces mode, shown in Missioni while the braces are on. They pay no coins, so the
 * coin economy stays as it is: the care routine itself is the reward.
 */
export function BracesMissions() {
  const colors = useColors();
  const router = useRouter();
  const { t, formatNumber } = useI18n();
  const braces = useBraces();
  if (!braces.active) return null;
  const missions = [
    { id: "today", title: t("braces.missions.today"), progress: braces.doneToday ? 1 : 0, target: 1, done: braces.doneToday },
    {
      id: "week",
      title: t("braces.missions.week"),
      progress: braces.cleanWeek ? CLEAN_WEEK_DAYS : Math.min(braces.streak, CLEAN_WEEK_DAYS),
      target: CLEAN_WEEK_DAYS,
      done: braces.cleanWeek,
    },
  ];
  return (
    <View testID="braces-missions" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>{t("braces.missions.title")}</Text>
      <Text style={[styles.note, { color: colors.muted }]}>{t("braces.missions.note")}</Text>
      {missions.map((mission) => (
        <View key={mission.id} testID={`braces-mission-${mission.id}`} style={styles.row}>
          <MaterialIcons
            accessible={false}
            name={mission.done ? "check-circle" : "radio-button-unchecked"}
            size={24}
            color={mission.done ? "#17633F" : colors.muted}
          />
          <View style={styles.copy}>
            <Text style={[styles.missionTitle, { color: colors.foreground }]}>{mission.title}</Text>
            <View style={[styles.track, { backgroundColor: "#E6E9F0" }]}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${Math.round((mission.progress / mission.target) * 100)}%` as DimensionValue,
                    backgroundColor: mission.done ? "#55B987" : colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={[styles.note, { color: colors.muted }]}>
              {mission.done ? t("game.missions.completed") : `${formatNumber(mission.progress)}/${formatNumber(mission.target)}`}
            </Text>
          </View>
        </View>
      ))}
      <Pressable
        testID="braces-missions-open"
        accessibilityRole="button"
        onPress={() => router.push("/(tabs)/braces")}
        style={({ pressed }) => [styles.button, { backgroundColor: colors.primary }, pressed && styles.pressed]}
      >
        <Text style={[styles.buttonText, { color: colors.primaryText }]}>{t("braces.missions.open")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 22, padding: 16, gap: 12 },
  title: { fontSize: 18, lineHeight: 25, fontWeight: "900" },
  note: { fontSize: 13, lineHeight: 19 },
  row: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  copy: { flex: 1, gap: 6 },
  missionTitle: { fontSize: 15, lineHeight: 21, fontWeight: "800" },
  track: { height: 8, borderRadius: 4, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4 },
  button: { minHeight: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  buttonText: { fontSize: 16, lineHeight: 22, fontWeight: "800" },
  pressed: { opacity: 0.85 },
});
