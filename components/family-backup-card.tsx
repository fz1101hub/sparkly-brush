import { useEffect, useState } from "react";
import { Platform, StyleSheet, Switch, View } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import { VillageButton } from "@/components/village-ui";
import { useAppRestart } from "@/contexts/app-restart";
import { useBrush } from "@/contexts/brush-context";
import { useI18n } from "@/contexts/locale-context";
import { useColors } from "@/hooks/use-colors";
import { confirmDestructive } from "@/lib/dialogs";
import type { FamilyBackupFile } from "@/lib/family-backup-format";
import {
  chooseAutoBackupFolder,
  exportFamilyBackup,
  familyBackupAvailable,
  loadAutoBackup,
  pickFamilyBackup,
  restoreFamilyBackup,
  saveAutoBackup,
  type AutoBackupSettings,
} from "@/lib/family-backup";

/**
 * The whole family in one file (voce 69) and the automatic weekly backup (voce 44), in the backup
 * screen. Restoring a family file brings back every child in it, then the app starts again.
 */
export function FamilyBackupCard() {
  const colors = useColors();
  const { t, formatDate } = useI18n();
  const restart = useAppRestart();
  const { isActive, demoMode } = useBrush();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<FamilyBackupFile | null>(null);
  const [auto, setAuto] = useState<AutoBackupSettings | null>(null);
  const defaultName = t("family.profile.defaultName");

  useEffect(() => {
    let active = true;
    void loadAutoBackup().then((loaded) => {
      if (active) setAuto(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
    } catch {
      setMessage(t("familyBackup.failed"));
    } finally {
      setBusy(false);
    }
  };
  const blocked = busy || isActive || demoMode || !familyBackupAvailable;
  const updateAuto = (next: AutoBackupSettings) => {
    setAuto(next);
    void saveAutoBackup(next);
  };

  return (
    <View testID="family-backup" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>{t("familyBackup.title")}</Text>
      <Text style={[styles.text, { color: colors.muted }]}>
        {familyBackupAvailable ? t("familyBackup.text") : t("familyBackup.webOnly")}
      </Text>
      <View style={styles.actions}>
        <VillageButton
          testID="family-backup-export"
          icon="family-restroom"
          label={t("familyBackup.export")}
          disabled={blocked}
          onPress={() => void run(async () => {
            const result = await exportFamilyBackup(t("familyBackup.title"), defaultName);
            setMessage(t("familyBackup.exported", { children: result.children, sessions: result.sessions }));
          })}
        />
        <VillageButton
          testID="family-backup-pick"
          secondary
          icon="folder-open"
          label={t("familyBackup.pick")}
          disabled={blocked}
          onPress={() => void run(async () => setPreview(await pickFamilyBackup()))}
        />
      </View>
      {preview ? (
        <View testID="family-backup-preview" style={styles.preview}>
          <Text style={[styles.text, { color: colors.foreground }]}>
            {t("familyBackup.preview", { date: formatDate(preview.createdAt, { day: "numeric", month: "long", year: "numeric" }) })}
          </Text>
          {preview.children.map((child) => (
            <Text key={child.profileId} style={[styles.text, { color: colors.foreground }]}>
              • {t("familyBackup.child", { name: child.name, count: child.sessionCount })}
            </Text>
          ))}
          <VillageButton
            testID="family-backup-restore"
            icon="settings-backup-restore"
            label={t("familyBackup.restore")}
            disabled={blocked}
            onPress={() => confirmDestructive({
              title: t("familyBackup.confirmTitle"),
              message: t("familyBackup.confirmMessage"),
              cancelLabel: t("common.cancel"),
              confirmLabel: t("familyBackup.restore"),
              onConfirm: () => void run(async () => {
                await restoreFamilyBackup(preview, defaultName);
                restart();
              }),
            })}
          />
        </View>
      ) : null}
      {auto ? (
        <View style={styles.preview}>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.foreground, flex: 1 }]}>{t("familyBackup.auto")}</Text>
            <Switch
              testID="family-backup-auto"
              style={{ minHeight: 44, minWidth: 48 }}
              accessibilityLabel={t("familyBackup.auto")}
              value={auto.enabled}
              disabled={!familyBackupAvailable}
              onValueChange={(enabled) => updateAuto({ ...auto, enabled })}
            />
          </View>
          <Text style={[styles.text, { color: colors.muted }]}>
            {auto.lastAt ? t("familyBackup.autoLast", { date: formatDate(auto.lastAt, { day: "numeric", month: "long" }) }) : t("familyBackup.autoHint")}
          </Text>
          {Platform.OS === "android" && familyBackupAvailable ? (
            <VillageButton
              testID="family-backup-folder"
              secondary
              icon="drive-folder-upload"
              label={auto.directoryUri ? t("familyBackup.folderChosen") : t("familyBackup.folder")}
              onPress={() => void run(async () => {
                const directoryUri = await chooseAutoBackupFolder();
                if (directoryUri) updateAuto({ ...auto, directoryUri });
              })}
            />
          ) : null}
        </View>
      ) : null}
      {message ? <Text testID="family-backup-message" accessibilityLiveRegion="polite" style={[styles.text, { color: colors.foreground }]}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 22, padding: 16, gap: 10 },
  title: { fontSize: 18, lineHeight: 24, fontWeight: "900" },
  text: { fontSize: 14, lineHeight: 21 },
  label: { fontSize: 15, lineHeight: 22, fontWeight: "700" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  preview: { gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
});
