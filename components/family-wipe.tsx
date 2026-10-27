import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import { VillageButton } from "@/components/village-ui";
import { useAppRestart } from "@/contexts/app-restart";
import { useFamily } from "@/contexts/family-context";
import { useI18n } from "@/contexts/locale-context";
import { useParentGate } from "@/contexts/parent-gate-context";
import { useColors } from "@/hooks/use-colors";
import { confirmDestructive } from "@/lib/dialogs";
import { wipeFamilyData } from "@/lib/family-wipe";

/** Parent settings, last card: delete every child's data from this phone (voce 70). */
export function FamilyWipe() {
  const colors = useColors();
  const { t } = useI18n();
  const { profiles } = useFamily();
  const { requireParent } = useParentGate();
  const restart = useAppRestart();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const wipe = () =>
    requireParent(() =>
      confirmDestructive({
        title: t("wipe.confirmTitle"),
        message: t("wipe.confirmMessage"),
        cancelLabel: t("common.cancel"),
        confirmLabel: t("wipe.button"),
        onConfirm: () => {
          setBusy(true);
          setFailed(false);
          void wipeFamilyData(profiles.map((profile) => profile.id))
            .then(restart)
            .catch(() => setFailed(true))
            .finally(() => setBusy(false));
        },
      }),
    );

  return (
    <View testID="family-wipe" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.error }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>{t("wipe.title")}</Text>
      <Text style={[styles.text, { color: colors.muted }]}>{t("wipe.text")}</Text>
      <VillageButton testID="family-wipe-button" icon="delete-forever" label={t("wipe.button")} disabled={busy} onPress={wipe} />
      {failed ? (
        <Text accessibilityRole="alert" style={[styles.text, { color: colors.error }]}>
          {t("wipe.failed")}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1.5, borderRadius: 22, padding: 18, gap: 12 },
  title: { fontSize: 20, lineHeight: 28, fontWeight: "800" },
  text: { fontSize: 14, lineHeight: 22 },
});
