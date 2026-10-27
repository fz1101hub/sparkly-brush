import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import { ChoiceChips, VillageButton } from "@/components/village-ui";
import { useExtras } from "@/contexts/extras-context";
import { useI18n } from "@/contexts/locale-context";
import { useColors } from "@/hooks/use-colors";
import { localDateKey } from "@/lib/day-progress";
import { DENTIST_NOTICE_DAYS, type DentistNoticeDays } from "@/lib/dental-care";
import { MAX_NOTE_LENGTH } from "@/lib/extras";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A real calendar day, written as YYYY-MM-DD. */
function isCalendarDay(value: string): boolean {
  if (!DAY.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/**
 * Family area: the next dentist visit with its reminder (voce 32) and the note shown in the
 * babysitter guide (voce 34). Both belong to the active child and are in the backup.
 */
export function ParentCareSettings() {
  // The form starts from the saved values: it waits for them.
  return useExtras().ready ? <ParentCareForm /> : null;
}

function ParentCareForm() {
  const colors = useColors();
  const { t } = useI18n();
  const { extras, apply, ready } = useExtras();
  const [day, setDay] = useState(extras.dentistVisit?.day ?? "");
  const [notice, setNotice] = useState<DentistNoticeDays>(extras.dentistVisit?.noticeDays ?? 3);
  const [note, setNote] = useState(extras.babysitterNote);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = [styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }];

  const saveVisit = () => {
    const clean = day.trim();
    if (!isCalendarDay(clean) || clean < localDateKey(Date.now())) {
      setError(t("dentist.invalid"));
      setMessage(null);
      return;
    }
    setError(null);
    // The reminder lifecycle schedules the notification from the saved visit.
    void apply((previous) => ({ ...previous, dentistVisit: { day: clean, noticeDays: notice } })).then(() =>
      setMessage(t("dentist.saved")),
    );
  };
  const clearVisit = () => {
    setDay("");
    setError(null);
    void apply((previous) => ({ ...previous, dentistVisit: null })).then(() => setMessage(null));
  };

  return (
    <View style={styles.stack}>
      <View testID="dentist-settings" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>{t("dentist.title")}</Text>
        <Text style={[styles.text, { color: colors.muted }]}>{t("dentist.text")}</Text>
        <Text style={[styles.label, { color: colors.foreground }]}>{t("dentist.dateLabel")}</Text>
        <TextInput
          testID="dentist-date"
          accessibilityLabel={t("dentist.dateLabel")}
          value={day}
          onChangeText={setDay}
          placeholder="2026-11-15"
          placeholderTextColor={colors.muted}
          maxLength={10}
          keyboardType="numbers-and-punctuation"
          style={input}
        />
        <Text style={[styles.label, { color: colors.foreground }]}>{t("dentist.noticeLabel")}</Text>
        <ChoiceChips<DentistNoticeDays>
          label={t("dentist.noticeLabel")}
          testIDPrefix="dentist-notice"
          value={notice}
          onChange={setNotice}
          options={DENTIST_NOTICE_DAYS.map((days) => ({ value: days, label: t("dentist.noticeDays", { count: days }) }))}
        />
        <View style={styles.row}>
          <View style={styles.action}>
            <VillageButton testID="dentist-save" icon="event-available" label={t("dentist.save")} disabled={!ready} onPress={saveVisit} />
          </View>
          {extras.dentistVisit ? (
            <View style={styles.action}>
              <VillageButton secondary testID="dentist-clear" label={t("dentist.clear")} onPress={clearVisit} />
            </View>
          ) : null}
        </View>
        {error ? (
          <Text accessibilityRole="alert" style={[styles.text, { color: colors.error }]}>
            {error}
          </Text>
        ) : message ? (
          <Text testID="dentist-saved" accessibilityLiveRegion="polite" style={[styles.text, { color: colors.success }]}>
            {message}
          </Text>
        ) : null}
      </View>

      <View testID="babysitter-settings" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>{t("babysitter.screenTitle")}</Text>
        <Text style={[styles.label, { color: colors.foreground }]}>{t("babysitter.noteLabel")}</Text>
        <TextInput
          testID="babysitter-note-input"
          accessibilityLabel={t("babysitter.noteLabel")}
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={MAX_NOTE_LENGTH}
          style={[...input, styles.multiline]}
        />
        <VillageButton
          testID="babysitter-note-save"
          icon="save"
          label={t("babysitter.noteSave")}
          disabled={!ready}
          onPress={() => void apply((previous) => ({ ...previous, babysitterNote: note.trim() }))}
        />
        {extras.babysitterNote && extras.babysitterNote === note.trim() ? (
          <Text accessibilityLiveRegion="polite" style={[styles.text, { color: colors.success }]}>
            {t("babysitter.noteSaved")}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 16 },
  card: { borderWidth: 1, borderRadius: 22, padding: 18, gap: 12 },
  title: { fontSize: 20, lineHeight: 28, fontWeight: "800" },
  text: { fontSize: 14, lineHeight: 22 },
  label: { fontSize: 15, lineHeight: 22, fontWeight: "700" },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 17 },
  multiline: { minHeight: 96, paddingTop: 12, textAlignVertical: "top" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  action: { flexGrow: 1, flexBasis: 140 },
});
