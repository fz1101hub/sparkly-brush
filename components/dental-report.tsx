import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { DesignText as Text } from "@/components/design-text";
import { useBrush } from "@/contexts/brush-context";
import { useFamily } from "@/contexts/family-context";
import { useI18n } from "@/contexts/locale-context";
import { useColors } from "@/hooks/use-colors";
import { useCurrentDayTimestamp } from "@/hooks/use-current-day";
import { getBrushStorage } from "@/lib/brush-storage";
import { dentalReportCsv, monthlyRoutineTrend, reportWindow } from "@/lib/dental-report";
import { shareLocalText } from "@/lib/local-text-export";
import type { SessionSummary } from "@/lib/session-summary";

type Report = { window: { since: number; until: number }; days: 30 | 90; summary: SessionSummary; trend: ReturnType<typeof monthlyRoutineTrend>; complete: boolean };

export function DentalReport() {
  const { t, formatDate } = useI18n();
  const { active } = useFamily();
  const { lifetimeProgress, demoMode, historyReady } = useBrush();
  const store = useRef(getBrushStorage(active.id));
  const colors = useColors();
  const today = useCurrentDayTimestamp();
  const [days, setDays] = useState<30 | 90>(30);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [shared, setShared] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!historyReady || demoMode) return;
    let mounted = true;
    const now = Date.now();
    const window = reportWindow(now, days);
    const yearStart = new Date(now);
    yearStart.setDate(1);
    yearStart.setMonth(yearStart.getMonth() - 11);
    yearStart.setHours(0, 0, 0, 0);
    void Promise.all([
      store.current.summarizeSessions(window.since, window.until),
      store.current.summarizeSessions(yearStart.getTime(), now),
    ]).then(([summary, yearly]) => {
      if (!mounted) return;
      setReport({ window, days, summary, trend: monthlyRoutineTrend(yearly, now), complete: summary.historyComplete && yearly.historyComplete });
      setError(false);
    }).catch(() => { if (mounted) setError(true); });
    return () => { mounted = false; };
  }, [days, demoMode, historyReady, lifetimeProgress, today, revision]);

  const current = report?.days === days ? report : null;
  const exportReport = async () => {
    if (!current || sharing || error || demoMode) return;
    setSharing(true);
    setShared(false);
    try {
      const csv = dentalReportCsv(active.name, current.summary, {
        name: t("care.reportName"), date: t("care.reportDate"), morning: t("care.reportMorning"), evening: t("care.reportEvening"),
        sessions: t("care.reportSessions"), yes: t("care.yes"), no: t("care.no"), average: t("care.reportAverage"), total: t("care.reportTotal"),
      }, { ...current.window, note: current.complete ? undefined : t("care.reportPartial") });
      await shareLocalText(`sparkly-brush-dentist-${days}d.csv`, csv, "text/csv");
      setShared(true);
    } catch { setError(true); }
    finally { setSharing(false); }
  };

  if (demoMode) return null;
  return <View style={{ gap: 12, padding: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 22 }}>
    <Text accessibilityRole="header" style={{ color: colors.foreground, fontSize: 22, fontWeight: "800" }}>{t("care.reportTitle")}</Text>
    <View accessibilityRole="radiogroup" accessibilityLabel={t("care.reportTitle")} style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {([30, 90] as const).map((value) => <Pressable key={value} accessibilityRole="radio" aria-checked={days === value} accessibilityState={{ checked: days === value }} onPress={() => { setDays(value); setShared(false); }} style={{ minHeight: 48, padding: 12, borderRadius: 12, borderWidth: 2, borderColor: days === value ? colors.primary : colors.border }}>
        <Text style={{ color: colors.foreground }}>{t("care.reportDays", { days: value })}</Text>
      </Pressable>)}
    </View>
    {error ? <View><Text accessibilityRole="alert" style={{ color: colors.error }}>{t("care.failed")}</Text><Pressable accessibilityRole="button" onPress={() => setRevision((old) => old + 1)} style={{ minHeight: 48, padding: 12 }}><Text style={{ color: colors.primary }}>{t("common.retry")}</Text></Pressable></View> : null}
    {current && !error ? <>
      <Text style={{ color: colors.foreground }}>{t("care.reportSummary", { sessions: current.summary.completedSessions, seconds: current.summary.averageCompletedSeconds })}</Text>
      {!current.complete ? <Text style={{ color: colors.foreground }}>{t("care.reportPartial")}</Text> : null}
      <Pressable accessibilityRole="button" disabled={sharing} onPress={() => void exportReport()} style={{ minHeight: 48, padding: 12, borderRadius: 12, backgroundColor: colors.primary }}>
        <Text style={{ color: colors.primaryText, textAlign: "center" }}>{t("care.reportShare")}</Text>
      </Pressable>
      <Text accessibilityRole="header" style={{ color: colors.foreground, fontSize: 20, fontWeight: "800" }}>{t("care.monthlyTitle")}</Text>
      {current.trend.map((month) => <View key={month.key} accessible accessibilityLabel={t("care.monthlyRow", { month: formatDate(month.timestamp, { month: "long", year: "numeric" }), morning: month.morning, evening: month.evening, days: month.days })} style={{ gap: 5 }}>
        <Text style={{ color: colors.foreground }}>{formatDate(month.timestamp, { month: "short", year: "numeric" })} · {month.morning}/{month.days} ☀ · {month.evening}/{month.days} ☾</Text>
        <View style={{ height: 10, borderRadius: 5, backgroundColor: colors.border, overflow: "hidden" }}><View style={{ height: 10, backgroundColor: colors.primary, width: `${Math.min(100, month.rate * 100)}%` }} /></View>
      </View>)}
    </> : null}
    {shared ? <Text accessibilityLiveRegion="polite" style={{ color: colors.foreground }}>{t("care.reportShared")}</Text> : null}
  </View>;
}
