import { useState } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { AnimatedBrushling } from "@/components/animated-brushling";
import { SessionRewardModal } from "@/components/session-reward-modal";
import { StarterChooser } from "@/components/starter-chooser";
import { MouthZones } from "@/components/mouth-zones";
import { ScreenContainer } from "@/components/screen-container";
import { ThemeHomeHero } from "@/components/theme-home-hero";
import { TimerRing } from "@/components/timer-ring";
import { useFamily } from "@/contexts/family-context";
import { useBrush } from "@/contexts/brush-context";
import { useBrushling } from "@/contexts/brushling-context";
import { useParentRewards } from "@/contexts/parent-rewards-context";
import { useColors } from "@/hooks/use-colors";
import { useSessionKeepAwake } from "@/hooks/use-session-keep-awake";
import { getEvolution } from "@/lib/brushlings";
import { getBrushlingDialogue, inferDialogueContext } from "@/lib/brushling-dialogue";
import { useThemeContext } from "@/lib/theme-provider";

function KeepAwake() { useSessionKeepAwake(); return null; }

export default function TodayScreen() {
  const colors = useColors();
  const [modeError, setModeError] = useState<string | null>(null);
  const family = useFamily();
  const { theme } = useThemeContext();
  const router = useRouter();
  const { selected, stats, walletCoins, missionCenter, profileReady, hasChosenStarter } = useBrushling();
  const { nextReward: familyReward } = useParentRewards();
  const evolution = getEvolution(selected, stats.level);
  const {
    status, statusMessage, device, isActive, activeElapsed, activeTarget, activeZone,
    manualRecoveryReady, manualStartPending, recoveredManualSession, resumeManual, pauseManual, discardManualRecovery,
    manualActive, manualSaveError, hasPendingManualSession, isSavingManualSession,
    demoMode, setDemoMode, connect, startManual, stopManual, retryManualSession,
  } = useBrush();
  const connecting = status === "scanning" || status === "connecting";
  const actionDisabled = (isActive && !manualActive) || hasPendingManualSession || isSavingManualSession || manualStartPending || !manualRecoveryReady || !!recoveredManualSession || family.busy;
  const dialogue = getBrushlingDialogue(selected.id, inferDialogueContext(isActive), stats.completedSessions, stats.level);

  if (!profileReady || !hasChosenStarter) {
    return <ScreenContainer><ScrollView contentContainerStyle={styles.content}>
      <AppHeader eyebrow="Brushlings" title={profileReady ? "Scegli il tuo compagno" : "Preparo l’avventura…"} connected={status === "connected"} />
      {profileReady ? <StarterChooser /> : <Text style={{ color: colors.muted }}>Carico creature e progressi salvati su questo telefono.</Text>}
    </ScrollView></ScreenContainer>;
  }

  const sessionButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={manualActive ? "Termina sessione" : "Inizia una sessione manuale di due minuti"}
      accessibilityState={{ disabled: actionDisabled }}
      disabled={actionDisabled}
      onPress={manualActive ? () => void stopManual() : () => void startManual()}
      style={({ pressed }) => [styles.primaryButton, { backgroundColor: manualActive ? colors.error : colors.primary }, actionDisabled && styles.disabled, pressed && styles.pressed]}
    >
      <MaterialIcons name={manualActive ? "stop-circle" : "play-arrow"} size={24} color={manualActive ? colors.background : colors.primaryText} />
      <Text style={[styles.buttonText, { color: manualActive ? colors.background : colors.primaryText }]}>
        {manualActive ? "Termina sessione" : manualStartPending ? "Preparo la sessione…" : isSavingManualSession ? "Salvataggio in corso…" : hasPendingManualSession ? "Sessione da salvare" : isActive ? "Sessione dallo spazzolino" : "Inizia · 2 minuti"}
      </Text>
    </Pressable>
  );

  return (
    <ScreenContainer>
      {isActive ? <KeepAwake /> : null}
      <SessionRewardModal />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {modeError ? <Text accessibilityRole="alert" style={{ color: colors.error, fontSize: 16, lineHeight: 24 }}>{modeError}</Text> : null}
        {recoveredManualSession && !hasPendingManualSession ? <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text accessibilityRole="header" style={[styles.label, { color: colors.foreground }]}>La tua sessione ti aspetta</Text>
          <Text style={[styles.small, { color: colors.muted }]}>{recoveredManualSession.elapsedSeconds} secondi già spazzolati. Il tempo trascorso ad app chiusa non viene contato.</Text>
          <Pressable accessibilityRole="button" disabled={isActive || manualStartPending || family.busy} onPress={() => void resumeManual()} style={[styles.primaryButton, { backgroundColor: colors.primary }]}><Text style={[styles.buttonText, { color: colors.primaryText }]}>Riprendi sessione</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => void discardManualRecovery()} style={styles.textAction}><Text style={[styles.label, { color: colors.primary }]}>Scarta sessione interrotta</Text></Pressable>
        </View> : null}
        {manualSaveError && !hasPendingManualSession ? <View style={[styles.card, { borderColor: colors.error, backgroundColor: colors.surface }]}>
          <Text accessibilityRole="alert" style={[styles.small, { color: colors.error }]}>{manualSaveError}</Text>
          {!manualRecoveryReady ? <Pressable accessibilityRole="button" onPress={() => void discardManualRecovery()} style={styles.textAction}><Text style={[styles.label, { color: colors.primary }]}>Scarta la sessione illeggibile</Text></Pressable> : null}
        </View> : null}

        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Profilo attivo: ${family.active.name}. Cambia profilo`} onPress={() => router.push("/(tabs)/settings")} style={{ flex: 1, minWidth: 130, minHeight: 48 }}>
            <Text style={[styles.brand, { color: colors.foreground }]}>Brushlings</Text>
            <Text style={[styles.small, { color: colors.muted }]}>{isActive ? "Spazzola con " + evolution.name : family.active.name + " · " + theme.name}</Text>
          </Pressable>
          <View style={[styles.coin, { backgroundColor: colors.primarySoft }]} accessibilityLabel={walletCoins + " monete sorriso"}>
            <MaterialIcons name="stars" size={21} color={colors.warning} />
            <Text style={[styles.label, { color: colors.foreground }]}>{walletCoins}</Text>
          </View>
          {!isActive ? <Pressable accessibilityRole="button" accessibilityLabel="Scegli il tema" onPress={() => router.push("/(tabs)/settings")} style={[styles.themeButton, { backgroundColor: colors.surface, borderColor: colors.border }]}><MaterialIcons name="palette" size={24} color={colors.primary} /></Pressable> : null}
        </View>

        {demoMode ? <View style={[styles.card, { backgroundColor: colors.primarySoft, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.foreground }]}>Demo · dati simulati</Text>
          <Text style={[styles.small, { color: colors.muted }]}>Queste sessioni restano separate dai progressi reali.</Text>
          <Pressable accessibilityRole="button" onPress={() => { setModeError(null); void setDemoMode(false).catch(error => setModeError(error instanceof Error ? error.message : "Non riesco a cambiare modalità")); }} style={styles.textAction}><Text style={[styles.label, { color: colors.primary }]}>Esci dalla demo</Text></Pressable>
        </View> : null}

        {isActive ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>Un sorriso, una zona alla volta</Text>
            <View style={styles.center}><TimerRing elapsed={activeElapsed} target={activeTarget} active /></View>
            <MouthZones activeZone={activeZone} isActive />
            {manualActive ? <Pressable accessibilityRole="button" onPress={() => void pauseManual()} style={styles.textAction}><Text style={[styles.label, { color: colors.primary, textAlign: "center" }]}>Metti in pausa</Text></Pressable> : null}
            <View style={styles.cheer}><AnimatedBrushling framed={false} creature={selected} level={stats.level} size={76} active /><Text style={[styles.cheerText, { color: colors.foreground }]}>{dialogue}</Text></View>
            {manualActive ? sessionButton : <Text style={[styles.small, { color: colors.muted }]}>Sessione guidata dallo spazzolino. Arrestalo per terminare.</Text>}
          </View>
        ) : (
          <ThemeHomeHero creature={selected} name={evolution.name} level={stats.level} progress={stats.levelProgress}
            morning={missionCenter.today.missions.some((mission) => mission.id === "morning" && mission.completed)}
            evening={missionCenter.today.missions.some((mission) => mission.id === "evening" && mission.completed)}>
            {sessionButton}
            <Text style={[styles.small, { color: colors.muted, textAlign: "center" }]}>Timer manuale disponibile anche senza Bluetooth.</Text>
          </ThemeHomeHero>
        )}

        {hasPendingManualSession ? <View accessibilityLiveRegion="assertive" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.error }]}>
          <Text style={[styles.label, { color: colors.error }]}>Sessione non ancora salvata</Text>
          <Text style={[styles.small, { color: colors.foreground }]}>{manualSaveError ?? "La sessione resta conservata finché il salvataggio non termina."}</Text>
          <Pressable accessibilityRole="button" disabled={isSavingManualSession} onPress={() => void retryManualSession()} style={[styles.primaryButton, { backgroundColor: colors.primary }, isSavingManualSession && styles.disabled]}><Text style={[styles.buttonText, { color: colors.primaryText }]}>{isSavingManualSession ? "Attendi…" : "Riprova il salvataggio"}</Text></Pressable>
        </View> : null}

        {!isActive ? <>
          <View style={[styles.card, styles.deviceRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialIcons name={demoMode ? "science" : status === "connected" ? "bluetooth-connected" : "bluetooth-searching"} size={25} color={colors.primary} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[styles.label, { color: colors.foreground }]}>{demoMode ? "Modalità demo" : device?.name ?? "Collega lo spazzolino"}</Text>
              <Text style={[styles.small, { color: colors.muted }]}>{demoMode ? "Dati simulati" : statusMessage}</Text>
              {device?.battery !== undefined && !demoMode ? <Text style={[styles.small, { color: colors.success }]}>Batteria {device.battery}%</Text> : null}
            </View>
            {!demoMode && status !== "connected" ? <Pressable accessibilityRole="button" disabled={connecting} onPress={() => void connect()} style={[styles.textAction, connecting && styles.disabled]}><Text style={[styles.label, { color: colors.primary }]}>{connecting ? "Attendi…" : "Collega"}</Text></Pressable> : null}
          </View>

          <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/missions")} style={({ pressed }) => [styles.card, { backgroundColor: colors.primarySoft, borderColor: colors.border }, pressed && styles.pressed]}>
            <Text style={[styles.label, { color: colors.foreground }]}>Missioni di oggi · {missionCenter.today.completedCount}/3</Text>
            <Text style={[styles.small, { color: colors.muted }]}>{missionCenter.today.allCompleted ? "Scrigno del Sorriso aperto!" : "Mattina, sera e doppio sorriso: scopri i tuoi traguardi."}</Text>
            <Text style={[styles.label, { color: colors.primary }]}>Vedi le missioni →</Text>
          </Pressable>

          {familyReward && !familyReward.deliveredAt ? <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/parent")} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.foreground }]}>Premio di famiglia · {familyReward.title}</Text>
            <Text style={[styles.small, { color: colors.muted }]}>{familyReward.unlocked ? "Obiettivo raggiunto! Parlane con un genitore." : familyReward.progress + "/" + familyReward.target + " · Continua la routine per sbloccarlo."}</Text>
          </Pressable> : null}

          <View style={[styles.card, styles.deviceRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.stat, { color: colors.foreground }]}>{stats.currentStreakDays}</Text>
            <Text style={[styles.small, { flex: 1, color: colors.muted }]}>giorni di fila · serie attuale</Text>
            <Text style={[styles.stat, { color: colors.foreground }]}>{stats.todayCompletedSessions}</Text>
            <Text style={[styles.small, { flex: 1, color: colors.muted }]}>sessioni complete oggi</Text>
          </View>
          <Text style={[styles.small, { color: colors.muted, textAlign: "center" }]}>Nessun account: storico e progressi restano su questo telefono.</Text>
        </> : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 40, gap: 16 },
  header: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10 },
  brand: { fontSize: 29, lineHeight: 36, fontWeight: "900" },
  coin: { borderRadius: 99, flexDirection: "row", alignItems: "center", gap: 5, padding: 10 },
  themeButton: { minWidth: 48, minHeight: 48, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  primaryButton: { minHeight: 56, borderRadius: 18, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  buttonText: { fontSize: 17, lineHeight: 24, fontWeight: "900", flexShrink: 1, textAlign: "center" },
  card: { borderWidth: 1, borderRadius: 24, padding: 18, gap: 10 },
  title: { fontSize: 23, lineHeight: 30, fontWeight: "900", textAlign: "center" },
  label: { fontSize: 15, lineHeight: 22, fontWeight: "800" },
  small: { fontSize: 13, lineHeight: 20 },
  center: { alignItems: "center", paddingVertical: 6 },
  deviceRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  textAction: { minHeight: 48, paddingHorizontal: 8, justifyContent: "center" },
  cheer: { flexDirection: "row", gap: 12, alignItems: "center" },
  cheerText: { flex: 1, fontSize: 15, lineHeight: 22, fontWeight: "600" },
  stat: { fontSize: 25, fontWeight: "900" },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.5 },
});

