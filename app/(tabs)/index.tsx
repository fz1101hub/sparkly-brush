import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useKeepAwake } from "expo-keep-awake";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { AnimatedBrushling } from "@/components/animated-brushling";
import { SessionRewardModal } from "@/components/session-reward-modal";
import { StarterChooser } from "@/components/starter-chooser";
import { MouthZones } from "@/components/mouth-zones";
import { ScreenContainer } from "@/components/screen-container";
import { TimerRing } from "@/components/timer-ring";
import { useBrush } from "@/contexts/brush-context";
import { useBrushling } from "@/contexts/brushling-context";
import { useColors } from "@/hooks/use-colors";
import { getEvolution, getNextEvolution } from "@/lib/brushlings";

function ActiveWakeLock({ active }: { active: boolean }) {
  if (active) return <KeepAwake />;
  return null;
}

function KeepAwake() {
  useKeepAwake();
  return null;
}

function sameDay(timestamp: number) {
  const date = new Date(timestamp);
  const today = new Date();
  return date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();
}

export default function TodayScreen() {
  const colors = useColors();
  const router = useRouter();
  const { selected, stats, walletCoins, missionCenter, profileReady, hasChosenStarter } = useBrushling();
  const currentEvolution = getEvolution(selected, stats.level);
  const nextEvolution = getNextEvolution(selected, stats.level);

  const {
    status,
    statusMessage,
    device,
    history,
    isActive,
    activeElapsed,
    activeTarget,
    activeZone,
    manualActive,
    demoMode,
    setDemoMode,
    connect,
    startManual,
    stopManual,
  } = useBrush();

  const todaySessions = history.filter((session) => sameDay(session.startedAt)).length;
  const todaySeconds = history
    .filter((session) => sameDay(session.startedAt))
    .reduce((total, session) => total + session.durationSeconds, 0);
  const connecting = status === "scanning" || status === "connecting";
  const levelProgress = `${Math.round(stats.levelProgress * 100)}%` as `${number}%`;

  if (!profileReady) {
    return (
      <ScreenContainer>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <AppHeader eyebrow="Brushlings" title="Preparo l'avventura..." connected={status === "connected"} />
          <View style={[styles.loadingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialIcons name="auto-awesome" size={30} color={colors.primary} />
            <Text style={[styles.loadingTitle, { color: colors.foreground }]}>Carico il tuo mondo</Text>
            <Text style={[styles.loadingCopy, { color: colors.muted }]}>
              Un attimo: sto preparando creature e progressi salvati su questo telefono.
            </Text>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  if (!hasChosenStarter) {
    return (
      <ScreenContainer>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <AppHeader eyebrow="Brushlings" title="La tua avventura inizia qui" connected={status === "connected"} />
          <StarterChooser />
          <View style={styles.privacyNote}>
            <MaterialIcons name="lock-outline" size={18} color={colors.muted} />
            <Text style={[styles.privacyText, { color: colors.muted }]}>
              La scelta del compagno resta salvata solo su questo telefono.
            </Text>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ActiveWakeLock active={isActive} />
      <SessionRewardModal />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader
          eyebrow="Brushlings"
          title={`Ciao, ${currentEvolution.name} è pronto!`}
          connected={!demoMode && status === "connected"}
        />

        {demoMode ? (
          <View style={styles.demoBanner}>
            <View style={styles.demoBannerIcon}>
              <MaterialIcons name="science" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.demoBannerCopy}>
              <Text style={styles.demoBannerEyebrow}>LABORATORIO DEMO</Text>
              <Text style={[styles.demoBannerTitle, { color: colors.foreground }]}>Dati simulati attivi</Text>
              <Text style={[styles.demoBannerText, { color: colors.muted }]}>
                Storico reale e backup restano separati e intatti.
              </Text>
            </View>
            <Pressable
              onPress={() => void setDemoMode(false)}
              style={({ pressed }) => [styles.demoExit, pressed && styles.pressed]}
            >
              <Text style={styles.demoExitText}>Esci</Text>
            </Pressable>
          </View>
        ) : null}

        <View
          style={[
            styles.companionCard,
            { backgroundColor: selected.soft, borderColor: selected.accent },
          ]}
        >
          <AnimatedBrushling creature={selected} size={118} level={stats.level} active={isActive} />
          <View style={styles.companionCopy}>
            <Text style={[styles.companionEyebrow, { color: selected.accent }]}>IL TUO COMPAGNO</Text>
            <Text style={[styles.companionName, { color: colors.foreground }]}>{currentEvolution.name}</Text>
            <Text style={[styles.companionTitle, { color: selected.accent }]}>{currentEvolution.title}</Text>
            <Text style={[styles.companionTagline, { color: colors.muted }]} numberOfLines={2}>
              {nextEvolution
                ? `A livello ${nextEvolution.unlockLevel} può evolvere in ${nextEvolution.name}.`
                : selected.tagline}
            </Text>
            <View style={[styles.xpTrack, { backgroundColor: "#FFFFFFAA" }]}>
              <View style={[styles.xpFill, { width: levelProgress, backgroundColor: selected.accent }]} />
            </View>
            <Text style={[styles.xpText, { color: colors.muted }]}>
              Livello {stats.level} · {stats.xp} XP · {walletCoins} monete sorriso
            </Text>
          </View>
        </View>

        <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.statusIcon, { backgroundColor: demoMode ? "#FFF4C9" : status === "connected" ? "#E1F7EF" : "#EEF2FF" }]}>
            <MaterialIcons
              name={demoMode ? "science" : status === "connected" ? "bluetooth-connected" : "bluetooth-searching"}
              size={23}
              color={demoMode ? "#9A7200" : status === "connected" ? colors.success : colors.primary}
            />
          </View>
          <View style={styles.statusCopy}>
            <Text style={[styles.statusTitle, { color: colors.foreground }]}>
              {demoMode ? "Modalità demo" : device?.name ?? (connecting ? "Cerco Sonicare…" : "HX6322/04")}
            </Text>
            <Text style={[styles.statusText, { color: colors.muted }]}>{demoMode ? "Le sessioni simulate non modificano lo storico reale." : statusMessage}</Text>
          </View>
          {demoMode ? null : status !== "connected" ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Collega lo spazzolino"
              disabled={connecting}
              onPress={() => void connect()}
              style={({ pressed }) => [styles.smallButton, pressed && styles.pressed, connecting && styles.disabled]}
            >
              <Text style={styles.smallButtonText}>{connecting ? "Attendi" : "Collega"}</Text>
            </Pressable>
          ) : device?.battery !== undefined ? (
            <View style={styles.batteryBadge}>
              <MaterialIcons name="battery-5-bar" size={17} color={colors.success} />
              <Text style={[styles.batteryText, { color: colors.success }]}>{device.battery}%</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.timerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.timerHeading}>
            <View style={styles.timerHeadingCopy}>
              <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>SESSIONE GUIDATA</Text>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                {isActive ? `${currentEvolution.name} fa il tifo per te!` : "Pronto a spazzolare?"}
              </Text>
            </View>
            <View style={[styles.modeBadge, { backgroundColor: "#FFF0E4" }]}>
              <Text style={styles.modeBadgeText}>{device ? liveMode(device.model) : "Kids"}</Text>
            </View>
          </View>

          <View style={styles.timerCenter}>
            <TimerRing elapsed={activeElapsed} target={activeTarget} active={isActive} />
          </View>

          <Text style={[styles.zonePrompt, { color: colors.foreground }]}>
            {isActive ? `Spazzola: ${["alto a destra", "alto a sinistra", "basso a sinistra", "basso a destra"][activeZone]}` : "Ogni zona riceve la stessa attenzione"}
          </Text>
          <MouthZones activeZone={activeZone} isActive={isActive} />

          <Pressable
            accessibilityRole="button"
            onPress={manualActive ? () => void stopManual() : startManual}
            disabled={liveIsActive(isActive, manualActive)}
            style={({ pressed }) => [
              styles.primaryButton,
              manualActive && styles.stopButton,
              liveIsActive(isActive, manualActive) && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <MaterialIcons name={manualActive ? "stop-circle" : "play-arrow"} size={24} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>
              {manualActive ? "Termina sessione" : isActive ? "Sessione dallo spazzolino" : "Avvia anche senza Bluetooth"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: "#E7F7F1" }]}>
            <MaterialIcons name="done-all" size={24} color={colors.success} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{todaySessions}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>sessioni oggi</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#FFF0E4" }]}>
            <MaterialIcons name="schedule" size={24} color={colors.warning} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{Math.round(todaySeconds / 60)} min</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>spazzolati oggi</Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/(tabs)/missions")}
          style={({ pressed }) => [
            styles.missionCard,
            {
              backgroundColor: missionCenter.today.allCompleted ? "#FFF4C9" : "#EEF4FF",
              borderColor: missionCenter.today.allCompleted ? "#E8BE38" : "#C8D9FF",
            },
            pressed && styles.pressed,
          ]}
        >
          <View
            style={[
              styles.missionIcon,
              { backgroundColor: missionCenter.today.allCompleted ? "#E8BE38" : "#2457D6" },
            ]}
          >
            <MaterialIcons
              name={missionCenter.today.allCompleted ? "card-giftcard" : "flag"}
              size={26}
              color="#FFFFFF"
            />
          </View>
          <View style={styles.missionCopy}>
            <Text style={[styles.missionEyebrow, { color: missionCenter.today.allCompleted ? "#9A7200" : colors.primary }]}>
              MISSIONI DI OGGI
            </Text>
            <Text style={[styles.missionTitle, { color: colors.foreground }]}>
              {missionCenter.today.completedCount}/3 completate
            </Text>
            <Text style={[styles.missionText, { color: colors.muted }]}>
              {missionCenter.today.allCompleted
                ? "Scrigno del Sorriso aperto!"
                : "Mattina, sera e doppio sorriso: completa la routine per il bonus."}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.muted} />
        </Pressable>

        <View style={[styles.rewardStrip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.rewardItem}>
            <MaterialIcons name="local-fire-department" size={21} color="#E76A2C" />
            <Text style={[styles.rewardValue, { color: colors.foreground }]}>{stats.streakDays}</Text>
            <Text style={[styles.rewardLabel, { color: colors.muted }]}>giorni di serie</Text>
          </View>
          <View style={[styles.rewardDivider, { backgroundColor: colors.border }]} />
          <View style={styles.rewardItem}>
            <MaterialIcons name="stars" size={21} color="#B98A00" />
            <Text style={[styles.rewardValue, { color: colors.foreground }]}>{stats.todayCompletedSessions}</Text>
            <Text style={[styles.rewardLabel, { color: colors.muted }]}>sessioni complete oggi</Text>
          </View>
        </View>

        <View style={styles.privacyNote}>
          <MaterialIcons name="lock-outline" size={18} color={colors.muted} />
          <Text style={[styles.privacyText, { color: colors.muted }]}>
            Nessun account: storico e progressi restano su questo telefono.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function liveIsActive(isActive: boolean, manualActive: boolean) {
  return isActive && !manualActive;
}

function liveMode(model: string) {
  return model.includes("HX6322") ? "Kids" : "Clean";
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 120, gap: 18 },
  loadingCard: {
    borderWidth: 1,
    borderRadius: 28,
    minHeight: 210,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingTitle: { fontSize: 20, lineHeight: 26, fontWeight: "900", marginTop: 10 },
  loadingCopy: { fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 4, maxWidth: 280 },
  demoBanner: { borderWidth: 1, borderColor: "#E8BE38", backgroundColor: "#FFF4C9", borderRadius: 20, padding: 12, flexDirection: "row", alignItems: "center", gap: 9 },
  demoBannerIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#B07D00", alignItems: "center", justifyContent: "center" },
  demoBannerCopy: { flex: 1 },
  demoBannerEyebrow: { color: "#8A6400", fontSize: 8, lineHeight: 12, fontWeight: "900", letterSpacing: 0.8 },
  demoBannerTitle: { fontSize: 13, lineHeight: 18, fontWeight: "900" },
  demoBannerText: { fontSize: 9, lineHeight: 14, marginTop: 1 },
  demoExit: { minHeight: 34, paddingHorizontal: 10, borderRadius: 12, backgroundColor: "#B07D00", alignItems: "center", justifyContent: "center" },
  demoExitText: { color: "#FFFFFF", fontSize: 9, lineHeight: 13, fontWeight: "900" },
  companionCard: {
    borderRadius: 28,
    borderWidth: 2,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  companionCopy: { flex: 1 },
  companionEyebrow: { fontSize: 10, lineHeight: 14, fontWeight: "900", letterSpacing: 1.1 },
  companionName: { fontSize: 25, lineHeight: 30, fontWeight: "900", marginTop: 2 },
  companionTitle: { fontSize: 10, lineHeight: 14, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.7 },
  companionTagline: { fontSize: 12, lineHeight: 17, marginTop: 3, fontWeight: "600" },
  xpTrack: { height: 8, borderRadius: 99, overflow: "hidden", marginTop: 10 },
  xpFill: { height: "100%", borderRadius: 99 },
  xpText: { fontSize: 10, lineHeight: 15, fontWeight: "800", marginTop: 5 },
  statusCard: { borderRadius: 22, borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  statusIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  statusCopy: { flex: 1 },
  statusTitle: { fontSize: 15, lineHeight: 21, fontWeight: "800" },
  statusText: { fontSize: 12, lineHeight: 17, marginTop: 1 },
  smallButton: { backgroundColor: "#2457D6", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  smallButtonText: { color: "#FFFFFF", fontSize: 13, lineHeight: 18, fontWeight: "800" },
  batteryBadge: { flexDirection: "row", alignItems: "center", gap: 3 },
  batteryText: { fontSize: 13, fontWeight: "800" },
  timerCard: { borderRadius: 28, borderWidth: 1, padding: 18, shadowColor: "#142044", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 3 },
  timerHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  timerHeadingCopy: { flex: 1 },
  sectionEyebrow: { fontSize: 11, lineHeight: 16, fontWeight: "900", letterSpacing: 1.2 },
  sectionTitle: { fontSize: 22, lineHeight: 28, fontWeight: "900", marginTop: 2 },
  modeBadge: { borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7 },
  modeBadgeText: { color: "#BA4E13", fontSize: 12, lineHeight: 16, fontWeight: "900" },
  timerCenter: { alignItems: "center", paddingVertical: 18 },
  zonePrompt: { fontSize: 15, lineHeight: 21, fontWeight: "800", textAlign: "center", marginBottom: 12 },
  primaryButton: { marginTop: 16, minHeight: 54, backgroundColor: "#2457D6", borderRadius: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 18 },
  stopButton: { backgroundColor: "#D33D5D" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, lineHeight: 21, fontWeight: "900", textAlign: "center" },
  pressed: { opacity: 0.86, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.55 },
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, minHeight: 128, borderRadius: 22, padding: 16, justifyContent: "space-between" },
  statValue: { fontSize: 24, lineHeight: 30, fontWeight: "900", marginTop: 8 },
  statLabel: { fontSize: 12, lineHeight: 17, fontWeight: "600" },
  missionCard: {
    borderWidth: 1.5,
    borderRadius: 22,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  missionIcon: { width: 50, height: 50, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  missionCopy: { flex: 1 },
  missionEyebrow: { fontSize: 9, lineHeight: 13, fontWeight: "900", letterSpacing: 0.8 },
  missionTitle: { fontSize: 16, lineHeight: 21, fontWeight: "900" },
  missionText: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  rewardStrip: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  rewardItem: { flex: 1, alignItems: "center", gap: 2 },
  rewardDivider: { width: 1, height: 44 },
  rewardValue: { fontSize: 18, lineHeight: 22, fontWeight: "900" },
  rewardLabel: { fontSize: 10, lineHeight: 14, fontWeight: "700", textAlign: "center" },
  privacyNote: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 5 },
  privacyText: { fontSize: 12, lineHeight: 17, flex: 1, textAlign: "center" },
});
