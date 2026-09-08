import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { ScreenContainer } from "@/components/screen-container";
import { useBrush } from "@/contexts/brush-context";
import { useBrushling } from "@/contexts/brushling-context";
import { useColors } from "@/hooks/use-colors";
import { computeParentDashboard } from "@/lib/parent-dashboard";

function percentage(value: number): string {
  return String(Math.round(value * 100)) + "%";
}

function duration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return String(minutes) + ":" + String(rest).padStart(2, "0");
}

export default function ParentDashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const { history } = useBrush();
  const { stats, missionCenter } = useBrushling();
  const dashboard = computeParentDashboard(history);

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
            <AppHeader eyebrow="Solo su questo telefono" title="Area genitori" connected={false} />
          </View>
        </View>

        <View style={[styles.privacyCard, { backgroundColor: "#EEF4FF", borderColor: "#C8D9FF" }]}>
          <MaterialIcons name="lock-outline" size={22} color="#2457D6" />
          <Text style={[styles.privacyText, { color: colors.foreground }]}>
            Questa dashboard usa soltanto lo storico locale dell’app. Non invia dati a un account o a un server.
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: "#E7F7F1" }]}>
            <Text style={[styles.statValue, { color: "#2E8A60" }]}>{percentage(dashboard.adherenceRate)}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>routine mattina/sera</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#E7EEFF" }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{dashboard.completedSessions}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>sessioni complete</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#FFF0E4" }]}>
            <Text style={[styles.statValue, { color: "#BA4E13" }]}>{dashboard.totalMinutes}m</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>tempo registrato</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#F0ECFF" }]}>
            <Text style={[styles.statValue, { color: "#7357C7" }]}>{dashboard.daysWithBoth}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>giorni completi</Text>
          </View>
        </View>

        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ultimi 7 giorni</Text>
          <Text style={[styles.sectionCopy, { color: colors.muted }]}>
            Una spunta indica una sessione completa registrata nella fascia mattina o sera.
          </Text>
        </View>

        <View style={[styles.weekCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.weekHeader}>
            <Text style={[styles.dayHeader, { color: colors.muted }]}>Giorno</Text>
            <Text style={[styles.slotHeader, { color: colors.muted }]}>Mattina</Text>
            <Text style={[styles.slotHeader, { color: colors.muted }]}>Sera</Text>
            <Text style={[styles.slotHeader, { color: colors.muted }]}>Totale</Text>
          </View>

          {dashboard.days.map((day) => (
            <View key={day.timestamp} style={[styles.dayRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.dayLabel, { color: colors.foreground }]}>{day.label}</Text>
              <View style={styles.slot}>
                <MaterialIcons
                  name={day.morningCompleted ? "check-circle" : "radio-button-unchecked"}
                  size={21}
                  color={day.morningCompleted ? "#2E9B67" : "#B6BBC6"}
                />
              </View>
              <View style={styles.slot}>
                <MaterialIcons
                  name={day.eveningCompleted ? "check-circle" : "radio-button-unchecked"}
                  size={21}
                  color={day.eveningCompleted ? "#7357C7" : "#B6BBC6"}
                />
              </View>
              <Text style={[styles.slotValue, { color: colors.foreground }]}>{day.completedSessions}</Text>
            </View>
          ))}
        </View>

        <View style={styles.detailGrid}>
          <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialIcons name="verified" size={23} color={colors.success} />
            <Text style={[styles.detailValue, { color: colors.foreground }]}>
              {percentage(dashboard.completionRate)}
            </Text>
            <Text style={[styles.detailLabel, { color: colors.muted }]}>tentativi completati</Text>
          </View>
          <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialIcons name="schedule" size={23} color={colors.primary} />
            <Text style={[styles.detailValue, { color: colors.foreground }]}>
              {duration(dashboard.averageCompletedSeconds)}
            </Text>
            <Text style={[styles.detailLabel, { color: colors.muted }]}>durata media completa</Text>
          </View>
          <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialIcons name="bluetooth" size={23} color={colors.primary} />
            <Text style={[styles.detailValue, { color: colors.foreground }]}>{dashboard.deviceSessions}</Text>
            <Text style={[styles.detailLabel, { color: colors.muted }]}>da spazzolino</Text>
          </View>
          <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialIcons name="touch-app" size={23} color="#E76A2C" />
            <Text style={[styles.detailValue, { color: colors.foreground }]}>{dashboard.manualSessions}</Text>
            <Text style={[styles.detailLabel, { color: colors.muted }]}>timer manuale</Text>
          </View>
        </View>

        <View style={[styles.progressCard, { backgroundColor: "#FFF8E8", borderColor: "#F2D588" }]}>
          <MaterialIcons name="emoji-events" size={26} color="#B98A00" />
          <View style={styles.progressCopy}>
            <Text style={[styles.progressTitle, { color: colors.foreground }]}>Progressione gioco</Text>
            <Text style={[styles.progressText, { color: colors.muted }]}>
              Livello {stats.level} · {stats.completedSessions} sessioni complete · {missionCenter.achievements.filter((item) => item.unlocked).length} badge sbloccati.
            </Text>
          </View>
        </View>

        <View style={[styles.noteCard, { backgroundColor: "#F7F8FA", borderColor: colors.border }]}>
          <MaterialIcons name="info-outline" size={20} color={colors.muted} />
          <Text style={[styles.noteText, { color: colors.muted }]}>
            I dati mostrano soltanto ciò che l’app ha registrato e non costituiscono una valutazione odontoiatrica o clinica.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 80, gap: 18 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerWrap: { flex: 1 },
  privacyCard: { borderWidth: 1, borderRadius: 20, padding: 13, flexDirection: "row", gap: 9, alignItems: "flex-start" },
  privacyText: { flex: 1, fontSize: 11, lineHeight: 17, fontWeight: "600" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { width: "48%", borderRadius: 21, padding: 15 },
  statValue: { fontSize: 25, lineHeight: 31, fontWeight: "900" },
  statLabel: { fontSize: 10, lineHeight: 15, fontWeight: "700", marginTop: 3 },
  sectionTitle: { fontSize: 22, lineHeight: 28, fontWeight: "900" },
  sectionCopy: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  weekCard: { borderWidth: 1, borderRadius: 22, overflow: "hidden" },
  weekHeader: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#F7F8FA" },
  dayHeader: { flex: 1.4, fontSize: 9, lineHeight: 13, fontWeight: "900", textTransform: "uppercase" },
  slotHeader: { flex: 1, fontSize: 9, lineHeight: 13, fontWeight: "900", textAlign: "center", textTransform: "uppercase" },
  dayRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, minHeight: 48, borderTopWidth: 1 },
  dayLabel: { flex: 1.4, fontSize: 12, lineHeight: 17, fontWeight: "800", textTransform: "capitalize" },
  slot: { flex: 1, alignItems: "center" },
  slotValue: { flex: 1, textAlign: "center", fontSize: 13, lineHeight: 18, fontWeight: "900" },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  detailCard: { width: "48%", borderWidth: 1, borderRadius: 20, padding: 14 },
  detailValue: { fontSize: 20, lineHeight: 25, fontWeight: "900", marginTop: 7 },
  detailLabel: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  progressCard: { borderWidth: 1, borderRadius: 20, padding: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  progressCopy: { flex: 1 },
  progressTitle: { fontSize: 14, lineHeight: 19, fontWeight: "900" },
  progressText: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  noteCard: { borderWidth: 1, borderRadius: 18, padding: 12, flexDirection: "row", alignItems: "flex-start", gap: 8 },
  noteText: { flex: 1, fontSize: 10, lineHeight: 15 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
});
