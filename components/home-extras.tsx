import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useExtras } from "@/contexts/extras-context";
import { useI18n } from "@/contexts/locale-context";
import { useCurrentDayTimestamp } from "@/hooks/use-current-day";
import { localDateKey } from "@/lib/day-progress";
import { daysToVisit } from "@/lib/dental-care";
import type { TranslationKey } from "@/lib/i18n";
import { extraStepOf } from "@/lib/session-tips";

const DENTIST_SHOWN_DAYS = 14;

/**
 * Under the start button on Today: the surprise extra step of the day (voce 56) and, in the two
 * weeks before it, the countdown to the dentist visit with a link to get ready (voce 32).
 */
export function HomeExtras({ ink }: { ink: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const { extras } = useExtras();
  const today = useCurrentDayTimestamp();
  const step = extraStepOf(today);
  const done = extras.extraStepDays.includes(localDateKey(today));
  const visitIn = extras.dentistVisit ? daysToVisit(extras.dentistVisit.day, today) : null;
  return (
    <View style={styles.stack}>
      <View testID="home-extra-step" style={styles.row}>
        <MaterialIcons accessible={false} name={done ? "check-circle" : "auto-awesome"} size={20} color={ink} />
        <Text style={[styles.text, { color: ink }]}>
          {t("extraStep.title")}: {t(`extraStep.step.${step}` as TranslationKey)}
        </Text>
      </View>
      {visitIn !== null && visitIn <= DENTIST_SHOWN_DAYS ? (
        <Pressable
          testID="home-dentist"
          accessibilityRole="button"
          accessibilityLabel={`${visitIn === 0 ? t("dentist.homeToday") : t("dentist.homeCard", { count: visitIn })} ${t("dentist.prepare")}`}
          onPress={() => router.push("/(tabs)/dentist-visit")}
          style={[styles.row, styles.button]}
        >
          <MaterialIcons accessible={false} name="event" size={20} color={ink} />
          <Text style={[styles.text, { color: ink, fontWeight: "800" }]}>
            {visitIn === 0 ? t("dentist.homeToday") : t("dentist.homeCard", { count: visitIn })} · {t("dentist.prepare")}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 4, alignItems: "center" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 8 },
  button: { minHeight: 44 },
  text: { fontFamily: "BrushlingsBody", fontSize: 14, lineHeight: 20, flexShrink: 1, textAlign: "center" },
});
