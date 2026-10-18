import { useEffect, useRef, useState } from "react";
import {
  AppState,
  Linking,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import { DesignText as Text } from "@/components/design-text";
import { useFamily } from "@/contexts/family-context";
import { useColors } from "@/hooks/use-colors";
import {
  getReminderService,
  DEFAULT_REMINDERS,
  type ReminderSettings as Settings,
} from "@/lib/reminders";
import { reminderAdapter } from "@/lib/reminder-platform";

export function ReminderSettings() {
  const colors = useColors();
  const { active } = useFamily();
  const service = useRef(getReminderService(active.id));
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_REMINDERS });
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    let mounted = true;
    void service.current
      .load()
      .then((value) => {
        if (mounted) {
          setSettings(value);
          setReady(true);
        }
      })
      .catch(() => {
        if (mounted)
          setError(
            "Non riesco a leggere i promemoria salvati. Riapri questa schermata per riprovare.",
          );
      });
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    if (!ready || !settings.enabled || !reminderAdapter.permissionGranted)
      return;
    let mounted = true;
    const check = () => {
      void reminderAdapter.permissionGranted!()
        .then((allowed) => {
          if (mounted && !allowed)
            setError(
              "Le notifiche sono disattivate nel telefono. Consenti il permesso e salva di nuovo i promemoria.",
            );
        })
        .catch(() => {
          if (mounted)
            setError(
              "Non riesco a verificare il permesso notifiche del telefono",
            );
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
    setSaved(false);
    try {
      const value = await service.current.save(
        active.name,
        settings,
        reminderAdapter,
      );
      setSettings(value);
      setSaved(true);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Promemoria non salvati",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: colors.foreground }]}
      >
        Promemoria per {active.name}
      </Text>
      <Text style={[styles.copy, { color: colors.muted }]}>
        {reminderAdapter.available
          ? "Due piccoli inviti al giorno, anche quando l’app è chiusa. Puoi cambiare idea quando vuoi."
          : "Le notifiche locali funzionano nell’app iOS e Android. L’anteprima web non invia promemoria a schermo spento."}
      </Text>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.foreground, flex: 1 }]}>
          Attiva promemoria
        </Text>
        <Switch
          style={{ minHeight: 44, minWidth: 48 }}
          accessibilityLabel="Attiva promemoria"
          value={settings.enabled}
          disabled={!ready || saving || !reminderAdapter.available}
          onValueChange={(value) => change("enabled", value)}
        />
      </View>
      {(
        [
          ["morning", "Mattina"],
          ["evening", "Sera"],
        ] as const
      ).map(([key, label]) => (
        <View key={key} style={styles.row}>
          <Text style={[styles.label, { color: colors.foreground, flex: 1 }]}>
            {label}
          </Text>
          <TextInput
            accessibilityLabel={`Orario ${label.toLowerCase()}`}
            placeholder="08:00"
            placeholderTextColor={colors.muted}
            value={settings[key]}
            onChangeText={(value) => change(key, value)}
            editable={ready && !saving}
            maxLength={5}
            keyboardType="numbers-and-punctuation"
            style={[
              styles.input,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
          />
        </View>
      ))}
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.foreground, flex: 1 }]}>
          Modalità silenziosa
        </Text>
        <Switch
          style={{ minHeight: 44, minWidth: 48 }}
          accessibilityLabel="Promemoria silenziosi"
          value={settings.quiet}
          disabled={!ready || saving}
          onValueChange={(value) => change("quiet", value)}
        />
      </View>
      <Text style={[styles.copy, { color: colors.muted }]}>
        Gli orari seguono il fuso del telefono. La modalità silenziosa non
        riproduce suoni né vibrazioni.
      </Text>
      <Pressable
        accessibilityRole="button"
        disabled={!ready || saving}
        onPress={() => void save()}
        style={[
          styles.button,
          { backgroundColor: colors.primary },
          (!ready || saving) && { opacity: 0.5 },
        ]}
      >
        <Text
          style={[
            styles.label,
            { color: colors.primaryText, textAlign: "center" },
          ]}
        >
          {saving ? "Salvo…" : "Salva promemoria"}
        </Text>
      </Pressable>
      {saved ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.copy, { color: colors.success }]}
        >
          Promemoria salvati
        </Text>
      ) : null}
      {error ? (
        <>
          <Text
            accessibilityRole="alert"
            style={[styles.copy, { color: colors.error }]}
          >
            {error}
          </Text>
          {reminderAdapter.available ? (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                void Linking.openSettings().catch(() =>
                  setError(
                    "Apri le impostazioni del telefono e cerca Brushlings",
                  ),
                )
              }
              style={styles.button}
            >
              <Text style={[styles.label, { color: colors.primary }]}>
                Impostazioni notifiche del telefono
              </Text>
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    minHeight: 48,
  },
  input: {
    minHeight: 48,
    minWidth: 88,
    fontSize: 18,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    textAlign: "center",
  },
  button: {
    minHeight: 48,
    borderRadius: 12,
    padding: 12,
    justifyContent: "center",
  },
});
