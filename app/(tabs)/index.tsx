import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useKeepAwake } from "expo-keep-awake";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { MouthZones } from "@/components/mouth-zones";
import { ScreenContainer } from "@/components/screen-container";
import { TimerRing } from "@/components/timer-ring";
import { useBrush } from "@/contexts/brush-context";
import { useColors } from "@/hooks/use-colors";

function ActiveWakeLock({ active }: { active: boolean }) {
  if (active) return <KeepAwake />;
  return null;
}

function KeepAwake() {
  useKeepAwake();
  return null;
}

function sameDay(timestamp: number) {
  const date = new Date(timestamp);
  const today = new Date();
  return date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();
}

export default function TodayScreen() {
  const colors = useColors();
  const {
    status,
    statusMessage,
    device,
    history,
    isActive,
    activeElapsed,
    activeTarget,
    activeZone,
    manualActive,
    connect,
    startManual,
    stopManual,
  } = useBrush();

  const todaySessions = history.filter((session) => sameDay(session.startedAt)).length;
  const todaySeconds = history
    .filter((session) => sameDay(session.startedAt))
    .reduce((total, session) => total + session.durationSeconds, 0);
  const connecting = status === "scanning" || status === "connecting";

  return (
    <ScreenContainer>
      <ActiveWakeLock active={isActive} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader eyebrow="Sparkly Brush" title="Ciao, campione!" connected={status === "connected"} />

        <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.statusIcon, { backgroundColor: status === "connected" ? "#E1F7EF" : "#EEF2FF" }]}>
            <MaterialIcons
              name={status === "connected" ? "bluetooth-connected" : "bluetooth-searching"}
              size={23}
              color={status === "connected" ? colors.success : colors.primary}
            />
          </View>
          <View style={styles.statusCopy}>
            <Text style={[styles.statusTitle, { color: colors.foreground }]}>
              {device?.name ?? (connecting ? "Cerco Sonicare…" : "HX6322/04")}
            </Text>
            <Text style={[styles.statusText, { color: colors.muted }]}>{statusMessage}</Text>
          </View>
          {status !== "connected" ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Collega lo spazzolino"
              disabled={connecting}
              onPress={() => void connect()}
              style={({ pressed }) => [styles.smallButton, pressed && styles.pressed, connecting && styles.disabled]}
            >
              <Text style={styles.smallButtonText}>{connecting ? "Attendi" : "Collega"}</Text>
            </Pressable>
          ) : device?.battery !== undefined ? (
            <View style={styles.batteryBadge}>
              <MaterialIcons name="battery-5-bar" size={17} color={colors.success} />
              <Text style={[styles.batteryText, { color: colors.success }]}>{device.battery}%</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.timerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.timerHeading}>
            <View>
              <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>SESSIONE GUIDATA</Text>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                {isActive ? "Continua così!" : "Pronto a spazzolare?"}
              </Text>
            </View>
            <View style={[styles.modeBadge, { backgroundColor: "#FFF0E4" }]}>
              <Text style={styles.modeBadgeText}>{device ? liveMode(device.model) : "Kids"}</Text>
            </View>
          </View>

          <View style={styles.timerCenter}>
            <TimerRing elapsed={activeElapsed} target={activeTarget} active={isActive} />
          </View>

          <Text style={[styles.zonePrompt, { color: colors.foreground }]}>
            {isActive ? `Spazzola: ${["alto a destra", "alto a sinistra", "basso a sinistra", "basso a destra"][activeZone]}` : "Ogni zona riceve la stessa attenzione"}
          </Text>
          <MouthZones activeZone={activeZone} isActive={isActive} />

          <Pressable
            accessibilityRole="button"
            onPress={manualActive ? () => void stopManual() : startManual}
            disabled={liveIsActive(isActive, manualActive)}
            style={({ pressed }) => [
              styles.primaryButton,
              manualActive && styles.stopButton,
              liveIsActive(isActive, manualActive) && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <MaterialIcons name={manualActive ? "stop-circle" : "play-arrow"} size={24} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>
              {manualActive ? "Termina sessione" : isActive ? "Sessione dallo spazzolino" : "Avvia anche senza Bluetooth"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: "#E7F7F1" }]}>
            <MaterialIcons name="done-all" size={24} color={colors.success} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{todaySessions}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>sessioni oggi</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#FFF0E4" }]}>
            <MaterialIcons name="schedule" size={24} color={colors.warning} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{Math.round(todaySeconds / 60)} min</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>spazzolati oggi</Text>
          </View>
        </View>

        <View style={styles.privacyNote}>
          <MaterialIcons name="lock-outline" size={18} color={colors.muted} />
          <Text style={[styles.privacyText, { color: colors.muted }]}>
            Nessun account: lo storico resta su questo telefono.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function liveIsActive(isActive: boolean, manualActive: boolean) {
  return isActive && !manualActive;
}

function liveMode(model: string) {
  return model.includes("HX6322") ? "Kids" : "Clean";
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 120, gap: 18 },
  statusCard: { borderRadius: 22, borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  statusIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  statusCopy: { flex: 1 },
  statusTitle: { fontSize: 15, lineHeight: 21, fontWeight: "800" },
  statusText: { fontSize: 12, lineHeight: 17, marginTop: 1 },
  smallButton: { backgroundColor: "#2457D6", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  smallButtonText: { color: "#FFFFFF", fontSize: 13, lineHeight: 18, fontWeight: "800" },
  batteryBadge: { flexDirection: "row", alignItems: "center", gap: 3 },
  batteryText: { fontSize: 13, fontWeight: "800" },
  timerCard: { borderRadius: 28, borderWidth: 1, padding: 18, shadowColor: "#142044", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 3 },
  timerHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  sectionEyebrow: { fontSize: 11, lineHeight: 16, fontWeight: "900", letterSpacing: 1.2 },
  sectionTitle: { fontSize: 22, lineHeight: 28, fontWeight: "900", marginTop: 2 },
  modeBadge: { borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7 },
  modeBadgeText: { color: "#BA4E13", fontSize: 12, lineHeight: 16, fontWeight: "900" },
  timerCenter: { alignItems: "center", paddingVertical: 18 },
  zonePrompt: { fontSize: 15, lineHeight: 21, fontWeight: "800", textAlign: "center", marginBottom: 12 },
  primaryButton: { marginTop: 16, minHeight: 54, backgroundColor: "#2457D6", borderRadius: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 18 },
  stopButton: { backgroundColor: "#D33D5D" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, lineHeight: 21, fontWeight: "900", textAlign: "center" },
  pressed: { opacity: 0.86, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.55 },
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, minHeight: 128, borderRadius: 22, padding: 16, justifyContent: "space-between" },
  statValue: { fontSize: 24, lineHeight: 30, fontWeight: "900", marginTop: 8 },
  statLabel: { fontSize: 12, lineHeight: 17, fontWeight: "600" },
  privacyNote: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 5 },
  privacyText: { fontSize: 12, lineHeight: 17 },
});
