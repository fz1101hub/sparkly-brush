import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import { useBraces } from "@/contexts/braces-context";
import { useExtras } from "@/contexts/extras-context";
import { useFamily } from "@/contexts/family-context";
import { useI18n } from "@/contexts/locale-context";
import { useColors } from "@/hooks/use-colors";
import { toothpasteDoseKey } from "@/lib/dental-care";

type Step = { icon: ComponentProps<typeof MaterialIcons>["name"]; text: string };

/**
 * «Modalità babysitter» (voce 34): what whoever puts the child to bed needs to know, on one
 * screen, with the parent's own note. Nothing to set up for the babysitter.
 */
export function BabysitterGuide() {
  const colors = useColors();
  const { t } = useI18n();
  const { active } = useFamily();
  const { extras } = useExtras();
  const braces = useBraces();
  const steps: Step[] = [
    { icon: "phone-iphone", text: t("babysitter.step.open", { name: active.name }) },
    { icon: "timer", text: t("babysitter.step.timer", { minutes: extras.sessionSeconds / 60 }) },
    { icon: "water-drop", text: t("babysitter.step.paste", { dose: t(toothpasteDoseKey(extras.ageGroup)) }) },
    { icon: "do-not-disturb-on", text: t("babysitter.step.spit") },
    ...(braces.active ? [{ icon: "medical-services" as const, text: t("babysitter.step.braces") }] : []),
    { icon: "bedtime", text: t("babysitter.step.after") },
  ];
  return (
    <View testID="babysitter-guide" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>
        {t("babysitter.title", { name: active.name })}
      </Text>
      {steps.map((step, index) => (
        <View key={step.text} style={styles.row}>
          <View style={[styles.number, { backgroundColor: colors.primarySoft }]}>
            <Text style={[styles.numberText, { color: colors.foreground }]}>{index + 1}</Text>
          </View>
          <MaterialIcons accessible={false} name={step.icon} size={22} color={colors.foreground} />
          <Text style={[styles.text, { color: colors.foreground }]}>{step.text}</Text>
        </View>
      ))}
      {extras.babysitterNote ? (
        <View style={[styles.note, { borderColor: colors.border, backgroundColor: colors.primarySoft }]}>
          <Text style={[styles.label, { color: colors.foreground }]}>{t("babysitter.noteTitle")}</Text>
          <Text testID="babysitter-note" style={[styles.text, { color: colors.foreground }]}>
            {extras.babysitterNote}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 22, padding: 18, gap: 12 },
  title: { fontSize: 20, lineHeight: 28, fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  number: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  numberText: { fontSize: 14, lineHeight: 18, fontWeight: "900" },
  text: { flex: 1, fontSize: 15, lineHeight: 22 },
  note: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 4 },
  label: { fontSize: 15, lineHeight: 22, fontWeight: "800" },
});
