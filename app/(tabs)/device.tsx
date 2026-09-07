import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { ScreenContainer } from "@/components/screen-container";
import { useBrush } from "@/contexts/brush-context";
import { useColors } from "@/hooks/use-colors";
import type { DiagnosticLog } from "@/lib/brush-types";
import { HANDLE_STATE_LABELS } from "@/lib/sonicare-uuids";

export default function DeviceScreen() {
  const colors = useColors();
  const {
    status,
    statusMessage,
    adapterState,
    device,
    live,
    logs,
    connect,
    disconnect,
    syncLatest,
  } = useBrush();
  const connected = status === "connected";
  const busy = status === "scanning" || status === "connecting";

  const renderLog = ({ item }: { item: DiagnosticLog }) => (
    <View style={styles.logRow}>
      <View style={[styles.logDot, { backgroundColor: logColor(item.level) }]} />
      <View style={styles.logCopy}>
        <Text style={[styles.logMessage, { color: colors.foreground }]}>{item.message}</Text>
        <Text style={[styles.logTime, { color: colors.muted }]}>
          {new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(item.at))}
        </Text>
      </View>
    </View>
  );

  return (
    <ScreenContainer>
      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        renderItem={renderLog}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={[styles.logSeparator, { backgroundColor: colors.border }]} />}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <AppHeader eyebrow="Bluetooth Low Energy" title="Spazzolino" connected={connected} />

            <View style={[styles.heroCard, { backgroundColor: connected ? "#E1F7EF" : "#E7EEFF" }]}>
              <View style={styles.toothbrushVisual}>
                <View style={styles.brushHead}>
                  <View style={styles.bristles} />
                </View>
                <View style={styles.brushHandle}>
                  <View style={styles.powerDot} />
                </View>
              </View>
              <View style={styles.heroCopy}>
                <Text style={[styles.heroModel, { color: colors.foreground }]}>{device?.model ?? "Philips Sonicare for Kids"}</Text>
                <Text style={[styles.heroStatus, { color: colors.muted }]}>{statusMessage}</Text>
                <View style={styles.badges}>
                  <View style={styles.protocolBadge}><Text style={styles.protocolText}>HX63xx · GATT aperto</Text></View>
                  {device?.battery !== undefined ? <View style={styles.batteryBadge}><Text style={styles.batteryText}>{device.battery}%</Text></View> : null}
                </View>
              </View>
            </View>

            <View style={styles.actions}>
              <Pressable
                onPress={connected ? () => void disconnect() : () => void connect()}
                disabled={busy}
                style={({ pressed }) => [styles.primaryButton, connected && styles.disconnectButton, busy && styles.disabled, pressed && styles.pressed]}
              >
                <MaterialIcons name={connected ? "link-off" : "bluetooth-searching"} size={22} color="#FFFFFF" />
                <Text style={styles.primaryText}>{connected ? "Disconnetti" : busy ? "Ricerca…" : "Cerca e collega"}</Text>
              </Pressable>
              <Pressable
                onPress={() => void syncLatest()}
                disabled={!connected}
                style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.surface }, !connected && styles.disabled, pressed && styles.pressed]}
              >
                <MaterialIcons name="sync" size={22} color={colors.primary} />
                <Text style={[styles.secondaryText, { color: colors.primary }]}>Sincronizza ultima</Text>
              </Pressable>
            </View>

            <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <InfoRow icon="bluetooth" label="Adattatore" value={adapterState} />
              <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
              <InfoRow icon="motion-photos-on" label="Stato manico" value={HANDLE_STATE_LABELS[live.handleState] ?? "sconosciuto"} />
              <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
              <InfoRow icon="speed" label="Intensità" value={live.intensity} />
              <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
              <InfoRow icon="memory" label="Firmware" value={device?.firmware ?? "da leggere"} />
            </View>

            <View style={styles.diagnosticHeading}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Diagnostica BLE</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>Utile per validare il tuo HX6322/04 reale</Text>
              </View>
              <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.emptyLog, { borderColor: colors.border }]}>
            <Text style={[styles.emptyLogText, { color: colors.muted }]}>I messaggi Bluetooth appariranno qui.</Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={styles.infoRow}>
      <MaterialIcons name={icon} size={20} color={colors.primary} />
      <Text style={[styles.infoLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

function logColor(level: DiagnosticLog["level"]) {
  if (level === "success") return "#11845B";
  if (level === "warning") return "#E36B24";
  if (level === "error") return "#D33D5D";
  return "#2457D6";
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 120 },
  headerContent: { gap: 18, marginBottom: 14 },
  heroCard: { borderRadius: 26, padding: 18, flexDirection: "row", alignItems: "center", gap: 18 },
  toothbrushVisual: { width: 60, height: 136, alignItems: "center" },
  brushHead: { width: 28, height: 42, borderRadius: 12, backgroundColor: "#FFFFFF", alignItems: "center", paddingTop: 5, zIndex: 2 },
  bristles: { width: 18, height: 12, borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: "#82A6FF" },
  brushHandle: { width: 42, height: 100, borderRadius: 20, backgroundColor: "#2457D6", marginTop: -8, alignItems: "center", paddingTop: 34 },
  powerDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#FFFFFF" },
  heroCopy: { flex: 1 },
  heroModel: { fontSize: 18, lineHeight: 24, fontWeight: "900" },
  heroStatus: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 },
  protocolBadge: { backgroundColor: "#FFFFFF", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 6 },
  protocolText: { color: "#2457D6", fontSize: 10, lineHeight: 14, fontWeight: "900" },
  batteryBadge: { backgroundColor: "#11845B", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 6 },
  batteryText: { color: "#FFFFFF", fontSize: 10, lineHeight: 14, fontWeight: "900" },
  actions: { flexDirection: "row", gap: 10 },
  primaryButton: { flex: 1, minHeight: 52, borderRadius: 17, backgroundColor: "#2457D6", flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 7, paddingHorizontal: 12 },
  disconnectButton: { backgroundColor: "#D33D5D" },
  primaryText: { color: "#FFFFFF", fontSize: 13, lineHeight: 18, fontWeight: "900" },
  secondaryButton: { flex: 1, minHeight: 52, borderRadius: 17, borderWidth: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 7, paddingHorizontal: 12 },
  secondaryText: { fontSize: 13, lineHeight: 18, fontWeight: "900" },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  infoCard: { borderRadius: 22, borderWidth: 1, paddingHorizontal: 15 },
  infoRow: { minHeight: 50, flexDirection: "row", alignItems: "center", gap: 10 },
  infoLabel: { flex: 1, fontSize: 13, lineHeight: 18 },
  infoValue: { fontSize: 13, lineHeight: 18, fontWeight: "800", textTransform: "capitalize" },
  infoDivider: { height: StyleSheet.hairlineWidth, marginLeft: 30 },
  diagnosticHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  sectionTitle: { fontSize: 19, lineHeight: 25, fontWeight: "900" },
  sectionSubtitle: { fontSize: 11, lineHeight: 16, marginTop: 1 },
  liveBadge: { borderRadius: 99, backgroundColor: "#E1F7EF", flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#11845B" },
  liveText: { color: "#11845B", fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  logRow: { flexDirection: "row", gap: 10, paddingVertical: 11, paddingHorizontal: 4 },
  logDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  logCopy: { flex: 1 },
  logMessage: { fontSize: 12, lineHeight: 17, fontWeight: "600" },
  logTime: { fontSize: 10, lineHeight: 14, marginTop: 2 },
  logSeparator: { height: StyleSheet.hairlineWidth, marginLeft: 18 },
  emptyLog: { borderWidth: 1, borderStyle: "dashed", borderRadius: 18, padding: 18, alignItems: "center" },
  emptyLogText: { fontSize: 12, lineHeight: 17 },
});
