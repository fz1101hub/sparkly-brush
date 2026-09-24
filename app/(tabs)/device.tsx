import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { ScreenContainer } from "@/components/screen-container";
import { useBrush } from "@/contexts/brush-context";
import { useI18n } from "@/contexts/locale-context";
import { useColors } from "@/hooks/use-colors";
import type { DiagnosticLog } from "@/lib/brush-types";
import { localizeSonicareMessage } from "@/lib/sonicare-message-i18n";

const LIGHT_CARD_FOREGROUND = "#17213A";
const LIGHT_CARD_MUTED = "#56617D";

export default function DeviceScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t, formatDate } = useI18n();
  const {
    status,
    statusMessage,
    adapterState,
    device,
    live,
    logs,
    connect,
    disconnect,
    forgetToothbrush,
    syncLatest,
    demoMode,
    demoSessionCount,
    setDemoMode,
    addDemoSession,
    generateDemoWeek,
    clearDemoData,
    isForgettingToothbrush,
  } = useBrush();
  const connected = status === "connected";
  const busy = status === "scanning" || status === "connecting" || isForgettingToothbrush;

  const confirmForgetToothbrush = () => {
    Alert.alert(t("device.forgetAlertTitle"), t("device.forgetAlertMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("device.forgetAction"),
        style: "destructive",
        onPress: () =>
          void forgetToothbrush().catch(() => {
            Alert.alert(t("device.forgetFailureTitle"), t("device.retryLater"));
          }),
      },
    ]);
  };

  const renderLog = ({ item }: { item: DiagnosticLog }) => {
    const message = item.translationKey
      ? t(item.translationKey, item.translationParams)
      : localizeSonicareMessage(item.message, t);
    return (
      <View style={styles.logRow}>
        <View
          style={[styles.logDot, { backgroundColor: logColor(item.level) }]}
        />
        <View style={styles.logCopy}>
          <Text style={[styles.logMessage, { color: colors.foreground }]}>
            {message}
          </Text>
          <Text style={[styles.logTime, { color: colors.muted }]}>
            {formatDate(item.at, {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer>
      <FlatList
        testID="device-screen"
        data={logs}
        keyExtractor={(item) => item.id}
        renderItem={renderLog}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={[styles.logSeparator, { backgroundColor: colors.border }]} />}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <AppHeader
              eyebrow={t("device.eyebrow")}
              title={t("device.title")}
              connected={connected}
            />

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
                <Text
                  style={[styles.heroModel, { color: LIGHT_CARD_FOREGROUND }]}
                >
                  {device?.model ?? t("device.defaultModel")}
                </Text>
                <Text style={[styles.heroStatus, { color: LIGHT_CARD_MUTED }]}>
                  {statusMessage}
                </Text>
                <View style={styles.badges}>
                  <View style={styles.protocolBadge}>
                    <Text style={styles.protocolText}>
                      {t("device.protocol")}
                    </Text>
                  </View>
                  {device?.battery !== undefined ? (
                    <View style={styles.batteryBadge}>
                      <Text style={styles.batteryText}>{device.battery}%</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            <View style={styles.actions}>
              <Pressable
                testID="device-connect-disconnect"
                accessibilityRole="button"
                accessibilityLabel={
                  connected
                    ? t("device.disconnectLabel")
                    : t("device.connectLabel")
                }
                accessibilityState={{ disabled: busy || demoMode, busy }}
                onPress={connected ? () => void disconnect() : () => void connect()}
                disabled={busy || demoMode}
                style={({ pressed }) => [styles.primaryButton, connected && styles.disconnectButton, (busy || demoMode) && styles.disabled, pressed && styles.pressed]}
              >
                <MaterialIcons
                  name={connected ? "link-off" : "bluetooth-searching"}
                  size={22}
                  color="#FFFFFF"
                />
                <Text style={styles.primaryText}>
                  {demoMode
                    ? t("device.demoActive")
                    : connected
                      ? t("device.disconnect")
                      : busy
                        ? t("device.searching")
                        : t("device.searchConnect")}
                </Text>
              </Pressable>
              <Pressable
                testID="device-sync"
                accessibilityRole="button"
                accessibilityLabel={t("device.syncLabel")}
                accessibilityState={{
                  disabled: !connected || demoMode || isForgettingToothbrush,
                }}
                onPress={() => void syncLatest()}
                disabled={!connected || demoMode || isForgettingToothbrush}
                style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.surface }, (!connected || demoMode || isForgettingToothbrush) && styles.disabled, pressed && styles.pressed]}
              >
                <MaterialIcons name="sync" size={22} color={colors.primary} />
                <Text style={[styles.secondaryText, { color: colors.primary }]}>
                  {t("device.syncLatest")}
                </Text>
              </Pressable>
            </View>

            <View
              style={[
                styles.infoCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <InfoRow
                icon="bluetooth"
                label={t("device.adapter")}
                value={adapterStateLabel(adapterState, t)}
              />
              <View
                style={[styles.infoDivider, { backgroundColor: colors.border }]}
              />
              <InfoRow
                icon="motion-photos-on"
                label={t("device.handleState")}
                value={handleStateLabel(live.handleState, t)}
              />
              <View
                style={[styles.infoDivider, { backgroundColor: colors.border }]}
              />
              <InfoRow
                icon="speed"
                label={t("device.intensity")}
                value={intensityLabel(live.intensity, t)}
              />
              <View
                style={[styles.infoDivider, { backgroundColor: colors.border }]}
              />
              <InfoRow
                icon="memory"
                label={t("device.firmware")}
                value={device?.firmware ?? t("device.firmwareToRead")}
              />
            </View>

            <Pressable
              testID="device-forget-reset"
              accessibilityRole="button"
              accessibilityLabel={t("device.forgetResetLabel")}
              accessibilityHint={t("device.forgetResetHint")}
              accessibilityState={{
                disabled: !connected || demoMode || isForgettingToothbrush,
                busy: isForgettingToothbrush,
              }}
              disabled={!connected || demoMode || isForgettingToothbrush}
              onPress={confirmForgetToothbrush}
              style={({ pressed }) => [
                styles.forgetButton,
                { borderColor: colors.border, backgroundColor: colors.surface },
                (!connected || demoMode || isForgettingToothbrush) && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <MaterialIcons name="restart-alt" size={22} color="#B33A55" />
              <View style={styles.forgetCopy}>
                <Text
                  style={[styles.forgetTitle, { color: colors.foreground }]}
                >
                  {isForgettingToothbrush
                    ? t("device.forgetting")
                    : t("device.forgetResetLabel")}
                </Text>
                <Text style={[styles.forgetText, { color: colors.muted }]}>
                  {t("device.forgetResetDescription")}
                </Text>
              </View>
            </Pressable>

            <View style={[styles.demoCard, { backgroundColor: demoMode ? "#FFF4C9" : "#F4F6FF", borderColor: demoMode ? "#E8BE38" : "#DCE3FF" }]}>
              <View style={styles.demoTop}>
                <View style={styles.demoHeading}>
                  <View style={[styles.demoIcon, { backgroundColor: demoMode ? "#E8BE38" : "#2457D6" }]}>
                    <MaterialIcons name="science" size={25} color="#FFFFFF" />
                  </View>
                  <View style={styles.demoCopy}>
                    <Text
                      style={[
                        styles.demoEyebrow,
                        { color: demoMode ? "#765600" : "#2457D6" },
                      ]}
                    >
                      {t("device.demoEyebrow")}
                    </Text>
                    <Text
                      style={[
                        styles.demoTitle,
                        { color: LIGHT_CARD_FOREGROUND },
                      ]}
                    >
                      {t("device.demoTitle")}
                    </Text>
                    <Text
                      style={[styles.demoText, { color: LIGHT_CARD_MUTED }]}
                    >
                      {demoMode
                        ? t("device.demoSummary", { count: demoSessionCount })
                        : t("device.demoDescription")}
                    </Text>
                  </View>
                </View>
                <Pressable
                  testID="device-demo-switch"
                  accessibilityRole="switch"
                  accessibilityLabel={t("device.demoSwitchLabel")}
                  accessibilityState={{ checked: demoMode }}
                  aria-checked={demoMode}
                  onPress={() => void setDemoMode(!demoMode)}
                  style={({ pressed }) => [
                    styles.demoToggle,
                    { backgroundColor: demoMode ? "#2E9B67" : "#C8CDD8" },
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[styles.demoToggleKnob, { alignSelf: demoMode ? "flex-end" : "flex-start" }]} />
                </Pressable>
              </View>

              {demoMode ? (
                <View style={styles.demoActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("device.demoMorningLabel")}
                    onPress={() => void addDemoSession("morning")}
                    style={({ pressed }) => [
                      styles.demoAction,
                      pressed && styles.pressed,
                    ]}
                  >
                    <MaterialIcons name="wb-sunny" size={19} color="#E76A2C" />
                    <Text
                      style={[
                        styles.demoActionText,
                        { color: LIGHT_CARD_FOREGROUND },
                      ]}
                    >
                      {t("device.demoMorning")}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("device.demoEveningLabel")}
                    onPress={() => void addDemoSession("evening")}
                    style={({ pressed }) => [
                      styles.demoAction,
                      pressed && styles.pressed,
                    ]}
                  >
                    <MaterialIcons name="dark-mode" size={19} color="#7357C7" />
                    <Text
                      style={[
                        styles.demoActionText,
                        { color: LIGHT_CARD_FOREGROUND },
                      ]}
                    >
                      {t("device.demoEvening")}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("device.demoWeekLabel")}
                    onPress={() => void generateDemoWeek()}
                    style={({ pressed }) => [
                      styles.demoAction,
                      pressed && styles.pressed,
                    ]}
                  >
                    <MaterialIcons
                      name="calendar-month"
                      size={19}
                      color="#2457D6"
                    />
                    <Text
                      style={[
                        styles.demoActionText,
                        { color: LIGHT_CARD_FOREGROUND },
                      ]}
                    >
                      {t("device.demoWeek")}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("device.demoClearLabel")}
                    onPress={() => void clearDemoData()}
                    style={({ pressed }) => [
                      styles.demoAction,
                      pressed && styles.pressed,
                    ]}
                  >
                    <MaterialIcons
                      name="delete-outline"
                      size={19}
                      color="#D33D5D"
                    />
                    <Text
                      style={[
                        styles.demoActionText,
                        { color: LIGHT_CARD_FOREGROUND },
                      ]}
                    >
                      {t("device.demoClear")}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
            <Pressable
              testID="device-hardware-test"
              accessibilityRole="button"
              accessibilityLabel={t("device.hardwareOpenLabel")}
              onPress={() => router.push("/(tabs)/hardware-test")}
              style={({ pressed }) => [
                styles.hardwareCard,
                { backgroundColor: "#E8F8EF", borderColor: "#B9E4CC" },
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.hardwareIcon}>
                <MaterialIcons name="fact-check" size={26} color="#14845B" />
              </View>
              <View style={styles.hardwareCopy}>
                <Text style={styles.hardwareEyebrow}>
                  {t("device.hardwareEyebrow")}
                </Text>
                <Text
                  style={[styles.hardwareTitle, { color: colors.foreground }]}
                >
                  {t("device.hardwareTitle")}
                </Text>
                <Text style={[styles.hardwareText, { color: colors.muted }]}>
                  {t("device.hardwareDescription")}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={colors.muted} />
            </Pressable>
            <Pressable
              testID="device-backup"
              accessibilityRole="button"
              accessibilityLabel={t("device.backupOpenLabel")}
              onPress={() => router.push("/(tabs)/backup")}
              style={({ pressed }) => [
                styles.backupCard,
                { backgroundColor: "#EEF4FF", borderColor: "#C8D9FF" },
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.backupIcon}>
                <MaterialIcons name="settings-backup-restore" size={26} color="#2457D6" />
              </View>
              <View style={styles.backupCopy}>
                <Text style={[styles.backupEyebrow, { color: "#2457D6" }]}>
                  {t("device.backupEyebrow")}
                </Text>
                <Text
                  style={[styles.backupTitle, { color: colors.foreground }]}
                >
                  {t("device.backupTitle")}
                </Text>
                <Text style={[styles.backupText, { color: colors.muted }]}>
                  {t("device.backupDescription")}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={colors.muted} />
            </Pressable>

            <View style={styles.diagnosticHeading}>
              <View>
                <Text
                  style={[styles.sectionTitle, { color: colors.foreground }]}
                >
                  {t("device.diagnosticsTitle")}
                </Text>
                <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
                  {t("device.diagnosticsDescription")}
                </Text>
              </View>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>{t("device.live")}</Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.emptyLog, { borderColor: colors.border }]}>
            <Text style={[styles.emptyLogText, { color: colors.muted }]}>
              {t("device.emptyLogs")}
            </Text>
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

function handleStateLabel(
  handleState: number,
  t: ReturnType<typeof useI18n>["t"],
): string {
  const keyByState: Record<
    number,
    | "off"
    | "idle"
    | "brushing"
    | "charging"
    | "shuttingDown"
    | "verifying"
    | "background"
  > = {
    0: "off",
    1: "idle",
    2: "brushing",
    3: "charging",
    4: "shuttingDown",
    6: "verifying",
    7: "background",
  };
  const key = keyByState[handleState];
  return key ? t(`device.handleState.${key}`) : t("device.unknown");
}

function adapterStateLabel(
  state: string,
  t: ReturnType<typeof useI18n>["t"],
): string {
  const keyByState = {
    Unknown: "unknown",
    Resetting: "resetting",
    Unsupported: "unsupported",
    Unauthorized: "unauthorized",
    PoweredOff: "poweredOff",
    PoweredOn: "poweredOn",
  } as const;
  const key = keyByState[state as keyof typeof keyByState];
  return key ? t(`device.adapterState.${key}`) : state;
}

function intensityLabel(
  intensity: string,
  t: ReturnType<typeof useI18n>["t"],
): string {
  if (intensity === "bassa") return t("device.intensity.low");
  if (intensity === "media") return t("device.intensity.medium");
  if (intensity === "alta") return t("device.intensity.high");
  return t("device.unknown");
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
  forgetButton: { minHeight: 62, borderRadius: 18, borderWidth: 1, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 11 },
  forgetCopy: { flex: 1 },
  forgetTitle: { fontSize: 13, lineHeight: 18, fontWeight: "900" },
  forgetText: { fontSize: 10, lineHeight: 15, marginTop: 1 },
  demoCard: { borderWidth: 1.5, borderRadius: 22, padding: 13, gap: 12 },
  demoTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  demoHeading: { flex: 1, flexDirection: "row", alignItems: "center", gap: 9 },
  demoIcon: { width: 45, height: 45, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  demoCopy: { flex: 1 },
  demoEyebrow: { fontSize: 8, lineHeight: 12, fontWeight: "900", letterSpacing: 0.7 },
  demoTitle: { fontSize: 15, lineHeight: 20, fontWeight: "900" },
  demoText: { fontSize: 9, lineHeight: 14, marginTop: 2 },
  demoToggle: { width: 48, height: 28, borderRadius: 99, padding: 3, justifyContent: "center" },
  demoToggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#FFFFFF" },
  demoActions: { flexDirection: "row", gap: 7 },
  demoAction: { flex: 1, minHeight: 54, borderRadius: 15, backgroundColor: "#FFFFFFAA", alignItems: "center", justifyContent: "center", gap: 3, paddingHorizontal: 4 },
  demoActionText: { fontSize: 9, lineHeight: 13, fontWeight: "900", textAlign: "center" },
  backupCard: { borderWidth: 1, borderRadius: 21, padding: 13, flexDirection: "row", alignItems: "center", gap: 10 },
  backupIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#FFFFFFAA", alignItems: "center", justifyContent: "center" },
  backupCopy: { flex: 1 },
  backupEyebrow: { fontSize: 9, lineHeight: 13, fontWeight: "900", letterSpacing: 0.8 },
  backupTitle: { fontSize: 14, lineHeight: 19, fontWeight: "900" },
  backupText: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  hardwareCard: { borderWidth: 1, borderRadius: 21, padding: 13, flexDirection: "row", alignItems: "center", gap: 10 },
  hardwareIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#FFFFFFAA", alignItems: "center", justifyContent: "center" },
  hardwareCopy: { flex: 1 },
  hardwareEyebrow: { color: "#14845B", fontSize: 9, lineHeight: 13, fontWeight: "900", letterSpacing: 0.8 },
  hardwareTitle: { fontSize: 14, lineHeight: 19, fontWeight: "900" },
  hardwareText: { fontSize: 10, lineHeight: 15, marginTop: 2 },
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
