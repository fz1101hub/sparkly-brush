import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter, type Href } from "expo-router";
import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import { EnergyPill, VillageButton, VillageCard, villageStyles } from "@/components/village-ui";
import { useBraces } from "@/contexts/braces-context";
import { useI18n } from "@/contexts/locale-context";
import { useVillage } from "@/contexts/village-context";
import { useColors } from "@/hooks/use-colors";
import type { TranslationKey } from "@/lib/i18n";
import { QUIZ_QUESTIONS } from "@/lib/learning/quiz-content";

type Building = {
  id: string;
  icon: ComponentProps<typeof MaterialIcons>["name"];
  title: TranslationKey;
  text: string;
  actions: readonly { label: string; route: Href; testID: string }[];
};

/**
 * «Il villaggio del Brushling», at the top of the World tab: the activities away from the two
 * minutes of brushing. Quiz and tooth-name games cost energy that only brushing earns.
 */
export function VillageSection() {
  const colors = useColors();
  const router = useRouter();
  const { t } = useI18n();
  const { state } = useVillage();
  const braces = useBraces();
  const cards = QUIZ_QUESTIONS.filter((question) => state.cards.includes(question.id)).length;
  const buildings: Building[] = [
    {
      id: "school",
      icon: "school",
      title: "village.school.title",
      text: t("village.school.text"),
      actions: [
        { label: t("village.school.quiz"), route: "/(tabs)/quiz", testID: "village-quiz" },
        { label: t("village.school.teeth"), route: "/(tabs)/tooth-names", testID: "village-tooth-names" },
      ],
    },
    {
      id: "dentist",
      icon: "medical-services",
      title: "village.dentist.title",
      text: t(braces.active ? "village.dentist.textBraces" : "village.dentist.text"),
      actions: [
        { label: t("village.dentist.visit"), route: "/(tabs)/dentist-visit", testID: "village-visit" },
        { label: t("village.dentist.braces"), route: "/(tabs)/braces", testID: "village-braces" },
      ],
    },
    {
      id: "museum",
      icon: "museum",
      title: "village.museum.title",
      text: t("village.museum.text", { count: cards, total: QUIZ_QUESTIONS.length }),
      actions: [{ label: t("village.museum.open"), route: "/(tabs)/museum", testID: "village-museum" }],
    },
    {
      id: "market",
      icon: "storefront",
      title: "village.market.title",
      text: t("village.market.text"),
      actions: [{ label: t("village.market.open"), route: "/(tabs)/habitat", testID: "village-market" }],
    },
  ];
  return (
    <View testID="village-section" style={styles.section}>
      <Text accessibilityRole="header" style={[styles.heading, { color: colors.foreground }]}>{t("village.title")}</Text>
      <Text style={[villageStyles.small, { color: colors.muted }]}>{t("village.intro")}</Text>
      <EnergyPill />
      {buildings.map((building) => (
        <VillageCard key={building.id}>
          <View style={villageStyles.row}>
            <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
              <MaterialIcons accessible={false} name={building.icon} size={26} color={colors.foreground} />
            </View>
            <View style={styles.copy}>
              <Text accessibilityRole="header" style={[villageStyles.title, { color: colors.foreground }]}>{t(building.title)}</Text>
              <Text style={[villageStyles.small, { color: colors.muted }]}>{building.text}</Text>
            </View>
          </View>
          <View style={villageStyles.row}>
            {building.actions.map((action) => (
              <View key={action.testID} style={styles.action}>
                <VillageButton testID={action.testID} label={action.label} onPress={() => router.push(action.route)} />
              </View>
            ))}
          </View>
        </VillageCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  heading: { fontSize: 24, lineHeight: 31, fontWeight: "900" },
  icon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, minWidth: 160 },
  action: { flexGrow: 1, flexBasis: 140 },
});
