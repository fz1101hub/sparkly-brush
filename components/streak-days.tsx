import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import { ChoiceChips, VillageButton } from "@/components/village-ui";
import { useExtras } from "@/contexts/extras-context";
import { useI18n } from "@/contexts/locale-context";
import { useParentGate } from "@/contexts/parent-gate-context";
import { useColors } from "@/hooks/use-colors";
import { localDateKey, parseLocalDateKey } from "@/lib/day-progress";
import type { ProtectedReason } from "@/lib/extras";
import type { TranslationKey } from "@/lib/i18n";

const REASON_KEYS: Record<ProtectedReason, TranslationKey> = {
  offline: "streakDays.reason.offline",
  sick: "streakDays.reason.sick",
  holiday: "streakDays.reason.holiday",
};
const REASONS: readonly ProtectedReason[] = ["offline", "sick", "holiday"];

/**
 * Parent area: days that keep the «serie del sorriso» alive (voci 16 e 62): brushed without the
 * phone, sick or on holiday. Today or one of the six days before.
 */
export function StreakDays() {
  const colors = useColors();
  const { t, formatDate } = useI18n();
  const { extras, apply, ready } = useExtras();
  const { requireParent } = useParentGate();
  const [now] = useState(() => Date.now());
  const dayOptions = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(now);
    return localDateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset, 12).getTime());
  });
  const [day, setDay] = useState(dayOptions[0]);
  const [reason, setReason] = useState<ProtectedReason>("offline");
  const label = (key: string, index: number) =>
    index === 0 ? t("streakDays.today") : index === 1 ? t("streakDays.yesterday") : formatDate(parseLocalDateKey(key), { weekday: "short", day: "numeric" });
  const marked = [...extras.protectedDays].reverse().slice(0, 10);

  return (
    <View testID="streak-days" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>{t("streakDays.title")}</Text>
      <Text style={[styles.text, { color: colors.muted }]}>{t("streakDays.text")}</Text>
      <Text style={[styles.label, { color: colors.foreground }]}>{t("streakDays.dayLabel")}</Text>
      <ChoiceChips<string>
        label={t("streakDays.dayLabel")}
        testIDPrefix="streak-day"
        value={day}
        onChange={setDay}
        options={dayOptions.map((key, index) => ({ value: key, label: label(key, index) }))}
      />
      <Text style={[styles.label, { color: colors.foreground }]}>{t("streakDays.reasonLabel")}</Text>
      <ChoiceChips<ProtectedReason>
        label={t("streakDays.reasonLabel")}
        testIDPrefix="streak-reason"
        value={reason}
        onChange={setReason}
        options={REASONS.map((item) => ({ value: item, label: t(REASON_KEYS[item]) }))}
      />
      <VillageButton
        testID="streak-day-save"
        icon="event-available"
        label={t("streakDays.save")}
        disabled={!ready}
        onPress={() =>
          requireParent(() => {
            void apply((previous) => ({
              ...previous,
              protectedDays: [...previous.protectedDays.filter((item) => item.day !== day), { day, reason }],
            }));
          })
        }
      />
      {marked.length ? (
        <View style={styles.list}>
          {marked.map((item) => (
            <View key={item.day} style={styles.row}>
              <Text testID={`streak-marked-${item.day}`} style={[styles.text, { color: colors.foreground, flex: 1 }]}>
                {t("streakDays.marked", {
                  date: formatDate(parseLocalDateKey(item.day), { weekday: "long", day: "numeric", month: "long" }),
                  reason: t(REASON_KEYS[item.reason]),
                })}
              </Text>
              <VillageButton
                secondary
                icon="delete-outline"
                label={t("streakDays.remove")}
                accessibilityLabel={t("streakDays.removeLabel", { date: formatDate(parseLocalDateKey(item.day), { day: "numeric", month: "long" }) })}
                onPress={() =>
                  requireParent(() => {
                    void apply((previous) => ({
                      ...previous,
                      protectedDays: previous.protectedDays.filter((entry) => entry.day !== item.day),
                    }));
                  })
                }
              />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 22, padding: 18, gap: 12 },
  title: { fontSize: 20, lineHeight: 28, fontWeight: "800" },
  text: { fontSize: 14, lineHeight: 21 },
  label: { fontSize: 15, lineHeight: 22, fontWeight: "700" },
  list: { gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
});
