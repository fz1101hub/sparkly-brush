import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import { VillageCard, VillageScreen, villageStyles } from "@/components/village-ui";
import { useI18n } from "@/contexts/locale-context";
import { contentLocale } from "@/lib/locale-types";
import { useVillage } from "@/contexts/village-context";
import { useColors } from "@/hooks/use-colors";
import type { TranslationKey } from "@/lib/i18n";
import { QUIZ_QUESTIONS, type QuizCategory } from "@/lib/learning/quiz-content";

const CATEGORIES: readonly { id: QuizCategory; title: TranslationKey; icon: ComponentProps<typeof MaterialIcons>["name"] }[] = [
  { id: "body", title: "quiz.category.body", icon: "emoji-people" },
  { id: "hygiene", title: "quiz.category.hygiene", icon: "clean-hands" },
  { id: "food", title: "quiz.category.food", icon: "restaurant" },
  { id: "animals", title: "quiz.category.animals", icon: "pets" },
  { id: "history", title: "quiz.category.history", icon: "history-edu" },
  { id: "world", title: "quiz.category.world", icon: "public" },
];

/** «Museo del sorriso»: the cards won in the quiz, each with its fact. */
export default function MuseumScreen() {
  const colors = useColors();
  const { t, locale: appLocale } = useI18n();
  // Educational content in the languages it exists in (voce 71: newer UI languages read English).
  const locale = contentLocale(appLocale);
  const { state } = useVillage();
  const collected = new Set(state.cards);
  const total = QUIZ_QUESTIONS.length;
  const won = QUIZ_QUESTIONS.filter((question) => collected.has(question.id)).length;
  return (
    <VillageScreen testID="museum-screen" eyebrow={t("village.title")} title={t("museum.title")}>
      <Text testID="museum-count" style={[villageStyles.body, { color: colors.foreground }]}>
        {t("museum.count", { count: won, total })}
      </Text>
      {CATEGORIES.map((category) => (
        <VillageCard key={category.id}>
          <View style={villageStyles.row}>
            <MaterialIcons accessible={false} name={category.icon} size={24} color={colors.foreground} />
            <Text accessibilityRole="header" style={[villageStyles.title, { color: colors.foreground }]}>{t(category.title)}</Text>
          </View>
          {QUIZ_QUESTIONS.filter((question) => question.category === category.id).map((question) =>
            collected.has(question.id) ? (
              <View key={question.id} testID={`museum-card-${question.id}`} style={[styles.card, { borderColor: colors.border, backgroundColor: colors.primarySoft }]}>
                <Text style={[villageStyles.body, { color: colors.foreground }]}>{question.text[locale].fact}</Text>
              </View>
            ) : (
              <View key={question.id} accessible accessibilityLabel={t("museum.locked")} style={[styles.card, styles.locked, { borderColor: colors.border }]}>
                <MaterialIcons accessible={false} name="lock-outline" size={20} color={colors.muted} />
                <Text style={[villageStyles.small, { color: colors.muted }]}>{t("museum.locked")}</Text>
              </View>
            ),
          )}
        </VillageCard>
      ))}
    </VillageScreen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 12 },
  locked: { flexDirection: "row", alignItems: "center", gap: 8, borderStyle: "dashed" },
});
