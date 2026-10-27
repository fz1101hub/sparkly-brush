import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AnimatedBrushling } from "@/components/animated-brushling";
import { CelebrationBurst } from "@/components/celebration-burst";
import { DesignText as Text } from "@/components/design-text";
import { ChoiceChips, VillageButton, VillageCard, VillageScreen, villageStyles } from "@/components/village-ui";
import { useBraces } from "@/contexts/braces-context";
import { useBrushling } from "@/contexts/brushling-context";
import { useI18n } from "@/contexts/locale-context";
import { useParentGate } from "@/contexts/parent-gate-context";
import { useColors } from "@/hooks/use-colors";
import {
  BRACES_STEPS,
  BRACES_TIP_COUNT,
  BRACES_TYPES,
  CARE_SECONDS_OPTIONS,
  CLEAN_WEEK_DAYS,
  ELASTIC_COLORS,
  type BracesType,
  type CareSeconds,
  type ElasticColor,
} from "@/lib/braces";
import { confirmAction } from "@/lib/dialogs";
import type { TranslationKey } from "@/lib/i18n";

const TYPE_KEYS: Record<BracesType, TranslationKey> = {
  fixed: "braces.type.fixed",
  removable: "braces.type.removable",
  aligners: "braces.type.aligners",
  expander: "braces.type.expander",
};

/** One step of the care routine: timed steps count down, but «Fatto» is always available. */
function CareStep({ seconds, timed }: { seconds: number; timed: boolean }) {
  const colors = useColors();
  const { t } = useI18n();
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (!timed) return;
    const timer = setInterval(() => setLeft((value) => Math.max(0, value - 1)), 1_000);
    return () => clearInterval(timer);
  }, [timed]);
  if (!timed) return null;
  return (
    <Text testID="braces-step-timer" accessibilityLiveRegion="polite" style={[styles.timer, { color: colors.foreground }]}>
      {left > 0 ? t("braces.secondsLeft", { seconds: left }) : t("braces.timeUp")}
    </Text>
  );
}

/** Braces mode (Studio della dottoressa Dentina): care after brushing, tips and parent settings. */
export default function BracesScreen() {
  const colors = useColors();
  const { t, formatDate } = useI18n();
  const braces = useBraces();
  const { selected, stats } = useBrushling();
  const { requireParent } = useParentGate();
  const [routine, setRoutine] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const { settings, active } = braces;
  const steps = BRACES_STEPS[settings.type];

  const finishStep = () => {
    if (routine === null) return;
    if (routine + 1 < steps.length) {
      setRoutine(routine + 1);
      return;
    }
    setRoutine(null);
    setFinished(true);
    void braces.recordCare();
  };

  const remove = () =>
    requireParent(() =>
      confirmAction({
        title: t("braces.removeTitle"),
        message: t("braces.removeMessage"),
        cancelLabel: t("common.cancel"),
        confirmLabel: t("braces.removeConfirm"),
        onConfirm: () => {
          void braces.markRemoved().then(() => setCelebrate(true));
        },
      }),
    );

  return (
    <VillageScreen testID="braces-screen" eyebrow={t("village.dentist.title")} title={t("braces.title")}>
      <CelebrationBurst active={celebrate} />
      {!active ? (
        <VillageCard>
          {settings.removedAt ? (
            <Text testID="braces-removed" accessibilityRole="header" style={[villageStyles.title, { color: colors.foreground }]}>
              {t("braces.removedOn", { date: formatDate(new Date(settings.removedAt), { day: "numeric", month: "long", year: "numeric" }) })}
            </Text>
          ) : null}
          {braces.newSmile ? (
            <View style={styles.hero}>
              <AnimatedBrushling creature={selected} level={stats.level} size={150} framed={false} active={false} />
              <Text testID="braces-new-smile" accessibilityRole="header" style={[villageStyles.title, { color: colors.foreground }]}>
                {t("braces.newSmileTitle")}
              </Text>
              <Text style={[villageStyles.body, { color: colors.foreground, textAlign: "center" }]}>{t("braces.newSmileText")}</Text>
            </View>
          ) : null}
          <Text style={[villageStyles.body, { color: colors.foreground }]}>{t("braces.intro")}</Text>
          <VillageButton
            testID="braces-enable"
            icon="add-circle-outline"
            label={t("braces.enable")}
            onPress={() => requireParent(() => void braces.update({ enabled: true, removedAt: null }))}
          />
        </VillageCard>
      ) : (
        <>
          <VillageCard style={styles.hero}>
            <AnimatedBrushling creature={selected} level={stats.level} size={150} framed={false} active={routine !== null} />
            <View style={[styles.bubble, { backgroundColor: colors.primarySoft, borderColor: colors.border }]}>
              <Text style={[villageStyles.body, { color: colors.foreground }]}>{t("braces.creatureSays")}</Text>
            </View>
          </VillageCard>

          <VillageCard>
            <Text accessibilityRole="header" style={[villageStyles.title, { color: colors.foreground }]}>{t("braces.careTitle")}</Text>
            <Text testID="braces-streak" style={[villageStyles.body, { color: colors.foreground }]}>
              {t("braces.streak", { days: braces.streak })}
            </Text>
            {braces.cleanWeek ? (
              <View style={villageStyles.row}>
                <MaterialIcons accessible={false} name="emoji-events" size={24} color={colors.foreground} />
                <Text style={[villageStyles.body, { color: colors.foreground, fontWeight: "800" }]}>{t("braces.cleanWeek")}</Text>
              </View>
            ) : (
              <Text style={[villageStyles.small, { color: colors.muted }]}>{t("braces.cleanWeekGoal", { days: CLEAN_WEEK_DAYS })}</Text>
            )}
            {routine === null ? (
              <>
                {finished || braces.doneToday ? (
                  <Text testID="braces-done" accessibilityRole="alert" style={[villageStyles.body, { color: colors.foreground, fontWeight: "800" }]}>
                    {t("braces.doneToday")}
                  </Text>
                ) : null}
                <VillageButton
                  testID="braces-start-care"
                  icon="play-arrow"
                  label={t(braces.doneToday ? "braces.careAgain" : "braces.startCare")}
                  onPress={() => {
                    setFinished(false);
                    setRoutine(0);
                  }}
                />
              </>
            ) : (
              <View style={styles.step}>
                <Text style={[villageStyles.small, { color: colors.muted }]}>{t("braces.stepProgress", { current: routine + 1, total: steps.length })}</Text>
                <Text testID="braces-step" accessibilityRole="header" style={[villageStyles.title, { color: colors.foreground }]}>
                  {t(`braces.step.${steps[routine].id}` as TranslationKey)}
                </Text>
                <CareStep key={routine} seconds={settings.careSeconds} timed={steps[routine].timed} />
                <VillageButton testID="braces-step-done" icon="check" label={t("braces.stepDone")} onPress={finishStep} />
              </View>
            )}
          </VillageCard>

          {settings.type === "fixed" ? (
            <VillageCard>
              <Text accessibilityRole="header" style={[villageStyles.title, { color: colors.foreground }]}>{t("braces.elasticsTitle")}</Text>
              <View accessibilityRole="radiogroup" accessibilityLabel={t("braces.elasticsTitle")} style={villageStyles.row}>
                {(Object.keys(ELASTIC_COLORS) as ElasticColor[]).map((color) => {
                  const chosen = settings.elasticColor === color;
                  return (
                    <Pressable
                      key={color}
                      testID={`braces-color-${color}`}
                      accessibilityRole="radio"
                      accessibilityLabel={t(`braces.color.${color}` as TranslationKey)}
                      accessibilityState={{ checked: chosen }}
                      aria-checked={chosen}
                      onPress={() => void braces.update({ elasticColor: color })}
                      style={[
                        styles.swatch,
                        { backgroundColor: ELASTIC_COLORS[color], borderColor: chosen ? colors.foreground : "transparent" },
                      ]}
                    >
                      {chosen ? <MaterialIcons accessible={false} name="check" size={24} color="#FFFFFF" /> : null}
                    </Pressable>
                  );
                })}
              </View>
            </VillageCard>
          ) : null}

          <VillageCard>
            <Text accessibilityRole="header" style={[villageStyles.title, { color: colors.foreground }]}>
              {t("braces.tipsTitle", { type: t(TYPE_KEYS[settings.type]) })}
            </Text>
            {Array.from({ length: BRACES_TIP_COUNT[settings.type] }, (_, index) => (
              <View key={index} style={styles.tip}>
                <MaterialIcons accessible={false} name="tips-and-updates" size={20} color={colors.foreground} />
                <Text style={[villageStyles.body, styles.tipText, { color: colors.foreground }]}>
                  {t(`braces.tip.${settings.type}.${index + 1}` as TranslationKey)}
                </Text>
              </View>
            ))}
            {settings.type === "aligners" && settings.alignerHours ? (
              <Text style={[villageStyles.body, { color: colors.foreground, fontWeight: "800" }]}>
                {t("braces.alignerGoal", { hours: settings.alignerHours })}
              </Text>
            ) : null}
            <Text style={[villageStyles.small, { color: colors.muted }]}>{t("braces.disclaimer")}</Text>
          </VillageCard>

          <VillageCard>
            <Text accessibilityRole="header" style={[villageStyles.title, { color: colors.foreground }]}>{t("braces.parentTitle")}</Text>
            <Text style={[villageStyles.small, { color: colors.muted }]}>{t("braces.parentHint")}</Text>
            <Text style={[villageStyles.small, { color: colors.muted }]}>{t("braces.typeLabel")}</Text>
            <ChoiceChips<BracesType>
              label={t("braces.typeLabel")}
              testIDPrefix="braces-type"
              value={settings.type}
              onChange={(type) => requireParent(() => void braces.update({ type }))}
              options={BRACES_TYPES.map((type) => ({ value: type, label: t(TYPE_KEYS[type]) }))}
            />
            <Text style={[villageStyles.small, { color: colors.muted }]}>{t("braces.durationLabel")}</Text>
            <ChoiceChips<CareSeconds>
              label={t("braces.durationLabel")}
              testIDPrefix="braces-seconds"
              value={settings.careSeconds}
              onChange={(careSeconds) => requireParent(() => void braces.update({ careSeconds }))}
              options={CARE_SECONDS_OPTIONS.map((seconds) => ({ value: seconds, label: t("braces.secondsOption", { seconds }) }))}
            />
            {settings.type === "aligners" ? (
              <>
                <Text style={[villageStyles.small, { color: colors.muted }]}>{t("braces.hoursLabel")}</Text>
                <View style={villageStyles.row}>
                  <VillageButton
                    secondary
                    icon="remove"
                    label="−"
                    accessibilityLabel={t("braces.hoursLess")}
                    disabled={settings.alignerHours <= 0}
                    onPress={() => requireParent(() => void braces.update({ alignerHours: Math.max(0, settings.alignerHours - 1) }))}
                  />
                  <Text testID="braces-hours" style={[villageStyles.title, { color: colors.foreground }]}>
                    {settings.alignerHours ? t("braces.hoursValue", { hours: settings.alignerHours }) : t("braces.hoursUnset")}
                  </Text>
                  <VillageButton
                    secondary
                    icon="add"
                    label="+"
                    accessibilityLabel={t("braces.hoursMore")}
                    disabled={settings.alignerHours >= 24}
                    onPress={() => requireParent(() => void braces.update({ alignerHours: Math.min(24, settings.alignerHours + 1) }))}
                  />
                </View>
              </>
            ) : null}
            <VillageButton testID="braces-remove" icon="celebration" label={t("braces.remove")} onPress={remove} />
            <VillageButton
              secondary
              testID="braces-disable"
              label={t("braces.disable")}
              onPress={() => requireParent(() => void braces.update({ enabled: false }))}
            />
          </VillageCard>
        </>
      )}
    </VillageScreen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center" },
  bubble: { borderWidth: 1, borderRadius: 18, padding: 12, alignSelf: "stretch" },
  step: { gap: 10 },
  timer: { fontSize: 28, lineHeight: 36, fontWeight: "900", textAlign: "center" },
  swatch: { width: 48, height: 48, borderRadius: 24, borderWidth: 3, alignItems: "center", justifyContent: "center" },
  tip: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  tipText: { flex: 1 },
});
