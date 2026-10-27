import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import {
  ChoiceChips,
  EnergyPill,
  NoEnergyNotice,
  VillageButton,
  VillageCard,
  VillageScreen,
  villageStyles,
} from "@/components/village-ui";
import { useI18n } from "@/contexts/locale-context";
import { useVillage } from "@/contexts/village-context";
import { useColors } from "@/hooks/use-colors";
import type { TranslationKey } from "@/lib/i18n";
import { pickQuizRound, quizOptions, type QuizLevel, type QuizOption } from "@/lib/learning/quiz";
import type { QuizCategory, QuizQuestion } from "@/lib/learning/quiz-content";
import { SPEECH_LANGUAGE } from "@/lib/learning/tooth-names";
import { speak } from "@/lib/speech";

const CATEGORY_KEYS: Record<QuizCategory, TranslationKey> = {
  body: "quiz.category.body",
  hygiene: "quiz.category.hygiene",
  food: "quiz.category.food",
  animals: "quiz.category.animals",
  history: "quiz.category.history",
  world: "quiz.category.world",
};

type Round = { questions: QuizQuestion[]; options: QuizOption[][] };
type Answer = { option: QuizOption; newCard: boolean };

/** «Quiz del sorriso»: three questions per round, paid with one energy, cards for right answers. */
export default function QuizScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t, locale } = useI18n();
  const village = useVillage();
  const [round, setRound] = useState<Round | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [noEnergy, setNoEnergy] = useState(false);
  const [starting, setStarting] = useState(false);
  const labels = useMemo(() => ({ true: t("quiz.true"), false: t("quiz.false") }), [t]);

  const start = async () => {
    setStarting(true);
    try {
      if (!(await village.spendEnergy())) {
        setNoEnergy(true);
        return;
      }
      const questions = pickQuizRound(new Set(village.state.cards), village.state.quizLevel);
      setRound({ questions, options: questions.map((question) => quizOptions(question, locale, labels)) });
      setIndex(0);
      setAnswers([]);
      setNoEnergy(false);
    } finally {
      setStarting(false);
    }
  };

  const answer = (option: QuizOption) => {
    if (!round || answers[index]) return;
    const question = round.questions[index];
    const newCard = option.correct && !village.state.cards.includes(question.id);
    setAnswers((previous) => [...previous, { option, newCard }]);
    if (option.correct) void village.collectCard(question.id);
  };

  const readAloud = (question: QuizQuestion, options: QuizOption[]) =>
    speak([question.text[locale].question, ...options.map((option) => option.label)].join(". "), SPEECH_LANGUAGE[locale]);

  // Intro: level and start.
  if (!round) {
    return (
      <VillageScreen testID="quiz-screen" eyebrow={t("village.school.title")} title={t("quiz.title")}>
        <EnergyPill />
        <VillageCard>
          <Text style={[villageStyles.body, { color: colors.foreground }]}>{t("quiz.intro")}</Text>
          <Text style={[villageStyles.small, { color: colors.muted }]}>{t("quiz.levelLabel")}</Text>
          <ChoiceChips<QuizLevel>
            label={t("quiz.levelLabel")}
            testIDPrefix="quiz-level"
            value={village.state.quizLevel}
            onChange={(quizLevel) => void village.update({ quizLevel })}
            options={[
              { value: 1, label: t("quiz.level.young") },
              { value: 2, label: t("quiz.level.older") },
            ]}
          />
          <VillageButton
            testID="quiz-start"
            icon="play-arrow"
            label={t("quiz.start")}
            disabled={starting || !village.ready}
            onPress={() => void start()}
          />
        </VillageCard>
        {noEnergy ? <NoEnergyNotice /> : null}
        <Text style={[villageStyles.small, { color: colors.muted }]}>{t("quiz.reviewNote")}</Text>
      </VillageScreen>
    );
  }

  // End of the round.
  if (index >= round.questions.length) {
    const right = answers.filter((item) => item.option.correct).length;
    const cards = answers.filter((item) => item.newCard).length;
    return (
      <VillageScreen testID="quiz-screen" eyebrow={t("village.school.title")} title={t("quiz.title")}>
        <VillageCard>
          <Text testID="quiz-result" accessibilityRole="header" style={[villageStyles.title, { color: colors.foreground }]}>
            {t("quiz.result", { right, total: round.questions.length })}
          </Text>
          <Text style={[villageStyles.body, { color: colors.foreground }]}>
            {cards ? t("quiz.newCards", { count: cards }) : t("quiz.noNewCards")}
          </Text>
          <VillageButton testID="quiz-museum" icon="museum" label={t("quiz.openMuseum")} onPress={() => router.push("/(tabs)/museum")} />
          <VillageButton secondary label={t("quiz.again")} onPress={() => setRound(null)} />
        </VillageCard>
      </VillageScreen>
    );
  }

  const question = round.questions[index];
  const options = round.options[index];
  const given = answers[index];
  return (
    <VillageScreen testID="quiz-screen" eyebrow={t(CATEGORY_KEYS[question.category])} title={t("quiz.progress", { current: index + 1, total: round.questions.length })}>
      <VillageCard>
        <Text accessibilityRole="header" style={[villageStyles.title, { color: colors.foreground }]}>
          {question.text[locale].question}
        </Text>
        <VillageButton secondary icon="volume-up" label={t("quiz.listen")} onPress={() => readAloud(question, options)} />
        <View style={styles.options}>
          {options.map((option, optionIndex) => {
            const chosen = given?.option.key === option.key;
            const reveal = Boolean(given) && option.correct;
            return (
              <Pressable
                key={option.key}
                testID={`quiz-answer-${optionIndex}`}
                accessibilityRole="button"
                accessibilityState={{ disabled: Boolean(given), selected: chosen }}
                disabled={Boolean(given)}
                onPress={() => answer(option)}
                style={({ pressed }) => [
                  styles.option,
                  {
                    borderColor: reveal ? "#17633F" : chosen ? "#B42318" : colors.border,
                    backgroundColor: reveal ? "#E3F6EA" : chosen ? "#FDECEC" : colors.surface,
                  },
                  pressed && styles.pressed,
                ]}
              >
                {reveal || chosen ? (
                  <MaterialIcons
                    accessible={false}
                    name={reveal ? "check-circle" : "highlight-off"}
                    size={24}
                    color={reveal ? "#17633F" : "#B42318"}
                  />
                ) : null}
                <Text style={[styles.optionText, { color: reveal || chosen ? "#17213C" : colors.foreground }]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </VillageCard>
      {given ? (
        <VillageCard>
          <Text testID="quiz-feedback" accessibilityRole="alert" style={[villageStyles.title, { color: colors.foreground }]}>
            {t(given.option.correct ? "quiz.right" : "quiz.almost")}
          </Text>
          <Text style={[villageStyles.body, { color: colors.foreground }]}>{question.text[locale].fact}</Text>
          {given.newCard ? (
            <Text style={[villageStyles.body, { color: colors.foreground, fontWeight: "800" }]}>{t("quiz.cardWon")}</Text>
          ) : null}
          <VillageButton
            testID="quiz-next"
            icon="arrow-forward"
            label={t(index + 1 < round.questions.length ? "quiz.next" : "quiz.finish")}
            onPress={() => setIndex((value) => value + 1)}
          />
        </VillageCard>
      ) : null}
    </VillageScreen>
  );
}

const styles = StyleSheet.create({
  options: { gap: 10 },
  option: { minHeight: 56, borderRadius: 16, borderWidth: 2, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  optionText: { flex: 1, fontSize: 17, lineHeight: 24, fontWeight: "700" },
  pressed: { opacity: 0.85 },
});
