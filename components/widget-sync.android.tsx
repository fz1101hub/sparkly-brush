import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect } from "react";
import { requestWidgetUpdate } from "react-native-android-widget";

import { useBrush } from "@/contexts/brush-context";
import { useOptionalFamily } from "@/contexts/family-context-value";
import { useI18n } from "@/contexts/locale-context";
import { useSmileStreak } from "@/hooks/use-smile-streak";
import { useCurrentDayTimestamp } from "@/hooks/use-current-day";
import { isEvening, isMorning, sameLocalDay } from "@/lib/day-progress";
import { StreakWidget, type WidgetSummary } from "@/widgets/streak-widget";
import { WIDGET_SUMMARY_KEY } from "@/widgets/widget-task-handler";

/**
 * Keeps the Android home-screen widget (voce 42) in step with the active child: the streak and
 * the next brushing, saved for the widget's headless task and redrawn after every session.
 */
export function WidgetSync() {
  const { t } = useI18n();
  const family = useOptionalFamily();
  const { history, demoMode } = useBrush();
  const streak = useSmileStreak();
  const today = useCurrentDayTimestamp();
  const name = family?.active.name ?? "";

  useEffect(() => {
    if (demoMode) return;
    const done = history.filter((session) => session.completed && sameLocalDay(session.startedAt, Date.now()));
    const morning = done.some((session) => isMorning(session.startedAt));
    const evening = done.some((session) => isEvening(session.startedAt));
    const summary: WidgetSummary = {
      name,
      streak: streak.days,
      streakLabel: t("widget.streak", { count: streak.days }),
      next: morning && evening ? t("widget.allDone") : !morning && isMorning(Date.now()) ? t("widget.nextMorning") : t("widget.nextEvening"),
      title: "Sparkly Brush",
      tap: t("widget.tap"),
    };
    void AsyncStorage.setItem(WIDGET_SUMMARY_KEY, JSON.stringify(summary))
      .then(() => requestWidgetUpdate({ widgetName: "Streak", renderWidget: () => <StreakWidget summary={summary} /> }))
      .catch(() => undefined);
  }, [demoMode, history, name, streak.days, t, today]);

  return null;
}
