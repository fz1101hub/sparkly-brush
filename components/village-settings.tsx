import { StyleSheet, Switch, View } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import { useI18n } from "@/contexts/locale-context";
import { useVillage } from "@/contexts/village-context";
import { useColors } from "@/hooks/use-colors";
import { DAILY_ENERGY_MAX, ENERGY_PER_SESSION } from "@/lib/village";

/** Parent setting of the village: the daily limit of activities earned by brushing. */
export function VillageSettings() {
  const colors = useColors();
  const { t } = useI18n();
  const { state, update, ready } = useVillage();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>{t("village.settings.title")}</Text>
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={[styles.label, { color: colors.foreground }]}>{t("village.settings.limit")}</Text>
          <Text style={[styles.text, { color: colors.muted }]}>
            {t("village.settings.limitText", { perSession: ENERGY_PER_SESSION, max: DAILY_ENERGY_MAX })}
          </Text>
        </View>
        <Switch
          testID="village-energy-limit"
          accessibilityLabel={t("village.settings.limit")}
          style={{ minHeight: 44, minWidth: 48 }}
          disabled={!ready}
          value={state.energyLimit}
          onValueChange={(energyLimit) => void update({ energyLimit })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 22, padding: 18, gap: 12 },
  title: { fontSize: 20, lineHeight: 28, fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  copy: { flex: 1 },
  label: { fontSize: 16, lineHeight: 24, fontWeight: "700" },
  text: { fontSize: 14, lineHeight: 22 },
});
