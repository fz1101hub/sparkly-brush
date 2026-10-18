import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { DesignText as Text } from "@/components/design-text";

import { AppHeader } from "@/components/app-header";
import { ScreenContainer } from "@/components/screen-container";
import { useBrush } from "@/contexts/brush-context";
import { useColors } from "@/hooks/use-colors";
import {
  createHardwareValidationRun,
  HARDWARE_TEST_CASES,
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
  label: string;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
}[] = [
  { status: "passed", label: "Superato", icon: "check-circle" },
  { status: "failed", label: "Fallito", icon: "cancel" },
  { status: "blocked", label: "Bloccato", icon: "pause-circle" },
  { status: "pending", label: "Da fare", icon: "radio-button-unchecked" },
];

function currentPlatform(): HardwareValidationRun["platform"] {
  if (Platform.OS === "ios" || Platform.OS === "android" || Platform.OS === "web") {
    return Platform.OS;
  }
  return "unknown";
}

function newRun(): HardwareValidationRun {
  return createHardwareValidationRun(
    currentPlatform(),
    Constants.expoConfig?.version ?? "sconosciuta",
    String(Platform.Version),
  );
}

export default function HardwareTestScreen() {
  const colors = useColors();
  const router = useRouter();
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
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saveRevisionRef = useRef(0);

  const persistRun = useCallback((next: HardwareValidationRun) => {
    const revision = saveRevisionRef.current + 1;
    saveRevisionRef.current = revision;
    setSaving(true);
    setPersistenceError(null);
    void saveHardwareValidationRun(next)
      .then(() => {
        if (saveRevisionRef.current === revision) setSaving(false);
      })
      .catch((caught) => {
        if (saveRevisionRef.current !== revision) return;
        setSaving(false);
        setPersistenceError(caught instanceof Error ? caught.message : "Salvataggio locale non riuscito");
      });
  }, []);

  useEffect(() => {
    let active = true;
    void loadHardwareValidationRun()
      .then(async (stored) => {
        const initial = stored ?? newRun();
        if (active) setRun(initial);
      })
      .catch((caught) => {
        if (!active) return;
        const fallback = newRun();
        setRun(fallback);
        setPersistenceError(caught instanceof Error ? caught.message : "Impossibile caricare il collaudo salvato");
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (run) persistRun(run);
  }, [persistRun, run]);

  const summary = useMemo(() => run ? hardwareValidationSummary(run) : null, [run]);
  const progress = summary ? summary.completed / summary.total : 0;

  const updateResult = (test: HardwareTestCase, patch: Parameters<typeof updateHardwareTestResult>[2]) => {
    setMessage(null);
    setError(null);
    setRun((current) => current
      ? updateHardwareTestResult(current, test.id, patch)
      : current);
  };

  const shareReport = async () => {
    if (!run) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const report = renderHardwareValidationReport(run, {
        connectionStatus: status,
        adapterState,
        device: device ? {
          name: device.name,
          model: device.model,
          firmware: device.firmware,
          battery: device.battery,
        } : null,
        live,
        recentSessionCount: realHistory.length,
        attemptedSessions: lifetimeProgress.attemptedSessions,
        completedSessions: lifetimeProgress.completedSessions,
        diagnosticLogs: logs,
      });
      await exportHardwareValidationReport(reportFileName(run), report);
      setMessage("Report sanitizzato preparato correttamente.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Esportazione del report non riuscita");
    } finally {
      setBusy(false);
    }
  };

  const resetRun = () => {
    const performReset = () => {
      const next = newRun();
      setRun(next);
      setMessage(null);
      setError(null);
    };
    if (Platform.OS === "web") {
      if (globalThis.confirm?.("Creare un nuovo collaudo? Gli esiti e le note correnti verranno cancellati.")) {
        performReset();
      }
      return;
    }
    Alert.alert(
      "Nuovo collaudo?",
      "Gli esiti e le note della sessione corrente verranno cancellati.",
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Ricomincia",
          style: "destructive",
          onPress: performReset,
        },
      ],
    );
  };

  const renderTest = ({ item, index }: { item: HardwareTestCase; index: number }) => {
    if (!run) return null;
    const result = run.results[item.id];
    return (
      <View style={[styles.testCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.testHeading}>
          <View style={[styles.testNumber, { backgroundColor: result.status === "passed" ? colors.success : colors.primary }]}>
            <Text style={[styles.testNumberText, { color: result.status === "passed" ? colors.background : colors.primaryText }]}>{index + 1}</Text>
          </View>
          <View style={styles.testTitleWrap}>
            <Text style={[styles.testTitle, { color: colors.foreground }]}>{item.title}</Text>
            <Text style={[styles.testInstruction, { color: colors.muted }]}>{item.instruction}</Text>
          </View>
        </View>

        <View style={[styles.successBox, { backgroundColor: colors.primarySoft }]}>
          <MaterialIcons name="verified" size={17} color="#14845B" />
          <Text style={[styles.successText, { color: colors.success }]}>{item.success}</Text>
        </View>

        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={`Esito: ${item.title}`}
          style={styles.statusGrid}
        >
          {STATUS_OPTIONS.map((option) => {
            const selected = result.status === option.status;
            const optionColor = option.status === "passed" ? colors.success : option.status === "failed" ? colors.error : option.status === "blocked" ? colors.warning : colors.muted;
            return (
              <Pressable
                key={option.status}
                accessibilityRole="radio"
                accessibilityLabel={`${item.title}: ${option.label}`}
                accessibilityState={{ checked: selected }}
                aria-checked={selected}
                onPress={() => updateResult(item, { status: option.status })}
                style={({ pressed }) => [
                  styles.statusButton,
                  { borderColor: selected ? optionColor : colors.border, backgroundColor: selected ? colors.primarySoft : colors.background },
                  pressed && styles.pressed,
                ]}
              >
                <MaterialIcons name={option.icon} size={17} color={selected ? optionColor : colors.muted} />
                <Text style={[styles.statusLabel, { color: selected ? optionColor : colors.muted }]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          value={result.note}
          onChangeText={(note) => updateResult(item, { note })}
          placeholder="Nota, errore osservato o riferimento screenshot…"
          placeholderTextColor={colors.muted}
          accessibilityLabel={`Note per ${item.title}`}
          multiline
          maxLength={1_000}
          textAlignVertical="top"
          style={[styles.noteInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
        />
      </View>
    );
  };

  return (
    <ScreenContainer>
      <FlatList
        data={HARDWARE_TEST_CASES as readonly HardwareTestCase[]}
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
                accessibilityLabel="Torna indietro"
                onPress={() => router.back()}
                style={({ pressed }) => [styles.backButton, { backgroundColor: colors.surface }, pressed && styles.pressed]}
              >
                <MaterialIcons name="arrow-back" size={22} color={colors.foreground} />
              </Pressable>
              <View style={styles.headerWrap}>
                <AppHeader eyebrow="HX6322/04 · iOS e Android" title="Collaudo hardware" connected={status === "connected"} />
              </View>
            </View>

            <View style={[styles.hero, { backgroundColor: colors.primarySoft, borderColor: "#C8D9FF" }]}>
              <View style={styles.heroIcon}>
                <MaterialIcons name="fact-check" size={30} color="#2457D6" />
              </View>
              <View style={styles.heroCopy}>
                <Text style={[styles.heroTitle, { color: colors.foreground }]}>Una matrice verificabile, non appunti sparsi</Text>
                <Text style={[styles.heroText, { color: colors.muted }]}>Gli esiti restano sul telefono e il report oscura UUID, MAC e ID persistenti.</Text>
              </View>
            </View>

            {demoMode ? (
              <View style={[styles.warning, { backgroundColor: colors.primarySoft, borderColor: "#E8BE38" }]}>
                <MaterialIcons name="science" size={21} color="#9A7200" />
                <Text style={[styles.warningText, { color: colors.foreground }]}>Disattiva la demo prima delle prove con il manico reale.</Text>
              </View>
            ) : null}

            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.summaryTop}>
                <View>
                  <Text style={[styles.summaryTitle, { color: colors.foreground }]}>Avanzamento</Text>
                  <Text style={[styles.summaryText, { color: colors.muted }]}>
                    {summary ? `${summary.completed}/${summary.total} compilate · ${summary.passed} superate${saving ? " · salvataggio…" : ""}` : "Caricamento…"}
                  </Text>
                </View>
                <Text style={[styles.summaryPercent, { color: colors.primary }]}>{Math.round(progress * 100)}%</Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} />
              </View>
              <View style={styles.snapshotRow}>
                <Snapshot label="BLE" value={adapterState} />
                <Snapshot label="Stato" value={status} />
                <Snapshot label="Firmware" value={device?.firmware ?? "—"} />
              </View>
            </View>

            {message ? (
              <View style={[styles.feedback, { backgroundColor: colors.primarySoft, borderColor: "#B9E4CC" }]}>
                <MaterialIcons name="check-circle" size={20} color="#14845B" />
                <Text style={[styles.feedbackSuccess, { color: colors.success }]}>{message}</Text>
              </View>
            ) : null}
            {error ? (
              <View style={[styles.feedback, { backgroundColor: colors.primarySoft, borderColor: "#F0BEC8" }]}>
                <MaterialIcons name="error-outline" size={20} color="#C43D58" />
                <Text style={[styles.feedbackError, { color: colors.error }]}>{error}</Text>
              </View>
            ) : null}
            {persistenceError ? (
              <View style={[styles.feedback, { backgroundColor: colors.primarySoft, borderColor: "#E8BE38" }]}>
                <MaterialIcons name="sync-problem" size={20} color="#9A7200" />
                <Text style={[styles.feedbackWarning, { color: colors.warning }]}>Il dato è visibile ma non ancora salvato: {persistenceError}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Riprova il salvataggio del collaudo"
                  onPress={() => { if (run) persistRun(run); }}
                  style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
                >
                  <Text style={styles.retryText}>Riprova</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Condividi il report di collaudo sanitizzato"
                onPress={() => void shareReport()}
                disabled={!run || busy}
                style={({ pressed }) => [styles.primaryButton, (!run || busy) && styles.disabled, pressed && styles.pressed]}
              >
                <MaterialIcons name="ios-share" size={20} color="#FFFFFF" />
                <Text style={styles.primaryText}>{busy ? "Preparazione…" : "Condividi report"}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Crea un nuovo collaudo"
                onPress={resetRun}
                disabled={!run || busy}
                style={({ pressed }) => [styles.resetButton, { borderColor: colors.border }, (!run || busy) && styles.disabled, pressed && styles.pressed]}
              >
                <MaterialIcons name="restart-alt" size={20} color={colors.primary} />
                <Text style={[styles.resetText, { color: colors.primary }]}>Nuovo</Text>
              </Pressable>
            </View>

            <View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Matrice di prova</Text>
              <Text style={[styles.sectionText, { color: colors.muted }]}>Compila ogni esito sul dispositivo che stai testando. Le note sono incluse nel report.</Text>
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
      <Text style={[styles.snapshotLabel, { color: colors.muted }]}>{label}</Text>
      <Text numberOfLines={1} style={[styles.snapshotValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 120 },
  headerContent: { gap: 16, marginBottom: 18 },
  topRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  backButton: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  headerWrap: { flex: 1 },
  hero: { borderWidth: 1, borderRadius: 22, padding: 15, flexDirection: "row", gap: 12, alignItems: "center" },
  heroIcon: { width: 50, height: 50, borderRadius: 17, backgroundColor: "#FFFFFFAA", alignItems: "center", justifyContent: "center" },
  heroCopy: { flex: 1 },
  heroTitle: { fontSize: 15, lineHeight: 21, fontWeight: "900" },
  heroText: { fontSize: 11, lineHeight: 16, marginTop: 3 },
  warning: { borderWidth: 1, borderRadius: 17, padding: 12, flexDirection: "row", alignItems: "center", gap: 9 },
  warningText: { flex: 1, fontSize: 11, lineHeight: 16, fontWeight: "700" },
  summaryCard: { borderWidth: 1, borderRadius: 22, padding: 15, gap: 12 },
  summaryTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryTitle: { fontSize: 16, lineHeight: 22, fontWeight: "900" },
  summaryText: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  summaryPercent: { fontSize: 23, lineHeight: 28, fontWeight: "900" },
  progressTrack: { height: 9, borderRadius: 99, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 99 },
  snapshotRow: { flexDirection: "row", gap: 8 },
  snapshot: { flex: 1, minWidth: 0 },
  snapshotLabel: { fontSize: 9, lineHeight: 13, fontWeight: "800", textTransform: "uppercase" },
  snapshotValue: { fontSize: 11, lineHeight: 16, fontWeight: "800", textTransform: "capitalize" },
  feedback: { borderWidth: 1, borderRadius: 16, padding: 11, flexDirection: "row", alignItems: "center", gap: 8 },
  feedbackSuccess: { flex: 1, color: "#246A4B", fontSize: 11, lineHeight: 16, fontWeight: "700" },
  feedbackError: { flex: 1, color: "#A83249", fontSize: 11, lineHeight: 16, fontWeight: "700" },
  feedbackWarning: { flex: 1, color: "#785600", fontSize: 10, lineHeight: 15, fontWeight: "700" },
  retryButton: { minHeight: 34, borderRadius: 11, backgroundColor: "#9A7200", paddingHorizontal: 10, alignItems: "center", justifyContent: "center" },
  retryText: { color: "#FFFFFF", fontSize: 10, lineHeight: 14, fontWeight: "900" },
  actions: { flexDirection: "row", gap: 9 },
  primaryButton: { flex: 1, minHeight: 52, borderRadius: 17, backgroundColor: "#2457D6", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryText: { color: "#FFFFFF", fontSize: 13, lineHeight: 18, fontWeight: "900" },
  resetButton: { minWidth: 104, minHeight: 52, borderRadius: 17, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  resetText: { fontSize: 13, lineHeight: 18, fontWeight: "900" },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  sectionTitle: { fontSize: 19, lineHeight: 25, fontWeight: "900" },
  sectionText: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  separator: { height: 12 },
  testCard: { borderWidth: 1, borderRadius: 22, padding: 15, gap: 12 },
  testHeading: { flexDirection: "row", gap: 11, alignItems: "flex-start" },
  testNumber: { width: 31, height: 31, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  testNumberText: { color: "#FFFFFF", fontSize: 13, lineHeight: 18, fontWeight: "900" },
  testTitleWrap: { flex: 1 },
  testTitle: { fontSize: 15, lineHeight: 20, fontWeight: "900" },
  testInstruction: { fontSize: 11, lineHeight: 16, marginTop: 3 },
  successBox: { borderRadius: 14, padding: 10, flexDirection: "row", alignItems: "flex-start", gap: 8 },
  successText: { flex: 1, color: "#246A4B", fontSize: 10, lineHeight: 15, fontWeight: "700" },
  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  statusButton: { width: "48%", minHeight: 39, borderRadius: 13, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 7 },
  statusLabel: { fontSize: 10, lineHeight: 14, fontWeight: "900" },
  noteInput: { minHeight: 72, borderWidth: 1, borderRadius: 14, paddingHorizontal: 11, paddingVertical: 9, fontSize: 11, lineHeight: 16 },
});

