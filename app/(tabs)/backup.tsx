import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { ScreenContainer } from "@/components/screen-container";
import { useBrush } from "@/contexts/brush-context";
import { useBrushling } from "@/contexts/brushling-context";
import { useParentRewards } from "@/contexts/parent-rewards-context";
import { usePreferences } from "@/contexts/preferences-context";
import { useColors } from "@/hooks/use-colors";
import {
  backupFingerprint,
  createBackupManifest,
  parseBackup,
  type BrushlingsBackup,
} from "@/lib/backup";
import {
  discardCompleteBackupPreview,
  exportAndShareCompleteBackup,
  pickAndInspectCompleteBackup,
  restoreCompleteBackup,
  type CompleteBackupPreview,
} from "@/lib/complete-backup";
import { runRestoreOperation } from "@/lib/history-operation";
import {
  beginApplicationRestore,
  completeApplicationRestore,
  type RestoreSnapshot,
} from "@/lib/restore-journal";

function formatBytes(bytes: number): string {
  if (bytes < 1_024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1_024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

export default function BackupScreen() {
  const colors = useColors();
  const router = useRouter();
  const {
    lifetimeProgress,
    historyReady,
    demoMode,
    setDemoMode,
    restoreRealHistory,
    adoptRestoredHistory,
  } = useBrush();
  const {
    selectedId,
    hasChosenStarter,
    customization,
    profileReady,
    restoreInProgress,
    restoreFromBackup,
    setRestoreInProgress,
  } = useBrushling();
  const { preferences, ready: preferencesReady, restorePreferences } = usePreferences();
  const { definitions: parentRewards, ready: rewardsReady, restoreRewards } = useParentRewards();
  const [importCode, setImportCode] = useState("");
  const [preview, setPreview] = useState<BrushlingsBackup | null>(null);
  const [filePreview, setFilePreview] = useState<CompleteBackupPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const filePreviewRef = useRef<CompleteBackupPreview | null>(null);
  const backupReady = historyReady && profileReady && preferencesReady && rewardsReady && !restoreInProgress;
  const nativeBackupAvailable = Platform.OS !== "web";

  useEffect(() => {
    filePreviewRef.current = filePreview;
  }, [filePreview]);

  useEffect(() => () => {
    if (filePreviewRef.current) discardCompleteBackupPreview(filePreviewRef.current);
  }, []);

  const currentManifest = useMemo(
    () => createBackupManifest(
      { selectedId, hasChosenStarter },
      customization,
      lifetimeProgress,
      Date.now(),
      { preferences, parentRewards },
    ),
    [customization, hasChosenStarter, lifetimeProgress, parentRewards, preferences, selectedId],
  );

  const shareBackup = async () => {
    if (demoMode || !backupReady) return;
    setBusy(true);
    setError(null);
    try {
      const result = await exportAndShareCompleteBackup(currentManifest);
      setMessage(`Backup completo: ${result.sessionCount} sessioni, ${formatBytes(result.size)}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Backup non riuscito");
    } finally {
      setBusy(false);
    }
  };

  const pickBackupFile = async () => {
    if (demoMode || !backupReady) return;
    setBusy(true);
    setError(null);
    try {
      const inspected = await pickAndInspectCompleteBackup();
      if (inspected) {
        if (filePreviewRef.current) discardCompleteBackupPreview(filePreviewRef.current);
        setFilePreview(inspected);
        setPreview(null);
        setMessage(null);
      }
    } catch (caught) {
      if (filePreviewRef.current) discardCompleteBackupPreview(filePreviewRef.current);
      setFilePreview(null);
      setError(caught instanceof Error ? caught.message : "File backup non valido");
    } finally {
      setBusy(false);
    }
  };

  const inspectImport = () => {
    try {
      const parsed = parseBackup(importCode);
      setPreview(parsed);
      if (filePreviewRef.current) discardCompleteBackupPreview(filePreviewRef.current);
      setFilePreview(null);
      setError(null);
      setMessage(null);
    } catch (caught) {
      setPreview(null);
      setError(caught instanceof Error ? caught.message : "Backup non valido");
    }
  };

  const restoreLegacy = async () => {
    if (!preview || demoMode || !backupReady) return;
    const previous: RestoreSnapshot = {
      profile: { selectedId, hasChosenStarter },
      customization,
      preferences,
      parentRewards,
    };
    const next: RestoreSnapshot = {
      profile: preview.profile,
      customization: preview.customization,
      preferences: preview.preferences,
      parentRewards: preview.parentRewards,
    };
    setBusy(true);
    setError(null);
    try {
      await runRestoreOperation(async () => {
        setRestoreInProgress(true);
        const restoreId = await beginApplicationRestore(previous, next);
        let databaseCommitted = false;
        try {
          await restoreFromBackup(next.profile, next.customization);
          await restorePreferences(next.preferences);
          await restoreRewards(next.parentRewards);
          await restoreRealHistory(preview.history, preview.lifetimeProgress, restoreId);
          databaseCommitted = true;
          await completeApplicationRestore(restoreId);
        } catch (caught) {
          if (!databaseCommitted) {
            const rollback = await Promise.allSettled([
              restoreFromBackup(previous.profile, previous.customization),
              restorePreferences(previous.preferences),
              restoreRewards(previous.parentRewards),
            ]);
            if (rollback.every((result) => result.status === "fulfilled")) {
              await completeApplicationRestore(restoreId);
            }
          }
          throw caught;
        } finally {
          setRestoreInProgress(false);
        }
      });
      setImportCode("");
      setPreview(null);
      setMessage("Vecchio backup ripristinato. Progressi lifetime e sessioni disponibili sono stati importati.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ripristino non riuscito");
    } finally {
      setBusy(false);
    }
  };

  const restoreFile = async () => {
    if (!filePreview || demoMode || !backupReady) return;
    const selectedPreview = filePreview;
    const previous: RestoreSnapshot = {
      profile: { selectedId, hasChosenStarter },
      customization,
      preferences,
      parentRewards,
    };
    const next: RestoreSnapshot = {
      profile: selectedPreview.manifest.profile,
      customization: selectedPreview.manifest.customization,
      preferences: selectedPreview.manifest.preferences,
      parentRewards: selectedPreview.manifest.parentRewards,
    };
    setBusy(true);
    setError(null);
    try {
      await runRestoreOperation(async () => {
        setRestoreInProgress(true);
        const restoreId = await beginApplicationRestore(previous, next);
        let databaseCommitted = false;
        try {
          await restoreFromBackup(next.profile, next.customization);
          await restorePreferences(next.preferences);
          await restoreRewards(next.parentRewards);
          const restored = await restoreCompleteBackup(selectedPreview, restoreId);
          databaseCommitted = true;
          adoptRestoredHistory(restored.recentHistory, restored.lifetimeProgress);
          await completeApplicationRestore(restoreId);
        } catch (caught) {
          if (!databaseCommitted) {
            const rollback = await Promise.allSettled([
              restoreFromBackup(previous.profile, previous.customization),
              restorePreferences(previous.preferences),
              restoreRewards(previous.parentRewards),
            ]);
            if (rollback.every((result) => result.status === "fulfilled")) {
              await completeApplicationRestore(restoreId);
            }
          }
          throw caught;
        } finally {
          setRestoreInProgress(false);
        }
      });
      setFilePreview(null);
      setPreview(null);
      setImportCode("");
      setMessage("Ripristino completo: tutte le sessioni e i progressi sono tornati.");
    } catch (caught) {
      discardCompleteBackupPreview(selectedPreview);
      setFilePreview(null);
      setError(caught instanceof Error ? caught.message : "Ripristino non riuscito");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Torna indietro"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <MaterialIcons name="arrow-back" size={22} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerWrap}>
            <AppHeader eyebrow="Proteggi il tuo compagno" title="Backup & trasferimento" connected={false} />
          </View>
        </View>

        <View style={[styles.hero, { backgroundColor: "#E8F8EF", borderColor: "#B9E4CC" }]}>
          <View style={styles.heroIcon}>
            <MaterialIcons name="cloud-done" size={31} color="#2E8A60" />
          </View>
          <View style={styles.heroCopy}>
            <Text style={[styles.heroTitle, { color: colors.foreground }]}>Ogni progresso segue il Brushling</Text>
            <Text style={[styles.heroText, { color: colors.muted }]}>
              Un solo file contiene tutte le sessioni, senza tagli, più date, durate, progressi, compagno, tana, premi e preferenze. Gli identificatori Bluetooth del manico vengono sostituiti da alias non leggibili.
            </Text>
          </View>
        </View>

        {demoMode ? (
          <View style={[styles.demoWarning, { backgroundColor: "#FFF4C9", borderColor: "#E8BE38" }]}>
            <MaterialIcons name="science" size={22} color="#9A7200" />
            <View style={styles.demoWarningCopy}>
              <Text style={[styles.demoWarningTitle, { color: colors.foreground }]}>Modalità demo attiva</Text>
              <Text style={[styles.demoWarningText, { color: colors.muted }]}>
                I backup usano solo i dati reali. Esci dalla demo prima di esportare o ripristinare.
              </Text>
            </View>
            <Pressable onPress={() => void setDemoMode(false)} style={({ pressed }) => [styles.demoWarningButton, pressed && styles.pressed]}>
              <Text style={styles.demoWarningButtonText}>Esci demo</Text>
            </Pressable>
          </View>
        ) : null}
        {!demoMode && !backupReady ? (
          <View style={[styles.messageCard, { backgroundColor: "#EEF4FF", borderColor: "#C8D9FF" }]}>
            <MaterialIcons name="hourglass-top" size={20} color="#2457D6" />
            <Text style={[styles.messageText, { color: colors.foreground }]}>Caricamento dei dati in corso…</Text>
          </View>
        ) : null}
        {message ? (
          <View style={[styles.messageCard, { backgroundColor: "#EEF4FF", borderColor: "#C8D9FF" }]}>
            <MaterialIcons name="check-circle" size={20} color="#2457D6" />
            <Text style={[styles.messageText, { color: colors.foreground }]}>{message}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>1. Crea un backup</Text>
            <Text style={[styles.sectionCopy, { color: colors.muted }]}>
              Salvalo in Mail, Messaggi, Drive o in un altro posto che resterà accessibile dopo il cambio telefono.
            </Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Summary icon="pets" label="Brushling" value={selectedId} />
            <Summary icon="history" label="Sessioni archiviate" value={String(lifetimeProgress.attemptedSessions)} />
            <Summary icon="home" label="Oggetti tana" value={String(customization.ownedIds.length)} />
            <Summary icon="redeem" label="Premi famiglia" value={String(parentRewards.length)} />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => void shareBackup()}
            disabled={demoMode || busy || !backupReady || !nativeBackupAvailable}
            style={({ pressed }) => [styles.primaryButton, (demoMode || busy || !backupReady || !nativeBackupAvailable) && styles.disabled, pressed && styles.pressed]}
          >
            <MaterialIcons name="ios-share" size={20} color="#FFFFFF" />
            <Text style={styles.primaryText}>{!nativeBackupAvailable ? "Disponibile su iOS e Android" : busy ? "Preparazione…" : "Salva il file completo"}</Text>
          </Pressable>
          <Text style={[styles.codeLabel, { color: colors.muted }]}>ID backup · {backupFingerprint(currentManifest)}</Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.section}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>2. Ripristina sul nuovo telefono</Text>
            <Text style={[styles.sectionCopy, { color: colors.muted }]}>
              Scegli il file .brushlings salvato. L’app controlla integrità e numero di sessioni prima del ripristino.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={demoMode || busy || !backupReady || !nativeBackupAvailable}
            onPress={() => void pickBackupFile()}
            style={({ pressed }) => [styles.checkButton, (demoMode || busy || !backupReady || !nativeBackupAvailable) && styles.disabled, pressed && styles.pressed]}
          >
            <MaterialIcons name="folder-open" size={20} color="#FFFFFF" />
            <Text style={styles.primaryText}>Scegli file backup</Text>
          </Pressable>

          {filePreview ? (
            <View style={[styles.previewCard, { backgroundColor: "#E8F8EF", borderColor: "#B9E4CC" }]}>
              <MaterialIcons name="verified-user" size={27} color="#2E8A60" />
              <View style={styles.previewCopy}>
                <Text style={[styles.previewEyebrow, { color: "#2E8A60" }]}>
                  {filePreview.manifest.historyComplete ? "FILE COMPLETO VERIFICATO" : "BACKUP LEGACY VERIFICATO"}
                </Text>
                <Text style={[styles.previewTitle, { color: colors.foreground }]}>
                  {filePreview.manifest.profile.selectedId} · {filePreview.sessionCount} sessioni
                </Text>
                <Text style={[styles.previewText, { color: colors.muted }]}>
                  {formatBytes(filePreview.size)} · creato il {new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(filePreview.manifest.createdAt))}.
                </Text>
                {!filePreview.manifest.historyComplete ? (
                  <Text style={[styles.warningText, { color: "#8A5B00" }]}>
                    Origine legacy: tutti i progressi sono conservati, ma il vecchio codice conteneva solo {filePreview.sessionCount} righe consultabili.
                  </Text>
                ) : null}
                <Text style={[styles.warningText, { color: "#246A4B" }]}>
                  Il ripristino sostituirà integralmente l’archivio reale di questo telefono.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  disabled={busy || !backupReady}
                  onPress={() => void restoreFile()}
                  style={({ pressed }) => [styles.restoreButton, (busy || !backupReady) && styles.disabled, pressed && styles.pressed]}
                >
                  <MaterialIcons name="settings-backup-restore" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryText}>Ripristina archivio completo</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View style={[styles.legacyCard, { borderColor: colors.border }]}>
            <Text style={[styles.legacyTitle, { color: colors.foreground }]}>Hai un vecchio codice backup?</Text>
            <Text style={[styles.previewText, { color: colors.muted }]}>I codici v1 e v2 restano importabili per non perdere dati creati dalle versioni precedenti.</Text>

            <TextInput
              value={importCode}
              onChangeText={(value) => {
                setImportCode(value);
                setPreview(null);
                if (filePreviewRef.current) discardCompleteBackupPreview(filePreviewRef.current);
                setFilePreview(null);
                setError(null);
              }}
              multiline
              placeholder="Incolla qui BRUSHLINGS-BACKUP-1/2:..."
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.importBox, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
            />

            <Pressable
              accessibilityRole="button"
              disabled={!importCode.trim()}
              onPress={inspectImport}
              style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.border }, !importCode.trim() && styles.disabled, pressed && styles.pressed]}
            >
              <MaterialIcons name="manage-search" size={20} color={colors.primary} />
              <Text style={[styles.secondaryText, { color: colors.primary }]}>Controlla vecchio codice</Text>
            </Pressable>
          </View>

          {error ? (
            <View style={[styles.errorCard, { backgroundColor: "#FFF0F2", borderColor: "#F0BEC8" }]}>
              <MaterialIcons name="error-outline" size={20} color="#C43D58" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {preview ? (
            <View style={[styles.previewCard, { backgroundColor: "#FFF8E8", borderColor: "#F2D588" }]}>
              <MaterialIcons name="inventory-2" size={27} color="#B98A00" />
              <View style={styles.previewCopy}>
                <Text style={[styles.previewEyebrow, { color: "#8A6900" }]}>BACKUP VALIDO</Text>
                <Text style={[styles.previewTitle, { color: colors.foreground }]}>
                  {preview.profile.selectedId} · {preview.lifetimeProgress.completedSessions} sessioni
                </Text>
                <Text style={[styles.previewText, { color: colors.muted }]}>
                  Creato il {new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(preview.createdAt))}.
                </Text>
                <Text style={[styles.warningText, { color: "#8A5B00" }]}>
                  Il ripristino sostituirà i progressi reali presenti su questo telefono.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  disabled={busy || !backupReady}
                  onPress={() => void restoreLegacy()}
                  style={({ pressed }) => [styles.restoreButton, (busy || !backupReady) && styles.disabled, pressed && styles.pressed]}
                >
                  <MaterialIcons name="settings-backup-restore" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryText}>Ripristina questo Brushling</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>

        <View style={[styles.privacyCard, { backgroundColor: "#F7F8FA", borderColor: colors.border }]}>
          <MaterialIcons name="privacy-tip" size={21} color={colors.muted} />
          <Text style={[styles.privacyText, { color: colors.muted }]}>
            Il file contiene date e durata di tutte le sessioni. Non pubblicarlo online: conservalo come documento privato di famiglia.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function Summary({ icon, label, value }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={styles.summaryItem}>
      <MaterialIcons name={icon} size={20} color={colors.primary} />
      <Text style={[styles.summaryValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 90, gap: 18 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  backButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  headerWrap: { flex: 1 },
  hero: { borderWidth: 1, borderRadius: 24, padding: 15, flexDirection: "row", alignItems: "center", gap: 12 },
  heroIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: "#FFFFFFAA", alignItems: "center", justifyContent: "center" },
  heroCopy: { flex: 1 },
  heroTitle: { fontSize: 16, lineHeight: 21, fontWeight: "900" },
  heroText: { fontSize: 10, lineHeight: 15, marginTop: 3 },
  demoWarning: { borderWidth: 1, borderRadius: 18, padding: 12, flexDirection: "row", alignItems: "center", gap: 9 },
  demoWarningCopy: { flex: 1 },
  demoWarningTitle: { fontSize: 12, lineHeight: 17, fontWeight: "900" },
  demoWarningText: { fontSize: 9, lineHeight: 14, marginTop: 2 },
  demoWarningButton: { minHeight: 34, paddingHorizontal: 10, borderRadius: 12, backgroundColor: "#B07D00", alignItems: "center", justifyContent: "center" },
  demoWarningButtonText: { color: "#FFFFFF", fontSize: 9, lineHeight: 13, fontWeight: "900" },
  messageCard: { borderWidth: 1, borderRadius: 18, padding: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  messageText: { flex: 1, fontSize: 11, lineHeight: 16, fontWeight: "700" },
  section: { gap: 12 },
  sectionTitle: { fontSize: 22, lineHeight: 28, fontWeight: "900" },
  sectionCopy: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  summaryCard: { borderWidth: 1, borderRadius: 20, padding: 13, flexDirection: "row", flexWrap: "wrap", rowGap: 10 },
  summaryItem: { width: "50%", alignItems: "center", gap: 3 },
  summaryValue: { fontSize: 13, lineHeight: 18, fontWeight: "900", textTransform: "capitalize" },
  summaryLabel: { fontSize: 9, lineHeight: 13, textAlign: "center" },
  actionRow: { flexDirection: "row", gap: 9 },
  primaryButton: { minHeight: 48, borderRadius: 16, backgroundColor: "#2457D6", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 10 },
  secondaryButton: { minHeight: 48, borderRadius: 16, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 10 },
  primaryText: { color: "#FFFFFF", fontSize: 11, lineHeight: 16, fontWeight: "900", textAlign: "center" },
  secondaryText: { fontSize: 11, lineHeight: 16, fontWeight: "900" },
  codeLabel: { fontSize: 9, lineHeight: 13, fontWeight: "800", marginBottom: 5 },
  codeBox: { minHeight: 100, maxHeight: 150, borderWidth: 1, borderRadius: 16, padding: 11, fontSize: 9, lineHeight: 13 },
  divider: { height: 1 },
  importBox: { minHeight: 130, borderWidth: 1, borderRadius: 18, padding: 12, fontSize: 10, lineHeight: 15, textAlignVertical: "top" },
  legacyCard: { borderWidth: 1, borderRadius: 18, padding: 12, gap: 10 },
  legacyTitle: { fontSize: 13, lineHeight: 18, fontWeight: "900" },
  checkButton: { minHeight: 48, borderRadius: 16, backgroundColor: "#2457D6", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  disabled: { opacity: 0.45 },
  errorCard: { borderWidth: 1, borderRadius: 17, padding: 11, flexDirection: "row", alignItems: "flex-start", gap: 8 },
  errorText: { flex: 1, color: "#A92E46", fontSize: 10, lineHeight: 15, fontWeight: "700" },
  previewCard: { borderWidth: 1.5, borderRadius: 21, padding: 13, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  previewCopy: { flex: 1 },
  previewEyebrow: { fontSize: 9, lineHeight: 13, fontWeight: "900", letterSpacing: 0.7 },
  previewTitle: { fontSize: 15, lineHeight: 20, fontWeight: "900" },
  previewText: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  warningText: { fontSize: 10, lineHeight: 15, fontWeight: "800", marginTop: 7 },
  restoreButton: { minHeight: 46, marginTop: 10, borderRadius: 15, backgroundColor: "#B07D00", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  privacyCard: { borderWidth: 1, borderRadius: 18, padding: 12, flexDirection: "row", alignItems: "flex-start", gap: 8 },
  privacyText: { flex: 1, fontSize: 10, lineHeight: 15 },
  pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
});
