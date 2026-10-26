import { useState } from "react";
import { Pressable, Switch, TextInput, View } from "react-native";
import { DesignText as Text } from "@/components/design-text";
import { useBrush } from "@/contexts/brush-context";
import { useI18n } from "@/contexts/locale-context";
import { usePreferences } from "@/contexts/preferences-context";
import { useColors } from "@/hooks/use-colors";
import { brushHeadDueDate, isCalendarDate, normalizeChildCare } from "@/lib/child-care";
import { localDateKey } from "@/lib/day-progress";

export function ChildCareSettings() {
  const { ready } = usePreferences();
  return ready ? <CareForm /> : null;
}

function CareForm() {
  const { preferences, setPreference } = usePreferences();
  const { isActive, recoveredManualSession, hasPendingManualSession, device } = useBrush();
  const { t, formatDate } = useI18n();
  const colors = useColors();
  const [draft, setDraft] = useState(() => normalizeChildCare(preferences.care));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState<"care.failed" | "care.brushHeadInvalid" | null>(null);
  const locked = isActive || !!recoveredManualSession || hasPendingManualSession || saving;
  const due = brushHeadDueDate(draft.brushHeadChangedOn);
  const inputStyle = { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, color: colors.foreground, fontSize: 16 };
  const save = async () => {
    if (saving) return;
    if (draft.brushHeadChangedOn && (!isCalendarDate(draft.brushHeadChangedOn) || draft.brushHeadChangedOn > localDateKey(Date.now()))) {
      setMessage("care.brushHeadInvalid");
      return;
    }
    setSaving(true);
    setSaved(false);
    setMessage(null);
    try { await setPreference("care", normalizeChildCare(draft)); setSaved(true); }
    catch { setMessage("care.failed"); }
    finally { setSaving(false); }
  };
  return (
    <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 22, padding: 18, gap: 14 }}>
      <Text accessibilityRole="header" style={{ color: colors.foreground, fontSize: 22, fontWeight: "800" }}>{t("care.title")}</Text>
      <Text style={{ color: colors.foreground }}>{t("care.name")}</Text>
      <TextInput testID="care-brushling-name" accessibilityLabel={t("care.name")} value={draft.brushlingName} maxLength={48} editable={!saving} onChangeText={(brushlingName) => setDraft((old) => ({ ...old, brushlingName }))} style={inputStyle} />
      <Text style={{ color: colors.foreground }}>{t("care.duration")}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={t("care.duration")} style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {([60, 90, 120] as const).map((seconds) => (
          <Pressable key={seconds} accessibilityRole="radio" accessibilityState={{ checked: draft.targetSeconds === seconds, disabled: locked }} disabled={locked} onPress={() => setDraft((old) => ({ ...old, targetSeconds: seconds }))} style={{ minHeight: 48, padding: 12, borderWidth: 2, borderColor: draft.targetSeconds === seconds ? colors.primary : colors.border, borderRadius: 12 }}>
            <Text style={{ color: colors.foreground }}>{t("care.seconds", { seconds })}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ color: colors.muted }}>{t("care.durationNote")}</Text>
      {([
        ["vacationMode", "care.vacation"], ["brushTogether", "care.together"],
        ["calmMode", "care.calm"], ["readableText", "care.readable"],
      ] as const).map(([key, label]) => (
        <View key={key} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Text style={{ flex: 1, color: colors.foreground }}>{t(label)}</Text>
          <Switch accessibilityLabel={t(label)} disabled={saving} value={draft[key]} onValueChange={(value) => setDraft((old) => ({ ...old, [key]: value }))} style={{ minHeight: 48, minWidth: 48 }} />
        </View>
      ))}
      <Text style={{ color: colors.foreground }}>{t("care.babysitter")}</Text>
      <TextInput accessibilityLabel={t("care.babysitter")} value={draft.babysitterInstructions} multiline maxLength={600} editable={!saving} onChangeText={(babysitterInstructions) => setDraft((old) => ({ ...old, babysitterInstructions }))} style={[inputStyle, { minHeight: 96, textAlignVertical: "top" }]} />
      <Text style={{ color: colors.foreground }}>{t("care.brushHead")}</Text>
      <TextInput accessibilityLabel={t("care.brushHead")} value={draft.brushHeadChangedOn} placeholder="2026-10-26" placeholderTextColor={colors.muted} maxLength={10} editable={!saving} onChangeText={(brushHeadChangedOn) => setDraft((old) => ({ ...old, brushHeadChangedOn }))} style={inputStyle} />
      {due ? <Text style={{ color: colors.foreground }}>{t("care.brushHeadDue", { date: formatDate(due, { day: "numeric", month: "long", year: "numeric" }) })}</Text> : null}
      {typeof device?.battery === "number" && device.battery <= 20 ? <Text style={{ color: colors.foreground }}>{t("care.lowBattery", { battery: device.battery })}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: saving }} testID="care-save" disabled={saving} onPress={() => void save()} style={{ minHeight: 48, padding: 14, borderRadius: 12, backgroundColor: colors.primary }}>
        <Text style={{ color: colors.primaryText, textAlign: "center", fontSize: 16 }}>{t("care.save")}</Text>
      </Pressable>
      {saved ? <Text accessibilityLiveRegion="polite" style={{ color: colors.foreground }}>{t("care.saved")}</Text> : null}
      {message ? <Text accessibilityRole="alert" style={{ color: colors.error }}>{t(message)}</Text> : null}
    </View>
  );
}
