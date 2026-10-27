import { describe, expect, it } from "vitest";

import { albumView, awardStickers, COMMON_ORDER, EMPTY_AWARDS, normalizeAwards, RARE_STICKERS } from "@/lib/album";
import type { BrushSession } from "@/lib/brush-types";
import { creatureStars, discoveryOfDay, isPerfectMonth, previousMonthKey } from "@/lib/milestones";
import { seasonAt, seasonEnd } from "@/lib/seasons";
import {
  BOSS_BASE_HP,
  BOSS_MIN_HP,
  challengeOfWeek,
  challengeProgress,
  CHALLENGE_IDS,
  familyBossWeeks,
  nextWeekStart,
  weekKey,
  weekStart,
} from "@/lib/weekly";

const at = (month: number, day: number, hour = 8, year = 2026) => new Date(year, month - 1, day, hour).getTime();

function session(id: string, startedAt: number, durationSeconds = 120, completed = true): BrushSession {
  return {
    id,
    startedAt,
    timeConfidence: "exact",
    rewardPolicy: "completed-only",
    durationSeconds,
    targetSeconds: 120,
    completed,
    source: "manual",
  };
}

describe("stagioni (voce 15)", () => {
  it("riconosce Halloween, Natale a cavallo dell'anno ed estate", () => {
    expect(seasonAt(at(10, 27))).toBe("halloween");
    expect(seasonAt(at(11, 3))).toBeNull();
    expect(seasonAt(at(12, 24))).toBe("christmas");
    expect(seasonAt(at(1, 6, 8, 2027))).toBe("christmas");
    expect(seasonAt(at(8, 15))).toBe("summer");
    expect(new Date(seasonEnd("christmas", at(12, 24))).getFullYear()).toBe(2027);
    expect(new Date(seasonEnd("halloween", at(10, 27))).getDate()).toBe(2);
  });
});

describe("album di figurine (voce 14)", () => {
  it("una figurina per spazzolata, una pagina dopo l'altra, poi i doppioni", () => {
    const view = albumView(7, EMPTY_AWARDS, 0);
    expect(view.ownedCount).toBe(7);
    expect(new Set(COMMON_ORDER.slice(0, 6).map((sticker) => sticker.page)).size).toBe(6);
    expect(albumView(40, EMPTY_AWARDS, 0).doubles).toBe(4);
  });

  it("la domenica arriva una figurina rara e in stagione quelle speciali, una volta per sessione", () => {
    // 25 October 2026 is a Sunday, in the Halloween season.
    const sunday = session("s1", at(10, 25));
    const monday = session("s2", at(10, 26));
    const awarded = awardStickers(EMPTY_AWARDS, [sunday, monday])!;
    expect(awarded.rare).toEqual([RARE_STICKERS[0].id]);
    expect(awarded.season).toEqual(["season-pumpkin", "season-ghost"]);
    expect(awardStickers(awarded, [sunday, monday])).toBeNull();
    expect(awardStickers(EMPTY_AWARDS, [session("x", at(10, 25), 30, false)])).toBeNull();
    expect(normalizeAwards({ rare: ["rare-unicorn", "season-ghost", "nope"], season: ["season-ghost"] })).toEqual({
      rare: ["rare-unicorn"],
      season: ["season-ghost"],
      countedIds: [],
    });
  });

  it("le uova d'oro si schiudono 5 sessioni dopo e il boss sconfitto dà la sua figurina", () => {
    expect(albumView(19, EMPTY_AWARDS, 0).nextEgg).toEqual({ id: "golden-chick", sessionsLeft: 6, found: false });
    expect(albumView(22, EMPTY_AWARDS, 0).nextEgg).toEqual({ id: "golden-chick", sessionsLeft: 3, found: true });
    expect(albumView(25, EMPTY_AWARDS, 0).owned.has("golden-chick")).toBe(true);
    expect(albumView(0, EMPTY_AWARDS, 2).owned.has("boss-germ")).toBe(true);
  });
});

describe("sfide della settimana (voce 51)", () => {
  it("cambia ogni settimana e le fa girare tutte", () => {
    const start = weekStart(at(10, 28));
    expect(new Date(start).getDay()).toBe(1);
    expect(weekKey(at(11, 1))).toBe("2026-10-26");
    const seen = new Set<string>();
    let week = start;
    for (let index = 0; index < CHALLENGE_IDS.length; index += 1) {
      seen.add(challengeOfWeek(week));
      week = nextWeekStart(week);
    }
    expect(seen.size).toBe(CHALLENGE_IDS.length);
  });

  it("conta solo la settimana in corso", () => {
    const start = weekStart(at(10, 28));
    const history = [
      session("a", at(10, 26, 8)),
      session("b", at(10, 26, 20)),
      session("c", at(10, 27, 20)),
      session("d", at(10, 25, 20)),
      session("e", at(10, 28, 8), 60),
    ];
    expect(challengeProgress("sessions", history, [], start)).toBe(4);
    expect(challengeProgress("perfect", history, [], start)).toBe(1);
    expect(challengeProgress("evenings", history, [], start)).toBe(2);
    expect(challengeProgress("full", history, [], start)).toBe(3);
    expect(challengeProgress("days", history, [], start)).toBe(3);
    expect(challengeProgress("extra", history, ["2026-10-25", "2026-10-26", "2026-11-01"], start)).toBe(2);
  });
});

describe("boss dei batteri di famiglia (voce 13)", () => {
  it("si indebolisce con i secondi di tutti i fratelli e, se non sconfitto, torna più debole", () => {
    const now = at(10, 28);
    const thisWeek = weekStart(now);
    const lastWeek = weekStart(thisWeek - 1);
    const emma = [session("e1", lastWeek + 3_600_000, 600)];
    const luca = [session("l1", thisWeek + 3_600_000, 900), session("l2", thisWeek + 7_200_000, 900)];
    const weeks = familyBossWeeks([emma, luca], now);
    expect(weeks.at(-2)).toMatchObject({ hp: BOSS_BASE_HP, damage: 600, defeated: false });
    expect(weeks.at(-1)).toMatchObject({ hp: BOSS_BASE_HP - 280, damage: 1_800, defeated: true });
    // Before the family started brushing, the boss does not get weaker.
    expect(familyBossWeeks([[]], now).at(-1)?.hp).toBe(BOSS_BASE_HP);
    expect(BOSS_MIN_HP).toBe(BOSS_BASE_HP / 2);
  });
});

describe("traguardi e prima settimana (voci 12 e 18)", () => {
  it("stelle oltre l'ultima evoluzione", () => {
    expect([5, 6, 8, 9, 12, 40].map(creatureStars)).toEqual([0, 0, 0, 1, 2, 5]);
  });

  it("mese perfetto: mattina e sera ogni giorno", () => {
    const days = Array.from({ length: 30 }, (_, index) => index + 1);
    const full = days.flatMap((day) => [session(`m${day}`, at(11, day, 8)), session(`e${day}`, at(11, day, 20))]);
    expect(isPerfectMonth(full, "2026-11")).toBe(true);
    expect(isPerfectMonth(full.filter((item) => item.id !== "e14"), "2026-11")).toBe(false);
    expect(previousMonthKey(at(1, 3, 8, 2027))).toBe("2026-12");
  });

  it("una scoperta al giorno per sette giorni", () => {
    expect(discoveryOfDay("2026-10-27", at(10, 27))?.id).toBe("creature");
    expect(discoveryOfDay("2026-10-27", at(11, 2))?.id).toBe("shop");
    expect(discoveryOfDay("2026-10-27", at(11, 3))).toBeNull();
  });
});

describe("registro dei traguardi del bambino", async () => {
  const { DEFAULT_EXTRAS, normalizeExtras } = await import("@/lib/extras");
  const { motivationUpdates } = await import("@/lib/motivation");

  it("dà figurine, sfide e boss una volta sola e avvia la prima settimana solo ai nuovi", () => {
    const now = at(10, 25, 21);
    const history = Array.from({ length: 10 }, (_, index) => session(`w${index}`, at(10, 19 + Math.floor(index / 2), index % 2 ? 20 : 8), 200));
    const inputs = { history, familyHistories: [history], completedSessions: 0, now };
    const first = motivationUpdates(DEFAULT_EXTRAS, inputs);
    expect(first.discoveryStart).toBe("2026-10-25");
    expect(first.album?.season.length).toBe(3);
    expect(first.bossWins).toEqual(["2026-10-19"]);
    const next = normalizeExtras({ ...DEFAULT_EXTRAS, ...first });
    expect(motivationUpdates(next, inputs)).toEqual({});
    expect(motivationUpdates(DEFAULT_EXTRAS, { ...inputs, history: [], familyHistories: [], completedSessions: 4 })).toEqual({ discoverySkipped: true });
  });

  it("normalizza i nuovi campi", () => {
    expect(normalizeExtras({
      challengeWins: ["2026-10-19", "lunedì", "2026-10-19"],
      perfectMonths: ["2026-10", "ottobre"],
      goalProposal: { goal: "park", target: 3, proposedAt: 1 },
      discoveryStart: "2026-10-27",
    })).toMatchObject({
      challengeWins: ["2026-10-19"],
      perfectMonths: ["2026-10"],
      goalProposal: { goal: "park", target: 3, proposedAt: 1 },
      discoveryStart: "2026-10-27",
    });
    expect(normalizeExtras({ goalProposal: { goal: "candy", target: 3, proposedAt: 1 } }).goalProposal).toBeNull();
  });
});
