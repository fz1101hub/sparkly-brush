import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import { ChoiceChips, VillageButton } from "@/components/village-ui";
import { useExtras } from "@/contexts/extras-context";
import { useI18n } from "@/contexts/locale-context";
import { useVillage } from "@/contexts/village-context";
import { useColors } from "@/hooks/use-colors";
import { localDateKey } from "@/lib/day-progress";
import { DENTAL_RECORD_KINDS, MAX_DENTAL_NOTE, type DentalRecordKind } from "@/lib/extras";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function isCalendarDay(value: string): boolean {
  if (!DAY.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/**
 * The dental booklet (voce 64): visits, sealants, fluoride and the orthodontist's notes, next to the
 * dentist reminder (voce 32) and the baby teeth given to the tooth mouse (voce 26). It goes in the
 * report for the dentist and in the backup with the child's extras.
 */
export function DentalBooklet() {
  const colors = useColors();
  const { t, formatDate } = useI18n();
  const { extras, apply } = useExtras();
  const { state } = useVillage();
  const [kind, setKind] = useState<DentalRecordKind>("visit");
  const [day, setDay] = useState(() => localDateKey(Date.now()));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const input = [styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }];
  const records = [...extras.dentalRecords].sort((first, second) => second.day.localeCompare(first.day));

  const add = () => {
    const clean = day.trim();
    if (!isCalendarDay(clean) || clean > localDateKey(Date.now())) {
      setError(t("booklet.invalidDay"));
      return;
    }
    setError(null);
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    void apply((previous) => ({ ...previous, dentalRecords: [...previous.dentalRecords, { id, kind, day: clean, note: note.trim() }] })).then(() => setNote(""));
  };

  return (
    <View style={styles.stack}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.text, { color: colors.muted }]}>{t("booklet.text")}</Text>
        <Text testID="booklet-summary" style={[styles.text, { color: colors.foreground }]}>
          {t("booklet.summary", {
            teeth: state.lostTeeth.length,
            visit: extras.dentistVisit ? formatDate(new Date(`${extras.dentistVisit.day}T12:00:00`).getTime(), { day: "numeric", month: "long" }) : "—",
          })}
        </Text>
      </View>
      <View testID="booklet-form" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>{t("booklet.add")}</Text>
        <ChoiceChips<DentalRecordKind>
          label={t("booklet.kindLabel")}
          testIDPrefix="booklet-kind"
          value={kind}
          onChange={setKind}
          options={DENTAL_RECORD_KINDS.map((value) => ({ value, label: t(`booklet.kind.${value}`) }))}
        />
        <TextInput
          testID="booklet-day"
          accessibilityLabel={t("booklet.dayLabel")}
          value={day}
          onChangeText={setDay}
          placeholder="2026-10-27"
          placeholderTextColor={colors.muted}
          maxLength={10}
          keyboardType="numbers-and-punctuation"
          style={input}
        />
        <TextInput
          testID="booklet-note"
          accessibilityLabel={t("booklet.noteLabel")}
          value={note}
          onChangeText={setNote}
          placeholder={t("booklet.notePlaceholder")}
          placeholderTextColor={colors.muted}
          maxLength={MAX_DENTAL_NOTE}
          multiline
          style={[input, styles.multiline]}
        />
        {error ? <Text testID="booklet-error" accessibilityLiveRegion="polite" style={[styles.text, { color: "#BE2D4C" }]}>{error}</Text> : null}
        <VillageButton testID="booklet-save" icon="add" label={t("booklet.save")} onPress={add} />
      </View>
      {records.length ? records.map((record) => (
        <View key={record.id} testID={`booklet-record-${record.id}`} style={[styles.record, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.copy}>
            <Text style={[styles.recordTitle, { color: colors.foreground }]}>
              {t(`booklet.kind.${record.kind}`)} · {formatDate(new Date(`${record.day}T12:00:00`).getTime(), { day: "numeric", month: "long", year: "numeric" })}
            </Text>
            {record.note ? <Text style={[styles.text, { color: colors.muted }]}>{record.note}</Text> : null}
          </View>
          <Pressable
            testID="booklet-remove"
            accessibilityRole="button"
            accessibilityLabel={t("booklet.remove")}
            onPress={() => void apply((previous) => ({ ...previous, dentalRecords: previous.dentalRecords.filter((item) => item.id !== record.id) }))}
            style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
          >
            <MaterialIcons accessible={false} name="delete-outline" size={22} color="#B33A55" />
          </Pressable>
        </View>
      )) : <Text testID="booklet-empty" style={[styles.text, { color: colors.muted }]}>{t("booklet.empty")}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 14 },
  card: { borderWidth: 1, borderRadius: 22, padding: 16, gap: 10 },
  title: { fontSize: 18, lineHeight: 24, fontWeight: "900" },
  text: { fontSize: 14, lineHeight: 21 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, fontSize: 16 },
  multiline: { minHeight: 80, paddingTop: 10, textAlignVertical: "top" },
  record: { borderWidth: 1, borderRadius: 18, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  copy: { flex: 1, gap: 2 },
  recordTitle: { fontSize: 15, lineHeight: 21, fontWeight: "800" },
  remove: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.7 },
});
