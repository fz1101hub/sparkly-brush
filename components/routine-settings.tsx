import { useState } from "react";
import { Pressable, StyleSheet, Switch, TextInput, View } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import { VillageButton } from "@/components/village-ui";
import { useExtras } from "@/contexts/extras-context";
import { useI18n } from "@/contexts/locale-context";
import { useColors } from "@/hooks/use-colors";
import { useCurrentDayTimestamp } from "@/hooks/use-current-day";
import { BEDTIME_ITEMS, bedtimeAllowed, onHoliday, type BedtimeItem } from "@/lib/bedtime";
import { localDateKey } from "@/lib/day-progress";
import { EPISODES, nextEpisode } from "@/lib/learning/serial-story";

function Row({ testID, label, hint, value, disabled, onChange }: {
  testID: string;
  label: string;
  hint?: string;
  value: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
        {hint ? <Text style={[styles.text, { color: colors.muted }]}>{hint}</Text> : null}
      </View>
      <Switch testID={testID} style={styles.switch} accessibilityLabel={label} value={value} disabled={disabled} onValueChange={onChange} />
    </View>
  );
}

/** Modes for each child (lotto 7): calm, pre-reader, legible font, high contrast. */
export function InclusionSettings() {
  const colors = useColors();
  const { t } = useI18n();
  const { extras, apply, ready } = useExtras();
  if (!ready) return null;
  const set = (key: "calmMode" | "preReader" | "legibleFont" | "highContrast") => (value: boolean) =>
    void apply((previous) => ({ ...previous, [key]: value }));
  return (
    <View testID="inclusion-settings" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>{t("inclusion.title")}</Text>
      <Row testID="inclusion-calm" label={t("inclusion.calm")} hint={t("inclusion.calmHint")} value={extras.calmMode} onChange={set("calmMode")} />
      <Row testID="inclusion-preReader" label={t("inclusion.preReader")} hint={t("inclusion.preReaderHint")} value={extras.preReader} onChange={set("preReader")} />
      <Row testID="inclusion-legible" label={t("inclusion.legible")} hint={t("inclusion.legibleHint")} value={extras.legibleFont} onChange={set("legibleFont")} />
      <Row testID="inclusion-contrast" label={t("inclusion.contrast")} hint={t("inclusion.contrastHint")} value={extras.highContrast} onChange={set("highContrast")} />
    </View>
  );
}

/** The company during the session (voci 7, 8 e 9), chosen by the parent. */
export function CompanionSettings() {
  const colors = useColors();
  const { t } = useI18n();
  const { extras, apply, ready } = useExtras();
  if (!ready) return null;
  const set = (key: "creatureVoice" | "serialStory" | "sessionSong") => (value: boolean) =>
    void apply((previous) => ({ ...previous, [key]: value }));
  return (
    <View testID="companion-settings" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>{t("companion.title")}</Text>
      <Row testID="companion-voice" label={t("companion.voice")} hint={t("companion.voiceHint")} value={extras.creatureVoice} onChange={set("creatureVoice")} />
      <Row
        testID="companion-story"
        label={t("companion.story")}
        hint={t("companion.storyHint", { episode: nextEpisode(extras.serialHeard) + 1, total: EPISODES.length })}
        value={extras.serialStory}
        onChange={set("serialStory")}
      />
      <Row testID="companion-song" label={t("companion.song")} hint={t("companion.songHint")} value={extras.sessionSong} onChange={set("sessionSong")} />
    </View>
  );
}

/** Bedtime missions turned on by the parent (voce 28), with the advice by age. */
export function BedtimeSettings() {
  const colors = useColors();
  const { t } = useI18n();
  const { extras, apply, ready } = useExtras();
  if (!ready) return null;
  const toggle = (item: BedtimeItem, on: boolean) =>
    void apply((previous) => ({
      ...previous,
      bedtimeItems: on ? [...new Set([...previous.bedtimeItems, item])] : previous.bedtimeItems.filter((value) => value !== item),
    }));
  return (
    <View testID="bedtime-settings" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>{t("bedtime.title")}</Text>
      <Text style={[styles.text, { color: colors.muted }]}>{t("bedtime.text")}</Text>
      {BEDTIME_ITEMS.map((item) => {
        const allowed = bedtimeAllowed(item, extras.ageGroup);
        return (
          <Row
            key={item}
            testID={`bedtime-setting-${item}`}
            label={t(`bedtime.item.${item}`)}
            hint={t(allowed ? `bedtime.age.${item}` : "bedtime.age.mouthwashTooYoung")}
            value={allowed && extras.bedtimeItems.includes(item)}
            disabled={!allowed}
            onChange={(on) => toggle(item, on)}
          />
        );
      })}
    </View>
  );
}

/** Holiday mode (voce 25): the travel toothbrush with the timer, the handle at home stays out. */
export function HolidaySettings() {
  const colors = useColors();
  const { t, formatDate } = useI18n();
  const { extras, apply, ready } = useExtras();
  const today = useCurrentDayTimestamp();
  const [until, setUntil] = useState("");
  const [error, setError] = useState<string | null>(null);
  if (!ready) return null;
  const active = onHoliday(extras.vacationUntil, localDateKey(today));
  const save = () => {
    const clean = until.trim();
    const [year, month, day] = clean.split("-").map(Number);
    const date = new Date(year, (month ?? 1) - 1, day ?? 1);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(clean) || date.getDate() !== day || clean < localDateKey(Date.now())) {
      setError(t("holiday.invalid"));
      return;
    }
    setError(null);
    void apply((previous) => ({ ...previous, vacationUntil: clean }));
  };
  return (
    <View testID="holiday-settings" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>{t("holiday.title")}</Text>
      <Text style={[styles.text, { color: colors.muted }]}>{t("holiday.text")}</Text>
      {active && extras.vacationUntil ? (
        <>
          <Text testID="holiday-active" style={[styles.label, { color: colors.foreground }]}>
            {t("holiday.activeUntil", { date: formatDate(new Date(`${extras.vacationUntil}T12:00:00`).getTime(), { day: "numeric", month: "long" }) })}
          </Text>
          <VillageButton testID="holiday-stop" secondary label={t("holiday.stop")} onPress={() => void apply((previous) => ({ ...previous, vacationUntil: null }))} />
        </>
      ) : (
        <>
          <TextInput
            testID="holiday-until"
            accessibilityLabel={t("holiday.untilLabel")}
            value={until}
            onChangeText={setUntil}
            placeholder="2026-08-31"
            placeholderTextColor={colors.muted}
            maxLength={10}
            keyboardType="numbers-and-punctuation"
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
          />
          {error ? <Text testID="holiday-error" accessibilityLiveRegion="polite" style={[styles.text, { color: "#BE2D4C" }]}>{error}</Text> : null}
          <VillageButton testID="holiday-start" icon="luggage" label={t("holiday.start")} onPress={save} />
        </>
      )}
    </View>
  );
}

/** Tonight's bedtime missions for the child (voce 28), in Missions. */
export function BedtimeRoutineCard() {
  const colors = useColors();
  const { t } = useI18n();
  const { extras, apply, ready } = useExtras();
  const today = useCurrentDayTimestamp();
  const items = extras.bedtimeItems.filter((item) => bedtimeAllowed(item, extras.ageGroup));
  if (!ready || !items.length) return null;
  const day = localDateKey(today);
  const done = extras.bedtimeDone?.day === day ? extras.bedtimeDone.items : [];
  return (
    <View testID="bedtime-routine" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>{t("bedtime.cardTitle")}</Text>
      {items.map((item) => {
        const checked = done.includes(item);
        return (
          <Pressable
            key={item}
            testID={`bedtime-${item}`}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            aria-checked={checked}
            onPress={() =>
              void apply((previous) => {
                const current = previous.bedtimeDone?.day === day ? previous.bedtimeDone.items : [];
                return { ...previous, bedtimeDone: { day, items: checked ? current.filter((value) => value !== item) : [...current, item] } };
              })}
            style={[styles.check, { borderColor: colors.border }]}
          >
            <Text accessible={false} style={styles.box}>{checked ? "✅" : "⬜"}</Text>
            <Text style={[styles.label, { color: colors.foreground, flex: 1 }]}>{t(`bedtime.item.${item}`)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 22, padding: 18, gap: 12 },
  title: { fontSize: 20, lineHeight: 28, fontWeight: "800" },
  text: { fontSize: 14, lineHeight: 21 },
  label: { fontSize: 15, lineHeight: 22, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  copy: { flex: 1, gap: 2 },
  switch: { minHeight: 44, minWidth: 48 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, fontSize: 16 },
  check: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  box: { fontSize: 18, lineHeight: 24 },
});
