import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Switch, View } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import { TOOTH_COLORS, ToothMap, type ToothMark } from "@/components/tooth-map";
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
import {
  fdiNumber,
  findToothRound,
  isSixYearMolar,
  memoryDeck,
  repeatRound,
  SPEECH_LANGUAGE,
  TOOTH_NAMES,
  typesIn,
  type Dentition,
  type MemoryCard,
  type Tooth,
  type ToothType,
} from "@/lib/learning/tooth-names";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/locale-types";
import { speak } from "@/lib/speech";

type Mode = "explore" | "repeat" | "find" | "memory";
type RepeatGame = { teeth: Tooth[]; index: number };
type FindGame = { prompts: ToothType[]; index: number; score: number; marks: Record<string, ToothMark>; answered: boolean };
type MemoryGame = { cards: MemoryCard[]; open: string[]; matched: string[]; moves: number };

const LANGUAGE_NAME_KEYS = {
  it: "toothNames.language.it",
  en: "toothNames.language.en",
  de: "toothNames.language.de",
  fr: "toothNames.language.fr",
  es: "toothNames.language.es",
} as const;

/** The names of the teeth in the app language and in a second one (Scuola del sorriso). */
export default function ToothNamesScreen() {
  const colors = useColors();
  const { t, locale } = useI18n();
  const village = useVillage();
  const learning = village.learningLanguage;
  const dentition = village.state.dentition;
  const [mode, setMode] = useState<Mode>("explore");
  const [selected, setSelected] = useState<Tooth | null>(null);
  const [find, setFind] = useState<FindGame | null>(null);
  const [memory, setMemory] = useState<MemoryGame | null>(null);
  const [repeat, setRepeat] = useState<RepeatGame | null>(null);
  const [noEnergy, setNoEnergy] = useState(false);
  const flipBack = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (flipBack.current) clearTimeout(flipBack.current);
  }, []);

  const pay = async () => {
    const paid = await village.spendEnergy();
    setNoEnergy(!paid);
    return paid;
  };

  const startFind = async () => {
    if (!(await pay())) return;
    setFind({ prompts: findToothRound(dentition), index: 0, score: 0, marks: {}, answered: false });
  };
  const startMemory = async () => {
    if (!(await pay())) return;
    setMemory({ cards: memoryDeck(locale, learning), open: [], matched: [], moves: 0 });
  };

  const changeMode = (next: Mode) => {
    setMode(next);
    setFind(null);
    setMemory(null);
    setRepeat(null);
    setNoEnergy(false);
  };

  /** «Ascolta e ripeti» is free practice: the phone speaks, the child repeats out loud. */
  const sayRepeat = (tooth: Tooth) => speak(TOOTH_NAMES[learning][tooth.type], SPEECH_LANGUAGE[learning]);
  const startRepeat = () => {
    const teeth = repeatRound(dentition);
    setRepeat({ teeth, index: 0 });
    sayRepeat(teeth[0]);
  };
  const nextRepeat = () => {
    if (!repeat) return;
    const index = repeat.index + 1;
    setRepeat({ ...repeat, index });
    if (index < repeat.teeth.length) sayRepeat(repeat.teeth[index]);
  };

  const tapInFind = (tooth: Tooth) => {
    if (!find || find.answered || find.index >= find.prompts.length) return;
    const right = tooth.type === find.prompts[find.index];
    setFind({ ...find, answered: true, score: find.score + (right ? 1 : 0), marks: { [tooth.id]: right ? "correct" : "wrong" } });
  };
  const nextFind = () => {
    if (!find) return;
    const index = find.index + 1;
    setFind({ ...find, index, answered: false, marks: {} });
    if (index >= find.prompts.length && find.score > village.state.bestFind) void village.update({ bestFind: find.score });
  };

  const flip = (card: MemoryCard) => {
    if (!memory || memory.open.length === 2 || memory.open.includes(card.id) || memory.matched.includes(card.id)) return;
    const open = [...memory.open, card.id];
    if (open.length < 2) {
      setMemory({ ...memory, open });
      return;
    }
    const [first, second] = open.map((id) => memory.cards.find((item) => item.id === id)!);
    const moves = memory.moves + 1;
    if (first.type === second.type) {
      const matched = [...memory.matched, first.id, second.id];
      setMemory({ ...memory, open: [], matched, moves });
      if (matched.length === memory.cards.length) void village.update({ memoryWins: village.state.memoryWins + 1 });
      return;
    }
    setMemory({ ...memory, open, moves });
    flipBack.current = setTimeout(() => setMemory((current) => (current ? { ...current, open: [] } : current)), 1_000);
  };

  const languageOptions = SUPPORTED_LOCALES.filter((option) => option !== locale).map((option) => ({
    value: option,
    label: t(LANGUAGE_NAME_KEYS[option]),
  }));

  return (
    <VillageScreen testID="tooth-names-screen" eyebrow={t("village.school.title")} title={t("toothNames.title")}>
      <EnergyPill />
      <VillageCard>
        <Text style={[villageStyles.small, { color: colors.muted }]}>{t("toothNames.learningLabel")}</Text>
        <ChoiceChips<SupportedLocale>
          label={t("toothNames.learningLabel")}
          testIDPrefix="tooth-language"
          value={learning}
          onChange={(learningLanguage) => void village.update({ learningLanguage })}
          options={languageOptions}
        />
        <Text style={[villageStyles.small, { color: colors.muted }]}>{t("toothNames.dentitionLabel")}</Text>
        <ChoiceChips<Dentition>
          label={t("toothNames.dentitionLabel")}
          testIDPrefix="tooth-dentition"
          value={dentition}
          onChange={(next) => {
            setSelected(null);
            setFind(null);
            setRepeat(null);
            void village.update({ dentition: next });
          }}
          options={[
            { value: "primary", label: t("toothNames.primary") },
            { value: "permanent", label: t("toothNames.permanent") },
          ]}
        />
        <ChoiceChips<Mode>
          label={t("toothNames.modeLabel")}
          testIDPrefix="tooth-mode"
          value={mode}
          onChange={changeMode}
          options={[
            { value: "explore", label: t("toothNames.mode.explore") },
            { value: "repeat", label: t("toothNames.mode.repeat") },
            { value: "find", label: t("toothNames.mode.find") },
            { value: "memory", label: t("toothNames.mode.memory") },
          ]}
        />
      </VillageCard>

      {mode === "explore" ? (
        <>
          <Text style={[villageStyles.body, { color: colors.foreground }]}>{t("toothNames.exploreHint")}</Text>
          <ToothMap
            dentition={dentition}
            colored
            showFdi={village.state.showFdi}
            starSixYear
            marks={selected ? { [selected.id]: "selected" } : {}}
            onPress={(tooth) => {
              setSelected(tooth);
              speak(TOOTH_NAMES[learning][tooth.type], SPEECH_LANGUAGE[learning]);
            }}
          />
          <View style={styles.legend}>
            {typesIn(dentition).map((type) => (
              <View key={type} style={[styles.legendItem, { backgroundColor: TOOTH_COLORS[type] }]}>
                <Text style={styles.legendText}>{TOOTH_NAMES[locale][type]}</Text>
              </View>
            ))}
          </View>
          {dentition === "permanent" ? (
            <Text style={[villageStyles.small, { color: colors.foreground, textAlign: "center" }]}>{t("toothNames.sixYearLegend")}</Text>
          ) : null}
          <View style={[villageStyles.row, styles.fdiRow]}>
            <Text style={[villageStyles.small, { color: colors.foreground, flex: 1 }]}>{t("toothNames.fdiToggle")}</Text>
            <Switch
              testID="tooth-fdi"
              accessibilityLabel={t("toothNames.fdiToggle")}
              style={{ minHeight: 44, minWidth: 48 }}
              value={village.state.showFdi}
              onValueChange={(showFdi) => void village.update({ showFdi })}
            />
          </View>
          {selected ? (
            <VillageCard>
              <Text testID="tooth-name-local" accessibilityRole="header" style={[villageStyles.title, { color: colors.foreground }]}>
                {TOOTH_NAMES[locale][selected.type]}
              </Text>
              <Text testID="tooth-name-learning" style={[villageStyles.body, { color: colors.foreground }]}>
                {t("toothNames.inLanguage", { language: t(LANGUAGE_NAME_KEYS[learning]), name: TOOTH_NAMES[learning][selected.type] })}
              </Text>
              {village.state.showFdi ? (
                <Text testID="tooth-fdi-number" style={[villageStyles.small, { color: colors.muted }]}>
                  {t("toothNames.fdiNumber", { number: fdiNumber(selected, dentition) })}
                </Text>
              ) : null}
              {isSixYearMolar(selected, dentition) ? (
                <Text testID="tooth-six-year" style={[villageStyles.body, { color: colors.foreground, fontWeight: "800" }]}>
                  {t("toothNames.sixYear")}
                </Text>
              ) : null}
              <View style={villageStyles.row}>
                <VillageButton
                  secondary
                  icon="volume-up"
                  label={t(LANGUAGE_NAME_KEYS[learning])}
                  accessibilityLabel={t("toothNames.listenIn", { language: t(LANGUAGE_NAME_KEYS[learning]) })}
                  onPress={() => speak(TOOTH_NAMES[learning][selected.type], SPEECH_LANGUAGE[learning])}
                />
                <VillageButton
                  secondary
                  icon="volume-up"
                  label={t(LANGUAGE_NAME_KEYS[locale])}
                  accessibilityLabel={t("toothNames.listenIn", { language: t(LANGUAGE_NAME_KEYS[locale]) })}
                  onPress={() => speak(TOOTH_NAMES[locale][selected.type], SPEECH_LANGUAGE[locale])}
                />
              </View>
            </VillageCard>
          ) : null}
        </>
      ) : null}

      {mode === "repeat" ? (
        !repeat ? (
          <VillageCard>
            <Text style={[villageStyles.body, { color: colors.foreground }]}>
              {t("toothNames.repeatIntro", { language: t(LANGUAGE_NAME_KEYS[learning]) })}
            </Text>
            <VillageButton testID="tooth-repeat-start" icon="play-arrow" label={t("toothNames.startGame")} onPress={startRepeat} />
          </VillageCard>
        ) : repeat.index < repeat.teeth.length ? (
          <>
            <VillageCard>
              <Text style={[villageStyles.small, { color: colors.muted }]}>
                {t("toothNames.findProgress", { current: repeat.index + 1, total: repeat.teeth.length })}
              </Text>
              <Text testID="tooth-repeat-word" accessibilityRole="header" style={[styles.repeatWord, { color: colors.foreground }]}>
                {TOOTH_NAMES[learning][repeat.teeth[repeat.index].type]}
              </Text>
              <Text style={[villageStyles.small, { color: colors.muted }]}>
                {TOOTH_NAMES[locale][repeat.teeth[repeat.index].type]}
              </Text>
              <View style={villageStyles.row}>
                <VillageButton secondary icon="volume-up" label={t("quiz.listen")} onPress={() => sayRepeat(repeat.teeth[repeat.index])} />
                <VillageButton testID="tooth-repeat-said" icon="record-voice-over" label={t("toothNames.repeatSaid")} onPress={nextRepeat} />
              </View>
            </VillageCard>
            <ToothMap
              dentition={dentition}
              colored
              disabled
              marks={{ [repeat.teeth[repeat.index].id]: "selected" }}
              onPress={() => undefined}
            />
          </>
        ) : (
          <VillageCard>
            <Text testID="tooth-repeat-result" accessibilityRole="alert" style={[villageStyles.title, { color: colors.foreground }]}>
              {t("toothNames.repeatResult", { count: repeat.teeth.length, language: t(LANGUAGE_NAME_KEYS[learning]) })}
            </Text>
            <VillageButton secondary label={t("quiz.again")} onPress={() => setRepeat(null)} />
          </VillageCard>
        )
      ) : null}

      {mode === "find" ? (
        !find ? (
          <VillageCard>
            <Text style={[villageStyles.body, { color: colors.foreground }]}>{t("toothNames.findIntro")}</Text>
            {village.state.bestFind ? (
              <Text style={[villageStyles.small, { color: colors.muted }]}>{t("toothNames.findBest", { score: village.state.bestFind })}</Text>
            ) : null}
            <VillageButton testID="tooth-find-start" icon="play-arrow" label={t("toothNames.startGame")} onPress={() => void startFind()} />
          </VillageCard>
        ) : find.index < find.prompts.length ? (
          <>
            <VillageCard>
              <Text style={[villageStyles.small, { color: colors.muted }]}>
                {t("toothNames.findProgress", { current: find.index + 1, total: find.prompts.length })}
              </Text>
              <Text testID="tooth-find-prompt" accessibilityRole="header" style={[villageStyles.title, { color: colors.foreground }]}>
                {t("toothNames.findPrompt", { name: TOOTH_NAMES[learning][find.prompts[find.index]] })}
              </Text>
              <VillageButton
                secondary
                icon="volume-up"
                label={t("quiz.listen")}
                onPress={() => speak(TOOTH_NAMES[learning][find.prompts[find.index]], SPEECH_LANGUAGE[learning])}
              />
            </VillageCard>
            <ToothMap dentition={dentition} colored={false} marks={find.marks} disabled={find.answered} onPress={tapInFind} />
            {find.answered ? (
              <VillageCard>
                <Text testID="tooth-find-feedback" accessibilityRole="alert" style={[villageStyles.title, { color: colors.foreground }]}>
                  {Object.values(find.marks)[0] === "correct"
                    ? t("quiz.right")
                    : t("toothNames.findWrong", { name: TOOTH_NAMES[locale][find.prompts[find.index]] })}
                </Text>
                <VillageButton testID="tooth-find-next" icon="arrow-forward" label={t("quiz.next")} onPress={nextFind} />
              </VillageCard>
            ) : null}
          </>
        ) : (
          <VillageCard>
            <Text testID="tooth-find-result" accessibilityRole="header" style={[villageStyles.title, { color: colors.foreground }]}>
              {t("toothNames.findResult", { score: find.score, total: find.prompts.length })}
            </Text>
            <VillageButton secondary label={t("quiz.again")} onPress={() => setFind(null)} />
          </VillageCard>
        )
      ) : null}

      {mode === "memory" ? (
        !memory ? (
          <VillageCard>
            <Text style={[villageStyles.body, { color: colors.foreground }]}>
              {t("toothNames.memoryIntro", { language: t(LANGUAGE_NAME_KEYS[learning]) })}
            </Text>
            <VillageButton testID="tooth-memory-start" icon="play-arrow" label={t("toothNames.startGame")} onPress={() => void startMemory()} />
          </VillageCard>
        ) : (
          <>
            <View style={styles.memoryGrid}>
              {memory.cards.map((card, cardIndex) => {
                const visible = memory.open.includes(card.id) || memory.matched.includes(card.id);
                const matched = memory.matched.includes(card.id);
                return (
                  <Pressable
                    key={card.id}
                    testID={`memory-card-${cardIndex}`}
                    accessibilityRole="button"
                    accessibilityLabel={visible ? `${card.label} (${t(LANGUAGE_NAME_KEYS[card.locale])})` : t("toothNames.memoryHidden", { number: cardIndex + 1 })}
                    accessibilityState={{ disabled: matched }}
                    onPress={() => flip(card)}
                    style={({ pressed }) => [
                      styles.memoryCard,
                      {
                        backgroundColor: matched ? "#E3F6EA" : visible ? "#FFFFFF" : colors.primary,
                        borderColor: matched ? "#17633F" : colors.border,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.memoryText, { color: visible ? "#17213C" : colors.primaryText }]}>
                      {visible ? card.label : "?"}
                    </Text>
                    {visible ? <Text style={styles.memoryLanguage}>{card.locale.toUpperCase()}</Text> : null}
                  </Pressable>
                );
              })}
            </View>
            {memory.matched.length === memory.cards.length ? (
              <VillageCard>
                <Text testID="tooth-memory-result" accessibilityRole="alert" style={[villageStyles.title, { color: colors.foreground }]}>
                  {t("toothNames.memoryResult", { moves: memory.moves })}
                </Text>
                <VillageButton secondary label={t("quiz.again")} onPress={() => setMemory(null)} />
              </VillageCard>
            ) : null}
          </>
        )
      ) : null}

      {noEnergy ? <NoEnergyNotice /> : null}
    </VillageScreen>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  legendItem: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  legendText: { color: "#17213C", fontSize: 14, lineHeight: 20, fontWeight: "700" },
  memoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" },
  memoryCard: { width: "47%", minHeight: 88, borderRadius: 18, borderWidth: 2, alignItems: "center", justifyContent: "center", padding: 8 },
  memoryText: { fontSize: 17, lineHeight: 23, fontWeight: "800", textAlign: "center" },
  memoryLanguage: { color: "#4B5563", fontSize: 12, lineHeight: 16, fontWeight: "700", marginTop: 4 },
  pressed: { opacity: 0.85 },
  fdiRow: { justifyContent: "space-between" },
  repeatWord: { fontSize: 28, lineHeight: 36, fontWeight: "900", textAlign: "center" },
});
