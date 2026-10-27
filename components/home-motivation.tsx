import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter, type Href } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";

import { useExtras } from "@/contexts/extras-context";
import { useI18n } from "@/contexts/locale-context";
import { useCurrentDayTimestamp } from "@/hooks/use-current-day";
import { discoveryOfDay } from "@/lib/milestones";
import { seasonAt, seasonEnd } from "@/lib/seasons";
import { speak } from "@/lib/speech";

/**
 * Under the start button on Today: the discovery of the day during the guided first week
 * (voce 18) and the season with its special stickers (voce 15). The youngest hear it read aloud
 * when they tap it (voce 41).
 */
export function HomeMotivation({ ink }: { ink: string }) {
  const { t, formatDate, locale } = useI18n();
  const router = useRouter();
  const { extras, ready } = useExtras();
  const today = useCurrentDayTimestamp();
  if (!ready) return null;
  const discovery = extras.discoveryStart ? discoveryOfDay(extras.discoveryStart, today) : null;
  const season = seasonAt(today);
  const little = extras.ageGroup === "under3" || extras.ageGroup === "3to6";
  const discoveryText = discovery ? `${t("discovery.title")}: ${t(`discovery.${discovery.id}`)}` : "";
  const seasonText = season
    ? t("season.banner", { season: t(`season.${season}`), date: formatDate(seasonEnd(season, today), { day: "numeric", month: "long" }) })
    : "";
  return (
    <>
      {discovery ? (
        <Pressable
          testID="home-discovery"
          accessibilityRole="button"
          accessibilityLabel={`${discoveryText}. ${t("discovery.open")}`}
          onPress={() => {
            if (little) speak(discoveryText, locale);
            router.push(discovery.route as Href);
          }}
          style={styles.row}
        >
          <MaterialIcons accessible={false} name="explore" size={20} color={ink} />
          <Text style={[styles.text, { color: ink, fontWeight: "800" }]}>{discoveryText}</Text>
        </Pressable>
      ) : null}
      {season ? (
        <Pressable
          testID="home-season"
          accessibilityRole="button"
          accessibilityLabel={seasonText}
          onPress={() => {
            if (little) speak(seasonText, locale);
            router.push("/(tabs)/album");
          }}
          style={styles.row}
        >
          <Text accessible={false} style={styles.emoji}>{season === "halloween" ? "🎃" : season === "christmas" ? "🎄" : "☀️"}</Text>
          <Text style={[styles.text, { color: ink }]}>{seasonText}</Text>
        </Pressable>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 8 },
  text: { fontFamily: "BrushlingsBody", fontSize: 14, lineHeight: 20, flexShrink: 1, textAlign: "center" },
  emoji: { fontSize: 18, lineHeight: 22 },
});
