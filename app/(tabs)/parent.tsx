import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AppHeader } from "@/components/app-header";
import { ScreenContainer } from "@/components/screen-container";
import {
  LIGHT_CARD_FOREGROUND,
  LIGHT_CARD_MUTED,
  readableAccent,
} from "@/constants/accessibility-colors";
import { useBrush } from "@/contexts/brush-context";
import { useBrushling } from "@/contexts/brushling-context";
import { useI18n } from "@/contexts/locale-context";
import { useParentRewards } from "@/contexts/parent-rewards-context";
import { useColors } from "@/hooks/use-colors";
import { computeParentDashboard } from "@/lib/parent-dashboard";
import {
  rewardRequirementLabel,
  type ParentRewardRequirement,
} from "@/lib/parent-rewards";

const REQUIREMENTS = [
  {
    value: "completed-sessions",
    labelKey: "family.parent.requirementSessions",
    icon: "check-circle",
    defaultTarget: "5",
  },
  {
    value: "perfect-days",
    labelKey: "family.parent.requirementPerfectDays",
    icon: "wb-sunny",
    defaultTarget: "3",
  },
  {
    value: "streak",
    labelKey: "family.parent.requirementStreak",
    icon: "local-fire-department",
    defaultTarget: "7",
  },
] as const satisfies readonly {
  value: ParentRewardRequirement;
  labelKey:
    | "family.parent.requirementSessions"
    | "family.parent.requirementPerfectDays"
    | "family.parent.requirementStreak";
  icon: "check-circle" | "wb-sunny" | "local-fire-department";
  defaultTarget: string;
}[];

export default function ParentDashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t, formatDate, formatNumber } = useI18n();
  const { history, demoMode } = useBrush();
  const { stats, missionCenter } = useBrushling();
  const { rewards, addReward, removeReward, markDelivered } =
    useParentRewards();
  const [rewardTitle, setRewardTitle] = useState("");
  const [requirement, setRequirement] =
    useState<ParentRewardRequirement>("perfect-days");
  const [target, setTarget] = useState("3");
  const dashboard = computeParentDashboard(history);

  const formatPercentage = (value: number) =>
    t("family.parent.percentage", {
      value: formatNumber(Math.round(value * 100)),
    });
  const formatDuration = (seconds: number) =>
    t("family.parent.duration", {
      minutes: formatNumber(Math.floor(seconds / 60)),
      seconds: formatNumber(seconds % 60).padStart(2, "0"),
    });

  const createReward = async () => {
    const parsedTarget = Math.max(
      1,
      Math.min(30, Number.parseInt(target, 10) || 1),
    );
    if (!rewardTitle.trim()) return;
    await addReward(rewardTitle, requirement, parsedTarget);
    setRewardTitle("");
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.back")}
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <MaterialIcons
              name="arrow-back"
              size={22}
              color={LIGHT_CARD_FOREGROUND}
            />
          </Pressable>
          <View style={styles.headerWrap}>
            <AppHeader
              eyebrow={t("family.parent.localOnly")}
              title={t("family.parent.title")}
              connected={false}
            />
          </View>
        </View>

        <View
          style={[
            styles.privacyCard,
            { backgroundColor: "#EEF4FF", borderColor: "#C8D9FF" },
          ]}
        >
          <MaterialIcons
            name="lock-outline"
            size={22}
            color={readableAccent("#2457D6")}
          />
          <Text style={[styles.privacyText, { color: LIGHT_CARD_FOREGROUND }]}>
            {t("family.parent.privacy")}
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: "#E7F7F1" }]}>
            <Text style={[styles.statValue, { color: "#17633F" }]}>
              {formatPercentage(dashboard.adherenceRate)}
            </Text>
            <Text style={[styles.statLabel, { color: LIGHT_CARD_MUTED }]}>
              {t("family.parent.routine")}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#E7EEFF" }]}>
            <Text style={[styles.statValue, { color: "#173F9F" }]}>
              {formatNumber(dashboard.completedSessions)}
            </Text>
            <Text style={[styles.statLabel, { color: LIGHT_CARD_MUTED }]}>
              {t("family.parent.completedSessions")}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#FFF0E4" }]}>
            <Text style={[styles.statValue, { color: "#9A3F0D" }]}>
              {t("family.parent.minutes", {
                minutes: formatNumber(dashboard.totalMinutes),
              })}
            </Text>
            <Text style={[styles.statLabel, { color: LIGHT_CARD_MUTED }]}>
              {t("family.parent.recordedTime")}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#F0ECFF" }]}>
            <Text style={[styles.statValue, { color: "#51369C" }]}>
              {formatNumber(dashboard.daysWithBoth)}
            </Text>
            <Text style={[styles.statLabel, { color: LIGHT_CARD_MUTED }]}>
              {t("family.parent.completeDays")}
            </Text>
          </View>
        </View>

        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {t("family.parent.recentDays")}
          </Text>
          <Text style={[styles.sectionCopy, { color: colors.muted }]}>
            {t("family.parent.routineDescription")}
          </Text>
        </View>

        <View
          style={[
            styles.weekCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.weekHeader}>
            <Text style={[styles.dayHeader, { color: LIGHT_CARD_MUTED }]}>
              {t("family.parent.day")}
            </Text>
            <Text style={[styles.slotHeader, { color: LIGHT_CARD_MUTED }]}>
              {t("family.parent.morning")}
            </Text>
            <Text style={[styles.slotHeader, { color: LIGHT_CARD_MUTED }]}>
              {t("family.parent.evening")}
            </Text>
            <Text style={[styles.slotHeader, { color: LIGHT_CARD_MUTED }]}>
              {t("family.parent.total")}
            </Text>
          </View>

          {dashboard.days.map((day) => (
            <View
              key={day.timestamp}
              style={[styles.dayRow, { borderTopColor: colors.border }]}
            >
              <Text style={[styles.dayLabel, { color: colors.foreground }]}>
                {formatDate(day.timestamp, {
                  weekday: "short",
                  day: "numeric",
                })}
              </Text>
              <View style={styles.slot}>
                <MaterialIcons
                  name={
                    day.morningCompleted
                      ? "check-circle"
                      : "radio-button-unchecked"
                  }
                  size={21}
                  color={day.morningCompleted ? "#17633F" : LIGHT_CARD_MUTED}
                />
              </View>
              <View style={styles.slot}>
                <MaterialIcons
                  name={
                    day.eveningCompleted
                      ? "check-circle"
                      : "radio-button-unchecked"
                  }
                  size={21}
                  color={day.eveningCompleted ? "#51369C" : LIGHT_CARD_MUTED}
                />
              </View>
              <Text style={[styles.slotValue, { color: colors.foreground }]}>
                {formatNumber(day.completedSessions)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.detailGrid}>
          <View
            style={[
              styles.detailCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <MaterialIcons name="verified" size={23} color="#17633F" />
            <Text style={[styles.detailValue, { color: colors.foreground }]}>
              {formatPercentage(dashboard.completionRate)}
            </Text>
            <Text style={[styles.detailLabel, { color: colors.muted }]}>
              {t("family.parent.completedAttempts")}
            </Text>
          </View>
          <View
            style={[
              styles.detailCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <MaterialIcons
              name="schedule"
              size={23}
              color={readableAccent("#2457D6")}
            />
            <Text style={[styles.detailValue, { color: colors.foreground }]}>
              {formatDuration(dashboard.averageCompletedSeconds)}
            </Text>
            <Text style={[styles.detailLabel, { color: colors.muted }]}>
              {t("family.parent.averageCompletedDuration")}
            </Text>
          </View>
          <View
            style={[
              styles.detailCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <MaterialIcons
              name="bluetooth"
              size={23}
              color={readableAccent("#2457D6")}
            />
            <Text style={[styles.detailValue, { color: colors.foreground }]}>
              {formatNumber(dashboard.deviceSessions)}
            </Text>
            <Text style={[styles.detailLabel, { color: colors.muted }]}>
              {t("family.parent.fromToothbrush")}
            </Text>
          </View>
          <View
            style={[
              styles.detailCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <MaterialIcons name="touch-app" size={23} color="#9A3F0D" />
            <Text style={[styles.detailValue, { color: colors.foreground }]}>
              {formatNumber(dashboard.manualSessions)}
            </Text>
            <Text style={[styles.detailLabel, { color: colors.muted }]}>
              {t("family.parent.manualTimer")}
            </Text>
          </View>
        </View>

        {dashboard.approximateTimeSessions > 0 ? (
          <Text style={[styles.sectionCopy, { color: colors.muted }]}>
            {t("family.parent.approximateSessions", {
              count: formatNumber(dashboard.approximateTimeSessions),
            })}
          </Text>
        ) : null}

        <View
          style={[
            styles.progressCard,
            { backgroundColor: "#FFF8E8", borderColor: "#F2D588" },
          ]}
        >
          <MaterialIcons name="emoji-events" size={26} color="#6F5100" />
          <View style={styles.progressCopy}>
            <Text
              style={[styles.progressTitle, { color: LIGHT_CARD_FOREGROUND }]}
            >
              {t("family.parent.gameProgress")}
            </Text>
            <Text style={[styles.progressText, { color: LIGHT_CARD_MUTED }]}>
              {t("family.parent.gameProgressDescription", {
                level: formatNumber(stats.level),
                sessions: formatNumber(stats.completedSessions),
                badges: formatNumber(
                  missionCenter.achievements.filter((item) => item.unlocked)
                    .length,
                ),
              })}
            </Text>
          </View>
        </View>

        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {t("family.parent.rewardsTitle")}
          </Text>
          <Text style={[styles.sectionCopy, { color: colors.muted }]}>
            {t("family.parent.rewardsDescription")}
          </Text>
        </View>

        <View
          style={[
            styles.rewardBuilder,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.builderEyebrow, { color: "#173F9F" }]}>
            {t("family.parent.newReward")}
          </Text>
          <TextInput
            accessibilityLabel={t("family.parent.rewardNameLabel")}
            value={rewardTitle}
            onChangeText={setRewardTitle}
            placeholder={t("family.parent.rewardNamePlaceholder")}
            placeholderTextColor={colors.muted}
            style={[
              styles.rewardInput,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
          />

          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={t("family.parent.rewardRequirementLabel")}
            style={styles.requirementRow}
          >
            {REQUIREMENTS.map(({ value, labelKey, icon, defaultTarget }) => {
              const selected = requirement === value;
              const label = t(labelKey);
              return (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityLabel={label}
                  accessibilityState={{ checked: selected }}
                  aria-checked={selected}
                  onPress={() => {
                    setRequirement(value);
                    setTarget(defaultTarget);
                  }}
                  style={({ pressed }) => [
                    styles.requirementButton,
                    {
                      backgroundColor: selected ? "#EEF4FF" : colors.background,
                      borderColor: selected ? "#173F9F" : colors.border,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <MaterialIcons
                    name={icon}
                    size={18}
                    color={selected ? "#173F9F" : LIGHT_CARD_MUTED}
                  />
                  <Text
                    style={[
                      styles.requirementText,
                      {
                        color: selected ? "#173F9F" : colors.foreground,
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.targetRow}>
            <View style={styles.targetCopy}>
              <Text style={[styles.targetLabel, { color: colors.foreground }]}>
                {t("family.parent.target")}
              </Text>
              <Text style={[styles.targetHelp, { color: colors.muted }]}>
                {rewardRequirementLabel(
                  requirement,
                  Number.parseInt(target, 10) || 1,
                  t,
                  formatNumber,
                )}
              </Text>
            </View>
            <TextInput
              accessibilityLabel={t("family.parent.targetAccessibilityLabel")}
              value={target}
              onChangeText={(value) =>
                setTarget(value.replace(/[^0-9]/g, "").slice(0, 2))
              }
              keyboardType="number-pad"
              style={[
                styles.targetInput,
                { color: colors.foreground, borderColor: colors.border },
              ]}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("family.parent.addReward")}
            disabled={!rewardTitle.trim()}
            onPress={() => void createReward()}
            style={({ pressed }) => [
              styles.addRewardButton,
              !rewardTitle.trim() && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <MaterialIcons name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.addRewardText}>
              {t("family.parent.addReward")}
            </Text>
          </Pressable>
        </View>

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
                        ? "#68707E"
                        : reward.unlocked
                          ? "#17633F"
                          : "#6F5100",
                    },
                  ]}
                >
                  <MaterialIcons
                    name={
                      reward.deliveredAt
                        ? "done-all"
                        : reward.unlocked
                          ? "redeem"
                          : "lock-clock"
                    }
                    size={23}
                    color="#FFFFFF"
                  />
                </View>
                <View style={styles.rewardCopy}>
                  <Text
                    style={[
                      styles.rewardTitle,
                      { color: LIGHT_CARD_FOREGROUND },
                    ]}
                  >
                    {reward.title}
                  </Text>
                  <Text
                    style={[styles.rewardMeta, { color: LIGHT_CARD_MUTED }]}
                  >
                    {rewardRequirementLabel(
                      reward.requirement,
                      reward.target,
                      t,
                      formatNumber,
                    )}{" "}
                    ·{" "}
                    {t("family.parent.rewardProgress", {
                      progress: formatNumber(reward.progress),
                      target: formatNumber(reward.target),
                    })}
                  </Text>
                  <Text
                    style={[
                      styles.rewardState,
                      {
                        color: reward.deliveredAt
                          ? LIGHT_CARD_MUTED
                          : reward.unlocked
                            ? "#17633F"
                            : "#6F5100",
                      },
                    ]}
                  >
                    {reward.deliveredAt
                      ? t("family.parent.rewardDelivered")
                      : reward.unlocked
                        ? demoMode
                          ? t("family.parent.rewardDemoUnlocked")
                          : t("family.parent.rewardUnlocked")
                        : t("family.parent.rewardInProgress")}
                  </Text>
                </View>
                <View style={styles.rewardActions}>
                  {reward.unlocked && !reward.deliveredAt ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t("family.parent.deliverReward", {
                        title: reward.title,
                      })}
                      disabled={demoMode}
                      onPress={() => void markDelivered(reward.id)}
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
                    accessibilityRole="button"
                    accessibilityLabel={t("family.parent.removeReward", {
                      title: reward.title,
                    })}
                    onPress={() => void removeReward(reward.id)}
                    style={({ pressed }) => [
                      styles.removeButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <MaterialIcons
                      name="delete-outline"
                      size={19}
                      color="#B4233D"
                    />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.emptyRewards, { borderColor: colors.border }]}>
            <MaterialIcons name="redeem" size={25} color={LIGHT_CARD_MUTED} />
            <Text style={[styles.emptyRewardText, { color: colors.muted }]}>
              {t("family.parent.noRewards")}
            </Text>
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("family.parent.settingsCardLabel")}
          onPress={() => router.push("/(tabs)/settings")}
          style={({ pressed }) => [
            styles.settingsCard,
            { backgroundColor: "#F0ECFF", borderColor: "#D4C9F5" },
            pressed && styles.pressed,
          ]}
        >
          <MaterialIcons name="tune" size={24} color="#51369C" />
          <View style={styles.settingsCopy}>
            <Text
              style={[styles.settingsTitle, { color: LIGHT_CARD_FOREGROUND }]}
            >
              {t("family.parent.settingsTitle")}
            </Text>
            <Text style={[styles.settingsText, { color: LIGHT_CARD_MUTED }]}>
              {t("family.parent.settingsDescription")}
            </Text>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={24}
            color={LIGHT_CARD_MUTED}
          />
        </Pressable>

        <View
          style={[
            styles.noteCard,
            { backgroundColor: "#F7F8FA", borderColor: colors.border },
          ]}
        >
          <MaterialIcons
            name="info-outline"
            size={20}
            color={LIGHT_CARD_MUTED}
          />
          <Text style={[styles.noteText, { color: LIGHT_CARD_MUTED }]}>
            {t("family.parent.clinicalNote")}
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
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerWrap: { flex: 1 },
  privacyCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 13,
    flexDirection: "row",
    gap: 9,
    alignItems: "flex-start",
  },
  privacyText: { flex: 1, fontSize: 11, lineHeight: 17, fontWeight: "600" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { width: "48%", borderRadius: 21, padding: 15 },
  statValue: { fontSize: 25, lineHeight: 31, fontWeight: "900" },
  statLabel: { fontSize: 10, lineHeight: 15, fontWeight: "700", marginTop: 3 },
  sectionTitle: { fontSize: 22, lineHeight: 28, fontWeight: "900" },
  sectionCopy: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  weekCard: { borderWidth: 1, borderRadius: 22, overflow: "hidden" },
  weekHeader: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F7F8FA",
  },
  dayHeader: {
    flex: 1.4,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  slotHeader: {
    flex: 1,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "900",
    textAlign: "center",
    textTransform: "uppercase",
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    minHeight: 48,
    borderTopWidth: 1,
  },
  dayLabel: {
    flex: 1.4,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  slot: { flex: 1, alignItems: "center" },
  slotValue: {
    flex: 1,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
  },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  detailCard: { width: "48%", borderWidth: 1, borderRadius: 20, padding: 14 },
  detailValue: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "900",
    marginTop: 7,
  },
  detailLabel: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  progressCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progressCopy: { flex: 1 },
  progressTitle: { fontSize: 14, lineHeight: 19, fontWeight: "900" },
  progressText: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  rewardBuilder: { borderWidth: 1, borderRadius: 22, padding: 14, gap: 11 },
  builderEyebrow: {
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  rewardInput: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 12,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  requirementRow: { flexDirection: "row", gap: 7 },
  requirementButton: {
    flex: 1,
    minHeight: 62,
    borderWidth: 1.5,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 5,
  },
  requirementText: {
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  targetRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  targetCopy: { flex: 1 },
  targetLabel: { fontSize: 12, lineHeight: 17, fontWeight: "900" },
  targetHelp: { fontSize: 9, lineHeight: 14, marginTop: 1 },
  targetInput: {
    width: 62,
    height: 44,
    borderWidth: 1,
    borderRadius: 14,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "900",
  },
  addRewardButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: "#2457D6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  addRewardText: {
    color: "#FFFFFF",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900",
  },
  rewardStack: { gap: 9 },
  rewardCard: {
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rewardIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  rewardCopy: { flex: 1 },
  rewardTitle: { fontSize: 13, lineHeight: 18, fontWeight: "900" },
  rewardMeta: { fontSize: 9, lineHeight: 14, marginTop: 2 },
  rewardState: { fontSize: 9, lineHeight: 14, fontWeight: "900", marginTop: 3 },
  rewardActions: { flexDirection: "row", alignItems: "center", gap: 5 },
  deliverButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#17633F",
    alignItems: "center",
    justifyContent: "center",
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#FFF0F2",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyRewards: {
    minHeight: 80,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    padding: 12,
  },
  emptyRewardText: { fontSize: 10, lineHeight: 15, textAlign: "center" },
  settingsCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  settingsCopy: { flex: 1 },
  settingsTitle: { fontSize: 13, lineHeight: 18, fontWeight: "900" },
  settingsText: { fontSize: 9, lineHeight: 14, marginTop: 2 },
  disabled: { opacity: 0.45 },
  noteCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  noteText: { flex: 1, fontSize: 10, lineHeight: 15 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
});
