import { useEffect, useRef } from "react";
import { AppState, StyleSheet, Switch, View } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import { useBrush } from "@/contexts/brush-context";
import { useExtras, useOptionalExtras } from "@/contexts/extras-context";
import { useI18n } from "@/contexts/locale-context";
import { useColors } from "@/hooks/use-colors";
import { useCurrentDayTimestamp } from "@/hooks/use-current-day";
import { onHoliday } from "@/lib/bedtime";
import { localDateKey } from "@/lib/day-progress";
import { addZoneSeconds, motorHours } from "@/lib/handle-zones";

/**
 * Experimental handle features (lotto 11), off by default until the hardware test plan confirms
 * them on the HX6322: zones from the handle (voce 10), the forgotten zone (voce 11), connecting by
 * itself when the app opens (voce 38) and the motor run time (voce 35).
 */
export function ExperimentalHandleCard() {
  const colors = useColors();
  const { t, formatNumber } = useI18n();
  const { device } = useBrush();
  const { extras, apply, ready } = useExtras();
  if (!ready) return null;
  const hours = motorHours(device?.motorRuntimeSeconds);
  const set = (key: "handleZones" | "autoConnect") => (value: boolean) => void apply((previous) => ({ ...previous, [key]: value }));
  return (
    <View testID="handle-experiments" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>{t("experiments.title")}</Text>
      <Text style={[styles.text, { color: colors.muted }]}>{t("experiments.text")}</Text>
      {([
        ["handleZones", "experiments.zones", "experiments.zonesHint"],
        ["autoConnect", "experiments.autoConnect", "experiments.autoConnectHint"],
      ] as const).map(([key, label, hint]) => (
        <View key={key} style={styles.row}>
          <View style={styles.copy}>
            <Text style={[styles.label, { color: colors.foreground }]}>{t(label)}</Text>
            <Text style={[styles.text, { color: colors.muted }]}>{t(hint)}</Text>
          </View>
          <Switch testID={`experiment-${key}`} style={styles.switch} accessibilityLabel={t(label)} value={extras[key]} onValueChange={set(key)} />
        </View>
      ))}
      <Text testID="handle-motor" style={[styles.text, { color: colors.foreground }]}>
        {hours === null ? t("experiments.motorUnknown") : t("experiments.motor", { hours: formatNumber(hours) })}
      </Text>
    </View>
  );
}

/** Adds up the seconds of each zone while the handle brushes and keeps them when it stops. */
export function ZoneTracker() {
  const record = useOptionalExtras();
  const { live, demoMode } = useBrush();
  const enabled = record?.extras.handleZones === true && !demoMode;
  const apply = record?.apply;
  const seconds = useRef<number[]>([]);
  const last = useRef<number | null>(null);
  const seen = useRef(false);

  useEffect(() => {
    if (!enabled || !apply) return;
    if (live.isBrushing) {
      const previous = last.current;
      last.current = live.elapsedSeconds;
      if (previous !== null && typeof live.quadrant === "number") {
        seconds.current = addZoneSeconds(seconds.current, live.quadrant, live.elapsedSeconds - previous);
        seen.current = true;
      }
      return;
    }
    if (seen.current) {
      const total = seconds.current;
      void apply((current) => ({ ...current, zoneSeconds: { day: localDateKey(Date.now()), seconds: [0, 1, 2, 3].map((zone) => total[zone] ?? 0) } }));
    }
    seconds.current = [];
    last.current = null;
    seen.current = false;
  }, [apply, enabled, live.elapsedSeconds, live.isBrushing, live.quadrant]);

  return null;
}

/**
 * Connects to the paired handle by itself when the app opens or comes back to the foreground
 * (voce 38): one attempt each time, so a handle that is off does not keep the phone scanning.
 */
export function AutoConnect() {
  const record = useOptionalExtras();
  const { status, pairedDevice, demoMode, connect } = useBrush();
  const enabled = record?.extras.autoConnect === true;
  const today = useCurrentDayTimestamp();
  const holiday = onHoliday(record?.extras.vacationUntil ?? null, localDateKey(today));
  const ready = enabled && !holiday && !demoMode && pairedDevice !== null;
  const statusRef = useRef(status);
  const connectRef = useRef(connect);
  useEffect(() => {
    statusRef.current = status;
    connectRef.current = connect;
  }, [connect, status]);

  useEffect(() => {
    if (!ready) return;
    const attempt = () => {
      if (statusRef.current !== "idle" && statusRef.current !== "error") return;
      void connectRef.current();
    };
    attempt();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") attempt();
    });
    return () => subscription.remove();
  }, [ready]);

  return null;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 21, padding: 13, gap: 10 },
  title: { fontSize: 16, lineHeight: 22, fontWeight: "900" },
  text: { fontSize: 14, lineHeight: 20 },
  label: { fontSize: 15, lineHeight: 21, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  copy: { flex: 1, gap: 2 },
  switch: { minHeight: 44, minWidth: 48 },
});
