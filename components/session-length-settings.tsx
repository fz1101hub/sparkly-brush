import { StyleSheet, View } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import { ChoiceChips } from "@/components/village-ui";
import { useExtras } from "@/contexts/extras-context";
import { useI18n } from "@/contexts/locale-context";
import { useColors } from "@/hooks/use-colors";
import { AGE_GROUPS, type AgeGroup } from "@/lib/dental-care";
import { SESSION_SECONDS_OPTIONS, type SessionSeconds } from "@/lib/extras";

/** Parent setting (voce 57): a shorter timer for the youngest, growing to the full 2 minutes. */
export function SessionLengthSettings() {
  const colors = useColors();
  const { t } = useI18n();
  const { extras, apply, ready } = useExtras();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>{t("sessionLength.title")}</Text>
      <Text style={[styles.text, { color: colors.muted }]}>{t("sessionLength.text")}</Text>
      {ready ? (
        <ChoiceChips<SessionSeconds>
          label={t("sessionLength.title")}
          testIDPrefix="session-length"
          value={extras.sessionSeconds}
          onChange={(sessionSeconds) => void apply((previous) => ({ ...previous, sessionSeconds }))}
          options={SESSION_SECONDS_OPTIONS.map((seconds) => ({
            value: seconds,
            label: t(seconds === 60 ? "sessionLength.one" : seconds === 90 ? "sessionLength.oneHalf" : "sessionLength.two"),
          }))}
        />
      ) : null}
      <Text style={[styles.title, { color: colors.foreground }]}>{t("age.title")}</Text>
      {ready ? (
        <ChoiceChips<AgeGroup | "unset">
          label={t("age.title")}
          testIDPrefix="age-group"
          value={extras.ageGroup ?? "unset"}
          onChange={(value) => void apply((previous) => ({ ...previous, ageGroup: value === "unset" ? null : value }))}
          options={AGE_GROUPS.map((group) => ({ value: group, label: t(`age.${group}`) }))}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 22, padding: 18, gap: 12 },
  title: { fontSize: 20, lineHeight: 28, fontWeight: "800" },
  text: { fontSize: 14, lineHeight: 22 },
});
