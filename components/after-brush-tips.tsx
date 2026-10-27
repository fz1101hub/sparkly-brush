import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import { useBrushling } from "@/contexts/brushling-context";
import { useOptionalExtras } from "@/contexts/extras-context";
import { useI18n } from "@/contexts/locale-context";
import { localDateKey } from "@/lib/day-progress";
import { toothpasteDoseKey } from "@/lib/dental-care";
import { DEFAULT_EXTRAS } from "@/lib/extras";
import type { TranslationKey } from "@/lib/i18n";
import { didYouKnow, extraStepOf } from "@/lib/session-tips";

/**
 * What the reward shows after a session (lotto 2): «sputa, non sciacquare» with the toothpaste
 * amount for the child's age (voce 58), the extra step of the day (voce 56) and a «Lo sapevi?»
 * fact (voce 23). Colours follow the reward card, light or dark.
 */
export function AfterBrushTips({ completed, onDark }: { completed: boolean; onDark: boolean }) {
  const { t, locale } = useI18n();
  const { stats } = useBrushling();
  const record = useOptionalExtras();
  const extras = record?.extras ?? DEFAULT_EXTRAS;
  const [now] = useState(() => Date.now());
  const today = localDateKey(now);
  const step = extraStepOf(now);
  const stepDone = extras.extraStepDays.includes(today);
  const ink = onDark ? "#FFFFFF" : "#17213C";
  const soft = onDark ? "#E9F5FF" : "#4B5563";
  const panel = onDark ? "#FFFFFF18" : "#F3F6FB";

  return (
    <View style={styles.stack}>
      {!completed ? (
        <Text testID="stains-left" style={[styles.text, { color: soft }]}>🦠 {t("stains.left")}</Text>
      ) : null}
      {completed ? (
        <View testID="after-brush" style={[styles.panel, { backgroundColor: panel }]}>
          <Text style={[styles.title, { color: ink }]}>{t("afterBrush.title")}</Text>
          <Text style={[styles.text, { color: soft }]}>{t("afterBrush.spit")}</Text>
          <Text style={[styles.text, { color: soft }]}>{t("afterBrush.dose", { dose: t(toothpasteDoseKey(extras.ageGroup)) })}</Text>
        </View>
      ) : null}
      {completed && record ? (
        <View testID="extra-step-check" style={[styles.panel, { backgroundColor: panel }]}>
          <Text style={[styles.title, { color: ink }]}>{t("extraStep.title")}</Text>
          <Text style={[styles.text, { color: soft }]}>{t(`extraStep.step.${step}` as TranslationKey)}</Text>
          {stepDone ? (
            <Text testID="extra-step-recorded" style={[styles.text, { color: ink, fontWeight: "800" }]}>{t("extraStep.recorded")}</Text>
          ) : (
            <Pressable
              testID="extra-step-done"
              accessibilityRole="button"
              accessibilityLabel={`${t("extraStep.question")} ${t("extraStep.done")}`}
              onPress={() =>
                void record.apply((previous) =>
                  previous.extraStepDays.includes(today) ? previous : { ...previous, extraStepDays: [...previous.extraStepDays, today] },
                )
              }
              style={({ pressed }) => [styles.button, { borderColor: ink }, pressed && { opacity: 0.8 }]}
            >
              <Text style={[styles.buttonText, { color: ink }]}>{t("extraStep.done")}</Text>
            </Pressable>
          )}
        </View>
      ) : null}
      <View testID="did-you-know" style={[styles.panel, { backgroundColor: panel }]}>
        <Text style={[styles.title, { color: ink }]}>{t("didYouKnow.title")}</Text>
        <Text style={[styles.text, { color: soft }]}>{didYouKnow(stats.completedSessions, locale)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { alignSelf: "stretch", gap: 8, marginTop: 10 },
  panel: { borderRadius: 16, padding: 12, gap: 4 },
  title: { fontSize: 15, lineHeight: 21, fontWeight: "900" },
  text: { fontSize: 14, lineHeight: 20 },
  button: { minHeight: 44, borderWidth: 1.5, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 4 },
  buttonText: { fontSize: 15, lineHeight: 21, fontWeight: "800" },
});
