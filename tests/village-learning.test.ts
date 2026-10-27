import { beforeEach, describe, expect, it, vi } from "vitest";

const data = vi.hoisted(() => new Map<string, string>());
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => data.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      data.set(key, value);
    }),
  },
}));

import {
  BRACES_STEPS,
  BRACES_TYPES,
  careStreak,
  DEFAULT_BRACES,
  getBracesStorage,
  hadCleanWeek,
  normalizeBraces,
  withCareDay,
} from "@/lib/braces";
import type { BrushSession } from "@/lib/brush-types";
import { localDateKey } from "@/lib/day-progress";
import { pickQuizRound, quizOptions } from "@/lib/learning/quiz";
import { QUIZ_QUESTIONS } from "@/lib/learning/quiz-content";
import {
  defaultLearningLanguage,
  findToothRound,
  memoryDeck,
  TOOTH_NAMES,
  TOOTH_TYPES,
  teethFor,
  typesIn,
} from "@/lib/learning/tooth-names";
import { SUPPORTED_LOCALES } from "@/lib/locale-types";
import {
  DAILY_ENERGY_MAX,
  DEFAULT_VILLAGE,
  earnedEnergy,
  energyStatus,
  getVillageStorage,
  normalizeVillage,
  spendEnergy,
  withCard,
} from "@/lib/village";

beforeEach(() => data.clear());

/** A repeatable sequence instead of Math.random. */
function seeded(seed = 1) {
  // Spread small seeds: their first values would otherwise all be close to zero.
  let value = (seed * 104_729) % 2_147_483_647;
  return () => {
    value = (value * 16_807) % 2_147_483_647;
    return (value - 1) / 2_147_483_646;
  };
}

function session(startedAt: number, completed = true, extra: Partial<BrushSession> = {}): BrushSession {
  return {
    id: `s-${startedAt}`,
    startedAt,
    durationSeconds: completed ? 120 : 40,
    targetSeconds: 120,
    completed,
    source: "manual",
    rewardPolicy: "completed-only",
    ...extra,
  };
}

describe("contenuti del quiz", () => {
  it("ha 30 domande, cinque per categoria, complete in tutte le lingue", () => {
    expect(QUIZ_QUESTIONS).toHaveLength(30);
    expect(new Set(QUIZ_QUESTIONS.map((question) => question.id)).size).toBe(30);
    const perCategory = new Map<string, number>();
    for (const question of QUIZ_QUESTIONS) {
      perCategory.set(question.category, (perCategory.get(question.category) ?? 0) + 1);
      expect(question.source.length).toBeGreaterThan(10);
      for (const locale of SUPPORTED_LOCALES) {
        const text = question.text[locale];
        expect(text.question.trim().length, `${question.id}/${locale}`).toBeGreaterThan(5);
        expect(text.fact.trim().length, `${question.id}/${locale}`).toBeGreaterThan(10);
        if (question.kind === "choice") {
          const answers = (text as { answers: readonly string[] }).answers;
          expect(answers).toHaveLength(3);
          expect(new Set(answers).size, `${question.id}/${locale}`).toBe(3);
        }
      }
    }
    expect([...perCategory.values()]).toEqual([5, 5, 5, 5, 5, 5]);
    expect(QUIZ_QUESTIONS.some((question) => question.level === 1)).toBe(true);
    expect(QUIZ_QUESTIONS.some((question) => question.level === 2)).toBe(true);
  });
});

describe("partita del quiz", () => {
  it("ai più piccoli propone solo domande di livello 1, prima quelle non ancora vinte", () => {
    const easy = QUIZ_QUESTIONS.filter((question) => question.level === 1);
    const collected = new Set(easy.slice(0, easy.length - 2).map((question) => question.id));
    const round = pickQuizRound(collected, 1, seeded(3));
    expect(round).toHaveLength(3);
    expect(round.every((question) => question.level === 1)).toBe(true);
    // The two cards still missing come first.
    expect(round.slice(0, 2).every((question) => !collected.has(question.id))).toBe(true);
  });

  it("resta giocabile anche quando tutte le carte sono già state vinte", () => {
    const all = new Set(QUIZ_QUESTIONS.map((question) => question.id));
    expect(pickQuizRound(all, 2, seeded(5))).toHaveLength(3);
  });

  it("ha una sola risposta giusta, che non è sempre la prima", () => {
    const choice = QUIZ_QUESTIONS.find((question) => question.kind === "choice")!;
    const positions = new Set<number>();
    for (let seed = 1; seed < 40; seed += 1) {
      const options = quizOptions(choice, "de", { true: "Richtig", false: "Falsch" }, seeded(seed));
      expect(options.filter((option) => option.correct)).toHaveLength(1);
      expect(options.find((option) => option.correct)?.label).toBe(
        (choice.text.de as { answers: readonly string[] }).answers[0],
      );
      positions.add(options.findIndex((option) => option.correct));
    }
    expect(positions.size).toBeGreaterThan(1);
  });

  it("nelle domande vero/falso segue la risposta salvata", () => {
    const falseOne = QUIZ_QUESTIONS.find((question) => question.kind === "truefalse" && !question.answer)!;
    const options = quizOptions(falseOne, "it", { true: "Vero", false: "Falso" });
    expect(options.map((option) => [option.label, option.correct])).toEqual([
      ["Vero", false],
      ["Falso", true],
    ]);
  });
});

describe("nomi dei denti", () => {
  it("ha 20 denti da latte e 32 definitivi con i tipi giusti", () => {
    expect(teethFor("primary")).toHaveLength(20);
    expect(teethFor("permanent")).toHaveLength(32);
    expect(typesIn("primary")).toEqual(["centralIncisor", "lateralIncisor", "canine", "molar"]);
    expect(teethFor("permanent").filter((tooth) => tooth.type === "wisdom")).toHaveLength(4);
    expect(teethFor("permanent").filter((tooth) => tooth.type === "premolar")).toHaveLength(8);
  });

  it("dà un nome diverso a ogni tipo in ognuna delle cinque lingue", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const names = TOOTH_TYPES.map((type) => TOOTH_NAMES[locale][type]);
      expect(names.every((name) => name.trim().length > 2)).toBe(true);
      expect(new Set(names).size).toBe(TOOTH_TYPES.length);
    }
  });

  it("in «Trova il dente» chiede solo denti presenti e mai due volte di fila", () => {
    const round = findToothRound("primary", seeded(7), 20);
    expect(round.every((type) => typesIn("primary").includes(type))).toBe(true);
    expect(round.every((type, index) => index === 0 || type !== round[index - 1])).toBe(true);
  });

  it("nel memory abbina ogni tipo nelle due lingue", () => {
    const deck = memoryDeck("it", "en", seeded(11));
    expect(deck).toHaveLength(8);
    for (const type of new Set(deck.map((card) => card.type))) {
      expect(deck.filter((card) => card.type === type).map((card) => card.locale).sort()).toEqual(["en", "it"]);
    }
  });

  it("propone una lingua diversa da quella dell'app", () => {
    expect(defaultLearningLanguage("it")).toBe("en");
    expect(defaultLearningLanguage("en")).toBe("it");
  });
});

describe("energia del villaggio", () => {
  const now = new Date(2026, 9, 27, 19).getTime();
  const morning = new Date(2026, 9, 27, 8).getTime();
  const yesterday = new Date(2026, 9, 26, 20).getTime();

  it("si guadagna solo con le sessioni complete di oggi, fino a quattro", () => {
    expect(earnedEnergy([session(morning)], now)).toBe(2);
    expect(earnedEnergy([session(morning), session(now - 60_000), session(now - 30_000)], now)).toBe(DAILY_ENERGY_MAX);
    expect(earnedEnergy([session(yesterday), session(morning, false)], now)).toBe(0);
    expect(earnedEnergy([session(morning, true, { timeConfidence: "approximate" })], now)).toBe(0);
  });

  it("si spende un'attività alla volta e ricomincia il giorno dopo", () => {
    const history = [session(morning)];
    const once = spendEnergy(DEFAULT_VILLAGE, history, now)!;
    const twice = spendEnergy(once, history, now)!;
    expect(energyStatus(twice, history, now).available).toBe(0);
    expect(spendEnergy(twice, history, now)).toBeNull();
    const tomorrow = new Date(2026, 9, 28, 8).getTime();
    expect(energyStatus(twice, [...history, session(tomorrow)], tomorrow)).toMatchObject({ spent: 0, available: 2 });
  });

  it("senza limite, deciso dal genitore, le attività restano sempre aperte", () => {
    const free = { ...DEFAULT_VILLAGE, energyLimit: false };
    expect(energyStatus(free, [], now)).toMatchObject({ limited: false, available: DAILY_ENERGY_MAX });
    expect(spendEnergy(free, [], now)).not.toBeNull();
  });

  it("conserva le carte una sola volta e scarta i dati non validi", () => {
    expect(withCard(withCard(DEFAULT_VILLAGE, "food-cheese"), "food-cheese").cards).toEqual(["food-cheese"]);
    expect(normalizeVillage({ spent: -3, quizLevel: 7, learningLanguage: "xx", cards: [1, "ok"], day: "2026" })).toMatchObject({
      spent: 0,
      quizLevel: 1,
      learningLanguage: null,
      cards: ["ok"],
      day: "",
    });
  });

  it("tiene separati i villaggi dei bambini", async () => {
    await getVillageStorage("primary").save(withCard(DEFAULT_VILLAGE, "food-cheese"));
    expect((await getVillageStorage("child-b").load()).cards).toEqual([]);
    expect((await getVillageStorage("primary").load()).cards).toEqual(["food-cheese"]);
  });
});

describe("modalità apparecchio", () => {
  it("ha passaggi di cura per ogni tipo, con almeno uno a tempo", () => {
    for (const type of BRACES_TYPES) {
      expect(BRACES_STEPS[type].length).toBeGreaterThan(1);
      expect(BRACES_STEPS[type].some((step) => step.timed)).toBe(true);
    }
  });

  it("scarta valori non validi e tiene i giorni in ordine, una volta sola", () => {
    expect(normalizeBraces({ type: "magic", careSeconds: 45, alignerHours: 30, elasticColor: "gold" })).toMatchObject({
      type: "fixed",
      careSeconds: 60,
      alignerHours: 0,
      elasticColor: "blue",
    });
    const day = new Date(2026, 9, 27, 20).getTime();
    expect(withCareDay(withCareDay(DEFAULT_BRACES, day), day).careDays).toEqual([localDateKey(day)]);
  });

  it("conta la serie fino a ieri finché oggi la cura non è fatta", () => {
    const today = new Date(2026, 9, 27, 7).getTime();
    const days = [24, 25, 26].map((date) => localDateKey(new Date(2026, 9, date, 20).getTime()));
    expect(careStreak(days, today)).toBe(3);
    expect(careStreak([...days, localDateKey(today)], today)).toBe(4);
    expect(careStreak([localDateKey(new Date(2026, 9, 20).getTime())], today)).toBe(0);
  });

  it("riconosce la settimana con l'apparecchio pulito", () => {
    const week = [1, 2, 3, 4, 5, 6, 7].map((date) => localDateKey(new Date(2026, 9, date, 20).getTime()));
    expect(hadCleanWeek(week)).toBe(true);
    expect(hadCleanWeek(week.filter((_, index) => index !== 3))).toBe(false);
  });

  it("salva l'apparecchio solo nel profilo del bambino", async () => {
    await getBracesStorage("child-b").save({ ...DEFAULT_BRACES, enabled: true, type: "aligners" });
    expect((await getBracesStorage("primary").load()).enabled).toBe(false);
    expect((await getBracesStorage("child-b").load())).toMatchObject({ enabled: true, type: "aligners" });
  });
});
