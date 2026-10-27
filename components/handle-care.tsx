import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, StyleSheet, View } from "react-native";
import { DesignText as Text } from "@/components/design-text";

import { useBrush } from "@/contexts/brush-context";
import { useExtras } from "@/contexts/extras-context";
import { useOptionalFamily } from "@/contexts/family-context-value";
import { useI18n } from "@/contexts/locale-context";
import { useParentGate } from "@/contexts/parent-gate-context";
import { useAsyncAction } from "@/hooks/use-async-action";
import { useColors } from "@/hooks/use-colors";
import { useCurrentDayTimestamp } from "@/hooks/use-current-day";
import { localDateKey } from "@/lib/day-progress";
import {
  HEAD_NOTICE_DAYS,
  headDaysLeft,
  LOW_BATTERY_PERCENT,
  recommendedIntensity,
} from "@/lib/dental-care";
import { confirmAction, showMessage } from "@/lib/dialogs";
import { errorText } from "@/lib/localized-error";

const WARN = "#9A5B00";
const WARN_BACKGROUND = "#FFF8E8";
const WARN_BORDER = "#F2D588";

function dayTimestamp(dayKey: string): number {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(year, month - 1, day, 12).getTime();
}

/**
 * A sibling's handle was found while this child searched for theirs (voce 37): one tap opens the
 * profile it belongs to, where it connects without mixing rewards.
 */
export function SiblingHandleCard() {
  const { t } = useI18n();
  const colors = useColors();
  const runAction = useAsyncAction();
  const family = useOptionalFamily();
  const { siblingHandle, dismissSiblingHandle } = useBrush();
  const owner = family?.profiles.find((profile) => profile.id === siblingHandle?.ownerProfileId);
  if (!family || !siblingHandle || !owner) return null;
  return (
    <View testID="device-sibling-handle" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.row}>
        <MaterialIcons accessible={false} name="people" size={22} color={colors.primary} />
        <Text style={[styles.text, { color: colors.foreground }]}>{t("device.sibling.found", { name: owner.name })}</Text>
      </View>
      <View style={styles.actions}>
        <Pressable
          testID="device-sibling-switch"
          accessibilityRole="button"
          onPress={() => {
            dismissSiblingHandle();
            runAction(family.switchProfile(owner.id));
          }}
          style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary }, pressed && styles.pressed]}
        >
          <Text style={styles.primaryText}>{t("device.sibling.switch", { name: owner.name })}</Text>
        </Pressable>
        <Pressable
          testID="device-sibling-dismiss"
          accessibilityRole="button"
          onPress={dismissSiblingHandle}
          style={({ pressed }) => [styles.secondary, { borderColor: colors.border }, pressed && styles.pressed]}
        >
          <Text style={[styles.secondaryText, { color: colors.foreground }]}>{t("device.sibling.dismiss")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Looking after the handle (voci 35 e 36): recharge when the battery is low, the brush head
 * every three months from the day the parent records, and the power setting for the child's age.
 */
export function HandleCareCard() {
  const { t, formatDate } = useI18n();
  const colors = useColors();
  const runAction = useAsyncAction();
  const { requireParent } = useParentGate();
  const { status, device, live } = useBrush();
  const { extras, apply } = useExtras();
  const today = useCurrentDayTimestamp();
  const connected = status === "connected";
  const battery = connected ? device?.battery : undefined;
  const lowBattery = battery !== undefined && battery < LOW_BATTERY_PERCENT;
  const left = extras.headChangedOn ? headDaysLeft(extras.headChangedOn, today) : null;
  const headDue = left !== null && left <= HEAD_NOTICE_DAYS;
  const recommended = recommendedIntensity(extras.ageGroup);
  const current = live.intensity === "bassa" ? "low" : live.intensity === "alta" ? "high" : null;

  const headText = left === null
    ? t("device.head.unknown")
    : left <= 0
      ? t("device.head.overdue")
      : headDue
        ? t("device.head.soon", { count: left })
        : t("device.head.next", { date: formatDate(dayTimestamp(extras.headChangedOn!), { day: "numeric", month: "long" }), count: left });

  const recordChange = () => requireParent(() => {
    confirmAction({
      title: t("device.head.confirmTitle"),
      message: t("device.head.confirmMessage"),
      cancelLabel: t("common.cancel"),
      confirmLabel: t("device.head.changedToday"),
      onConfirm: () => runAction(apply((previous) => ({ ...previous, headChangedOn: localDateKey(Date.now()) }))),
    });
  });

  return (
    <View testID="device-care" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>{t("device.care.title")}</Text>
      {lowBattery ? (
        <View testID="device-battery-low" style={[styles.row, styles.warn]}>
          <MaterialIcons accessible={false} name="battery-alert" size={22} color={WARN} />
          <Text style={[styles.text, { color: "#17213A" }]}>{t("device.battery.low", { percent: battery })}</Text>
        </View>
      ) : null}
      <View testID="device-head" style={[styles.row, headDue && styles.warn]}>
        <MaterialIcons accessible={false} name="brush" size={22} color={headDue ? WARN : colors.primary} />
        <Text style={[styles.text, { color: headDue ? "#17213A" : colors.foreground }]}>{headText}</Text>
      </View>
      <Pressable
        testID="device-head-changed"
        accessibilityRole="button"
        accessibilityHint={t("device.head.hint")}
        onPress={recordChange}
        style={({ pressed }) => [styles.secondary, { borderColor: colors.border }, pressed && styles.pressed]}
      >
        <Text style={[styles.secondaryText, { color: colors.foreground }]}>{t("device.head.changedToday")}</Text>
      </Pressable>
      <View testID="device-intensity-tip" style={styles.row}>
        <MaterialIcons accessible={false} name="speed" size={22} color={colors.primary} />
        <Text style={[styles.text, { color: colors.foreground }]}>
          {recommended === null
            ? t("device.intensityTip.unknownAge")
            : t(recommended === "low" ? "device.intensityTip.low" : "device.intensityTip.high")}
          {recommended !== null && current !== null && current !== recommended ? ` ${t("device.intensityTip.mismatch")}` : ""}
        </Text>
      </View>
    </View>
  );
}

/**
 * Gives the handle to another child (voce 50), behind the parent gate: this child's sessions are
 * imported first, then the new owner only receives the brushing done from now on.
 */
export function HandleTransferCard() {
  const { t } = useI18n();
  const colors = useColors();
  const family = useOptionalFamily();
  const { requireParent } = useParentGate();
  const { status, device, pairedDevice, demoMode, isForgettingToothbrush, transferToothbrushTo } = useBrush();
  const others = family?.profiles.filter((profile) => profile.id !== family.active.id) ?? [];
  if (!family || others.length === 0) return null;
  const handle = device ?? pairedDevice;
  const connected = status === "connected";
  const disabled = !handle || demoMode || isForgettingToothbrush || status === "scanning" || status === "connecting";

  const transfer = (profileId: string, name: string) => requireParent(() => {
    confirmAction({
      title: t("device.transfer.confirmTitle", { name }),
      message: t(connected ? "device.transfer.confirmConnected" : "device.transfer.confirmOffline", { from: family.active.name, to: name }),
      cancelLabel: t("common.cancel"),
      confirmLabel: t("device.transfer.action"),
      onConfirm: () => {
        transferToothbrushTo(profileId).then(
          () => showMessage(t("device.transfer.doneTitle"), t("device.transfer.doneMessage", { name })),
          (error: unknown) => showMessage(t("device.transfer.failedTitle"), errorText(error, t, "device.transfer.error.failed")),
        );
      },
    });
  });

  return (
    <View testID="device-transfer" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>{t("device.transfer.title")}</Text>
      <Text style={[styles.text, { color: colors.muted }]}>
        {handle
          ? t(connected ? "device.transfer.descriptionConnected" : "device.transfer.descriptionOffline", { name: family.active.name })
          : t("device.transfer.noHandle")}
      </Text>
      <View style={styles.chips}>
        {others.map((profile) => (
          <Pressable
            key={profile.id}
            testID={`device-transfer-${profile.id}`}
            accessibilityRole="button"
            accessibilityLabel={t("device.transfer.toChild", { name: profile.name })}
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={() => transfer(profile.id, profile.name)}
            style={({ pressed }) => [styles.secondary, { borderColor: colors.border }, disabled && styles.disabled, pressed && styles.pressed]}
          >
            <Text style={[styles.secondaryText, { color: colors.foreground }]}>{t("device.transfer.toChild", { name: profile.name })}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 21, padding: 13, gap: 10 },
  title: { fontSize: 16, lineHeight: 22, fontWeight: "900" },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  warn: { backgroundColor: WARN_BACKGROUND, borderColor: WARN_BORDER, borderWidth: 1, borderRadius: 14, padding: 10 },
  text: { flex: 1, fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  primary: { minHeight: 44, borderRadius: 99, paddingHorizontal: 16, justifyContent: "center" },
  primaryText: { color: "#FFFFFF", fontSize: 14, lineHeight: 20, fontWeight: "900" },
  secondary: { minHeight: 44, borderRadius: 99, borderWidth: 1, paddingHorizontal: 14, justifyContent: "center", alignSelf: "flex-start" },
  secondaryText: { fontSize: 14, lineHeight: 20, fontWeight: "800" },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
});
