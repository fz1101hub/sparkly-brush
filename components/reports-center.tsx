import { useRef, useState } from "react";
import { StyleSheet, Switch, TextInput, View, type DimensionValue } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import { ChoiceChips, VillageButton } from "@/components/village-ui";
import { useBraces } from "@/contexts/braces-context";
import { useBrush } from "@/contexts/brush-context";
import { useBrushling } from "@/contexts/brushling-context";
import { useExtras } from "@/contexts/extras-context";
import { useOptionalFamily } from "@/contexts/family-context-value";
import { useI18n } from "@/contexts/locale-context";
import { useColors } from "@/hooks/use-colors";
import { useCurrentDayTimestamp } from "@/hooks/use-current-day";
import { useMinuteClock } from "@/hooks/use-minute-clock";
import { CREATURE_EMOJI } from "@/lib/avatar";
import { localDateKey } from "@/lib/day-progress";
import { showMessage } from "@/lib/dialogs";
import { canSharePostcard, sharePostcard } from "@/lib/postcard-capture";
import { canSharePdf, printHtml, sharePdf, shareTextFile } from "@/lib/print";
import {
  CERTIFICATE_DAYS,
  CERTIFICATES,
  certificateHtml,
  clinicCode,
  daysInMonth,
  dentistReport,
  dentistReportCsv,
  dentistReportHtml,
  parseClinicCode,
  REPORT_PERIODS,
  weeklyBoardHtml,
  type CertificateId,
  type ReportPeriod,
} from "@/lib/reports";
import { inWeek, weekStart } from "@/lib/weekly";


function Card({ testID, title, children }: { testID: string; title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View testID={testID} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      {children}
    </View>
  );
}

/**
 * «Stampe e rapporti» in the parent area (lotto 5): weekly summary, long-term chart, the report
 * for the dentist with the clinic header, the board and certificates to print and the postcard
 * for the grandparents. Everything is made on the phone and leaves it only through the share sheet.
 */
export function ReportsCenter() {
  const colors = useColors();
  const { t, formatDate, formatNumber } = useI18n();
  const family = useOptionalFamily();
  const { history, demoMode } = useBrush();
  const { selectedId } = useBrushling();
  const { extras, apply } = useExtras();
  const braces = useBraces();
  const today = useCurrentDayTimestamp();
  const now = useMinuteClock();
  const [period, setPeriod] = useState<ReportPeriod>(30);
  const [code, setCode] = useState("");
  const [clinicMessage, setClinicMessage] = useState<string | null>(null);
  const [clinic, setClinic] = useState(extras.clinic);
  const postcard = useRef<View>(null);
  const name = family?.active.name ?? "";
  const emoji = CREATURE_EMOJI[selectedId];
  const real = demoMode ? [] : history;
  const fail = () => showMessage(t("common.actionFailedTitle"), t("common.actionFailedMessage"));
  const longDate = (timestamp: number) => formatDate(timestamp, { day: "numeric", month: "long", year: "numeric" });

  const start = weekStart(today);
  const weekDone = real.filter((session) => session.completed && inWeek(session, start)).length;
  const daysBrushed = extras.monthStats.reduce((sum, stat) => sum + stat.days, 0);
  const certificateReady = (id: CertificateId) => (id === "braces" ? braces.settings.removedAt !== null : daysBrushed >= CERTIFICATE_DAYS[id]);
  const months = extras.monthStats.slice(-12);
  const input = [styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }];

  // The clock of the latest minute: a session saved just now is in the report.
  const report = () => dentistReport(real, Math.max(now, real[0]?.startedAt ?? 0), period);
  const reportHtml = () => dentistReportHtml(report(), {
    childName: name,
    clinic: extras.clinic,
    months: extras.monthStats,
    records: extras.dentalRecords,
    t,
    formatDate: longDate,
  });

  return (
    <View style={styles.stack}>
      <Card testID="weekly-summary" title={t("summary.title")}>
        <Text testID="weekly-summary-count" style={[styles.big, { color: colors.foreground }]}>
          {t("summary.count", { done: weekDone, total: 14 })}
        </Text>
        <View style={styles.row}>
          <Text style={[styles.text, { color: colors.foreground, flex: 1 }]}>{t("summary.notify")}</Text>
          <Switch
            testID="weekly-summary-switch"
            style={{ minHeight: 44, minWidth: 48 }}
            accessibilityLabel={t("summary.notify")}
            value={extras.weeklySummary}
            onValueChange={(weeklySummary) => void apply((previous) => ({ ...previous, weeklySummary }))}
          />
        </View>
      </Card>

      <Card testID="month-chart" title={t("chart.title")}>
        <Text style={[styles.text, { color: colors.muted }]}>{t("chart.text")}</Text>
        {months.length ? months.map((stat) => {
          const total = daysInMonth(stat.month);
          const [year, month] = stat.month.split("-").map(Number);
          const label = formatDate(new Date(year, month - 1, 1).getTime(), { month: "short", year: "2-digit" });
          return (
            <View
              key={stat.month}
              testID={`month-${stat.month}`}
              accessible
              accessibilityLabel={t("chart.monthLabel", { month: label, mornings: stat.mornings, evenings: stat.evenings, days: total })}
              style={styles.monthRow}
            >
              <Text style={[styles.monthLabel, { color: colors.foreground }]}>{label}</Text>
              <View style={styles.bars}>
                <View style={[styles.bar, { backgroundColor: "#2457D6", width: `${Math.round((stat.mornings / total) * 100)}%` as DimensionValue }]} />
                <View style={[styles.bar, { backgroundColor: "#6C4CC2", width: `${Math.round((stat.evenings / total) * 100)}%` as DimensionValue }]} />
              </View>
            </View>
          );
        }) : <Text style={[styles.text, { color: colors.muted }]}>{t("chart.empty")}</Text>}
        <Text style={[styles.text, { color: colors.muted }]}>{t("chart.legend")}</Text>
      </Card>

      <Card testID="dentist-report" title={t("report.cardTitle")}>
        <Text style={[styles.text, { color: colors.muted }]}>{t("report.cardText")}</Text>
        <ChoiceChips<ReportPeriod>
          label={t("report.period.label")}
          testIDPrefix="report-days"
          value={period}
          onChange={setPeriod}
          options={REPORT_PERIODS.map((days) => ({ value: days, label: t("report.period.days", { count: days }) }))}
        />
        <Text testID="report-summary" style={[styles.text, { color: colors.foreground }]}>
          {(() => {
            const value = report();
            return t("report.summary", { completed: value.completedSessions, days: value.daysWithBrushing, period: value.days, average: value.averageSeconds });
          })()}
        </Text>
        <View style={styles.actions}>
          <VillageButton testID="report-print" icon="print" label={t("print.print")} onPress={() => void printHtml(reportHtml()).catch(fail)} />
          {canSharePdf ? (
            <VillageButton
              testID="report-pdf"
              secondary
              icon="picture-as-pdf"
              label={t("print.pdf")}
              onPress={() => void sharePdf(reportHtml(), `rapporto-${localDateKey(Date.now())}.pdf`, t("report.cardTitle")).catch(fail)}
            />
          ) : null}
          <VillageButton
            testID="report-csv"
            secondary
            icon="table-chart"
            label={t("print.csv")}
            onPress={() => void shareTextFile(dentistReportCsv(report(), t), `spazzolate-${localDateKey(Date.now())}.csv`, "text/csv", t("report.cardTitle")).catch(fail)}
          />
        </View>
      </Card>

      <Card testID="clinic-settings" title={t("clinic.title")}>
        <Text style={[styles.text, { color: colors.muted }]}>{t("clinic.text")}</Text>
        {(["name", "address", "phone"] as const).map((field) => (
          <TextInput
            key={field}
            testID={`clinic-${field}`}
            accessibilityLabel={t(`clinic.${field}`)}
            placeholder={t(`clinic.${field}`)}
            placeholderTextColor={colors.muted}
            value={clinic[field]}
            maxLength={80}
            onChangeText={(value) => setClinic((previous) => ({ ...previous, [field]: value }))}
            style={input}
          />
        ))}
        <VillageButton
          testID="clinic-save"
          label={t("clinic.save")}
          onPress={() => void apply((previous) => ({ ...previous, clinic })).then(() => setClinicMessage(t("clinic.saved")), fail)}
        />
        <TextInput
          testID="clinic-code-input"
          accessibilityLabel={t("clinic.codeLabel")}
          placeholder={t("clinic.codeLabel")}
          placeholderTextColor={colors.muted}
          value={code}
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setCode}
          style={input}
        />
        <VillageButton
          testID="clinic-code-apply"
          secondary
          label={t("clinic.codeApply")}
          onPress={() => {
            const parsed = parseClinicCode(code);
            if (!parsed) {
              setClinicMessage(t("clinic.codeInvalid"));
              return;
            }
            setClinic(parsed);
            void apply((previous) => ({ ...previous, clinic: parsed })).then(() => setClinicMessage(t("clinic.codeApplied", { name: parsed.name })), fail);
          }}
        />
        {clinicMessage ? <Text testID="clinic-message" accessibilityLiveRegion="polite" style={[styles.text, { color: colors.foreground }]}>{clinicMessage}</Text> : null}
        {extras.clinic.name ? (
          <Text testID="clinic-code" selectable style={[styles.code, { color: colors.muted }]}>{t("clinic.codeShare", { code: clinicCode(extras.clinic) })}</Text>
        ) : null}
      </Card>

      <Card testID="print-board" title={t("board.cardTitle")}>
        <Text style={[styles.text, { color: colors.muted }]}>{t("board.cardText")}</Text>
        <VillageButton
          testID="board-print"
          icon="print"
          label={t("print.print")}
          onPress={() => void printHtml(weeklyBoardHtml(name, emoji, weekStart(Date.now()), t, (day) => formatDate(day, { weekday: "long", day: "numeric" }))).catch(fail)}
        />
      </Card>

      <Card testID="certificates" title={t("certificate.cardTitle")}>
        <Text style={[styles.text, { color: colors.muted }]}>{t("certificate.cardText", { days: formatNumber(daysBrushed) })}</Text>
        <View style={styles.actions}>
          {CERTIFICATES.map((id) => (
            <VillageButton
              key={id}
              testID={`certificate-${id}`}
              secondary
              icon={certificateReady(id) ? "workspace-premium" : "lock"}
              disabled={!certificateReady(id)}
              label={t(`certificate.${id}`)}
              onPress={() => void printHtml(certificateHtml(id, name, emoji, longDate(Date.now()), t)).catch(fail)}
            />
          ))}
        </View>
      </Card>

      <Card testID="postcard-card" title={t("postcard.title")}>
        <View ref={postcard} collapsable={false} testID="postcard" style={styles.postcard}>
          <Text accessible={false} style={styles.postcardEmoji}>{emoji} 😁</Text>
          <Text style={styles.postcardTitle}>{t("postcard.headline", { name, count: daysBrushed })}</Text>
          <Text style={styles.postcardText}>{t("postcard.text")}</Text>
        </View>
        {canSharePostcard ? (
          <VillageButton testID="postcard-share" icon="share" label={t("postcard.share")} onPress={() => void sharePostcard(postcard, t("postcard.title")).catch(fail)} />
        ) : (
          <Text style={[styles.text, { color: colors.muted }]}>{t("postcard.webHint")}</Text>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 16 },
  card: { borderWidth: 1, borderRadius: 22, padding: 16, gap: 10 },
  title: { fontSize: 18, lineHeight: 24, fontWeight: "900" },
  text: { fontSize: 14, lineHeight: 21 },
  big: { fontSize: 22, lineHeight: 28, fontWeight: "900" },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, fontSize: 16 },
  code: { fontSize: 12, lineHeight: 18 },
  monthRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 36 },
  monthLabel: { width: 64, fontSize: 13, lineHeight: 18, fontWeight: "800" },
  bars: { flex: 1, gap: 4 },
  bar: { height: 10, borderRadius: 5, minWidth: 2 },
  postcard: { borderRadius: 22, padding: 22, backgroundColor: "#FFF4C9", alignItems: "center", gap: 8 },
  postcardEmoji: { fontSize: 48, lineHeight: 58 },
  postcardTitle: { color: "#17213A", fontSize: 22, lineHeight: 28, fontWeight: "900", textAlign: "center" },
  postcardText: { color: "#3D4660", fontSize: 15, lineHeight: 21, textAlign: "center" },
});
