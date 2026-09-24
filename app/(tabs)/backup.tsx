import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { ScreenContainer } from "@/components/screen-container";
import { useBrush } from "@/contexts/brush-context";
import { useI18n } from "@/contexts/locale-context";
import { useBrushling } from "@/contexts/brushling-context";
import { useParentRewards } from "@/contexts/parent-rewards-context";
import { usePreferences } from "@/contexts/preferences-context";
import { useColors } from "@/hooks/use-colors";
import {
  translateDynamic,
  type TranslationKey,
  type TranslationParams,
} from "@/lib/i18n";
import { DEFAULT_LOCALE } from "@/lib/locale-types";
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

const LIGHT_CARD_FOREGROUND = "#17213A";
const LIGHT_CARD_MUTED = "#56617D";

type BackupTranslate = (
  key: TranslationKey,
  params?: TranslationParams,
) => string;
type BackupFormatNumber = (
  value: number,
  options?: Intl.NumberFormatOptions,
) => string;

const fallbackTranslate: BackupTranslate = (key, params) =>
  translateDynamic(DEFAULT_LOCALE, key, params);
const fallbackFormatNumber: BackupFormatNumber = (value, options) =>
  new Intl.NumberFormat("it-IT", options).format(value);

function formatBytes(
  bytes: number,
  t: BackupTranslate = fallbackTranslate,
  formatNumber: BackupFormatNumber = fallbackFormatNumber,
): string {
  if (bytes < 1_024) return t("backup.bytes", { value: bytes });
  if (bytes < 1_048_576) {
    return t("backup.kilobytes", {
      value: formatNumber(bytes / 1_024, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    });
  }
  return t("backup.megabytes", {
    value: formatNumber(bytes / 1_048_576, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }),
  });
}

export default function BackupScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t, formatDate, formatNumber } = useI18n();
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
  const [manifestCreatedAt] = useState(Date.now);
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
      manifestCreatedAt,
      { preferences, parentRewards },
    ),
    [customization, hasChosenStarter, lifetimeProgress, manifestCreatedAt, parentRewards, preferences, selectedId],
  );

  const shareBackup = async () => {
    if (demoMode || !backupReady) return;
    setBusy(true);
    setError(null);
    try {
      const result = await exportAndShareCompleteBackup(currentManifest);
      setMessage(
        t("backup.exportSuccess", {
          sessions: result.sessionCount,
          size: formatBytes(result.size, t, formatNumber),
        }),
      );
    } catch {
      setError(t("backup.exportFailed"));
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
    } catch {
      if (filePreviewRef.current)
        discardCompleteBackupPreview(filePreviewRef.current);
      setFilePreview(null);
      setError(t("backup.invalidFile"));
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
    } catch {
      setPreview(null);
      setError(t("backup.invalidBackup"));
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
      setMessage(t("backup.legacyRestoreSuccess"));
    } catch {
      setError(t("backup.restoreFailed"));
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
      setMessage(t("backup.restoreSuccess"));
    } catch {
      discardCompleteBackupPreview(selectedPreview);
      setFilePreview(null);
      setError(t("backup.restoreFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView testID="backup-screen" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("backup.backLabel")}
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <MaterialIcons name="arrow-back" size={22} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerWrap}>
            <AppHeader
              eyebrow={t("backup.eyebrow")}
              title={t("backup.title")}
              connected={false}
            />
          </View>
        </View>

        <View style={[styles.hero, { backgroundColor: "#E8F8EF", borderColor: "#B9E4CC" }]}>
          <View style={styles.heroIcon}>
            <MaterialIcons name="cloud-done" size={31} color="#2E8A60" />
          </View>
          <View style={styles.heroCopy}>
            <Text style={[styles.heroTitle, { color: LIGHT_CARD_FOREGROUND }]}>
              {t("backup.heroTitle")}
            </Text>
            <Text style={[styles.heroText, { color: LIGHT_CARD_MUTED }]}>
              {t("backup.heroDescription")}
            </Text>
          </View>
        </View>

        {demoMode ? (
          <View style={[styles.demoWarning, { backgroundColor: "#FFF4C9", borderColor: "#E8BE38" }]}>
            <MaterialIcons name="science" size={22} color="#9A7200" />
            <View style={styles.demoWarningCopy}>
              <Text
                style={[
                  styles.demoWarningTitle,
                  { color: LIGHT_CARD_FOREGROUND },
                ]}
              >
                {t("backup.demoTitle")}
              </Text>
              <Text
                style={[styles.demoWarningText, { color: LIGHT_CARD_MUTED }]}
              >
                {t("backup.demoDescription")}
              </Text>
            </View>
            <Pressable
              onPress={() => void setDemoMode(false)}
              style={({ pressed }) => [
                styles.demoWarningButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.demoWarningButtonText}>
                {t("backup.exitDemo")}
              </Text>
            </Pressable>
          </View>
        ) : null}
        {!demoMode && !backupReady ? (
          <View accessibilityLiveRegion="polite" style={[styles.messageCard, { backgroundColor: "#EEF4FF", borderColor: "#C8D9FF" }]}>
            <MaterialIcons name="hourglass-top" size={20} color="#2457D6" />
            <Text
              style={[styles.messageText, { color: LIGHT_CARD_FOREGROUND }]}
            >
              {t("backup.loading")}
            </Text>
          </View>
        ) : null}
        {message ? (
          <View testID="backup-status" accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.messageCard, { backgroundColor: "#EEF4FF", borderColor: "#C8D9FF" }]}>
            <MaterialIcons name="check-circle" size={20} color="#2457D6" />
            <Text style={[styles.messageText, { color: LIGHT_CARD_FOREGROUND }]}>{message}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              {t("backup.createTitle")}
            </Text>
            <Text style={[styles.sectionCopy, { color: colors.muted }]}>
              {t("backup.createDescription")}
            </Text>
          </View>

          <View
            style={[
              styles.summaryCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Summary
              icon="pets"
              label={t("backup.summaryBrushling")}
              value={selectedId}
            />
            <Summary
              icon="history"
              label={t("backup.summarySessions")}
              value={String(lifetimeProgress.attemptedSessions)}
            />
            <Summary
              icon="home"
              label={t("backup.summaryDenItems")}
              value={String(customization.ownedIds.length)}
            />
            <Summary
              icon="redeem"
              label={t("backup.summaryFamilyRewards")}
              value={String(parentRewards.length)}
            />
          </View>

          <Pressable
            testID="backup-export"
            accessibilityRole="button"
            accessibilityLabel={t("backup.exportLabel")}
            accessibilityState={{
              disabled:
                demoMode || busy || !backupReady || !nativeBackupAvailable,
              busy,
            }}
            onPress={() => void shareBackup()}
            disabled={demoMode || busy || !backupReady || !nativeBackupAvailable}
            style={({ pressed }) => [styles.primaryButton, (demoMode || busy || !backupReady || !nativeBackupAvailable) && styles.disabled, pressed && styles.pressed]}
          >
            <MaterialIcons name="ios-share" size={20} color="#FFFFFF" />
            <Text style={styles.primaryText}>
              {!nativeBackupAvailable
                ? t("backup.nativeOnly")
                : busy
                  ? t("backup.preparing")
                  : t("backup.saveComplete")}
            </Text>
          </Pressable>
          <Text style={[styles.codeLabel, { color: colors.muted }]}>
            {t("backup.fingerprint", {
              id: backupFingerprint(currentManifest),
            })}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.section}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              {t("backup.restoreTitle")}
            </Text>
            <Text style={[styles.sectionCopy, { color: colors.muted }]}>
              {t("backup.restoreDescription")}
            </Text>
          </View>

          <Pressable
            testID="backup-pick-file"
            accessibilityRole="button"
            accessibilityLabel={t("backup.pickFileLabel")}
            accessibilityState={{
              disabled:
                demoMode || busy || !backupReady || !nativeBackupAvailable,
              busy,
            }}
            disabled={
              demoMode || busy || !backupReady || !nativeBackupAvailable
            }
            onPress={() => void pickBackupFile()}
            style={({ pressed }) => [styles.checkButton, (demoMode || busy || !backupReady || !nativeBackupAvailable) && styles.disabled, pressed && styles.pressed]}
          >
            <MaterialIcons name="folder-open" size={20} color="#FFFFFF" />
            <Text style={styles.primaryText}>{t("backup.pickFile")}</Text>
          </Pressable>

          {filePreview ? (
            <View testID="backup-file-preview" style={[styles.previewCard, { backgroundColor: "#E8F8EF", borderColor: "#B9E4CC" }]}>
              <MaterialIcons name="verified-user" size={27} color="#2E8A60" />
              <View style={styles.previewCopy}>
                <Text style={[styles.previewEyebrow, { color: "#2E8A60" }]}>
                  {filePreview.manifest.historyComplete
                    ? t("backup.verifiedComplete")
                    : t("backup.verifiedLegacy")}
                </Text>
                <Text
                  style={[
                    styles.previewTitle,
                    { color: LIGHT_CARD_FOREGROUND },
                  ]}
                >
                  {t("backup.previewTitle", {
                    name: filePreview.manifest.profile.selectedId,
                    sessions: filePreview.sessionCount,
                  })}
                </Text>
                <Text style={[styles.previewText, { color: LIGHT_CARD_MUTED }]}>
                  {t("backup.createdAt", {
                    size: formatBytes(filePreview.size, t, formatNumber),
                    date: formatDate(filePreview.manifest.createdAt, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }),
                  })}
                </Text>
                {!filePreview.manifest.historyComplete ? (
                  <Text style={[styles.warningText, { color: "#8A5B00" }]}>
                    {t("backup.legacyOrigin", {
                      sessions: filePreview.sessionCount,
                    })}
                  </Text>
                ) : null}
                <Text style={[styles.warningText, { color: "#246A4B" }]}>
                  {t("backup.replaceCompleteWarning")}
                </Text>
                <Pressable
                  testID="backup-restore-file"
                  accessibilityRole="button"
                  accessibilityLabel={t("backup.restoreFileLabel")}
                  accessibilityHint={t("backup.restoreFileHint")}
                  accessibilityState={{ disabled: busy || !backupReady, busy }}
                  disabled={busy || !backupReady}
                  onPress={() => void restoreFile()}
                  style={({ pressed }) => [styles.restoreButton, (busy || !backupReady) && styles.disabled, pressed && styles.pressed]}
                >
                  <MaterialIcons
                    name="settings-backup-restore"
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.primaryText}>
                    {t("backup.restoreComplete")}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View style={[styles.legacyCard, { borderColor: colors.border }]}>
            <Text style={[styles.legacyTitle, { color: colors.foreground }]}>
              {t("backup.legacyTitle")}
            </Text>
            <Text style={[styles.previewText, { color: colors.muted }]}>
              {t("backup.legacyDescription")}
            </Text>

            <TextInput
              testID="backup-import-code"
              accessibilityLabel={t("backup.legacyCodeLabel")}
              value={importCode}
              onChangeText={(value) => {
                setImportCode(value);
                setPreview(null);
                if (filePreviewRef.current) discardCompleteBackupPreview(filePreviewRef.current);
                setFilePreview(null);
                setError(null);
              }}
              multiline
              placeholder={t("backup.legacyCodePlaceholder")}
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.importBox, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
            />

            <Pressable
              testID="backup-inspect-code"
              accessibilityRole="button"
              accessibilityLabel={t("backup.inspectCodeLabel")}
              accessibilityState={{ disabled: !importCode.trim() }}
              disabled={!importCode.trim()}
              onPress={inspectImport}
              style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.border }, !importCode.trim() && styles.disabled, pressed && styles.pressed]}
            >
              <MaterialIcons
                name="manage-search"
                size={20}
                color={colors.primary}
              />
              <Text style={[styles.secondaryText, { color: colors.primary }]}>
                {t("backup.inspectCode")}
              </Text>
            </Pressable>
          </View>

          {error ? (
            <View testID="backup-error" accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[styles.errorCard, { backgroundColor: "#FFF0F2", borderColor: "#F0BEC8" }]}>
              <MaterialIcons name="error-outline" size={20} color="#C43D58" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {preview ? (
            <View testID="backup-legacy-preview" style={[styles.previewCard, { backgroundColor: "#FFF8E8", borderColor: "#F2D588" }]}>
              <MaterialIcons name="inventory-2" size={27} color="#B98A00" />
              <View style={styles.previewCopy}>
                <Text style={[styles.previewEyebrow, { color: "#8A6900" }]}>
                  {t("backup.validBackup")}
                </Text>
                <Text
                  style={[
                    styles.previewTitle,
                    { color: LIGHT_CARD_FOREGROUND },
                  ]}
                >
                  {t("backup.previewTitle", {
                    name: preview.profile.selectedId,
                    sessions: preview.lifetimeProgress.completedSessions,
                  })}
                </Text>
                <Text style={[styles.previewText, { color: LIGHT_CARD_MUTED }]}>
                  {t("backup.createdOn", {
                    date: formatDate(preview.createdAt, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }),
                  })}
                </Text>
                <Text style={[styles.warningText, { color: "#8A5B00" }]}>
                  {t("backup.replaceWarning")}
                </Text>
                <Pressable
                  testID="backup-restore-legacy"
                  accessibilityRole="button"
                  accessibilityLabel={t("backup.restoreLegacyLabel")}
                  accessibilityHint={t("backup.restoreLegacyHint")}
                  accessibilityState={{ disabled: busy || !backupReady, busy }}
                  disabled={busy || !backupReady}
                  onPress={() => void restoreLegacy()}
                  style={({ pressed }) => [styles.restoreButton, (busy || !backupReady) && styles.disabled, pressed && styles.pressed]}
                >
                  <MaterialIcons
                    name="settings-backup-restore"
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.primaryText}>
                    {t("backup.restoreBrushling")}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>

        <View style={[styles.privacyCard, { backgroundColor: "#F7F8FA", borderColor: colors.border }]}>
          <MaterialIcons name="privacy-tip" size={21} color={LIGHT_CARD_MUTED} />
          <Text style={[styles.privacyText, { color: LIGHT_CARD_MUTED }]}>
            {t("backup.privacy")}
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
