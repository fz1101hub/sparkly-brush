import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppHeader } from "@/components/app-header";
import { DemoModeNotice } from "@/components/demo-mode-notice";
import { ScreenContainer } from "@/components/screen-container";
import {
  LIGHT_CARD_FOREGROUND,
  LIGHT_CARD_MUTED,
  readableAccent,
} from "@/constants/accessibility-colors";
import { useBrush } from "@/contexts/brush-context";
import { useBrushling } from "@/contexts/brushling-context";
import { useI18n } from "@/contexts/locale-context";
import { useAsyncAction } from "@/hooks/use-async-action";
import { useColors } from "@/hooks/use-colors";
import type { BrushSession } from "@/lib/brush-types";
import { confirmDestructive } from "@/lib/dialogs";

export default function HistoryScreen() {
  const colors = useColors();
  const router = useRouter();
  const { history, lifetimeProgress, clearAllHistory, demoMode, setDemoMode } = useBrush();
  const { settlePurchasesAfterHistoryReset } = useBrushling();
  const { t, formatDate, formatNumber } = useI18n();
  const runAction = useAsyncAction();
  // The list holds only the most recent sessions; the totals come from the lifetime record,
  // except in demo mode where the simulated history is the whole story.
  const totals = demoMode || lifetimeProgress.attemptedSessions < history.length
    ? {
        sessions: history.length,
        completed: history.filter((session) => session.completed).length,
        brushingSeconds: history.reduce((total, session) => total + session.durationSeconds, 0),
      }
    : {
        sessions: lifetimeProgress.attemptedSessions,
        completed: lifetimeProgress.completedSessions,
        brushingSeconds: lifetimeProgress.totalBrushingSeconds,
      };
  const completed = totals.completed;
  const average = totals.sessions ? Math.round(totals.brushingSeconds / totals.sessions) : 0;

  const formatDuration = (seconds: number) =>
    t("family.history.duration", {
      minutes: formatNumber(Math.floor(seconds / 60)),
      seconds: formatNumber(seconds % 60).padStart(2, "0"),
    });
  const formatSessionDate = (timestamp: number) =>
    formatDate(timestamp, {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  const confirmClear = () => {
    confirmDestructive({
      title: t("family.history.clearTitle"),
      message: t("family.history.clearMessage"),
      cancelLabel: t("common.cancel"),
      confirmLabel: t("family.history.clearAction"),
      onConfirm: () => {
        void (async () => {
          // Clear first: an interruption must never leave settled prices with the old earnings.
          await clearAllHistory();
          if (!demoMode) await settlePurchasesAfterHistoryReset();
        })();
      },
    });
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: BrushSession;
    index: number;
  }) => {
    const status = item.completed
      ? t("family.history.sessionComplete")
      : t("family.history.sessionIncomplete");
    const sessionDate = formatSessionDate(item.startedAt);

    return (
      <View
        testID={`history-session-${index}`}
        accessibilityLabel={t("family.history.sessionAccessibility", {
          status,
          duration: formatDuration(item.durationSeconds),
          date: sessionDate,
        })}
        style={[
          styles.sessionCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View
          style={[
            styles.sessionIcon,
            { backgroundColor: item.completed ? "#E1F7EF" : "#FFF0E4" },
          ]}
        >
          <MaterialIcons
            name={item.completed ? "verified" : "timelapse"}
            size={24}
            color={readableAccent(item.completed ? "#2E9B67" : "#E76A2C")}
          />
        </View>
        <View style={styles.sessionCopy}>
          <Text style={[styles.sessionTitle, { color: colors.foreground }]}>
            {sessionDate}
          </Text>
          <Text style={[styles.sessionSubtitle, { color: colors.muted }]}>
            {item.source === "device"
              ? t("family.history.deviceSource")
              : item.source === "demo"
                ? t("family.history.demoSource")
                : t("family.history.manualSource")}
          </Text>
        </View>
        <View style={styles.durationBlock}>
          <Text style={[styles.duration, { color: colors.foreground }]}>
            {formatDuration(item.durationSeconds)}
          </Text>
          <Text style={[styles.goal, { color: colors.muted }]}>
            {t("family.history.durationOf", {
              duration: formatDuration(item.targetSeconds),
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer>
      <FlatList
        testID="history-screen"
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <AppHeader
              eyebrow={t("family.history.progressEyebrow")}
              title={t("family.history.title")}
            />
            {demoMode ? <DemoModeNotice onExit={() => runAction(setDemoMode(false))} /> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("family.history.parentCardLabel")}
              onPress={() => router.push("/(tabs)/parent")}
              style={({ pressed }) => [
                styles.parentCard,
                { backgroundColor: "#F4F6FF", borderColor: "#DCE3FF" },
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.parentIcon}>
                <MaterialIcons
                  name="family-restroom"
                  size={25}
                  color={readableAccent("#2457D6")}
                />
              </View>
              <View style={styles.parentCopy}>
                <Text style={[styles.parentEyebrow, { color: "#173F9F" }]}>
                  {t("family.history.parentArea")}
                </Text>
                <Text
                  style={[styles.parentTitle, { color: LIGHT_CARD_FOREGROUND }]}
                >
                  {t("family.history.parentSummary")}
                </Text>
                <Text style={[styles.parentText, { color: LIGHT_CARD_MUTED }]}>
                  {t("family.history.parentDescription")}
                </Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={24}
                color={LIGHT_CARD_MUTED}
              />
            </Pressable>

            <View style={styles.statsRow}>
              <View
                style={[styles.summaryCard, { backgroundColor: "#E7EEFF" }]}
              >
                <Text testID="history-recent-sessions" style={[styles.summaryValue, { color: "#173F9F" }]}>
                  {formatNumber(totals.sessions)}
                </Text>
                <Text
                  style={[styles.summaryLabel, { color: LIGHT_CARD_MUTED }]}
                >
                  {t("common.sessions")}
                </Text>
              </View>
              <View
                style={[styles.summaryCard, { backgroundColor: "#E1F7EF" }]}
              >
                <Text style={[styles.summaryValue, { color: "#17633F" }]}>
                  {formatNumber(completed)}
                </Text>
                <Text
                  style={[styles.summaryLabel, { color: LIGHT_CARD_MUTED }]}
                >
                  {t("common.complete")}
                </Text>
              </View>
              <View
                style={[styles.summaryCard, { backgroundColor: "#FFF0E4" }]}
              >
                <Text style={[styles.summaryValue, { color: "#9A3F0D" }]}>
                  {t("family.history.minutes", {
                    minutes: formatNumber(Math.round(average / 60)),
                  })}
                </Text>
                <Text
                  style={[styles.summaryLabel, { color: LIGHT_CARD_MUTED }]}
                >
                  {t("family.history.average")}
                </Text>
              </View>
            </View>
            {history.length > 0 ? (
              <View style={styles.listHeading}>
                <Text style={[styles.listTitle, { color: colors.foreground }]}>
                  {t("family.history.lastSessions")}
                </Text>
                <Pressable
                  testID="history-clear"
                  accessibilityRole="button"
                  accessibilityLabel={t("family.history.clearButtonLabel")}
                  onPress={confirmClear}
                  style={({ pressed }) => [
                    styles.clearButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.clearText, { color: colors.error }]}>
                    {t("family.history.clearAction")}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View
            style={[
              styles.empty,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.emptyIcon}>
              <MaterialIcons
                name="auto-awesome"
                size={32}
                color={readableAccent("#2457D6")}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {t("family.history.emptyTitle")}
            </Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              {t("family.history.emptyDescription")}
            </Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 120 },
  headerContent: { gap: 20, marginBottom: 14 },
  parentCard: {
    borderWidth: 1,
    borderRadius: 21,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  parentIcon: {
    width: 47,
    height: 47,
    borderRadius: 16,
    backgroundColor: "#FFFFFFAA",
    alignItems: "center",
    justifyContent: "center",
  },
  parentCopy: { flex: 1 },
  parentEyebrow: {
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  parentTitle: { fontSize: 14, lineHeight: 19, fontWeight: "900" },
  parentText: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 9 },
  summaryCard: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: "center",
  },
  summaryValue: { fontSize: 24, lineHeight: 30, fontWeight: "900" },
  summaryLabel: { fontSize: 11, lineHeight: 16, fontWeight: "700" },
  listHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  listTitle: { fontSize: 19, lineHeight: 25, fontWeight: "900" },
  clearButton: { paddingHorizontal: 10, paddingVertical: 8 },
  clearText: { fontSize: 13, fontWeight: "800" },
  sessionCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sessionIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionCopy: { flex: 1 },
  sessionTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  sessionSubtitle: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  durationBlock: { alignItems: "flex-end" },
  duration: { fontSize: 18, lineHeight: 23, fontWeight: "900" },
  goal: { fontSize: 10, lineHeight: 15 },
  separator: { height: 10 },
  empty: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    marginTop: 12,
  },
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 21,
    backgroundColor: "#E7EEFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 20, lineHeight: 26, fontWeight: "900" },
  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 7,
  },
  pressed: { opacity: 0.65 },
});
