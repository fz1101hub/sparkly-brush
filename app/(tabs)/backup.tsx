import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { DesignText as Text } from "@/components/design-text";

import { AppHeader } from "@/components/app-header";
import { ParentGuard } from "@/components/parent-guard";
import { ScreenContainer } from "@/components/screen-container";
import { GOLD_BUTTON_BACKGROUND } from "@/constants/accessibility-colors";
import { useBrush } from "@/contexts/brush-context";
import { useI18n } from "@/contexts/locale-context";
import { useBrushling } from "@/contexts/brushling-context";
import { useParentRewards } from "@/contexts/parent-rewards-context";
import { usePreferences } from "@/contexts/preferences-context";
import { useBraces } from "@/contexts/braces-context";
import { useFamily } from "@/contexts/family-context";
import { useVillage } from "@/contexts/village-context";
import { useBack } from "@/hooks/use-back";
import { useAsyncAction } from "@/hooks/use-async-action";
import { useColors } from "@/hooks/use-colors";
import {
  translateDynamic,
  type TranslationKey,
  type TranslationParams,
} from "@/lib/i18n";
import { themeText } from "@/lib/app-themes";
import type { BracesType } from "@/lib/braces";
import { reminderAdapter } from "@/lib/reminder-platform";
import {
  DEFAULT_REMINDERS,
  getReminderService,
  reminderText,
  type ReminderSettings,
} from "@/lib/reminders";
import { useThemeContext } from "@/lib/theme-provider";
import { DEFAULT_LOCALE } from "@/lib/locale-types";
import {
  backupFingerprint,
  createBackupManifest,
  parseBackup,
  type BrushlingsBackup,
} from "@/lib/backup";
import {
  compareBackupContents,
  type BackupComparison,
} from "@/lib/backup-comparison";
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
  const goBack = useBack();
  const { t, formatDate, formatNumber } = useI18n();
  const runAction = useAsyncAction();
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
  const { state: village, ready: villageReady, restoreVillage } = useVillage();
  const { settings: braces, ready: bracesReady, restoreBraces } = useBraces();
  const { theme, setTheme } = useThemeContext();
  const themeId = theme.id;
  const { active: activeProfile } = useFamily();
  const reminderService = useRef(getReminderService(activeProfile.id));
  const [reminders, setReminders] = useState<ReminderSettings | null>(null);
  const [importCode, setImportCode] = useState("");
  const [preview, setPreview] = useState<BrushlingsBackup | null>(null);
  const [filePreview, setFilePreview] = useState<CompleteBackupPreview | null>(null);
  const [pendingRestore, setPendingRestore] = useState<"file" | "legacy" | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manifestCreatedAt] = useState(Date.now);
  const filePreviewRef = useRef<CompleteBackupPreview | null>(null);
  const backupReady =
    historyReady && profileReady && preferencesReady && rewardsReady && villageReady && bracesReady
    && reminders !== null && !restoreInProgress;
  const nativeBackupAvailable = Platform.OS !== "web";

  useEffect(() => {
    filePreviewRef.current = filePreview;
  }, [filePreview]);

  // Unreadable reminder settings are not worth blocking a backup: the defaults stand in.
  useEffect(() => {
    let mounted = true;
    const service = reminderService.current;
    void service
      .load()
      .catch(() => ({ ...DEFAULT_REMINDERS }))
      .then((loaded) => {
        if (mounted) setReminders(loaded);
      });
    const unsubscribe = service.subscribe((restored) => {
      if (mounted) setReminders(restored);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => () => {
    if (filePreviewRef.current) discardCompleteBackupPreview(filePreviewRef.current);
  }, []);

  const currentManifest = useMemo(
    () => createBackupManifest(
      { selectedId, hasChosenStarter },
      customization,
      lifetimeProgress,
      manifestCreatedAt,
      { preferences, parentRewards, village, braces, themeId, reminders: reminders ?? DEFAULT_REMINDERS },
    ),
    [
      braces,
      customization,
      hasChosenStarter,
      lifetimeProgress,
      manifestCreatedAt,
      parentRewards,
      preferences,
      reminders,
      selectedId,
      themeId,
      village,
    ],
  );
  const fileComparison = filePreview
    ? compareBackupContents(
      currentManifest,
      filePreview.manifest,
      filePreview.sessionCount,
      filePreview.manifest.historyComplete,
    )
    : null;
  const legacyComparison = preview
    ? compareBackupContents(currentManifest, preview, preview.history.length, false)
    : null;

  const shareBackup = async () => {
    if (demoMode || !backupReady) return;
    setBusy(true);
    setError(null);
    try {
      // The screen stays mounted for days: date the file when it is created, not when the tab was opened.
      const result = await exportAndShareCompleteBackup({ ...currentManifest, createdAt: Date.now() }, t);
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
        setPendingRestore(null);
        if (filePreviewRef.current) discardCompleteBackupPreview(filePreviewRef.current);
        setFilePreview(inspected);
        setPreview(null);
        setMessage(null);
      }
    } catch {
      setPendingRestore(null);
      if (filePreviewRef.current)
        discardCompleteBackupPreview(filePreviewRef.current);
      setFilePreview(null);
      setError(t("backup.invalidFile"));
    } finally {
      setBusy(false);
    }
  };

  const inspectImport = () => {
    setPendingRestore(null);
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

  // After a restore on a new phone this may ask for the notification permission; if it is refused,
  // the reminder settings show it, and the restore itself has already succeeded.
  const rescheduleReminders = () => {
    void reminderService.current
      .reconcile(reminderText(t, activeProfile.name), reminderAdapter, true)
      .catch(() => {});
  };

  const restoreLegacy = async () => {
    if (!preview || pendingRestore !== "legacy" || demoMode || !backupReady || busy) return;
    setPendingRestore(null);
    const previous: RestoreSnapshot = {
      profile: { selectedId, hasChosenStarter },
      customization,
      preferences,
      parentRewards,
      village,
      braces,
      themeId,
      reminders: reminders ?? DEFAULT_REMINDERS,
    };
    const next: RestoreSnapshot = {
      profile: preview.profile,
      customization: preview.customization,
      preferences: preview.preferences,
      parentRewards: preview.parentRewards,
      // Text codes predate village, braces, themes and reminders: the child's current ones stay.
      village,
      braces,
      themeId,
      reminders: reminders ?? DEFAULT_REMINDERS,
    };
    setBusy(true);
    setError(null);
    try {
      await runRestoreOperation(async () => {
        setRestoreInProgress(true);
        try {
          const restoreId = await beginApplicationRestore(previous, next);
          let databaseCommitted = false;
          try {
            await restoreFromBackup(next.profile, next.customization);
            await restorePreferences(next.preferences);
            await restoreRewards(next.parentRewards);
            await restoreVillage(next.village);
            await restoreBraces(next.braces);
            await reminderService.current.restoreSettings(next.reminders);
            await setTheme(next.themeId);
            await restoreRealHistory(preview.history, preview.lifetimeProgress, restoreId);
            databaseCommitted = true;
            await completeApplicationRestore(restoreId);
          } catch (caught) {
            if (!databaseCommitted) {
              const rollback = await Promise.allSettled([
                restoreFromBackup(previous.profile, previous.customization),
                restorePreferences(previous.preferences),
                restoreRewards(previous.parentRewards),
                restoreVillage(previous.village),
                restoreBraces(previous.braces),
                reminderService.current.restoreSettings(previous.reminders),
                setTheme(previous.themeId),
              ]);
              if (rollback.every((result) => result.status === "fulfilled")) {
                await completeApplicationRestore(restoreId);
              }
            }
            throw caught;
          }
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
    if (!filePreview || pendingRestore !== "file" || demoMode || !backupReady || busy) return;
    setPendingRestore(null);
    const selectedPreview = filePreview;
    const previous: RestoreSnapshot = {
      profile: { selectedId, hasChosenStarter },
      customization,
      preferences,
      parentRewards,
      village,
      braces,
      themeId,
      reminders: reminders ?? DEFAULT_REMINDERS,
    };
    const next: RestoreSnapshot = {
      profile: selectedPreview.manifest.profile,
      customization: selectedPreview.manifest.customization,
      preferences: selectedPreview.manifest.preferences,
      parentRewards: selectedPreview.manifest.parentRewards,
      // Files written before 27 October 2026 leave these as they are.
      village: selectedPreview.manifest.village ?? village,
      braces: selectedPreview.manifest.braces ?? braces,
      themeId: selectedPreview.manifest.themeId ?? themeId,
      reminders: selectedPreview.manifest.reminders ?? reminders ?? DEFAULT_REMINDERS,
    };
    setBusy(true);
    setError(null);
    try {
      await runRestoreOperation(async () => {
        setRestoreInProgress(true);
        try {
          const restoreId = await beginApplicationRestore(previous, next);
          let databaseCommitted = false;
          try {
            await restoreFromBackup(next.profile, next.customization);
            await restorePreferences(next.preferences);
            await restoreRewards(next.parentRewards);
            await restoreVillage(next.village);
            await restoreBraces(next.braces);
            await reminderService.current.restoreSettings(next.reminders);
            await setTheme(next.themeId);
            const restored = await restoreCompleteBackup(selectedPreview, restoreId);
            databaseCommitted = true;
            adoptRestoredHistory(restored.recentHistory, restored.lifetimeProgress);
            await completeApplicationRestore(restoreId);
            rescheduleReminders();
          } catch (caught) {
            if (!databaseCommitted) {
              const rollback = await Promise.allSettled([
                restoreFromBackup(previous.profile, previous.customization),
                restorePreferences(previous.preferences),
                restoreRewards(previous.parentRewards),
                restoreVillage(previous.village),
                restoreBraces(previous.braces),
                reminderService.current.restoreSettings(previous.reminders),
                setTheme(previous.themeId),
              ]);
              if (rollback.every((result) => result.status === "fulfilled")) {
                await completeApplicationRestore(restoreId);
              }
            }
            throw caught;
          }
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
      <ParentGuard>
      <ScrollView testID="backup-screen" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("backup.backLabel")}
            hitSlop={4}
            onPress={goBack}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <MaterialIcons name="arrow-back" size={22} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerWrap}>
            <AppHeader
              eyebrow={t("backup.eyebrow")}
              title={t("backup.title")}
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
              onPress={() => runAction(setDemoMode(false))}
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
              testID="backup-current-sessions"
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
            <Summary
              icon="museum"
              label={t("backup.summaryMuseumCards")}
              value={String(village.cards.length)}
              testID="backup-current-cards"
            />
            <Summary
              icon="sentiment-satisfied-alt"
              label={t("backup.summaryBraces")}
              value={bracesLabel(braces.enabled ? braces.type : "none", t)}
              keepCase
            />
            <Summary icon="palette" label={t("backup.summaryTheme")} value={themeText(themeId, t).name} keepCase />
            <Summary
              icon="alarm"
              label={t("backup.summaryReminders")}
              value={remindersLabel(reminders, t)}
              keepCase
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
            onPress={() => runAction(shareBackup())}
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
            onPress={() => runAction(pickBackupFile())}
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
                {fileComparison ? <BackupComparisonCard kind="file" comparison={fileComparison} /> : null}
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
                  onPress={() => setPendingRestore("file")}
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
                {pendingRestore === "file" ? (
                  <RestoreConfirmation
                    kind="file"
                    warning={t("backup.replaceCompleteWarning")}
                    disabled={busy || !backupReady}
                    onCancel={() => setPendingRestore(null)}
                    onConfirm={() => runAction(restoreFile())}
                  />
                ) : null}
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
                setPendingRestore(null);
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
                {legacyComparison ? <BackupComparisonCard kind="legacy" comparison={legacyComparison} /> : null}
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
                  onPress={() => setPendingRestore("legacy")}
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
                {pendingRestore === "legacy" ? (
                  <RestoreConfirmation
                    kind="legacy"
                    warning={t("backup.replaceWarning")}
                    disabled={busy || !backupReady}
                    onCancel={() => setPendingRestore(null)}
                    onConfirm={() => runAction(restoreLegacy())}
                  />
                ) : null}
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
      </ParentGuard>
    </ScreenContainer>
  );
}

function BackupComparisonCard({
  kind,
  comparison,
}: {
  kind: "file" | "legacy";
  comparison: BackupComparison;
}) {
  const { t, formatNumber } = useI18n();
  return (
    <View testID={`backup-comparison-${kind}`} style={styles.comparisonCard}>
      <Text style={styles.comparisonTitle}>{t("backup.compareTitle")}</Text>
      <View style={styles.comparisonRow}>
        <Text style={styles.comparisonMetric} />
        <Text style={styles.comparisonValue}>{t("backup.compareCurrent")}</Text>
        <Text style={styles.comparisonValue}>{t("backup.compareIncoming")}</Text>
      </View>
      <ComparisonRow
        label={t("backup.summaryBrushling")}
        current={comparison.current.brushling}
        incoming={comparison.incoming.brushling}
      />
      <ComparisonRow
        label={t("backup.compareLifetime")}
        current={formatNumber(comparison.current.attemptedSessions)}
        incoming={formatNumber(comparison.incoming.attemptedSessions)}
      />
      <ComparisonRow
        label={t("backup.compareCompleted")}
        current={formatNumber(comparison.current.completedSessions)}
        incoming={formatNumber(comparison.incoming.completedSessions)}
      />
      <ComparisonRow
        label={t("backup.summaryDenItems")}
        current={formatNumber(comparison.current.denItems)}
        incoming={formatNumber(comparison.incoming.denItems)}
      />
      <ComparisonRow
        label={t("backup.summaryFamilyRewards")}
        current={formatNumber(comparison.current.familyRewards)}
        incoming={formatNumber(comparison.incoming.familyRewards)}
      />
      <ComparisonRow
        label={t("backup.summaryMuseumCards")}
        current={formatNumber(comparison.current.museumCards ?? 0)}
        incoming={comparison.incoming.museumCards === null ? t("backup.compareKept") : formatNumber(comparison.incoming.museumCards)}
      />
      <ComparisonRow
        label={t("backup.summaryBraces")}
        current={bracesLabel(comparison.current.braces ?? "none", t)}
        incoming={comparison.incoming.braces === null ? t("backup.compareKept") : bracesLabel(comparison.incoming.braces, t)}
      />
      <ComparisonRow
        label={t("backup.summaryTheme")}
        current={comparison.current.themeId ? themeText(comparison.current.themeId, t).name : t("backup.compareKept")}
        incoming={comparison.incoming.themeId ? themeText(comparison.incoming.themeId, t).name : t("backup.compareKept")}
      />
      <ComparisonRow
        label={t("backup.summaryReminders")}
        current={remindersLabel(comparison.current.reminders, t)}
        incoming={comparison.incoming.reminders ? remindersLabel(comparison.incoming.reminders, t) : t("backup.compareKept")}
      />
      <Text style={styles.comparisonNote}>
        {comparison.historyComplete
          ? t("backup.compareCompleteRows", { count: formatNumber(comparison.incomingRows) })
          : t("backup.comparePartialRows", { count: formatNumber(comparison.incomingRows) })}
      </Text>
      {comparison.lowerLifetimeProgress ? (
        <Text testID={`backup-comparison-${kind}-older`} style={styles.comparisonWarning}>
          {t("backup.compareOlder")}
        </Text>
      ) : null}
      <Text style={styles.comparisonWarning}>{t("backup.compareNoMerge")}</Text>
    </View>
  );
}

const BRACES_LABELS: Record<BracesType, TranslationKey> = {
  fixed: "braces.type.fixed",
  removable: "braces.type.removable",
  aligners: "braces.type.aligners",
  expander: "braces.type.expander",
};

function bracesLabel(value: BracesType | "none", t: (key: TranslationKey) => string): string {
  if (value === "none") return t("backup.bracesNone");
  const label = t(BRACES_LABELS[value]);
  return label.charAt(0).toLocaleUpperCase() + label.slice(1);
}

function remindersLabel(
  value: Pick<ReminderSettings, "enabled" | "morning" | "evening"> | null,
  t: (key: TranslationKey, params?: TranslationParams) => string,
): string {
  return value?.enabled ? t("backup.remindersAt", { morning: value.morning, evening: value.evening }) : t("backup.remindersOff");
}

function ComparisonRow({
  label,
  current,
  incoming,
}: {
  label: string;
  current: string;
  incoming: string;
}) {
  return (
    <View style={styles.comparisonRow}>
      <Text style={styles.comparisonMetric}>{label}</Text>
      <Text style={styles.comparisonValue}>{current}</Text>
      <Text style={styles.comparisonValue}>{incoming}</Text>
    </View>
  );
}

function RestoreConfirmation({
  kind,
  warning,
  disabled,
  onCancel,
  onConfirm,
}: {
  kind: "file" | "legacy";
  warning: string;
  disabled: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useI18n();
  const confirmLabel = t(kind === "file" ? "backup.confirmFile" : "backup.confirmLegacy");
  return (
    <View
      testID={`backup-confirm-${kind}-card`}
      accessibilityLiveRegion="assertive"
      style={styles.confirmCard}
    >
      <Text style={styles.confirmTitle}>{t("backup.confirmTitle")}</Text>
      <Text style={styles.confirmWarning}>{warning}</Text>
      <View style={styles.confirmActions}>
        <Pressable
          testID={`backup-cancel-${kind}`}
          accessibilityRole="button"
          accessibilityLabel={t("common.cancel")}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={onCancel}
          style={({ pressed }) => [styles.confirmCancel, disabled && styles.disabled, pressed && styles.pressed]}
        >
          <Text style={styles.confirmCancelText}>{t("common.cancel")}</Text>
        </Pressable>
        <Pressable
          testID={`backup-confirm-${kind}`}
          accessibilityRole="button"
          accessibilityLabel={confirmLabel}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={onConfirm}
          style={({ pressed }) => [styles.confirmProceed, disabled && styles.disabled, pressed && styles.pressed]}
        >
          <Text style={styles.confirmProceedText}>{confirmLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Summary({
  icon,
  label,
  value,
  testID,
  keepCase = false,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
  value: string;
  testID?: string;
  /** Translated text keeps its own capitals (the creature id is capitalized). */
  keepCase?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={styles.summaryItem}>
      <MaterialIcons name={icon} size={20} color={colors.primary} />
      <Text testID={testID} style={[styles.summaryValue, keepCase && styles.keepCase, { color: colors.foreground }]}>{value}</Text>
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
  demoWarningButton: { minHeight: 44, paddingHorizontal: 10, borderRadius: 12, backgroundColor: GOLD_BUTTON_BACKGROUND, alignItems: "center", justifyContent: "center" },
  demoWarningButtonText: { color: "#FFFFFF", fontSize: 9, lineHeight: 13, fontWeight: "900" },
  messageCard: { borderWidth: 1, borderRadius: 18, padding: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  messageText: { flex: 1, fontSize: 11, lineHeight: 16, fontWeight: "700" },
  section: { gap: 12 },
  sectionTitle: { fontSize: 22, lineHeight: 28, fontWeight: "900" },
  sectionCopy: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  summaryCard: { borderWidth: 1, borderRadius: 20, padding: 13, flexDirection: "row", flexWrap: "wrap", rowGap: 10 },
  summaryItem: { width: "50%", alignItems: "center", gap: 3 },
  summaryValue: { fontSize: 13, lineHeight: 18, fontWeight: "900", textTransform: "capitalize", textAlign: "center" },
  keepCase: { textTransform: "none" },
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
  comparisonCard: { borderWidth: 1, borderColor: "#C4D1D9", backgroundColor: "#FFFFFF", borderRadius: 14, padding: 10, gap: 5, marginTop: 10 },
  comparisonTitle: { color: LIGHT_CARD_FOREGROUND, fontSize: 12, lineHeight: 17, fontWeight: "900" },
  comparisonRow: { flexDirection: "row", alignItems: "flex-start", gap: 4 },
  comparisonMetric: { width: "42%", color: LIGHT_CARD_FOREGROUND, fontSize: 10, lineHeight: 15, fontWeight: "700" },
  comparisonValue: { width: "27%", color: LIGHT_CARD_FOREGROUND, fontSize: 10, lineHeight: 15, fontWeight: "800", textAlign: "center" },
  comparisonNote: { color: LIGHT_CARD_MUTED, fontSize: 10, lineHeight: 15, marginTop: 4 },
  comparisonWarning: { color: "#651C2F", fontSize: 10, lineHeight: 15, fontWeight: "700", marginTop: 3 },
  restoreButton: { minHeight: 46, marginTop: 10, borderRadius: 15, backgroundColor: GOLD_BUTTON_BACKGROUND, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  confirmCard: { backgroundColor: "#FFF0F2", borderColor: "#F0BEC8", borderWidth: 1, borderRadius: 16, padding: 12, gap: 8, marginTop: 10 },
  confirmTitle: { color: "#651C2F", fontSize: 14, lineHeight: 20, fontWeight: "900" },
  confirmWarning: { color: "#651C2F", fontSize: 11, lineHeight: 16, fontWeight: "700" },
  confirmActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  confirmCancel: { flexGrow: 1, minWidth: 100, minHeight: 44, borderWidth: 1, borderColor: "#A92E46", borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  confirmCancelText: { color: "#8A253A", fontSize: 11, lineHeight: 16, fontWeight: "800", textAlign: "center" },
  confirmProceed: { flexGrow: 1, minWidth: 130, minHeight: 44, backgroundColor: "#A92E46", borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  confirmProceedText: { color: "#FFFFFF", fontSize: 11, lineHeight: 16, fontWeight: "800", textAlign: "center" },
  privacyCard: { borderWidth: 1, borderRadius: 18, padding: 12, flexDirection: "row", alignItems: "flex-start", gap: 8 },
  privacyText: { flex: 1, fontSize: 10, lineHeight: 15 },
  pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
});
