import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { ScreenContainer } from "@/components/screen-container";
import { useBrush } from "@/contexts/brush-context";
import { useBrushling } from "@/contexts/brushling-context";
import { useParentRewards } from "@/contexts/parent-rewards-context";
import { usePreferences } from "@/contexts/preferences-context";
import { useColors } from "@/hooks/use-colors";
import {
  backupFingerprint,
  createBackup,
  parseBackup,
  serializeBackup,
  type BrushlingsBackup,
} from "@/lib/backup";

export default function BackupScreen() {
  const colors = useColors();
  const router = useRouter();
  const { realHistory, demoMode, setDemoMode, restoreRealHistory } = useBrush();
  const {
    selectedId,
    hasChosenStarter,
    customization,
    restoreFromBackup,
  } = useBrushling();
  const { preferences, restorePreferences } = usePreferences();
  const { definitions: parentRewards, restoreRewards } = useParentRewards();
  const [backupCode, setBackupCode] = useState("");
  const [importCode, setImportCode] = useState("");
  const [preview, setPreview] = useState<BrushlingsBackup | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentBackup = useMemo(
    () => createBackup(
      realHistory,
      { selectedId, hasChosenStarter },
      customization,
      Date.now(),
      { preferences, parentRewards },
    ),
    [customization, hasChosenStarter, parentRewards, preferences, realHistory, selectedId],
  );

  const generate = () => {
    if (demoMode) return;
    const code = serializeBackup(currentBackup);
    setBackupCode(code);
    setMessage("Backup aggiornato e pronto da salvare.");
    setError(null);
  };

  const shareBackup = async () => {
    if (demoMode) return;
    const code = backupCode || serializeBackup(currentBackup);
    if (!backupCode) setBackupCode(code);
    await Share.share({
      title: "Backup Brushlings",
      message: "Backup Brushlings — conservalo in un posto sicuro.\n\n" + code,
    });
  };

  const inspectImport = () => {
    try {
      const parsed = parseBackup(importCode);
      setPreview(parsed);
      setError(null);
      setMessage(null);
    } catch (caught) {
      setPreview(null);
      setError(caught instanceof Error ? caught.message : "Backup non valido");
    }
  };

  const restore = async () => {
    if (!preview || demoMode) return;
    await restoreFromBackup(preview.profile, preview.customization);
    await restoreRealHistory(preview.history);
    await restorePreferences(preview.preferences);
    await restoreRewards(preview.parentRewards);
    setImportCode("");
    setPreview(null);
    setBackupCode("");
    setError(null);
    setMessage("Ripristino completato: il Brushling e i suoi progressi sono tornati.");
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
            <Text style={[styles.heroTitle, { color: colors.foreground }]}>Il Brushling non resta intrappolato nel vecchio telefono</Text>
            <Text style={[styles.heroText, { color: colors.muted }]}>
              Il backup contiene storico, compagno, tana, premi di famiglia e preferenze di suoni, musica e vibrazione.
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
            <Summary icon="history" label="Sessioni" value={String(currentBackup.history.length)} />
            <Summary icon="home" label="Oggetti tana" value={String(customization.ownedIds.length)} />
            <Summary icon="redeem" label="Premi famiglia" value={String(parentRewards.length)} />
          </View>

          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              onPress={generate}
              disabled={demoMode}
              style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.border }, demoMode && styles.disabled, pressed && styles.pressed]}
            >
              <MaterialIcons name="refresh" size={20} color={colors.primary} />
              <Text style={[styles.secondaryText, { color: colors.primary }]}>Genera codice</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => void shareBackup()}
              disabled={demoMode}
              style={({ pressed }) => [styles.primaryButton, demoMode && styles.disabled, pressed && styles.pressed]}
            >
              <MaterialIcons name="ios-share" size={20} color="#FFFFFF" />
              <Text style={styles.primaryText}>Condividi backup</Text>
            </Pressable>
          </View>

          {backupCode ? (
            <View>
              <Text style={[styles.codeLabel, { color: colors.muted }]}>Codice backup · {backupFingerprint(currentBackup)}</Text>
              <TextInput
                value={backupCode}
                editable={false}
                multiline
                selectTextOnFocus
                style={[styles.codeBox, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              />
            </View>
          ) : null}
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.section}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>2. Ripristina sul nuovo telefono</Text>
            <Text style={[styles.sectionCopy, { color: colors.muted }]}>
              Incolla qui il codice. Prima del ripristino l’app ti mostra un riepilogo del contenuto.
            </Text>
          </View>

          <TextInput
            value={importCode}
            onChangeText={(value) => { setImportCode(value); setPreview(null); setError(null); }}
            multiline
            placeholder="Incolla qui BRUSHLINGS-BACKUP-1:..."
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.importBox, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
          />

          <Pressable
            accessibilityRole="button"
            disabled={!importCode.trim()}
            onPress={inspectImport}
            style={({ pressed }) => [styles.checkButton, !importCode.trim() && styles.disabled, pressed && styles.pressed]}
          >
            <MaterialIcons name="verified-user" size={20} color="#FFFFFF" />
            <Text style={styles.primaryText}>Controlla backup</Text>
          </Pressable>

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
                  {preview.profile.selectedId} · {preview.history.length} sessioni
                </Text>
                <Text style={[styles.previewText, { color: colors.muted }]}>
                  Creato il {new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(preview.createdAt))}.
                </Text>
                <Text style={[styles.warningText, { color: "#8A5B00" }]}>
                  Il ripristino sostituirà i progressi reali presenti su questo telefono.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void restore()}
                  style={({ pressed }) => [styles.restoreButton, pressed && styles.pressed]}
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
            Il codice può contenere date e durata delle sessioni. Non pubblicarlo online: conservalo come un piccolo documento privato di famiglia.
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
  primaryButton: { flex: 1, minHeight: 48, borderRadius: 16, backgroundColor: "#2457D6", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 10 },
  secondaryButton: { flex: 1, minHeight: 48, borderRadius: 16, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 10 },
  primaryText: { color: "#FFFFFF", fontSize: 11, lineHeight: 16, fontWeight: "900", textAlign: "center" },
  secondaryText: { fontSize: 11, lineHeight: 16, fontWeight: "900" },
  codeLabel: { fontSize: 9, lineHeight: 13, fontWeight: "800", marginBottom: 5 },
  codeBox: { minHeight: 100, maxHeight: 150, borderWidth: 1, borderRadius: 16, padding: 11, fontSize: 9, lineHeight: 13 },
  divider: { height: 1 },
  importBox: { minHeight: 130, borderWidth: 1, borderRadius: 18, padding: 12, fontSize: 10, lineHeight: 15, textAlignVertical: "top" },
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