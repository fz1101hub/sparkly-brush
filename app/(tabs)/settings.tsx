import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { AppHeader } from "@/components/app-header";
import { ScreenContainer } from "@/components/screen-container";
import {
  LIGHT_CARD_FOREGROUND,
  LIGHT_CARD_MUTED,
} from "@/constants/accessibility-colors";
import { usePreferences } from "@/contexts/preferences-context";
import { useColors } from "@/hooks/use-colors";

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { preferences, setPreference } = usePreferences();

  const rows = [
    {
      key: "soundsEnabled" as const,
      icon: "volume-up" as const,
      title: "Suoni",
      text: "Effetti per ricompense, missioni e interazioni.",
    },
    {
      key: "musicEnabled" as const,
      icon: "music-note" as const,
      title: "Musica",
      text: "Atmosfera musicale durante il gioco e la tana.",
    },
    {
      key: "hapticsEnabled" as const,
      icon: "vibration" as const,
      title: "Vibrazione",
      text: "Feedback aptico su tap, fine sessione e premi.",
    },
  ];

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Torna indietro"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            <MaterialIcons
              name="arrow-back"
              size={22}
              color={colors.foreground}
            />
          </Pressable>
          <View style={styles.headerWrap}>
            <AppHeader
              eyebrow="Comfort & feedback"
              title="Impostazioni"
              connected={false}
            />
          </View>
        </View>

        <View
          style={[
            styles.hero,
            { backgroundColor: "#F0ECFF", borderColor: "#D4C9F5" },
          ]}
        >
          <MaterialIcons name="tune" size={28} color="#7357C7" />
          <View style={styles.heroCopy}>
            <Text style={[styles.heroTitle, { color: LIGHT_CARD_FOREGROUND }]}>
              Il gioco deve adattarsi alla famiglia
            </Text>
            <Text style={[styles.heroText, { color: LIGHT_CARD_MUTED }]}>
              Tutte queste preferenze restano su questo telefono e possono
              essere cambiate in qualsiasi momento.
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.list,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {rows.map((row, index) => (
            <View key={row.key}>
              <View style={styles.row}>
                <View style={styles.rowIcon}>
                  <MaterialIcons
                    name={row.icon}
                    size={22}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.rowCopy}>
                  <Text style={[styles.rowTitle, { color: colors.foreground }]}>
                    {row.title}
                  </Text>
                  <Text style={[styles.rowText, { color: colors.muted }]}>
                    {row.text}
                  </Text>
                </View>
                <Switch
                  accessibilityLabel={row.title}
                  value={preferences[row.key]}
                  onValueChange={(value) => void setPreference(row.key, value)}
                  trackColor={{ false: "#D3D7E0", true: "#9EC0FF" }}
                  thumbColor={preferences[row.key] ? "#2457D6" : "#F5F5F5"}
                />
              </View>
              {index < rows.length - 1 ? (
                <View
                  style={[styles.divider, { backgroundColor: colors.border }]}
                />
              ) : null}
            </View>
          ))}
        </View>

        <View
          style={[
            styles.note,
            { backgroundColor: "#FFF8E8", borderColor: "#F2D588" },
          ]}
        >
          <MaterialIcons name="hearing" size={21} color="#B98A00" />
          <Text style={[styles.noteText, { color: LIGHT_CARD_FOREGROUND }]}>
            I suoni non devono mai essere necessari per capire cosa succede:
            l’app mantiene sempre testo, icone e feedback visivi.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 80,
    gap: 18,
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  back: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerWrap: { flex: 1 },
  hero: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  heroCopy: { flex: 1 },
  heroTitle: { fontSize: 15, lineHeight: 20, fontWeight: "900" },
  heroText: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  list: { borderWidth: 1, borderRadius: 22, overflow: "hidden" },
  row: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 14,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  rowCopy: { flex: 1 },
  rowTitle: { fontSize: 14, lineHeight: 19, fontWeight: "900" },
  rowText: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 67 },
  note: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  noteText: { flex: 1, fontSize: 10, lineHeight: 15, fontWeight: "600" },
  pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
});
