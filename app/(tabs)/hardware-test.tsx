import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Constants from "expo-constants";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AppHeader } from "@/components/app-header";
import { ScreenContainer } from "@/components/screen-container";
import {
  LIGHT_CARD_FOREGROUND,
  LIGHT_CARD_MUTED,
} from "@/constants/accessibility-colors";
import { useBrush } from "@/contexts/brush-context";
import { useI18n } from "@/contexts/locale-context";
import { useBack } from "@/hooks/use-back";
import { useAsyncAction } from "@/hooks/use-async-action";
import { useColors } from "@/hooks/use-colors";
import {
  createHardwareValidationRun,
  connectionStatusLabel,
  getHardwareTestCases,
  hardwareTestStatusLabel,
  hardwareValidationSummary,
  renderHardwareValidationReport,
  reportFileName,
  type HardwareTestCase,
  type HardwareTestStatus,
  type HardwareValidationRun,
  updateHardwareTestResult,
} from "@/lib/hardware-validation";
import { exportHardwareValidationReport } from "@/lib/hardware-validation-report";
import {
  loadHardwareValidationRun,
  saveHardwareValidationRun,
} from "@/lib/hardware-validation-storage";

const STATUS_OPTIONS: readonly {
  status: HardwareTestStatus;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  color: string;
}[] = [
  { status: "passed", icon: "check-circle", color: "#14845B" },
  { status: "failed", icon: "cancel", color: "#C43D58" },
  { status: "blocked", icon: "pause-circle", color: "#B27700" },
  { status: "pending", icon: "radio-button-unchecked", color: "" },
];

function currentPlatform(): HardwareValidationRun["platform"] {
  if (
    Platform.OS === "ios" ||
    Platform.OS === "android" ||
    Platform.OS === "web"
  ) {
    return Platform.OS;
  }
  return "unknown";
}

function newRun(): HardwareValidationRun {
  return createHardwareValidationRun(
    currentPlatform(),
    Constants.expoConfig?.version ?? "unknown",
    String(Platform.Version),
  );
}

export default function HardwareTestScreen() {
  const colors = useColors();
  const goBack = useBack();
  const { t } = useI18n();
  const runAction = useAsyncAction();
  const {
    status,
    adapterState,
    device,
    live,
    realHistory,
    lifetimeProgress,
    logs,
    demoMode,
  } = useBrush();
  const [run, setRun] = useState<HardwareValidationRun | null>(null);
  const testCases = useMemo(() => getHardwareTestCases(t), [t]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saveRevisionRef = useRef(0);

  const persistRun = useCallback(
    (next: HardwareValidationRun) => {
      const revision = saveRevisionRef.current + 1;
      saveRevisionRef.current = revision;
      setSaving(true);
      setPersistenceError(null);
      void saveHardwareValidationRun(next)
        .then(() => {
          if (saveRevisionRef.current === revision) setSaving(false);
        })
        .catch(() => {
          if (saveRevisionRef.current !== revision) return;
          setSaving(false);
          setPersistenceError(t("hardware.saveFailed"));
        });
    },
    [t],
  );

  useEffect(() => {
    let active = true;
    void loadHardwareValidationRun()
      .then(async (stored) => {
        const initial = stored ?? newRun();
        if (active) {
          setRun(initial);
        }
      })
      .catch(() => {
        if (!active) return;
        const fallback = newRun();
        setRun(fallback);
        setPersistenceError(t("hardware.loadFailed"));
      });
    return () => {
      active = false;
    };
  }, [t]);

  const summary = useMemo(
    () => (run ? hardwareValidationSummary(run) : null),
    [run],
  );
  const progress = summary ? summary.completed / summary.total : 0;

  const updateResult = (
    test: HardwareTestCase,
    patch: Parameters<typeof updateHardwareTestResult>[2],
  ) => {
    if (!run) return;
    setMessage(null);
    setError(null);
    const next = updateHardwareTestResult(run, test.id, patch);
    setRun(next);
    persistRun(next);
  };

  const shareReport = async () => {
    if (!run) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const report = renderHardwareValidationReport(
        run,
        {
          connectionStatus: status,
          adapterState,
          device: device
            ? {
                name: device.name,
                model: device.model,
                firmware: device.firmware,
                battery: device.battery,
              }
            : null,
          live,
          recentSessionCount: realHistory.length,
          attemptedSessions: lifetimeProgress.attemptedSessions,
          completedSessions: lifetimeProgress.completedSessions,
          diagnosticLogs: logs,
        },
        Date.now(),
        t,
      );
      await exportHardwareValidationReport(reportFileName(run), report, t);
      setMessage(t("hardware.reportReady"));
    } catch {
      setError(t("hardware.exportFailed"));
    } finally {
      setBusy(false);
    }
  };

  const resetRun = () => {
    const performReset = () => {
      const next = newRun();
      setRun(next);
      persistRun(next);
      setMessage(null);
      setError(null);
    };
    if (Platform.OS === "web") {
      if (globalThis.confirm?.(t("hardware.resetConfirmWeb"))) {
        performReset();
      }
      return;
    }
    Alert.alert(
      t("hardware.resetAlertTitle"),
      t("hardware.resetAlertMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("hardware.resetAction"),
          style: "destructive",
          onPress: performReset,
        },
      ],
    );
  };

  const renderTest = ({
    item,
    index,
  }: {
    item: HardwareTestCase;
    index: number;
  }) => {
    if (!run) return null;
    const result = run.results[item.id];
    return (
      <View
        testID={`hardware-test-${item.id}`}
        style={[
          styles.testCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.testHeading}>
          <View
            style={[
              styles.testNumber,
              {
                backgroundColor:
                  result.status === "passed" ? "#14845B" : colors.primary,
              },
            ]}
          >
            <Text style={styles.testNumberText}>{index + 1}</Text>
          </View>
          <View style={styles.testTitleWrap}>
            <Text style={[styles.testTitle, { color: colors.foreground }]}>
              {item.title}
            </Text>
            <Text style={[styles.testInstruction, { color: colors.muted }]}>
              {item.instruction}
            </Text>
          </View>
        </View>

        <View style={[styles.successBox, { backgroundColor: "#E8F8EF" }]}>
          <MaterialIcons name="verified" size={17} color="#14845B" />
          <Text style={styles.successText}>{item.success}</Text>
        </View>

        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={t("hardware.resultLabel", { title: item.title })}
          style={styles.statusGrid}
        >
          {STATUS_OPTIONS.map((option) => {
            const selected = result.status === option.status;
            const optionColor =
              option.status === "pending" ? colors.foreground : option.color;
            const optionLabel = hardwareTestStatusLabel(option.status, t);
            return (
              <Pressable
                key={option.status}
                testID={`hardware-status-${item.id}-${option.status}${selected ? "-selected" : ""}`}
                accessibilityRole="radio"
                accessibilityLabel={t("hardware.resultOptionLabel", {
                  title: item.title,
                  status: optionLabel,
                })}
                accessibilityState={{ checked: selected }}
                aria-checked={selected}
                onPress={() => updateResult(item, { status: option.status })}
                style={({ pressed }) => [
                  styles.statusButton,
                  {
                    borderColor: selected ? optionColor : colors.border,
                    backgroundColor: selected
                      ? `${optionColor}18`
                      : colors.background,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <MaterialIcons
                  name={option.icon}
                  size={17}
                  color={selected ? optionColor : colors.muted}
                />
                <Text
                  style={[
                    styles.statusLabel,
                    { color: selected ? optionColor : colors.muted },
                  ]}
                >
                  {optionLabel}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          value={result.note}
          onChangeText={(note) => updateResult(item, { note })}
          placeholder={t("hardware.notePlaceholder")}
          placeholderTextColor={colors.muted}
          accessibilityLabel={t("hardware.noteLabel", { title: item.title })}
          multiline
          maxLength={1_000}
          textAlignVertical="top"
          style={[
            styles.noteInput,
            {
              color: colors.foreground,
              backgroundColor: colors.background,
              borderColor: colors.border,
            },
          ]}
        />
      </View>
    );
  };

  return (
    <ScreenContainer>
      <FlatList
        testID="hardware-test-screen"
        data={testCases as readonly HardwareTestCase[]}
        keyExtractor={(item) => item.id}
        renderItem={renderTest}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <View style={styles.topRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("hardware.backLabel")}
                hitSlop={4}
                onPress={goBack}
                style={({ pressed }) => [
                  styles.backButton,
                  { backgroundColor: colors.surface },
                  pressed && styles.pressed,
                ]}
              >
                <MaterialIcons
                  name="arrow-back"
                  size={22}
                  color={colors.foreground}
                />
              </Pressable>
              <View style={styles.headerWrap}>
                <AppHeader
                  eyebrow={t("hardware.eyebrow")}
                  title={t("hardware.title")}
                  connected={status === "connected"}
                />
              </View>
            </View>

            <View
              style={[
                styles.hero,
                { backgroundColor: "#EEF4FF", borderColor: "#C8D9FF" },
              ]}
            >
              <View style={styles.heroIcon}>
                <MaterialIcons name="fact-check" size={30} color="#2457D6" />
              </View>
              <View style={styles.heroCopy}>
                <Text
                  style={[styles.heroTitle, { color: LIGHT_CARD_FOREGROUND }]}
                >
                  {t("hardware.heroTitle")}
                </Text>
                <Text style={[styles.heroText, { color: LIGHT_CARD_MUTED }]}>
                  {t("hardware.heroDescription")}
                </Text>
              </View>
            </View>

            {demoMode ? (
              <View
                style={[
                  styles.warning,
                  { backgroundColor: "#FFF4C9", borderColor: "#E8BE38" },
                ]}
              >
                <MaterialIcons name="science" size={21} color="#9A7200" />
                <Text
                  style={[styles.warningText, { color: LIGHT_CARD_FOREGROUND }]}
                >
                  {t("hardware.demoWarning")}
                </Text>
              </View>
            ) : null}

            <View
              testID={
                persistenceError
                  ? "hardware-checklist-error"
                  : saving
                    ? "hardware-checklist-saving"
                    : `hardware-checklist-saved-${summary?.completed ?? 0}`
              }
              style={[
                styles.summaryCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.summaryTop}>
                <View>
                  <Text
                    style={[styles.summaryTitle, { color: colors.foreground }]}
                  >
                    {t("hardware.progressTitle")}
                  </Text>
                  <Text style={[styles.summaryText, { color: colors.muted }]}>
                    {summary
                      ? t("hardware.progressSummary", {
                          completed: summary.completed,
                          total: summary.total,
                          passed: summary.passed,
                          saving: saving ? t("hardware.progressSaving") : "",
                        })
                      : t("hardware.progressLoading")}
                  </Text>
                </View>
                <Text
                  style={[styles.summaryPercent, { color: colors.primary }]}
                >
                  {Math.round(progress * 100)}%
                </Text>
              </View>
              <View
                style={[
                  styles.progressTrack,
                  { backgroundColor: colors.border },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progress * 100}%`,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              </View>
              <View style={styles.snapshotRow}>
                <Snapshot
                  label={t("hardware.snapshotBle")}
                  value={adapterState}
                />
                <Snapshot
                  label={t("hardware.snapshotStatus")}
                  value={connectionStatusLabel(status, t)}
                />
                <Snapshot
                  label={t("hardware.snapshotFirmware")}
                  value={device?.firmware ?? "—"}
                />
              </View>
            </View>

            {message ? (
              <View
                style={[
                  styles.feedback,
                  { backgroundColor: "#E8F8EF", borderColor: "#B9E4CC" },
                ]}
              >
                <MaterialIcons name="check-circle" size={20} color="#14845B" />
                <Text style={styles.feedbackSuccess}>{message}</Text>
              </View>
            ) : null}
            {error ? (
              <View
                style={[
                  styles.feedback,
                  { backgroundColor: "#FFF0F2", borderColor: "#F0BEC8" },
                ]}
              >
                <MaterialIcons name="error-outline" size={20} color="#C43D58" />
                <Text style={styles.feedbackError}>{error}</Text>
              </View>
            ) : null}
            {persistenceError ? (
              <View
                style={[
                  styles.feedback,
                  { backgroundColor: "#FFF4C9", borderColor: "#E8BE38" },
                ]}
              >
                <MaterialIcons name="sync-problem" size={20} color="#9A7200" />
                <Text style={styles.feedbackWarning}>
                  {t("hardware.unsavedMessage", { error: persistenceError })}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("hardware.retrySaveLabel")}
                  onPress={() => {
                    if (run) persistRun(run);
                  }}
                  style={({ pressed }) => [
                    styles.retryButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.retryText}>{t("common.retry")}</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("hardware.shareReportLabel")}
                onPress={() => runAction(shareReport())}
                disabled={!run || busy}
                style={({ pressed }) => [
                  styles.primaryButton,
                  (!run || busy) && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <MaterialIcons name="ios-share" size={20} color="#FFFFFF" />
                <Text style={styles.primaryText}>
                  {busy ? t("backup.preparing") : t("hardware.shareReport")}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("hardware.newRunLabel")}
                onPress={resetRun}
                disabled={!run || busy}
                style={({ pressed }) => [
                  styles.resetButton,
                  { borderColor: colors.border },
                  (!run || busy) && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <MaterialIcons
                  name="restart-alt"
                  size={20}
                  color={colors.primary}
                />
                <Text style={[styles.resetText, { color: colors.primary }]}>
                  {t("hardware.newRun")}
                </Text>
              </Pressable>
            </View>

            <View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                {t("hardware.matrixTitle")}
              </Text>
              <Text style={[styles.sectionText, { color: colors.muted }]}>
                {t("hardware.matrixDescription")}
              </Text>
            </View>
          </View>
        }
      />
    </ScreenContainer>
  );
}

function Snapshot({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={styles.snapshot}>
      <Text style={[styles.snapshotLabel, { color: colors.muted }]}>
        {label}
      </Text>
      <Text
        numberOfLines={1}
        style={[styles.snapshotValue, { color: colors.foreground }]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 120 },
  headerContent: { gap: 16, marginBottom: 18 },
  topRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  headerWrap: { flex: 1 },
  hero: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 15,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  heroIcon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: "#FFFFFFAA",
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: { flex: 1 },
  heroTitle: { fontSize: 15, lineHeight: 21, fontWeight: "900" },
  heroText: { fontSize: 11, lineHeight: 16, marginTop: 3 },
  warning: {
    borderWidth: 1,
    borderRadius: 17,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  warningText: { flex: 1, fontSize: 11, lineHeight: 16, fontWeight: "700" },
  summaryCard: { borderWidth: 1, borderRadius: 22, padding: 15, gap: 12 },
  summaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryTitle: { fontSize: 16, lineHeight: 22, fontWeight: "900" },
  summaryText: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  summaryPercent: { fontSize: 23, lineHeight: 28, fontWeight: "900" },
  progressTrack: { height: 9, borderRadius: 99, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 99 },
  snapshotRow: { flexDirection: "row", gap: 8 },
  snapshot: { flex: 1, minWidth: 0 },
  snapshotLabel: {
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  snapshotValue: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  feedback: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  feedbackSuccess: {
    flex: 1,
    color: "#246A4B",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
  },
  feedbackError: {
    flex: 1,
    color: "#A83249",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
  },
  feedbackWarning: {
    flex: 1,
    color: "#785600",
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "700",
  },
  retryButton: {
    minHeight: 44,
    borderRadius: 11,
    backgroundColor: "#9A7200",
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "900",
  },
  actions: { flexDirection: "row", gap: 9 },
  primaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 17,
    backgroundColor: "#2457D6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
  },
  resetButton: {
    minWidth: 104,
    minHeight: 52,
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  resetText: { fontSize: 13, lineHeight: 18, fontWeight: "900" },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  sectionTitle: { fontSize: 19, lineHeight: 25, fontWeight: "900" },
  sectionText: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  separator: { height: 12 },
  testCard: { borderWidth: 1, borderRadius: 22, padding: 15, gap: 12 },
  testHeading: { flexDirection: "row", gap: 11, alignItems: "flex-start" },
  testNumber: {
    width: 31,
    height: 31,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  testNumberText: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
  },
  testTitleWrap: { flex: 1 },
  testTitle: { fontSize: 15, lineHeight: 20, fontWeight: "900" },
  testInstruction: { fontSize: 11, lineHeight: 16, marginTop: 3 },
  successBox: {
    borderRadius: 14,
    padding: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  successText: {
    flex: 1,
    color: "#246A4B",
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "700",
  },
  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  statusButton: {
    width: "48%",
    minHeight: 44,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 7,
  },
  statusLabel: { fontSize: 10, lineHeight: 14, fontWeight: "900" },
  noteInput: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 9,
    fontSize: 11,
    lineHeight: 16,
  },
});
