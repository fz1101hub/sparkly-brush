import { useEffect, useRef, useState } from "react";
import { AppState, Linking, Pressable, StyleSheet, Switch, TextInput, View } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import { useFamily } from "@/contexts/family-context";
import { useI18n } from "@/contexts/locale-context";
import { useColors } from "@/hooks/use-colors";
import type { TranslationKey } from "@/lib/i18n";
import { errorText } from "@/lib/localized-error";
import { reminderAdapter } from "@/lib/reminder-platform";
import {
  DEFAULT_REMINDERS,
  getReminderService,
  reminderText,
  type ReminderSettings as Settings,
} from "@/lib/reminders";

/** Morning and evening local reminders for the active child (from PR #10). */
export function ReminderSettings() {
  const colors = useColors();
  const { active } = useFamily();
  const { t } = useI18n();
  const service = useRef(getReminderService(active.id));
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_REMINDERS });
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState<TranslationKey | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let mounted = true;
    void service.current
      .load()
      .then((value) => {
        if (!mounted) return;
        setSettings(value);
        setReady(true);
      })
      .catch(() => {
        if (mounted) setNotice("reminderSettings.loadFailed");
      });
    return () => {
      mounted = false;
    };
  }, []);

  // A permission revoked in the phone settings silently stops the reminders: say so.
  useEffect(() => {
    if (!ready || !settings.enabled || !reminderAdapter.permissionGranted) return;
    const permissionGranted = reminderAdapter.permissionGranted;
    let mounted = true;
    const check = () => {
      void permissionGranted()
        .then((allowed) => {
          if (mounted && !allowed) setNotice("reminderSettings.permissionOff");
        })
        .catch(() => {
          if (mounted) setNotice("reminderSettings.permissionUnknown");
        });
    };
    check();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [ready, settings.enabled]);

  const change = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSaved(false);
    setSettings((previous) => ({ ...previous, [key]: value }));
  };
  const save = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    setSaved(false);
    try {
      const value = await service.current.save(settings, reminderText(t, active.name), reminderAdapter);
      setSettings(value);
      setSaved(true);
    } catch (caught) {
      setError(caught);
    } finally {
      setSaving(false);
    }
  };
  const message = error ? errorText(error, t, "reminderSettings.saveFailed") : notice ? t(notice) : null;
  const inputStyle = [
    styles.input,
    { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background },
  ];
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>
        {t("reminderSettings.title", { name: active.name })}
      </Text>
      <Text style={[styles.copy, { color: colors.muted }]}>
        {t(reminderAdapter.available ? "reminderSettings.copy" : "reminderSettings.webCopy")}
      </Text>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.foreground, flex: 1 }]}>{t("reminderSettings.enable")}</Text>
        <Switch
          testID="reminders-enabled"
          style={{ minHeight: 44, minWidth: 48 }}
          accessibilityLabel={t("reminderSettings.enable")}
          value={settings.enabled}
          disabled={!ready || saving || !reminderAdapter.available}
          onValueChange={(value) => change("enabled", value)}
        />
      </View>
      {(
        [
          ["morning", "reminderSettings.morning", "reminderSettings.morningLabel"],
          ["evening", "reminderSettings.evening", "reminderSettings.eveningLabel"],
        ] as const
      ).map(([key, label, accessibilityLabel]) => (
        <View key={key} style={styles.row}>
          <Text style={[styles.label, { color: colors.foreground, flex: 1 }]}>{t(label)}</Text>
          <TextInput
            testID={`reminders-${key}`}
            accessibilityLabel={t(accessibilityLabel)}
            placeholder="08:00"
            placeholderTextColor={colors.muted}
            value={settings[key]}
            onChangeText={(value) => change(key, value)}
            editable={ready && !saving}
            maxLength={5}
            keyboardType="numbers-and-punctuation"
            style={inputStyle}
          />
        </View>
      ))}
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.foreground, flex: 1 }]}>{t("reminderSettings.quiet")}</Text>
        <Switch
          style={{ minHeight: 44, minWidth: 48 }}
          accessibilityLabel={t("reminderSettings.quietLabel")}
          value={settings.quiet}
          disabled={!ready || saving}
          onValueChange={(value) => change("quiet", value)}
        />
      </View>
      <Text style={[styles.copy, { color: colors.muted }]}>{t("reminderSettings.note")}</Text>
      <Pressable
        testID="reminders-save"
        accessibilityRole="button"
        disabled={!ready || saving}
        onPress={() => void save()}
        style={[styles.button, { backgroundColor: colors.primary }, (!ready || saving) && { opacity: 0.5 }]}
      >
        <Text style={[styles.label, { color: colors.primaryText, textAlign: "center" }]}>
          {t(saving ? "reminderSettings.saving" : "reminderSettings.save")}
        </Text>
      </Pressable>
      {saved ? (
        <Text accessibilityLiveRegion="polite" style={[styles.copy, { color: colors.success }]}>
          {t("reminderSettings.saved")}
        </Text>
      ) : null}
      {message ? (
        <>
          <Text accessibilityRole="alert" style={[styles.copy, { color: colors.error }]}>
            {message}
          </Text>
          {reminderAdapter.available ? (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                void Linking.openSettings().catch(() => setNotice("reminderSettings.openSettingsManually"))
              }
              style={styles.button}
            >
              <Text style={[styles.label, { color: colors.primary }]}>{t("reminderSettings.openSettings")}</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 22, padding: 18, gap: 12 },
  title: { fontSize: 20, lineHeight: 28, fontWeight: "800" },
  copy: { fontSize: 14, lineHeight: 22 },
  label: { fontSize: 16, lineHeight: 24, fontWeight: "700", flexShrink: 1 },
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12, minHeight: 48 },
  input: { minHeight: 48, minWidth: 88, fontSize: 18, padding: 12, borderWidth: 1, borderRadius: 12, textAlign: "center" },
  button: { minHeight: 48, borderRadius: 12, padding: 12, justifyContent: "center" },
});
