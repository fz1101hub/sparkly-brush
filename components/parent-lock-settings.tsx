import { useEffect, useState } from "react";
import { StyleSheet, Switch, TextInput, View } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import { VillageButton } from "@/components/village-ui";
import { useI18n } from "@/contexts/locale-context";
import { useParentGate } from "@/contexts/parent-gate-context";
import { usePreferences } from "@/contexts/preferences-context";
import { useColors } from "@/hooks/use-colors";
import { biometricsAvailable } from "@/lib/parent-biometrics";
import { createPin, PIN_PATTERN } from "@/lib/parent-lock";

/**
 * Settings of the parents' lock (voce 65): a PIN instead of the multiplication and, where the
 * phone allows it, the fingerprint or Face ID. Saving a PIN also turns the parent gate on.
 */
export function ParentLockSettings() {
  const colors = useColors();
  const { t } = useI18n();
  const { lock, saveLock, unlock } = useParentGate();
  const { preferences, setPreference } = usePreferences();
  const [pin, setPin] = useState("");
  const [repeat, setRepeat] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [canUseBiometrics, setCanUseBiometrics] = useState(false);

  useEffect(() => {
    let active = true;
    void biometricsAvailable().then((available) => {
      if (active) setCanUseBiometrics(available);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!lock) return null;
  const input = [styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }];
  const digits = (text: string) => text.replace(/[^0-9]/g, "").slice(0, 6);

  const save = async () => {
    if (!PIN_PATTERN.test(pin)) {
      setError(t("parentLock.invalid"));
      setMessage(null);
      return;
    }
    if (pin !== repeat) {
      setError(t("parentLock.mismatch"));
      setMessage(null);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveLock({ ...lock, pin: await createPin(pin) });
      if (!preferences.parentGateEnabled) {
        // The parent who just chose the PIN stays in Settings instead of being asked for it.
        unlock();
        await setPreference("parentGateEnabled", true);
      }
      setPin("");
      setRepeat("");
      setMessage(t("parentLock.saved"));
    } catch {
      setError(t("common.actionFailedMessage"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await saveLock({ ...lock, pin: null, biometrics: false });
      setMessage(t("parentLock.removed"));
      setError(null);
    } catch {
      setError(t("common.actionFailedMessage"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View testID="parent-lock-settings" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>{t("parentLock.title")}</Text>
      <Text testID="parent-lock-status" style={[styles.text, { color: colors.muted }]}>
        {lock.pin ? t("parentLock.statusOn") : t("parentLock.statusOff")}
      </Text>
      <TextInput
        testID="parent-pin-input"
        accessibilityLabel={lock.pin ? t("parentLock.newPin") : t("parentLock.pin")}
        value={pin}
        onChangeText={(text) => setPin(digits(text))}
        placeholder={lock.pin ? t("parentLock.newPin") : t("parentLock.pin")}
        placeholderTextColor={colors.muted}
        keyboardType="number-pad"
        inputMode="numeric"
        secureTextEntry
        maxLength={6}
        style={input}
      />
      <TextInput
        testID="parent-pin-repeat"
        accessibilityLabel={t("parentLock.repeat")}
        value={repeat}
        onChangeText={(text) => setRepeat(digits(text))}
        placeholder={t("parentLock.repeat")}
        placeholderTextColor={colors.muted}
        keyboardType="number-pad"
        inputMode="numeric"
        secureTextEntry
        maxLength={6}
        style={input}
      />
      {error ? <Text testID="parent-pin-error" accessibilityLiveRegion="polite" style={[styles.text, { color: "#BE2D4C" }]}>{error}</Text> : null}
      {message ? <Text testID="parent-pin-message" accessibilityLiveRegion="polite" style={[styles.text, { color: colors.foreground }]}>{message}</Text> : null}
      <View style={styles.actions}>
        <VillageButton testID="parent-pin-save" label={t("parentLock.save")} icon="lock" disabled={saving} onPress={() => void save()} />
        {lock.pin ? (
          <VillageButton testID="parent-pin-remove" secondary label={t("parentLock.remove")} disabled={saving} onPress={() => void remove()} />
        ) : null}
      </View>
      {lock.pin && canUseBiometrics ? (
        <View style={styles.row}>
          <Text style={[styles.text, { color: colors.foreground, flex: 1 }]}>{t("parentLock.biometrics")}</Text>
          <Switch
            testID="parent-biometrics-switch"
            style={{ minHeight: 44, minWidth: 48 }}
            accessibilityLabel={t("parentLock.biometrics")}
            value={lock.biometrics}
            disabled={saving}
            onValueChange={(biometrics) => void saveLock({ ...lock, biometrics })}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 22, padding: 18, gap: 12 },
  title: { fontSize: 20, lineHeight: 28, fontWeight: "800" },
  text: { fontSize: 14, lineHeight: 22 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, fontSize: 16 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
});
