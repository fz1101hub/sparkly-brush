import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useKeepAwake } from "expo-keep-awake";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { AnimatedBrushling } from "@/components/animated-brushling";
import { DemoModeNotice } from "@/components/demo-mode-notice";
import { SessionRewardModal } from "@/components/session-reward-modal";
import { StarterChooser } from "@/components/starter-chooser";
import { MouthZones } from "@/components/mouth-zones";
import { ScreenContainer } from "@/components/screen-container";
import { TimerRing } from "@/components/timer-ring";
import { useBrush } from "@/contexts/brush-context";
import { useBrushling } from "@/contexts/brushling-context";
import { useI18n } from "@/contexts/locale-context";
import { useParentRewards } from "@/contexts/parent-rewards-context";
import { useAsyncAction } from "@/hooks/use-async-action";
import { useColors } from "@/hooks/use-colors";
import { useSessionKeepAwake } from "@/hooks/use-session-keep-awake";
import { useCurrentDayTimestamp } from "@/hooks/use-current-day";
import { announce } from "@/lib/announce";
import { getEvolution, getNextEvolution } from "@/lib/brushlings";
import { getBrushlingDialogue, inferDialogueContext } from "@/lib/brushling-dialogue";
import { sameLocalDay } from "@/lib/day-progress";

const PASTEL_FOREGROUND = "#17213A";
const PASTEL_MUTED = "#56617D";

function ActiveWakeLock({ active }: { active: boolean }) {
  if (active && Platform.OS !== "web") return <KeepAwake />;
  return null;
}

function KeepAwake() {
  useKeepAwake();
  return null;
}

/** Keeps the screen on only while a session runs: a locked phone would pause the guided timer. */
function SessionKeepAwake() {
  useSessionKeepAwake();
  return null;
}

export default function TodayScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t } = useI18n();
  const runAction = useAsyncAction();
  const {
    selected,
    stats,
    walletCoins,
    missionCenter,
    profileReady,
    hasChosenStarter,
  } = useBrushling();
  const { nextReward: familyReward } = useParentRewards();
  const today = useCurrentDayTimestamp();
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
    manualSaveError,
    hasPendingManualSession,
    isSavingManualSession,
    demoMode,
    setDemoMode,
    connect,
    pairedDevice,
    startManual,
    stopManual,
    retryManualSession,
    manualRecoveryReady,
    manualStartPending,
    recoveredManualSession,
    resumeManual,
    discardManualRecovery,
  } = useBrush();
  const manualBlocked =
    liveIsActive(isActive, manualActive)
    || hasPendingManualSession
    || isSavingManualSession
    || manualStartPending
    || (!manualActive && (!manualRecoveryReady || recoveredManualSession !== null));

  const todayHistory = history.filter((session) => sameLocalDay(session.startedAt, today));
  const todaySessions = todayHistory.length;
  const todaySeconds = todayHistory.reduce((total, session) => total + session.durationSeconds, 0);
  const connecting = status === "scanning" || status === "connecting";
  const levelProgress = `${Math.round(stats.levelProgress * 100)}%` as `${number}%`;
  const dialogue = getBrushlingDialogue(
    selected.id,
    inferDialogueContext(isActive),
    stats.completedSessions,
    stats.level,
  );
  const familyRewardProgress = familyReward
    ? (`${Math.min(100, Math.round((familyReward.progress / familyReward.target) * 100))}%` as `${number}%`)
    : ("0%" as `${number}%`);
  const zoneNames = [
    t("timer.zone.upperRight"),
    t("timer.zone.upperLeft"),
    t("timer.zone.lowerLeft"),
    t("timer.zone.lowerRight"),
  ];
  const activeZoneName = zoneNames[activeZone] ?? zoneNames[0];

  // Screen readers hear the zone to brush each time the guided timer moves on.
  useEffect(() => {
    if (!isActive) return;
    announce(t("home.timer.activeZonePrompt", { zone: activeZoneName }));
  }, [activeZoneName, isActive, t]);

  if (!profileReady) {
    return (
      <ScreenContainer>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <AppHeader
            eyebrow={t("app.brand")}
            title={t("home.loading.headerTitle")}
            connected={status === "connected"}
          />
          <View
            style={[
              styles.loadingCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <MaterialIcons
              name="auto-awesome"
              size={30}
              color={colors.primary}
            />
            <Text style={[styles.loadingTitle, { color: colors.foreground }]}>
              {t("home.loading.title")}
            </Text>
            <Text style={[styles.loadingCopy, { color: colors.muted }]}>
              {t("home.loading.description")}
            </Text>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  if (!hasChosenStarter) {
    return (
      <ScreenContainer>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <AppHeader
            eyebrow={t("app.brand")}
            title={t("home.starter.headerTitle")}
            connected={status === "connected"}
          />
          <StarterChooser />
          <View style={styles.privacyNote}>
            <MaterialIcons name="lock-outline" size={18} color={colors.muted} />
            <Text style={[styles.privacyText, { color: colors.muted }]}>
              {t("home.starter.privacyNote")}
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
      <ScrollView testID="today-screen" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader
          eyebrow={t("app.brand")}
          title={t("home.greeting", { name: currentEvolution.name })}
          connected={!demoMode && status === "connected"}
        />

        {demoMode ? <DemoModeNotice onExit={() => runAction(setDemoMode(false))} /> : null}

        <View
          style={[
            styles.companionCard,
            { backgroundColor: selected.soft, borderColor: selected.accent },
          ]}
        >
          <AnimatedBrushling creature={selected} size={118} level={stats.level} active={isActive} />
          <View style={styles.companionCopy}>
            <Text style={[styles.companionEyebrow, { color: selected.textAccent }]}>
              {t("home.companion.eyebrow")}
            </Text>
            <Text style={[styles.companionName, { color: PASTEL_FOREGROUND }]}>
              {currentEvolution.name}
            </Text>
            <Text style={[styles.companionTitle, { color: selected.textAccent }]}>
              {currentEvolution.title}
            </Text>
            <Text
              style={[styles.companionTagline, { color: PASTEL_MUTED }]}
              numberOfLines={2}
            >
              {nextEvolution
                ? t("home.companion.evolutionNotice", {
                    level: nextEvolution.unlockLevel,
                    name: nextEvolution.name,
                  })
                : selected.tagline}
            </Text>
            <View
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={t("home.companion.levelProgressLabel", {
                level: stats.level,
              })}
              accessibilityValue={{
                min: 0,
                now: Math.round(stats.levelProgress * 100),
                max: 100,
              }}
              style={[styles.xpTrack, { backgroundColor: "#FFFFFFAA" }]}
            >
              <View style={[styles.xpFill, { width: levelProgress, backgroundColor: selected.accent }]} />
            </View>
            <Text style={[styles.xpText, { color: PASTEL_MUTED }]}>
              {t("home.companion.stats", {
                level: stats.level,
                xp: stats.xp,
                coins: walletCoins,
              })}
            </Text>
          </View>
        </View>

        <View style={[styles.speechCard, { backgroundColor: "#FFFFFF", borderColor: selected.accent }]}>
          <View style={[styles.speechIcon, { backgroundColor: selected.soft }]}>
            <MaterialIcons name="chat-bubble-outline" size={21} color={selected.textAccent} />
          </View>
          <View style={styles.speechCopy}>
            <Text style={[styles.speechName, { color: selected.textAccent }]}>
              {t("home.companion.speechAttribution", {
                name: currentEvolution.name,
              })}
            </Text>
            <Text style={[styles.speechText, { color: PASTEL_FOREGROUND }]}>
              {dialogue}
            </Text>
          </View>
        </View>

        {familyReward && !familyReward.deliveredAt ? (
          <View
            style={[
              styles.familyRewardCard,
              {
                backgroundColor: familyReward.unlocked ? "#E8F8EF" : "#FFF8E8",
                borderColor: familyReward.unlocked ? "#55B987" : "#F2D588",
              },
            ]}
          >
            <View
              style={[
                styles.familyRewardIcon,
                { backgroundColor: familyReward.unlocked ? "#17633F" : "#6F5100" },
              ]}
            >
              <MaterialIcons name={familyReward.unlocked ? "redeem" : "family-restroom"} size={23} color="#FFFFFF" />
            </View>
            <View style={styles.familyRewardCopy}>
              <Text
                style={[
                  styles.familyRewardEyebrow,
                  { color: familyReward.unlocked ? "#17633F" : "#6F5100" },
                ]}
              >
                {t("home.familyReward.eyebrow")}
              </Text>
              <Text style={[styles.familyRewardTitle, { color: PASTEL_FOREGROUND }]}>{familyReward.title}</Text>
              <View style={styles.familyRewardProgressRow}>
                <View
                  accessible
                  accessibilityRole="progressbar"
                  accessibilityLabel={t("home.familyReward.progressLabel", {
                    title: familyReward.title,
                  })}
                  accessibilityValue={{
                    min: 0,
                    now: familyReward.progress,
                    max: familyReward.target,
                  }}
                  style={styles.familyRewardTrack}
                >
                  <View
                    style={[
                      styles.familyRewardFill,
                      {
                        width: familyRewardProgress,
                        backgroundColor: familyReward.unlocked ? "#55B987" : "#E8BE38",
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.familyRewardCount, { color: PASTEL_MUTED }]}>
                  {familyReward.progress}/{familyReward.target}
                </Text>
              </View>
              <Text style={[styles.familyRewardText, { color: PASTEL_MUTED }]}>
                {familyReward.unlocked
                  ? t("home.familyReward.unlockedMessage")
                  : t("home.familyReward.lockedMessage")}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.statusIcon, { backgroundColor: demoMode ? "#FFF4C9" : status === "connected" ? "#E1F7EF" : "#EEF2FF" }]}>
            <MaterialIcons
              name={demoMode ? "science" : status === "connected" ? "bluetooth-connected" : "bluetooth-searching"}
              size={23}
              color={demoMode ? "#6F5100" : status === "connected" ? "#17633F" : "#173F9F"}
            />
          </View>
          <View style={styles.statusCopy}>
            <Text style={[styles.statusTitle, { color: colors.foreground }]}>
              {demoMode
                ? t("home.device.demoMode")
                : ((device ?? pairedDevice)?.name ??
                  (connecting
                    ? t("home.device.searching")
                    : t("home.device.defaultModel")))}
            </Text>
            <Text style={[styles.statusText, { color: colors.muted }]}>
              {demoMode ? t("home.device.demoDescription") : statusMessage}
            </Text>
          </View>
          {demoMode ? null : status !== "connected" ? (
            <Pressable
              testID="connect-toothbrush"
              accessibilityRole="button"
              accessibilityLabel={t("home.device.connectLabel")}
              accessibilityState={{ disabled: connecting, busy: connecting }}
              disabled={connecting}
              onPress={() => runAction(connect())}
              style={({ pressed }) => [styles.smallButton, pressed && styles.pressed, connecting && styles.disabled]}
            >
              <Text style={styles.smallButtonText}>
                {connecting ? t("home.device.wait") : t("home.device.connect")}
              </Text>
            </Pressable>
          ) : device?.battery !== undefined ? (
            <View style={styles.batteryBadge}>
              <MaterialIcons name="battery-5-bar" size={17} color={colors.success} />
              <Text style={[styles.batteryText, { color: colors.foreground }]}>{device.battery}%</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.timerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.timerHeading}>
            <View style={styles.timerHeadingCopy}>
              <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>
                {t("home.timer.eyebrow")}
              </Text>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                {isActive
                  ? t("home.timer.activeTitle", { name: currentEvolution.name })
                  : t("home.timer.inactiveTitle")}
              </Text>
            </View>
            <View style={[styles.modeBadge, { backgroundColor: "#FFF0E4" }]}>
              <Text style={styles.modeBadgeText}>
                {device ? liveMode(device.model, t) : t("home.device.modeKids")}
              </Text>
            </View>
          </View>

          <View style={styles.timerCenter}>
            <TimerRing elapsed={activeElapsed} target={activeTarget} active={isActive} />
          </View>

          <Text style={[styles.zonePrompt, { color: colors.foreground }]}>
            {isActive
              ? t("home.timer.activeZonePrompt", { zone: activeZoneName })
              : t("home.timer.inactiveZonePrompt")}
          </Text>
          <MouthZones activeZone={activeZone} isActive={isActive} />

          <Pressable
            testID="manual-start-stop"
            accessibilityRole="button"
            accessibilityLabel={t(
              manualActive
                ? "home.timer.stopManualLabel"
                : "home.timer.startManualLabel",
            )}
            accessibilityState={{
              disabled: manualBlocked,
              busy: isSavingManualSession || manualStartPending,
            }}
            onPress={() => runAction(manualActive ? stopManual() : startManual())}
            disabled={manualBlocked}
            style={({ pressed }) => [
              styles.primaryButton,
              manualActive && styles.stopButton,
              manualBlocked && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <MaterialIcons name={manualActive ? "stop-circle" : "play-arrow"} size={24} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>
              {manualActive
                ? t("home.timer.stopSession")
                : manualStartPending
                  ? t("home.timer.preparing")
                  : isSavingManualSession
                  ? t("home.timer.saving")
                  : hasPendingManualSession
                    ? t("home.timer.savePrevious")
                    : isActive
                      ? t("home.timer.fromToothbrush")
                      : t("home.timer.startWithoutBluetooth")}
            </Text>
          </Pressable>
        </View>

        {isActive ? <SessionKeepAwake /> : null}
        {recoveredManualSession && !hasPendingManualSession && !manualActive ? (
          <View testID="manual-recovery" style={[styles.recoveryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text accessibilityRole="header" style={[styles.recoveryTitle, { color: colors.foreground }]}>
              {t("home.recovery.title")}
            </Text>
            <Text style={[styles.recoveryText, { color: colors.muted }]}>
              {t("home.recovery.body", { seconds: recoveredManualSession.elapsedSeconds })}
            </Text>
            {manualSaveError ? (
              <Text accessibilityRole="alert" style={[styles.recoveryText, { color: colors.error }]}>{manualSaveError}</Text>
            ) : null}
            <Pressable
              testID="manual-resume"
              accessibilityRole="button"
              disabled={manualStartPending || liveIsActive(isActive, manualActive)}
              onPress={() => runAction(resumeManual())}
              style={({ pressed }) => [
                styles.primaryButton,
                (manualStartPending || liveIsActive(isActive, manualActive)) && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <MaterialIcons name="play-arrow" size={24} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>{t("home.recovery.resume")}</Text>
            </Pressable>
            <Pressable
              testID="manual-discard"
              accessibilityRole="button"
              disabled={manualStartPending}
              onPress={() => runAction(discardManualRecovery())}
              style={({ pressed }) => [styles.recoveryLink, pressed && styles.pressed]}
            >
              <Text style={[styles.recoveryLinkText, { color: colors.foreground }]}>{t("home.recovery.discard")}</Text>
            </Pressable>
          </View>
        ) : null}

        {!manualRecoveryReady && manualSaveError && !hasPendingManualSession ? (
          <View testID="manual-journal-error" accessibilityRole="alert" style={styles.saveErrorCard}>
            <MaterialIcons name="error-outline" size={24} color="#B42318" />
            <View style={styles.saveErrorCopy}>
              <Text style={styles.saveErrorText}>{manualSaveError}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => runAction(discardManualRecovery())}
              style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
            >
              <Text style={styles.retryButtonText}>{t("home.recovery.discardUnreadable")}</Text>
            </Pressable>
          </View>
        ) : null}

        {hasPendingManualSession ? (
          <View
            testID="manual-save-error"
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            style={styles.saveErrorCard}
          >
            <MaterialIcons name="error-outline" size={24} color="#B42318" />
            <View style={styles.saveErrorCopy}>
              <Text style={styles.saveErrorTitle}>
                {t("home.saveError.title")}
              </Text>
              <Text style={styles.saveErrorText}>
                {manualSaveError ?? t("home.saveError.fallback")}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("home.saveError.retryLabel")}
              disabled={isSavingManualSession}
              onPress={() => runAction(retryManualSession())}
              style={({ pressed }) => [styles.retryButton, isSavingManualSession && styles.disabled, pressed && styles.pressed]}
            >
              <Text style={styles.retryButtonText}>
                {isSavingManualSession
                  ? t("home.device.wait")
                  : t("home.saveError.retry")}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: "#E7F7F1" }]}>
            <MaterialIcons name="done-all" size={24} color="#17633F" />
            <Text style={[styles.statValue, { color: PASTEL_FOREGROUND }]}>
              {todaySessions}
            </Text>
            <Text style={[styles.statLabel, { color: PASTEL_MUTED }]}>
              {t("home.stats.sessionsToday")}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#FFF0E4" }]}>
            <MaterialIcons name="schedule" size={24} color="#9A3F0D" />
            <Text style={[styles.statValue, { color: PASTEL_FOREGROUND }]}>
              {t("home.stats.minutesValue", {
                minutes: Math.round(todaySeconds / 60),
              })}
            </Text>
            <Text style={[styles.statLabel, { color: PASTEL_MUTED }]}>
              {t("home.stats.minutesToday")}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityLabel={t("home.missions.label", {
            completed: missionCenter.today.completedCount,
            total: 3,
          })}
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
              { backgroundColor: missionCenter.today.allCompleted ? "#6F5100" : "#2457D6" },
            ]}
          >
            <MaterialIcons
              name={missionCenter.today.allCompleted ? "card-giftcard" : "flag"}
              size={26}
              color="#FFFFFF"
            />
          </View>
          <View style={styles.missionCopy}>
            <Text
              style={[
                styles.missionEyebrow,
                {
                  color: missionCenter.today.allCompleted
                    ? "#6F5100"
                    : "#173F9F",
                },
              ]}
            >
              {t("home.missions.eyebrow")}
            </Text>
            <Text style={[styles.missionTitle, { color: PASTEL_FOREGROUND }]}>
              {t("home.missions.progress", {
                completed: missionCenter.today.completedCount,
                total: 3,
              })}
            </Text>
            <Text style={[styles.missionText, { color: PASTEL_MUTED }]}>
              {missionCenter.today.allCompleted
                ? t("home.missions.completedMessage")
                : t("home.missions.incompleteMessage")}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={PASTEL_MUTED} />
        </Pressable>

        <View style={[styles.rewardStrip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.rewardItem}>
            <MaterialIcons
              name="local-fire-department"
              size={21}
              color="#E76A2C"
            />
            <Text style={[styles.rewardValue, { color: colors.foreground }]}>
              {stats.currentStreakDays}
            </Text>
            <Text style={[styles.rewardLabel, { color: colors.muted }]}>
              {t("home.rewards.currentStreak")}
            </Text>
          </View>
          <View style={[styles.rewardDivider, { backgroundColor: colors.border }]} />
          <View style={styles.rewardItem}>
            <MaterialIcons name="stars" size={21} color="#B98A00" />
            <Text style={[styles.rewardValue, { color: colors.foreground }]}>
              {stats.todayCompletedSessions}
            </Text>
            <Text style={[styles.rewardLabel, { color: colors.muted }]}>
              {t("home.rewards.completedToday")}
            </Text>
          </View>
        </View>

        <View style={styles.privacyNote}>
          <MaterialIcons name="lock-outline" size={18} color={colors.muted} />
          <Text style={[styles.privacyText, { color: colors.muted }]}>
            {t("home.privacyNote")}
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function liveIsActive(isActive: boolean, manualActive: boolean) {
  return isActive && !manualActive;
}

function liveMode(
  model: string,
  t: (key: "home.device.modeKids" | "home.device.modeClean") => string,
) {
  return model.includes("HX6322")
    ? t("home.device.modeKids")
    : t("home.device.modeClean");
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
  speechCard: {
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  speechIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  speechCopy: { flex: 1 },
  speechName: { fontSize: 9, lineHeight: 13, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.6 },
  speechText: { fontSize: 12, lineHeight: 18, fontWeight: "700", marginTop: 2 },
  familyRewardCard: {
    borderWidth: 1.5,
    borderRadius: 21,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  familyRewardIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  familyRewardCopy: { flex: 1 },
  familyRewardEyebrow: { fontSize: 8, lineHeight: 12, fontWeight: "900", letterSpacing: 0.8 },
  familyRewardTitle: { fontSize: 14, lineHeight: 19, fontWeight: "900" },
  familyRewardProgressRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 6 },
  familyRewardTrack: { flex: 1, height: 7, borderRadius: 99, backgroundColor: "#FFFFFFAA", overflow: "hidden" },
  familyRewardFill: { height: "100%", borderRadius: 99 },
  familyRewardCount: { fontSize: 9, lineHeight: 13, fontWeight: "900" },
  familyRewardText: { fontSize: 9, lineHeight: 14, marginTop: 4 },
  statusCard: { borderRadius: 22, borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  statusIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  statusCopy: { flex: 1 },
  statusTitle: { fontSize: 15, lineHeight: 21, fontWeight: "800" },
  statusText: { fontSize: 12, lineHeight: 17, marginTop: 1 },
  smallButton: { backgroundColor: "#2457D6", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  smallButtonText: { color: "#FFFFFF", fontSize: 13, lineHeight: 18, fontWeight: "800" },
  batteryBadge: { flexDirection: "row", alignItems: "center", gap: 3 },
  batteryText: { fontSize: 13, fontWeight: "800" },
  timerCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 18,
    ...Platform.select({
      web: { boxShadow: "0 8px 24px rgba(20, 32, 68, 0.08)" },
      default: {
        shadowColor: "#142044",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 3,
      },
    }),
  },
  timerHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  timerHeadingCopy: { flex: 1 },
  sectionEyebrow: { fontSize: 11, lineHeight: 16, fontWeight: "900", letterSpacing: 1.2 },
  sectionTitle: { fontSize: 22, lineHeight: 28, fontWeight: "900", marginTop: 2 },
  modeBadge: { borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7 },
  modeBadgeText: { color: "#A84210", fontSize: 12, lineHeight: 16, fontWeight: "900" },
  timerCenter: { alignItems: "center", paddingVertical: 18 },
  zonePrompt: { fontSize: 15, lineHeight: 21, fontWeight: "800", textAlign: "center", marginBottom: 12 },
  primaryButton: { marginTop: 16, minHeight: 54, backgroundColor: "#2457D6", borderRadius: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 18 },
  stopButton: { backgroundColor: "#D33D5D" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, lineHeight: 21, fontWeight: "900", textAlign: "center" },
  saveErrorCard: { borderWidth: 1.5, borderColor: "#FDA29B", backgroundColor: "#FEF3F2", borderRadius: 20, padding: 13, flexDirection: "row", alignItems: "center", gap: 10 },
  saveErrorCopy: { flex: 1 },
  saveErrorTitle: { color: "#B42318", fontSize: 13, lineHeight: 18, fontWeight: "900" },
  saveErrorText: { color: "#7A271A", fontSize: 10, lineHeight: 15, marginTop: 2 },
  retryButton: { minHeight: 44, borderRadius: 13, backgroundColor: "#B42318", paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  retryButtonText: { color: "#FFFFFF", fontSize: 11, lineHeight: 15, fontWeight: "900" },
  recoveryCard: { borderWidth: 1.5, borderRadius: 22, padding: 16, gap: 10 },
  recoveryTitle: { fontSize: 18, lineHeight: 24, fontWeight: "900" },
  recoveryText: { fontSize: 14, lineHeight: 20 },
  recoveryLink: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  recoveryLinkText: { fontSize: 14, lineHeight: 20, fontWeight: "700", textDecorationLine: "underline" },
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
