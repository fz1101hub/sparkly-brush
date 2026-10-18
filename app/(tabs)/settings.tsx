import { useState } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { DesignText as Text } from "@/components/design-text";

import { AppHeader } from "@/components/app-header";
import { ReminderSettings } from "@/components/reminder-settings";
import { QuickGuide } from "@/components/quick-guide";
import { FamilyPicker } from "@/components/family-picker";
import { ThemePicker } from "@/components/theme-picker";
import { ScreenContainer } from "@/components/screen-container";
import { usePreferences } from "@/contexts/preferences-context";
import { useColors } from "@/hooks/use-colors";

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { preferences, ready, saving, setPreference } = usePreferences();

  const [error, setError] = useState<string | null>(null);

  const rows = [
    { key: "soundsEnabled" as const, icon: "volume-up" as const, title: "Suoni", text: "Effetti per ricompense, missioni e interazioni." },
    { key: "musicEnabled" as const, icon: "music-note" as const, title: "Musica", text: "Atmosfera musicale durante il gioco e la tana." },
    { key: "hapticsEnabled" as const, icon: "vibration" as const, title: "Vibrazione", text: "Feedback aptico su tap, fine sessione e premi." },
  ];

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Torna indietro" onPress={() => router.back()} style={({ pressed }) => [styles.back, { backgroundColor: colors.surface }, pressed && styles.pressed]}>
            <MaterialIcons name="arrow-back" size={22} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerWrap}>
            <AppHeader eyebrow="Comfort & feedback" title="Impostazioni" connected={false} />
          </View>
        </View>

        <ThemePicker />
        <FamilyPicker />
        <ReminderSettings />
        <QuickGuide />

        <View style={[styles.hero, { backgroundColor: colors.primarySoft, borderColor: colors.border }]}>
          <MaterialIcons name="tune" size={28} color={colors.primary} />
          <View style={styles.heroCopy}>
            <Text style={[styles.heroTitle, { color: colors.foreground }]}>Il gioco deve adattarsi alla famiglia</Text>
            <Text style={[styles.heroText, { color: colors.muted }]}>
              Tutte queste preferenze restano su questo telefono e possono essere cambiate in qualsiasi momento.
            </Text>
          </View>
        </View>

        <View style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {rows.map((row, index) => (
            <View key={row.key}>
              <View style={styles.row}>
                <View style={[styles.rowIcon, { backgroundColor: colors.primarySoft }]}>
                  <MaterialIcons name={row.icon} size={22} color={colors.primary} />
                </View>
                <View style={styles.rowCopy}>
                  <Text style={[styles.rowTitle, { color: colors.foreground }]}>{row.title}</Text>
                  <Text style={[styles.rowText, { color: colors.muted }]}>{row.text}</Text>
                </View>
                <Switch
                  style={{ minHeight: 44, minWidth: 48 }}
                  accessibilityLabel={row.title}
                  disabled={!ready || saving}
                  value={preferences[row.key]}
                  onValueChange={(value) => { setError(null); void setPreference(row.key, value).catch(() => setError("Non riesco a salvare la preferenza. La scelta precedente è rimasta attiva.")); }}
                  trackColor={{ false: colors.border, true: colors.primarySoft }}
                  thumbColor={preferences[row.key] ? colors.primary : colors.muted}
                />
              </View>
              {index < rows.length - 1 ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
            </View>
          ))}
        </View>

        {error ? <Text accessibilityRole="alert" style={{ color: colors.error, fontSize: 16, lineHeight: 24 }}>{error}</Text> : null}
        <View style={[styles.note, { backgroundColor: colors.primarySoft, borderColor: colors.border }]}>
          <MaterialIcons name="hearing" size={21} color={colors.warning} />
          <Text style={[styles.noteText, { color: colors.foreground }]}>
            I suoni non devono mai essere necessari per capire cosa succede: l’app mantiene sempre testo, icone e feedback visivi.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 80, gap: 18 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  back: { width: 48, height: 48, borderRadius: 14, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  headerWrap: { flex: 1 },
  hero: { borderWidth: 1, borderRadius: 22, padding: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  heroCopy: { flex: 1 },
  heroTitle: { fontSize: 15, lineHeight: 20, fontWeight: "900" },
  heroText: { fontSize: 14, lineHeight: 22, marginTop: 2 },
  list: { borderWidth: 1, borderRadius: 22, overflow: "hidden" },
  row: { minHeight: 88, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 14 },
  rowIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: "#EEF4FF", alignItems: "center", justifyContent: "center" },
  rowCopy: { flex: 1 },
  rowTitle: { fontSize: 16, lineHeight: 24, fontWeight: "900" },
  rowText: { fontSize: 14, lineHeight: 22, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 67 },
  note: { borderWidth: 1, borderRadius: 18, padding: 12, flexDirection: "row", alignItems: "flex-start", gap: 8 },
  noteText: { flex: 1, fontSize: 14, lineHeight: 22, fontWeight: "600" },
  pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
});
