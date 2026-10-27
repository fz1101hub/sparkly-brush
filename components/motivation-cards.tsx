import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import { Pressable, StyleSheet, View, type DimensionValue } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import { ChoiceChips, VillageButton } from "@/components/village-ui";
import { useBrush } from "@/contexts/brush-context";
import { useBrushling } from "@/contexts/brushling-context";
import { useExtras } from "@/contexts/extras-context";
import { useI18n } from "@/contexts/locale-context";
import { useColors } from "@/hooks/use-colors";
import { useCurrentDayTimestamp } from "@/hooks/use-current-day";
import { useFamilyHistories } from "@/hooks/use-family-histories";
import { isEvening, isMorning } from "@/lib/day-progress";
import { GOAL_IDS, GOAL_TARGETS, type GoalId, type GoalTarget, creatureStars, MAX_STARS, SESSION_MILESTONES } from "@/lib/milestones";
import { speak } from "@/lib/speech";
import { challengeOfWeek, challengeProgress, CHALLENGE_TARGETS, familyBossWeeks, weekStart } from "@/lib/weekly";

const isLittle = (age: string | null) => age === "under3" || age === "3to6";

function Bar({ value, target, color }: { value: number; target: number; color: string }) {
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { backgroundColor: color, width: `${Math.round((Math.min(value, target) / target) * 100)}%` as DimensionValue }]} />
    </View>
  );
}

function ListenButton({ text }: { text: string }) {
  const { t, locale } = useI18n();
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t("listen.action")}: ${text}`}
      onPress={() => speak(text, locale)}
      style={({ pressed }) => [styles.listen, { borderColor: colors.border }, pressed && styles.pressed]}
    >
      <MaterialIcons accessible={false} name="volume-up" size={20} color={colors.primary} />
    </Pressable>
  );
}

/** Weekly rotating challenge (voce 51), with a «listen» button for the youngest (voce 41). */
export function WeeklyChallengeCard() {
  const colors = useColors();
  const { t } = useI18n();
  const { history, demoMode } = useBrush();
  const { extras } = useExtras();
  const today = useCurrentDayTimestamp();
  const start = weekStart(today);
  const id = challengeOfWeek(start);
  const target = CHALLENGE_TARGETS[id];
  const progress = challengeProgress(id, demoMode ? [] : history, extras.extraStepDays, start);
  const text = t(`challenge.${id}`, { target });
  return (
    <View testID="weekly-challenge" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.row}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground, flex: 1 }]}>{t("challenge.title")}</Text>
        {isLittle(extras.ageGroup) ? <ListenButton text={text} /> : null}
      </View>
      <Text testID="weekly-challenge-text" style={[styles.text, { color: colors.foreground }]}>{text}</Text>
      <Bar value={progress} target={target} color={colors.primary} />
      <Text testID="weekly-challenge-progress" style={[styles.text, { color: colors.muted }]}>
        {progress >= target ? t("challenge.won", { count: extras.challengeWins.length }) : t("challenge.progress", { progress, target })}
      </Text>
      {progress < target && extras.challengeWins.length > 0 ? (
        <Text style={[styles.text, { color: colors.muted }]}>{t("challenge.wins", { count: extras.challengeWins.length })}</Text>
      ) : null}
    </View>
  );
}

/** Weekly germ boss beaten by the whole family together (voce 13). */
export function FamilyBossCard() {
  const colors = useColors();
  const { t, formatNumber } = useI18n();
  const children = useFamilyHistories();
  const today = useCurrentDayTimestamp();
  const weeks = familyBossWeeks(children.map((child) => child.history), today);
  const week = weeks[weeks.length - 1];
  const previous = weeks[weeks.length - 2];
  const left = Math.max(0, week.hp - week.damage);
  const start = weekStart(today);
  return (
    <View testID="family-boss" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.row}>
        <Text accessible={false} style={styles.emoji}>{week.defeated ? "🏆" : "🦠"}</Text>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground, flex: 1 }]}>{t("boss.title")}</Text>
      </View>
      <Text style={[styles.text, { color: colors.muted }]}>{t("boss.text")}</Text>
      {previous && !previous.defeated && previous.damage > 0 ? (
        <Text style={[styles.text, { color: colors.foreground }]}>{t("boss.easier")}</Text>
      ) : null}
      <View accessible accessibilityRole="progressbar" accessibilityLabel={t("boss.title")} accessibilityValue={{ min: 0, max: week.hp, now: week.hp - left }}>
        <Bar value={week.hp - left} target={week.hp} color="#2E9B67" />
      </View>
      <Text testID="family-boss-hp" style={[styles.text, { color: colors.foreground }]}>
        {week.defeated ? t("boss.defeated") : t("boss.hp", { left: formatNumber(left), hp: formatNumber(week.hp) })}
      </Text>
      {children.length > 1 ? (
        <View style={styles.chips}>
          {children.map((child) => {
            const seconds = child.history
              .filter((session) => session.startedAt >= start)
              .reduce((sum, session) => sum + Math.max(0, Math.round(session.durationSeconds)), 0);
            return (
              <Text key={child.profileId} style={[styles.chip, { color: colors.foreground, borderColor: colors.border }]}>
                {t("boss.child", { name: child.name, seconds: formatNumber(seconds) })}
              </Text>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

/** Long-term milestones (voce 12): no coins, only the satisfaction of the road travelled. */
export function MilestonesCard() {
  const colors = useColors();
  const { t } = useI18n();
  const { stats } = useBrushling();
  const { extras } = useExtras();
  const stars = creatureStars(stats.level);
  return (
    <View testID="milestones" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>{t("milestones.title")}</Text>
      {SESSION_MILESTONES.map((target) => (
        <View key={target} testID={`milestone-${target}`} style={styles.rowTop}>
          <MaterialIcons
            accessible={false}
            name={stats.completedSessions >= target ? "emoji-events" : "radio-button-unchecked"}
            size={22}
            color={stats.completedSessions >= target ? "#9A5B00" : colors.muted}
          />
          <View style={styles.copy}>
            <Text style={[styles.text, { color: colors.foreground }]}>{t("milestones.sessions", { target })}</Text>
            <Bar value={stats.completedSessions} target={target} color={colors.primary} />
          </View>
        </View>
      ))}
      <View testID="milestone-month" style={styles.rowTop}>
        <MaterialIcons accessible={false} name="calendar-month" size={22} color={extras.perfectMonths.length ? "#9A5B00" : colors.muted} />
        <View style={styles.copy}>
          <Text style={[styles.text, { color: colors.foreground }]}>{t("milestones.perfectMonth")}</Text>
          <Text style={[styles.text, { color: colors.muted }]}>{t("milestones.perfectMonths", { count: extras.perfectMonths.length })}</Text>
        </View>
      </View>
      <View testID="milestone-stars" style={styles.rowTop}>
        <Text accessible={false} style={styles.stars}>{"★".repeat(stars)}{"☆".repeat(MAX_STARS - stars)}</Text>
        <View style={styles.copy}>
          <Text style={[styles.text, { color: colors.foreground }]}>{t("milestones.stars", { count: stars, max: MAX_STARS })}</Text>
          <Text style={[styles.text, { color: colors.muted }]}>{t("milestones.starsHint")}</Text>
        </View>
      </View>
    </View>
  );
}

/** Numbers for older children (voce 41): shown from 7 years, where they motivate. */
export function MyStatsCard() {
  const colors = useColors();
  const { t, formatNumber } = useI18n();
  const { history, lifetimeProgress, demoMode } = useBrush();
  const { stats } = useBrushling();
  const { extras } = useExtras();
  const today = useCurrentDayTimestamp();
  if (extras.ageGroup !== "over6" || demoMode) return null;
  const recent = history.filter((session) => session.completed).slice(0, 14);
  const average = recent.length ? Math.round(recent.reduce((sum, session) => sum + session.durationSeconds, 0) / recent.length) : 0;
  const month = history.filter((session) => session.completed && session.startedAt >= today - 30 * 86_400_000);
  const rows = [
    { label: t("stats.sessions"), value: formatNumber(stats.completedSessions) },
    { label: t("stats.minutes"), value: formatNumber(Math.round(lifetimeProgress.totalBrushingSeconds / 60)) },
    { label: t("stats.average"), value: t("stats.seconds", { count: average }) },
    { label: t("stats.best"), value: t("stats.days", { count: lifetimeProgress.longestStreakDays }) },
    {
      label: t("stats.balance"),
      value: t("stats.balanceValue", {
        morning: month.filter((session) => isMorning(session.startedAt)).length,
        evening: month.filter((session) => isEvening(session.startedAt)).length,
      }),
    },
  ];
  return (
    <View testID="my-stats" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>{t("stats.title")}</Text>
      {rows.map((row) => (
        <View key={row.label} style={styles.statRow}>
          <Text style={[styles.text, { color: colors.muted, flex: 1 }]}>{row.label}</Text>
          <Text style={[styles.statValue, { color: colors.foreground }]}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

/** The child chooses the goal and its length (voce 19); the parent approves it in the parent area. */
export function ChildGoalCard() {
  const colors = useColors();
  const { t } = useI18n();
  const { extras, apply, ready } = useExtras();
  const proposal = extras.goalProposal;
  const [goal, setGoal] = useState<GoalId>("story");
  const [target, setTarget] = useState<GoalTarget>(5);
  if (!ready) return null;
  return (
    <View testID="child-goal" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.row}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground, flex: 1 }]}>{t("goal.title")}</Text>
        {isLittle(extras.ageGroup) ? <ListenButton text={t("goal.text")} /> : null}
      </View>
      {proposal ? (
        <>
          <Text testID="child-goal-pending" style={[styles.text, { color: colors.foreground }]}>
            {t("goal.pending", { goal: t(`goal.${proposal.goal}`), count: proposal.target })}
          </Text>
          <VillageButton
            testID="child-goal-withdraw"
            secondary
            label={t("goal.withdraw")}
            onPress={() => void apply((previous) => ({ ...previous, goalProposal: null }))}
          />
        </>
      ) : (
        <>
          <Text style={[styles.text, { color: colors.muted }]}>{t("goal.text")}</Text>
          <ChoiceChips<GoalId>
            label={t("goal.title")}
            testIDPrefix="child-goal"
            value={goal}
            onChange={setGoal}
            options={GOAL_IDS.map((id) => ({ value: id, label: t(`goal.${id}`) }))}
          />
          <ChoiceChips<GoalTarget>
            label={t("goal.title")}
            testIDPrefix="child-goal-days"
            value={target}
            onChange={setTarget}
            options={GOAL_TARGETS.map((days) => ({ value: days, label: t("goal.days", { count: days }) }))}
          />
          <VillageButton
            testID="child-goal-propose"
            label={t("goal.propose")}
            icon="send"
            onPress={() => void apply((previous) => ({ ...previous, goalProposal: { goal, target, proposedAt: Date.now() } }))}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 22, padding: 16, gap: 10 },
  title: { fontSize: 18, lineHeight: 24, fontWeight: "900" },
  text: { fontSize: 14, lineHeight: 21 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  copy: { flex: 1, gap: 4 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, fontSize: 13, lineHeight: 18 },
  emoji: { fontSize: 28, lineHeight: 34 },
  stars: { color: "#9A5B00", fontSize: 18, lineHeight: 22, minWidth: 92 },
  track: { height: 10, borderRadius: 99, backgroundColor: "#E6E9F0", overflow: "hidden" },
  fill: { height: 10, borderRadius: 99 },
  listen: { minWidth: 44, minHeight: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  statRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 32 },
  statValue: { fontSize: 15, lineHeight: 21, fontWeight: "900" },
  pressed: { opacity: 0.75 },
});
