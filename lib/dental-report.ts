import type { SessionSummary } from "./session-summary";

export function reportWindow(now: number, days: 30 | 90) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - days + 1);
  return { since: start.getTime(), until: now };
}

/** Quote every cell and neutralize formulas before a spreadsheet opens family-entered text. */
export function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

export function dentalReportCsv(
  name: string,
  summary: SessionSummary,
  labels: { name: string; date: string; morning: string; evening: string; sessions: string; yes: string; no: string; average: string; total: string },
  window?: { since: number; until: number; note?: string },
): string {
  const entries = window ? [] : summary.days;
  if (window) {
    const cursor = new Date(window.since);
    cursor.setHours(0, 0, 0, 0);
    while (cursor.getTime() <= window.until) {
      const date = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      entries.push(summary.days.find((day) => day.date === date) ?? { date, morning: false, evening: false, count: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  const rows: (string | number)[][] = [
    [labels.name, name],
    [labels.total, summary.completedSessions],
    [labels.average, summary.averageCompletedSeconds],
    ...(window?.note ? [[window.note]] : []),
    [],
    [labels.date, labels.morning, labels.evening, labels.sessions],
    ...entries.map((day) => [day.date, day.morning ? labels.yes : labels.no, day.evening ? labels.yes : labels.no, day.count]),
  ];
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

/** Include empty months; denominators count elapsed local calendar days, including today. */
export function monthlyRoutineTrend(summary: SessionSummary, now = Date.now(), months = 12) {
  const today = new Date(now);
  return Array.from({ length: months }, (_, index) => {
    const month = new Date(today.getFullYear(), today.getMonth() - months + 1 + index, 1);
    const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
    const days = index === months - 1 ? today.getDate() : new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const entries = summary.days.filter((day) => day.date.startsWith(key + "-"));
    const morning = entries.filter((day) => day.morning).length;
    const evening = entries.filter((day) => day.evening).length;
    return { key, timestamp: month.getTime(), days, morning, evening, rate: (morning + evening) / (days * 2) };
  });
}
