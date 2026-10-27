import { beforeEach, describe, expect, it, vi } from "vitest";

const data = vi.hoisted(() => new Map<string, string>());
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => data.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      data.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      data.delete(key);
    }),
  },
}));

import { localDateKey } from "@/lib/day-progress";
import { cleanCreatureName, DEFAULT_EXTRAS, getExtrasStorage, normalizeExtras } from "@/lib/extras";
import { forgivingStreak } from "@/lib/forgiving-streak";
import { planReminders } from "@/lib/reminder-plan";

beforeEach(() => data.clear());

const day = (date: number, month = 9) => localDateKey(new Date(2026, month, date, 12).getTime());
const days = (...dates: number[]) => new Set(dates.map((date) => day(date)));

describe("serie del sorriso che perdona", () => {
  // October 2026: Monday 19, Monday 26.
  it("conta i giorni di fila e oggi non ancora spazzolato non la rompe", () => {
    expect(forgivingStreak(days(24, 25, 26), new Set(), new Date(2026, 9, 27, 8).getTime()).days).toBe(3);
    expect(forgivingStreak(days(24, 25, 26, 27), new Set(), new Date(2026, 9, 27, 21).getTime()).days).toBe(4);
  });

  it("perdona un giorno saltato a settimana, non il secondo", () => {
    const now = new Date(2026, 9, 25, 21).getTime();
    const oneMiss = forgivingStreak(days(19, 20, 22, 23, 24, 25), new Set(), now);
    expect(oneMiss).toMatchObject({ days: 6, jokerUsedThisWeek: true });
    const twoMisses = forgivingStreak(days(19, 20, 22, 24, 25), new Set(), now);
    expect(twoMisses.days).toBe(4);
  });

  it("i giorni segnati dal genitore (malato, vacanza) tengono viva la serie", () => {
    const now = new Date(2026, 9, 25, 21).getTime();
    expect(forgivingStreak(days(19, 20, 25), new Set([day(21), day(22), day(23), day(24)]), now).days).toBe(3);
  });

  it("dopo un'interruzione i primi tre giorni valgono doppio", () => {
    const now = new Date(2026, 9, 31, 21).getTime();
    // Streak 19–21, then 22 (joker) and 23 missed: broken. From 28: 2+2+2+1.
    const streak = forgivingStreak(days(19, 20, 21, 28, 29, 30, 31), new Set(), now);
    expect(streak).toMatchObject({ days: 7, bonusDaysLeft: 0 });
    expect(forgivingStreak(days(19, 20, 21, 28), new Set(), new Date(2026, 9, 28, 21).getTime()).bonusDaysLeft).toBe(2);
  });

  it("senza spazzolate non c'è serie", () => {
    expect(forgivingStreak(new Set(), new Set([day(20)]), Date.now()).days).toBe(0);
  });
});

describe("promemoria che saltano se hai già spazzolato", () => {
  const settings = { enabled: true, morning: "07:30", evening: "19:30", lastCall: true, lastCallTime: "21:00" };

  it("programma i prossimi sei giorni, solo nel futuro", () => {
    const plan = planReminders("emma", settings, new Date(2026, 9, 27, 12).getTime());
    expect(plan[0]).toMatchObject({ id: "brushlings-emma-evening-2026-10-27", slot: "evening" });
    expect(plan.filter((item) => item.slot === "morning")).toHaveLength(5);
    expect(plan.filter((item) => item.slot === "lastCall")).toHaveLength(6);
    expect(plan.every((item) => item.at > new Date(2026, 9, 27, 12).getTime())).toBe(true);
  });

  it("salta quelli di oggi già fatti e l'ultimo richiamo se la sera è fatta", () => {
    const now = new Date(2026, 9, 27, 6).getTime();
    const morningDone = planReminders("emma", settings, now, { morning: true, evening: false });
    expect(morningDone.some((item) => item.id === "brushlings-emma-morning-2026-10-27")).toBe(false);
    expect(morningDone.some((item) => item.id === "brushlings-emma-evening-2026-10-27")).toBe(true);
    const eveningDone = planReminders("emma", settings, new Date(2026, 9, 27, 19).getTime(), { morning: true, evening: true });
    expect(eveningDone.some((item) => item.id.endsWith("2026-10-27"))).toBe(false);
    expect(eveningDone.some((item) => item.id === "brushlings-emma-morning-2026-10-28")).toBe(true);
  });

  it("senza ultimo richiamo o con i promemoria spenti", () => {
    expect(planReminders("emma", { ...settings, lastCall: false }, Date.now()).some((item) => item.slot === "lastCall")).toBe(false);
    expect(planReminders("emma", { ...settings, enabled: false }, Date.now())).toEqual([]);
  });
});

describe("impostazioni extra del bambino", () => {
  it("normalizza giorni protetti, durata e nomi delle creature", () => {
    expect(normalizeExtras({})).toEqual(DEFAULT_EXTRAS);
    expect(
      normalizeExtras({
        protectedDays: [{ day: "2026-10-21", reason: "sick" }, { day: "ieri", reason: "sick" }, { day: "2026-10-20", reason: "party" }],
        sessionSeconds: 45,
        creatureNames: { bloopi: "  Blu <b>!!  ", unknown: "X", spriggo: "" },
      }),
    ).toEqual({
      version: 1,
      protectedDays: [{ day: "2026-10-21", reason: "sick" }],
      sessionSeconds: 120,
      creatureNames: { bloopi: "Blu b" },
    });
    expect(normalizeExtras({ sessionSeconds: 60 }).sessionSeconds).toBe(60);
  });

  it("pulisce il nome scelto e lo accorcia", () => {
    expect(cleanCreatureName("  Zuccherino   Blu ")).toBe("Zuccherino Blu");
    expect(cleanCreatureName("Ñandú d’Oro")).toBe("Ñandú d’Oro");
    expect(cleanCreatureName("a".repeat(30))).toHaveLength(16);
  });

  it("tiene separati i dati dei bambini", async () => {
    await getExtrasStorage("child-b").save({ ...DEFAULT_EXTRAS, sessionSeconds: 60 });
    expect((await getExtrasStorage("primary").load()).sessionSeconds).toBe(120);
    expect((await getExtrasStorage("child-b").load()).sessionSeconds).toBe(60);
  });
});
