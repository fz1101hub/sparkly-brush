import { describe, expect, it } from "vitest";

import type { BrushSession } from "@/lib/brush-types";
import {
  certificateHtml,
  clinicCode,
  csvCell,
  dentistReport,
  dentistReportCsv,
  dentistReportHtml,
  escapeHtml,
  mergeMonthStats,
  monthStat,
  normalizeMonthStats,
  parseClinicCode,
  weeklyBoardHtml,
} from "@/lib/reports";

const t = (key: string, params?: Record<string, unknown>) => (params ? `${key}${JSON.stringify(params)}` : key);
const at = (month: number, day: number, hour = 8) => new Date(2026, month - 1, day, hour).getTime();

function session(id: string, startedAt: number, durationSeconds = 120, completed = true): BrushSession {
  return {
    id,
    startedAt,
    timeConfidence: "exact",
    rewardPolicy: "completed-only",
    durationSeconds,
    targetSeconds: 120,
    completed,
    source: id.startsWith("h") ? "device" : "manual",
  } as BrushSession;
}

describe("rapporto per il dentista (voce 29)", () => {
  const history = [
    session("a", at(10, 25, 8)),
    session("b", at(10, 25, 20), 100),
    session("c", at(10, 26, 20)),
    session("d", at(10, 27, 8), 30, false),
    session("old", at(9, 1, 8)),
  ];

  it("conta frequenza, durata media, mattine, sere e serie negli ultimi 30 giorni", () => {
    const report = dentistReport(history, at(10, 27, 21), 30);
    expect(report).toMatchObject({
      sessions: 4,
      completedSessions: 3,
      averageSeconds: 93,
      daysWithBrushing: 2,
      morningDays: 1,
      eveningDays: 2,
      perfectDays: 1,
      longestStreak: 2,
    });
    expect(dentistReport(history, at(10, 27, 21), 90).completedSessions).toBe(4);
  });

  it("CSV con formule neutralizzate e HTML con i testi della famiglia protetti", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe(`"'=HYPERLINK(1)"`);
    expect(csvCell('a "b"')).toBe(`"a ""b"""`);
    const report = dentistReport(history, at(10, 27, 21), 30);
    const csv = dentistReportCsv(report, t as never);
    expect(csv.split("\r\n")).toHaveLength(6);
    expect(csv).toContain(`"2026-10-25","20:00","100"`);
    const html = dentistReportHtml(report, {
      childName: "<Sofia>",
      clinic: { name: "Studio & Co", address: "", phone: "" },
      months: [monthStat(history, "2026-10")],
      records: [{ id: "1", kind: "sealant", day: "2026-10-01", note: "<b>36</b>" }],
      t: t as never,
      formatDate: (value) => new Date(value).toISOString().slice(0, 10),
    });
    expect(html).toContain("Studio &amp; Co");
    expect(html).not.toContain("<Sofia>");
    expect(html).not.toContain("<b>36</b>");
    expect(escapeHtml(`<a href="x">'`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;");
  });
});

describe("codice dello studio (voce 30)", () => {
  it("va e torna, anche con lettere accentate, e rifiuta i codici sbagliati", () => {
    const clinic = { name: "Studio Dentistico Più Sorrisi", address: "Via Roma 1, Città", phone: "+39 02 123" };
    const code = clinicCode(clinic);
    expect(code.startsWith("SB1-")).toBe(true);
    expect(parseClinicCode(code)).toEqual(clinic);
    expect(parseClinicCode(` ${code} `)).toEqual(clinic);
    expect(parseClinicCode(code.slice(0, -1) + (code.endsWith("a") ? "b" : "a"))).toBeNull();
    expect(parseClinicCode("ciao")).toBeNull();
    expect(parseClinicCode(clinicCode({ name: "", address: "x", phone: "" }))).toBeNull();
  });
});

describe("regolarità per mesi (voce 63)", () => {
  it("tiene i mesi già visti anche quando escono dalla cronologia recente", () => {
    const october = [session("a", at(10, 1, 8)), session("b", at(10, 1, 20)), session("c", at(10, 2, 8))];
    const kept = mergeMonthStats([], october, at(10, 3));
    expect(kept).toEqual([{ month: "2026-10", days: 2, mornings: 2, evenings: 1, sessions: 3 }]);
    const later = mergeMonthStats(kept, [session("d", at(11, 1, 8))], at(11, 1));
    expect(later.map((stat) => stat.month)).toEqual(["2026-10", "2026-11"]);
    expect(later[0].sessions).toBe(3);
    expect(normalizeMonthStats([{ month: "2026-02", days: 40, mornings: -1, evenings: 3, sessions: 2 }, { month: "x" }])).toEqual([
      { month: "2026-02", days: 28, mornings: 0, evenings: 3, sessions: 2 },
    ]);
  });
});

describe("stampe (voci 20 e 67)", () => {
  it("tabellone di sette giorni e attestato con il nome", () => {
    const board = weeklyBoardHtml("Emma", "🐳", at(10, 26), t as never, (value) => String(new Date(value).getDate()));
    expect(board.match(/class="box"/g)).toHaveLength(14);
    expect(board).toContain(">26<");
    const certificate = certificateHtml("days100", "Emma & Luca", "🐳", "27 ottobre 2026", t as never);
    expect(certificate).toContain("Emma &amp; Luca");
    expect(certificate).toContain("certificate.days100");
  });
});

describe("riepilogo, libretto e registro dei mesi (voci 31, 64, 63)", async () => {
  const { isSummaryTime, nextSummaryAt } = await import("@/lib/weekly");
  const { DEFAULT_EXTRAS, normalizeExtras } = await import("@/lib/extras");
  const { motivationUpdates } = await import("@/lib/motivation");

  it("la domenica alle 18:30", () => {
    expect(new Date(nextSummaryAt(at(10, 27, 9))).toString()).toBe(new Date(2026, 10, 1, 18, 30).toString());
    expect(new Date(nextSummaryAt(new Date(2026, 10, 1, 19).getTime())).getDate()).toBe(8);
    expect(isSummaryTime(new Date(2026, 10, 1, 18, 45).getTime())).toBe(true);
    expect(isSummaryTime(new Date(2026, 10, 1, 17, 0).getTime())).toBe(false);
  });

  it("normalizza libretto, studio e mesi", () => {
    const extras = normalizeExtras({
      dentalRecords: [
        { id: "a", kind: "sealant", day: "2026-10-01", note: "x".repeat(300) },
        { id: "b", kind: "crown", day: "2026-10-01", note: "" },
        { id: "c", kind: "visit", day: "ieri", note: "" },
      ],
      clinic: { name: "  Studio\nSorrisi ", phone: 3 },
      weeklySummary: true,
    });
    expect(extras.dentalRecords).toHaveLength(1);
    expect(extras.dentalRecords[0].note).toHaveLength(200);
    expect(extras.clinic).toEqual({ name: "Studio Sorrisi", address: "", phone: "" });
    expect(extras.weeklySummary).toBe(true);
    expect(normalizeExtras({}).monthStats).toEqual([]);
  });

  it("il registro dei mesi si aggiorna una volta sola", () => {
    const history = [session("a", at(10, 1, 8)), session("b", at(10, 1, 20))];
    const inputs = { history, familyHistories: [history], completedSessions: 2, now: at(10, 2) };
    const first = motivationUpdates({ ...DEFAULT_EXTRAS, discoverySkipped: true }, inputs);
    expect(first.monthStats).toEqual([{ month: "2026-10", days: 1, mornings: 1, evenings: 1, sessions: 2 }]);
    expect(motivationUpdates(normalizeExtras({ ...DEFAULT_EXTRAS, discoverySkipped: true, ...first }), inputs)).toEqual({});
  });
});
