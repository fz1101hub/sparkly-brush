import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { ScreenContainer } from "@/components/screen-container";
import { useBrush } from "@/contexts/brush-context";
import { useBrushling } from "@/contexts/brushling-context";
import { useParentRewards } from "@/contexts/parent-rewards-context";
import { useColors } from "@/hooks/use-colors";
import { computeParentDashboard } from "@/lib/parent-dashboard";
import { rewardRequirementLabel, type ParentRewardRequirement } from "@/lib/parent-rewards";

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
  const { history, demoMode } = useBrush();
  const { stats, missionCenter } = useBrushling();
  const { rewards, addReward, removeReward, markDelivered } = useParentRewards();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingReward, setSavingReward] = useState(false);
  const [rewardTitle, setRewardTitle] = useState("");
  const [requirement, setRequirement] = useState<ParentRewardRequirement>("perfect-days");
  const [target, setTarget] = useState("3");
  const dashboard = computeParentDashboard(history);

  const createReward = async () => {
    const parsedTarget = Math.max(1, Math.min(30, Number.parseInt(target, 10) || 1));
    if (!rewardTitle.trim()) return;
    setSaveError(null); setSavingReward(true);
    try { await addReward(rewardTitle, requirement, parsedTarget); setRewardTitle(""); }
    catch { setSaveError("Premio non salvato. Riprova: le ricompense precedenti sono rimaste attive."); }
    finally { setSavingReward(false); }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Torna indietro"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, { backgroundColor: colors.surface }, pressed && styles.pressed]}
          >
            <MaterialIcons name="arrow-back" size={22} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerWrap}>
            <AppHeader eyebrow="Solo su questo telefono" title="Area genitori" connected={false} />
          </View>
        </View>

        <View style={[styles.privacyCard, { backgroundColor: colors.primarySoft, borderColor: "#C8D9FF" }]}>
          <MaterialIcons name="lock-outline" size={22} color="#2457D6" />
          <Text style={[styles.privacyText, { color: colors.foreground }]}>
            Questa dashboard usa soltanto lo storico locale dell’app. Non invia dati a un account o a un server.
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.primarySoft }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{percentage(dashboard.adherenceRate)}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>routine mattina/sera</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.primarySoft }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{dashboard.completedSessions}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>sessioni complete</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.primarySoft }]}>
            <Text style={[styles.statValue, { color: colors.warning }]}>{dashboard.totalMinutes}m</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>tempo registrato</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.primarySoft }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{dashboard.daysWithBoth}</Text>
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
          <View style={[styles.weekHeader, { backgroundColor: colors.primarySoft }]}>
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

        {dashboard.approximateTimeSessions > 0 ? (
          <Text style={[styles.sectionCopy, { color: colors.muted }]}>
            {dashboard.approximateTimeSessions} sessioni BLE conservate con orario approssimato sono escluse da calendario, streak e missioni giornaliere.
          </Text>
        ) : null}

        <View style={[styles.progressCard, { backgroundColor: colors.primarySoft, borderColor: "#F2D588" }]}>
          <MaterialIcons name="emoji-events" size={26} color="#B98A00" />
          <View style={styles.progressCopy}>
            <Text style={[styles.progressTitle, { color: colors.foreground }]}>Progressione gioco</Text>
            <Text style={[styles.progressText, { color: colors.muted }]}>
              Livello {stats.level} · {stats.completedSessions} sessioni complete · {missionCenter.achievements.filter((item) => item.unlocked).length} badge sbloccati.
            </Text>
          </View>
        </View>

        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Premi di famiglia</Text>
          <Text style={[styles.sectionCopy, { color: colors.muted }]}>
            Crea ricompense reali scelte dal genitore. L’app tiene solo il progresso; la promessa resta una cosa di famiglia.
          </Text>
        </View>

        <View style={[styles.rewardBuilder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.builderEyebrow, { color: colors.primary }]}>NUOVO PREMIO</Text>
          <TextInput
            accessibilityLabel="Nome del premio"
            maxLength={100}
            value={rewardTitle}
            onChangeText={setRewardTitle}
            placeholder="Es. scegli il film di stasera"
            placeholderTextColor={colors.muted}
            style={[styles.rewardInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.primarySoft }]}
          />

          <View style={styles.requirementRow}>
            {([
              ["completed-sessions", "Sessioni", "check-circle"],
              ["perfect-days", "Giorni perfetti", "wb-sunny"],
              ["streak", "Record serie", "local-fire-department"],
            ] as const).map(([value, label, icon]) => (
              <Pressable
                key={value}
                onPress={() => {
                  setRequirement(value);
                  setTarget(value === "completed-sessions" ? "5" : value === "perfect-days" ? "3" : "7");
                }}
                style={({ pressed }) => [
                  styles.requirementButton,
                  {
                    backgroundColor: requirement === value ? colors.primarySoft : colors.surface,
                    borderColor: requirement === value ? colors.primary : colors.border,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <MaterialIcons name={icon} size={18} color={requirement === value ? colors.primary : colors.muted} />
                <Text style={[styles.requirementText, { color: requirement === value ? colors.primary : colors.foreground }]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.targetRow}>
            <View style={styles.targetCopy}>
              <Text style={[styles.targetLabel, { color: colors.foreground }]}>Obiettivo</Text>
              <Text style={[styles.targetHelp, { color: colors.muted }]}>
                {rewardRequirementLabel(requirement, Number.parseInt(target, 10) || 1)}
              </Text>
            </View>
            <TextInput
              accessibilityLabel="Obiettivo del premio"
              value={target}
              onChangeText={(value) => setTarget(value.replace(/[^0-9]/g, "").slice(0, 2))}
              keyboardType="number-pad"
              style={[styles.targetInput, { color: colors.foreground, borderColor: colors.border }]}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={!rewardTitle.trim() || savingReward}
            onPress={() => void createReward()}
            style={({ pressed }) => [
              styles.addRewardButton,
              !rewardTitle.trim() && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <MaterialIcons name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.addRewardText}>Aggiungi premio</Text>
          </Pressable>
        </View>

        {saveError ? <Text accessibilityRole="alert" style={{ color: colors.error, fontSize: 16, lineHeight: 24 }}>{saveError}</Text> : null}
        {rewards.length ? (
          <View style={styles.rewardStack}>
            {rewards.map((reward) => (
              <View
                key={reward.id}
                style={[
                  styles.rewardCard,
                  {
                    backgroundColor: reward.deliveredAt
                      ? "#F5F6F8"
                      : reward.unlocked
                        ? "#E8F8EF"
                        : "#FFF8E8",
                    borderColor: reward.deliveredAt
                      ? colors.border
                      : reward.unlocked
                        ? "#55B987"
                        : "#F2D588",
                  },
                ]}
              >
                <View
                  style={[
                    styles.rewardIcon,
                    {
                      backgroundColor: reward.deliveredAt
                        ? "#B8BDC8"
                        : reward.unlocked
                          ? "#55B987"
                          : "#E8BE38",
                    },
                  ]}
                >
                  <MaterialIcons
                    name={reward.deliveredAt ? "done-all" : reward.unlocked ? "redeem" : "lock-clock"}
                    size={23}
                    color="#FFFFFF"
                  />
                </View>
                <View style={styles.rewardCopy}>
                  <Text style={[styles.rewardTitle, { color: colors.foreground }]}>{reward.title}</Text>
                  <Text style={[styles.rewardMeta, { color: colors.muted }]}>
                    {rewardRequirementLabel(reward.requirement, reward.target)} · {reward.progress}/{reward.target}
                  </Text>
                  <Text
                    style={[
                      styles.rewardState,
                      {
                        color: reward.deliveredAt
                          ? colors.muted
                          : reward.unlocked
                            ? "#2E8A60"
                            : "#8A6900",
                      },
                    ]}
                  >
                    {reward.deliveredAt
                      ? "Consegnato"
                      : reward.unlocked
                        ? demoMode
                          ? "Sbloccato nella demo · non consegnabile"
                          : "Sbloccato · pronto da consegnare"
                        : "In corso"}
                  </Text>
                </View>
                <View style={styles.rewardActions}>
                  {reward.unlocked && !reward.deliveredAt ? (
                    <Pressable
                      disabled={demoMode}
                      onPress={() => void markDelivered(reward.id).catch(() => setSaveError("Non riesco a segnare il premio come consegnato. Riprova."))}
                      style={({ pressed }) => [
                        styles.deliverButton,
                        demoMode && styles.disabled,
                        pressed && styles.pressed,
                      ]}
                    >
                      <MaterialIcons name="check" size={18} color="#FFFFFF" />
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={() => void removeReward(reward.id).catch(() => setSaveError("Non riesco a rimuovere il premio. Riprova."))}
                    style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}
                  >
                    <MaterialIcons name="delete-outline" size={19} color="#D33D5D" />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.emptyRewards, { borderColor: colors.border }]}>
            <MaterialIcons name="redeem" size={25} color={colors.muted} />
            <Text style={[styles.emptyRewardText, { color: colors.muted }]}>
              Nessun premio di famiglia ancora configurato.
            </Text>
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/(tabs)/settings")}
          style={({ pressed }) => [
            styles.settingsCard,
            { backgroundColor: colors.primarySoft, borderColor: "#D4C9F5" },
            pressed && styles.pressed,
          ]}
        >
          <MaterialIcons name="tune" size={24} color="#7357C7" />
          <View style={styles.settingsCopy}>
            <Text style={[styles.settingsTitle, { color: colors.foreground }]}>Suoni, musica e vibrazione</Text>
            <Text style={[styles.settingsText, { color: colors.muted }]}>
              Regola il feedback dell’app senza cambiare progressi o storico.
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.muted} />
        </Pressable>

        <View style={[styles.noteCard, { backgroundColor: colors.primarySoft, borderColor: colors.border }]}>
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
  rewardBuilder: { borderWidth: 1, borderRadius: 22, padding: 14, gap: 11 },
  builderEyebrow: { fontSize: 9, lineHeight: 13, fontWeight: "900", letterSpacing: 0.8 },
  rewardInput: { minHeight: 48, borderWidth: 1, borderRadius: 15, paddingHorizontal: 12, fontSize: 12, lineHeight: 17, fontWeight: "700" },
  requirementRow: { flexDirection: "row", gap: 7 },
  requirementButton: { flex: 1, minHeight: 62, borderWidth: 1.5, borderRadius: 15, alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 5 },
  requirementText: { fontSize: 9, lineHeight: 13, fontWeight: "900", textAlign: "center" },
  targetRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  targetCopy: { flex: 1 },
  targetLabel: { fontSize: 12, lineHeight: 17, fontWeight: "900" },
  targetHelp: { fontSize: 9, lineHeight: 14, marginTop: 1 },
  targetInput: { width: 62, height: 44, borderWidth: 1, borderRadius: 14, textAlign: "center", fontSize: 16, fontWeight: "900" },
  addRewardButton: { minHeight: 48, borderRadius: 16, backgroundColor: "#2457D6", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  addRewardText: { color: "#FFFFFF", fontSize: 12, lineHeight: 17, fontWeight: "900" },
  rewardStack: { gap: 9 },
  rewardCard: { borderWidth: 1.5, borderRadius: 20, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  rewardIcon: { width: 45, height: 45, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  rewardCopy: { flex: 1 },
  rewardTitle: { fontSize: 13, lineHeight: 18, fontWeight: "900" },
  rewardMeta: { fontSize: 9, lineHeight: 14, marginTop: 2 },
  rewardState: { fontSize: 9, lineHeight: 14, fontWeight: "900", marginTop: 3 },
  rewardActions: { flexDirection: "row", alignItems: "center", gap: 5 },
  deliverButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#2E9B67", alignItems: "center", justifyContent: "center" },
  removeButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#FFF0F2", alignItems: "center", justifyContent: "center" },
  emptyRewards: { minHeight: 80, borderWidth: 1, borderStyle: "dashed", borderRadius: 19, alignItems: "center", justifyContent: "center", gap: 5, padding: 12 },
  emptyRewardText: { fontSize: 10, lineHeight: 15, textAlign: "center" },
  settingsCard: { borderWidth: 1, borderRadius: 20, padding: 13, flexDirection: "row", alignItems: "center", gap: 9 },
  settingsCopy: { flex: 1 },
  settingsTitle: { fontSize: 13, lineHeight: 18, fontWeight: "900" },
  settingsText: { fontSize: 9, lineHeight: 14, marginTop: 2 },
  disabled: { opacity: 0.45 },
  noteCard: { borderWidth: 1, borderRadius: 18, padding: 12, flexDirection: "row", alignItems: "flex-start", gap: 8 },
  noteText: { flex: 1, fontSize: 10, lineHeight: 15 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
});

