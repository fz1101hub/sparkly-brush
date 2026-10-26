import { useState } from "react";
import { Pressable, View } from "react-native";
import { DesignText as Text } from "@/components/design-text";
import { useBrush } from "@/contexts/brush-context";
import { useI18n } from "@/contexts/locale-context";
import { useParentGate } from "@/contexts/parent-gate-context";
import { useColors } from "@/hooks/use-colors";
import { confirmAction } from "@/lib/dialogs";
import { routineSlot } from "@/lib/day-progress";

/** Mounted inside the parent-guarded family screen; never writes demo or BLE identities. */
export function ParentRecordedSession() {
  const { t } = useI18n();
  const colors = useColors();
  const { requireParent } = useParentGate();
  const brush = useBrush();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<"care.recordSuccess" | "care.failed" | "care.recordFuture" | null>(null);
  const save = async (period: "morning" | "evening") => {
    if (saving) return;
    const now = new Date();
    if (period === "evening" && routineSlot(now.getTime()) !== "evening") {
      setMessage("care.recordFuture");
      return;
    }
    setSaving(true);
    try { await brush.recordParentSession(period); setMessage("care.recordSuccess"); }
    catch { setMessage("care.failed"); }
    finally { setSaving(false); }
  };
  return <View style={{ padding: 18, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 12 }}>
    <Text accessibilityRole="header" style={{ color: colors.foreground, fontSize: 20, fontWeight: "800" }}>{t("care.record")}</Text>
    <Text style={{ color: colors.muted }}>{t("care.recordNote")}</Text>
    {(["morning", "evening"] as const).map((period) => <Pressable key={period} accessibilityRole="button" disabled={saving || brush.demoMode || brush.isActive} accessibilityState={{ disabled: saving || brush.demoMode || brush.isActive }} onPress={() => requireParent(() => confirmAction({ title: t("care.record"), message: t("care.recordConfirm"), confirmLabel: t("common.continue"), cancelLabel: t("common.cancel"), onConfirm: () => { void save(period); } }))} style={{ minHeight: 48, padding: 12, borderRadius: 12, backgroundColor: colors.primary }}>
      <Text style={{ color: colors.primaryText, textAlign: "center" }}>{t(period === "morning" ? "care.recordMorning" : "care.recordEvening")}</Text>
    </Pressable>)}
    {message ? <Text accessibilityLiveRegion="polite" style={{ color: message === "care.failed" ? colors.error : colors.foreground }}>{t(message)}</Text> : null}
  </View>;
}
