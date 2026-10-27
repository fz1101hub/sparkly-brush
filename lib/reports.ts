import { fromByteArray, toByteArray } from "base64-js";

import type { BrushSession } from "@/lib/brush-types";
import { isEvening, isMorning, localDateKey } from "@/lib/day-progress";
import type { TranslationKey, TranslationParams } from "@/lib/i18n";

/**
 * Printable sheets and reports (lotto 5), built on the phone with no server: the report for the
 * dentist (voce 29) with the clinic's header (voce 30), the weekly board to colour (voce 20), the
 * certificates (voce 67) and the monthly regularity (voce 63). HTML for the print dialog or a PDF,
 * CSV for a spreadsheet. Everything is escaped: names and notes are typed by the family.
 */
type Translate = (key: TranslationKey, params?: TranslationParams) => string;
const DAY_MS = 86_400_000;

export const REPORT_PERIODS = [30, 90] as const;
export type ReportPeriod = (typeof REPORT_PERIODS)[number];

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

/** A CSV cell: quoted, with formulas neutralised so a spreadsheet never runs them. */
export function csvCell(value: string | number): string {
  const text = String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export type DentistReport = {
  days: ReportPeriod;
  from: number;
  to: number;
  sessions: number;
  completedSessions: number;
  averageSeconds: number;
  daysWithBrushing: number;
  morningDays: number;
  eveningDays: number;
  perfectDays: number;
  longestStreak: number;
  sessionsInPeriod: BrushSession[];
};

export function dentistReport(history: readonly BrushSession[], now: number, days: ReportPeriod): DentistReport {
  const end = new Date(now);
  const from = new Date(end.getFullYear(), end.getMonth(), end.getDate() - (days - 1)).getTime();
  const sessions = history.filter((session) => session.startedAt >= from && session.startedAt <= now)
    .sort((first, second) => first.startedAt - second.startedAt);
  const completed = sessions.filter((session) => session.completed);
  const byDay = new Map<string, { morning: boolean; evening: boolean }>();
  for (const session of completed) {
    const key = localDateKey(session.startedAt);
    const day = byDay.get(key) ?? { morning: false, evening: false };
    if (isMorning(session.startedAt)) day.morning = true;
    if (isEvening(session.startedAt)) day.evening = true;
    byDay.set(key, day);
  }
  let longest = 0;
  let run = 0;
  for (let index = 0; index < days; index += 1) {
    const key = localDateKey(from + index * DAY_MS + 12 * 3_600_000);
    run = byDay.has(key) ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  const values = [...byDay.values()];
  return {
    days,
    from,
    to: now,
    sessions: sessions.length,
    completedSessions: completed.length,
    averageSeconds: sessions.length ? Math.round(sessions.reduce((sum, session) => sum + session.durationSeconds, 0) / sessions.length) : 0,
    daysWithBrushing: byDay.size,
    morningDays: values.filter((day) => day.morning).length,
    eveningDays: values.filter((day) => day.evening).length,
    perfectDays: values.filter((day) => day.morning && day.evening).length,
    longestStreak: longest,
    sessionsInPeriod: sessions,
  };
}

export type ClinicHeader = { name: string; address: string; phone: string };
export const EMPTY_CLINIC: ClinicHeader = { name: "", address: "", phone: "" };
const MAX_CLINIC_FIELD = 80;
const CLINIC_CODE_PREFIX = "SB1-";

export function cleanClinic(raw: unknown): ClinicHeader {
  const value = (raw && typeof raw === "object" ? raw : {}) as Partial<ClinicHeader>;
  const field = (text: unknown) => (typeof text === "string" ? text.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, MAX_CLINIC_FIELD) : "");
  return { name: field(value.name), address: field(value.address), phone: field(value.phone) };
}

function checksum(text: string): string {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.codePointAt(0)!) % 1_679_616;
  return hash.toString(36).padStart(4, "0");
}

// Percent-encoding first keeps the bytes ASCII, so no TextEncoder is needed on older engines.
const toBase64 = (text: string) => fromByteArray(Uint8Array.from(encodeURIComponent(text), (char) => char.charCodeAt(0)));
const fromBase64 = (text: string) => decodeURIComponent(String.fromCharCode(...toByteArray(text)));

/**
 * The clinic code (voce 30): the practice gives families a short code that fills its header on
 * the printed report. It travels by hand, so it carries a checksum against typing errors.
 */
export function clinicCode(clinic: ClinicHeader): string {
  const body = toBase64(JSON.stringify(cleanClinic(clinic))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${CLINIC_CODE_PREFIX}${body}.${checksum(body)}`;
}

export function parseClinicCode(code: string): ClinicHeader | null {
  const trimmed = code.trim().replace(/\s+/g, "");
  if (!trimmed.startsWith(CLINIC_CODE_PREFIX)) return null;
  const [body, sum] = trimmed.slice(CLINIC_CODE_PREFIX.length).split(".");
  if (!body || !sum || checksum(body) !== sum) return null;
  try {
    const padded = body.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (body.length % 4)) % 4);
    const clinic = cleanClinic(JSON.parse(fromBase64(padded)));
    return clinic.name ? clinic : null;
  } catch {
    return null;
  }
}

/** Monthly regularity kept for the long-term chart (voce 63): the recent history only covers weeks. */
export type MonthStat = { month: string; days: number; mornings: number; evenings: number; sessions: number };

export function monthStat(history: readonly BrushSession[], month: string): MonthStat {
  const completed = history.filter((session) => session.completed && localDateKey(session.startedAt).startsWith(`${month}-`));
  const days = new Map<string, { morning: boolean; evening: boolean }>();
  for (const session of completed) {
    const key = localDateKey(session.startedAt);
    const day = days.get(key) ?? { morning: false, evening: false };
    day.morning ||= isMorning(session.startedAt);
    day.evening ||= isEvening(session.startedAt);
    days.set(key, day);
  }
  const values = [...days.values()];
  return {
    month,
    days: days.size,
    mornings: values.filter((day) => day.morning).length,
    evenings: values.filter((day) => day.evening).length,
    sessions: completed.length,
  };
}

export function daysInMonth(month: string): number {
  const [year, number] = month.split("-").map(Number);
  return new Date(year, number, 0).getDate();
}

/** Merges the months seen in the recent history into the kept ones; a month only grows. */
export function mergeMonthStats(kept: readonly MonthStat[], history: readonly BrushSession[], now: number): MonthStat[] {
  const months = new Set(history.filter((session) => session.startedAt <= now).map((session) => localDateKey(session.startedAt).slice(0, 7)));
  const byMonth = new Map(kept.map((stat) => [stat.month, stat]));
  for (const month of months) {
    const fresh = monthStat(history, month);
    const old = byMonth.get(month);
    if (!old || fresh.sessions > old.sessions || fresh.days > old.days) byMonth.set(month, old ? {
      month,
      days: Math.max(old.days, fresh.days),
      mornings: Math.max(old.mornings, fresh.mornings),
      evenings: Math.max(old.evenings, fresh.evenings),
      sessions: Math.max(old.sessions, fresh.sessions),
    } : fresh);
  }
  return [...byMonth.values()].filter((stat) => stat.sessions > 0)
    .sort((first, second) => first.month.localeCompare(second.month)).slice(-36);
}

export function normalizeMonthStats(raw: unknown): MonthStat[] {
  if (!Array.isArray(raw)) return [];
  const count = (value: unknown, max: number) => (typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(max, Math.round(value))) : 0);
  return raw
    .filter((item): item is MonthStat => Boolean(item) && typeof item.month === "string" && /^\d{4}-\d{2}$/.test(item.month))
    .map((item) => {
      const days = daysInMonth(item.month);
      return { month: item.month, days: count(item.days, days), mornings: count(item.mornings, days), evenings: count(item.evenings, days), sessions: count(item.sessions, 999) };
    })
    .sort((first, second) => first.month.localeCompare(second.month))
    .slice(-36);
}

const PAGE_STYLE = `
  body { font-family: -apple-system, Roboto, "Segoe UI", sans-serif; color: #17213A; margin: 24px; }
  h1 { font-size: 24px; margin: 0 0 4px; } h2 { font-size: 17px; margin: 20px 0 6px; }
  .muted { color: #56617D; font-size: 13px; } table { border-collapse: collapse; width: 100%; margin-top: 8px; }
  th, td { border: 1px solid #C8D0E0; padding: 6px 8px; text-align: left; font-size: 13px; }
  th { background: #EEF2FA; } .box { height: 54px; } .clinic { border-bottom: 2px solid #2457D6; padding-bottom: 8px; margin-bottom: 14px; }
  .bar { height: 12px; background: #2457D6; border-radius: 6px; } .bar.evening { background: #6C4CC2; }
  .cert { border: 6px double #E8BE38; border-radius: 24px; padding: 40px; text-align: center; margin-top: 40px; }
  .cert .big { font-size: 64px; } .cert h1 { font-size: 34px; } .cert p { font-size: 18px; }
`;

function page(title: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${PAGE_STYLE}</style></head><body>${body}</body></html>`;
}

export type DentalRecordKind = "visit" | "sealant" | "fluoride" | "ortho";
export type DentalRecord = { id: string; kind: DentalRecordKind; day: string; note: string };

type ReportOptions = {
  childName: string;
  clinic: ClinicHeader;
  months: readonly MonthStat[];
  records: readonly DentalRecord[];
  t: Translate;
  formatDate: (timestamp: number) => string;
};

export function dentistReportHtml(report: DentistReport, options: ReportOptions): string {
  const { childName, clinic, months, records, t, formatDate } = options;
  const percent = (value: number, total: number) => (total ? `${Math.round((value / total) * 100)}%` : "—");
  const clinicBlock = clinic.name
    ? `<div class="clinic"><strong>${escapeHtml(clinic.name)}</strong><br><span class="muted">${escapeHtml([clinic.address, clinic.phone].filter(Boolean).join(" · "))}</span></div>`
    : "";
  const rows = [
    [t("report.row.sessions"), `${report.completedSessions} / ${report.sessions}`],
    [t("report.row.average"), t("stats.seconds", { count: report.averageSeconds })],
    [t("report.row.days"), `${report.daysWithBrushing} / ${report.days} (${percent(report.daysWithBrushing, report.days)})`],
    [t("report.row.mornings"), `${report.morningDays} (${percent(report.morningDays, report.days)})`],
    [t("report.row.evenings"), `${report.eveningDays} (${percent(report.eveningDays, report.days)})`],
    [t("report.row.perfect"), `${report.perfectDays}`],
    [t("report.row.streak"), t("stats.days", { count: report.longestStreak })],
  ];
  const monthRows = months.slice(-12).map((stat) => {
    const total = daysInMonth(stat.month);
    return `<tr><td>${escapeHtml(stat.month)}</td><td>${stat.mornings} / ${total}</td><td>${stat.evenings} / ${total}</td><td>${stat.sessions}</td></tr>`;
  }).join("");
  const recordRows = records.map((record) => `<tr><td>${escapeHtml(record.day)}</td><td>${escapeHtml(t(`booklet.kind.${record.kind}`))}</td><td>${escapeHtml(record.note)}</td></tr>`).join("");
  return page(t("report.title", { name: childName }), `
    ${clinicBlock}
    <h1>${escapeHtml(t("report.title", { name: childName }))}</h1>
    <p class="muted">${escapeHtml(t("report.period", { from: formatDate(report.from), to: formatDate(report.to), days: report.days }))}</p>
    <table>${rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}</table>
    ${monthRows ? `<h2>${escapeHtml(t("report.months"))}</h2><table><tr><th>${escapeHtml(t("report.month"))}</th><th>${escapeHtml(t("report.row.mornings"))}</th><th>${escapeHtml(t("report.row.evenings"))}</th><th>${escapeHtml(t("report.row.sessions"))}</th></tr>${monthRows}</table>` : ""}
    ${recordRows ? `<h2>${escapeHtml(t("booklet.title"))}</h2><table>${recordRows}</table>` : ""}
    <p class="muted">${escapeHtml(t("report.footer"))}</p>`);
}

export function dentistReportCsv(report: DentistReport, t: Translate): string {
  const header = [t("report.csv.date"), t("report.csv.time"), t("report.csv.seconds"), t("report.csv.completed"), t("report.csv.source")];
  const lines = report.sessionsInPeriod.map((session) => {
    const date = new Date(session.startedAt);
    return [
      localDateKey(session.startedAt),
      `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
      Math.round(session.durationSeconds),
      session.completed ? t("report.csv.yes") : t("report.csv.no"),
      session.source === "manual" ? t("report.csv.timer") : t("report.csv.handle"),
    ];
  });
  return [header, ...lines].map((line) => line.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

/** The board for the bathroom (voce 20): seven days, morning and evening boxes to colour. */
export function weeklyBoardHtml(childName: string, creatureEmoji: string, weekStartTimestamp: number, t: Translate, formatDay: (timestamp: number) => string): string {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStartTimestamp);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + index, 12).getTime();
  });
  return page(t("board.title", { name: childName }), `
    <h1>${escapeHtml(creatureEmoji)} ${escapeHtml(t("board.title", { name: childName }))}</h1>
    <p class="muted">${escapeHtml(t("board.text"))}</p>
    <table><tr><th></th><th>☀️ ${escapeHtml(t("board.morning"))}</th><th>🌙 ${escapeHtml(t("board.evening"))}</th></tr>
    ${days.map((day) => `<tr><th>${escapeHtml(formatDay(day))}</th><td class="box"></td><td class="box"></td></tr>`).join("")}</table>`);
}

export const CERTIFICATES = ["days30", "days100", "days365", "braces"] as const;
export type CertificateId = (typeof CERTIFICATES)[number];
export const CERTIFICATE_DAYS: Record<Exclude<CertificateId, "braces">, number> = { days30: 30, days100: 100, days365: 365 };

/** A certificate with the child's name (voce 67), for 30, 100 or 365 days or the braces taken off. */
export function certificateHtml(id: CertificateId, childName: string, creatureEmoji: string, date: string, t: Translate): string {
  return page(t(`certificate.${id}`), `
    <div class="cert">
      <div class="big">${escapeHtml(creatureEmoji)}</div>
      <h1>${escapeHtml(t("certificate.heading"))}</h1>
      <p>${escapeHtml(t("certificate.givenTo"))}</p>
      <h1>${escapeHtml(childName)}</h1>
      <p>${escapeHtml(t(`certificate.${id}`))}</p>
      <p class="muted">${escapeHtml(date)}</p>
    </div>`);
}
