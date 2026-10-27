import type { BrushSession } from "@/lib/brush-types";
import { seasonAt, SEASON_IDS, type SeasonId } from "@/lib/seasons";

/**
 * Sticker album (voce 14): a sticker for every completed session, filling six pages of six;
 * a rare golden one for brushing on Sunday, three special ones per season (voce 15), the friends
 * hatched from the golden eggs (voce 12) and one for every family boss defeated (voce 13).
 * Emoji only up to Unicode 10, so older Android phones show them all.
 */
export const COMMON_PAGES = ["sea", "garden", "space", "food", "smile", "village"] as const;
export type CommonPage = (typeof COMMON_PAGES)[number];
export type AlbumPage = CommonPage | "rare" | "seasons" | "friends" | "boss";
export type StickerKind = "common" | "rare" | "season" | "friend" | "boss";
export type Sticker = { id: string; emoji: string; page: AlbumPage; kind: StickerKind; season?: SeasonId };

const COMMON: Record<CommonPage, [string, string][]> = {
  sea: [["whale", "🐳"], ["octopus", "🐙"], ["fish", "🐠"], ["crab", "🦀"], ["turtle", "🐢"], ["shark", "🦈"]],
  garden: [["sunflower", "🌻"], ["bee", "🐝"], ["ladybug", "🐞"], ["butterfly", "🦋"], ["mushroom", "🍄"], ["tulip", "🌷"]],
  space: [["rocket", "🚀"], ["moon", "🌙"], ["star", "⭐"], ["satellite", "🛰️"], ["alien", "👽"], ["earth", "🌍"]],
  food: [["apple", "🍎"], ["carrot", "🥕"], ["cheese", "🧀"], ["broccoli", "🥦"], ["strawberry", "🍓"], ["milk", "🥛"]],
  smile: [["tooth", "🦷"], ["grin", "😁"], ["drop", "💧"], ["sparkles", "✨"], ["trophy", "🏆"], ["medal", "🎖️"]],
  village: [["house", "🏠"], ["school", "🏫"], ["books", "📚"], ["circus", "🎪"], ["mouse", "🐭"], ["tree", "🌳"]],
};
const RARE: [string, string][] = [["unicorn", "🦄"], ["dragon", "🐉"], ["rainbow", "🌈"], ["crown", "👑"], ["gem", "💎"], ["owl", "🦉"]];
const SEASONAL: Record<SeasonId, [string, string][]> = {
  halloween: [["pumpkin", "🎃"], ["ghost", "👻"], ["bat", "🦇"]],
  christmas: [["fir", "🎄"], ["snowman", "⛄"], ["gift", "🎁"]],
  summer: [["sun", "☀️"], ["watermelon", "🍉"], ["beach", "🏖️"]],
};

/** Golden eggs (voce 12): found at 20, 40 and 60 completed sessions, hatched five later. */
export const GOLDEN_EGGS = [
  { id: "golden-chick", emoji: "🐣", foundAt: 20, hatchAt: 25 },
  { id: "golden-dragon", emoji: "🐲", foundAt: 40, hatchAt: 45 },
  { id: "golden-eagle", emoji: "🦅", foundAt: 60, hatchAt: 65 },
] as const;

export const BOSS_STICKER: Sticker = { id: "boss-germ", emoji: "🦠", page: "boss", kind: "boss" };

/** Common stickers in the order they arrive: one per page in turn, so every page grows. */
export const COMMON_ORDER: Sticker[] = Array.from({ length: 6 }, (_, index) =>
  COMMON_PAGES.map((page) => ({ id: `${page}-${COMMON[page][index][0]}`, emoji: COMMON[page][index][1], page, kind: "common" as const })),
).flat();
export const RARE_STICKERS: Sticker[] = RARE.map(([id, emoji]) => ({ id: `rare-${id}`, emoji, page: "rare", kind: "rare" }));
export const SEASON_STICKERS: Sticker[] = SEASON_IDS.flatMap((season) =>
  SEASONAL[season].map(([id, emoji]) => ({ id: `season-${id}`, emoji, page: "seasons" as const, kind: "season" as const, season })),
);
export const FRIEND_STICKERS: Sticker[] = GOLDEN_EGGS.map(({ id, emoji }) => ({ id, emoji, page: "friends", kind: "friend" }));
export const ALL_STICKERS: Sticker[] = [...COMMON_ORDER, ...RARE_STICKERS, ...SEASON_STICKERS, ...FRIEND_STICKERS, BOSS_STICKER];

/** Stickers that depend on the day of a session, kept with the child's extras (and in the backup). */
export type AlbumAwards = { rare: string[]; season: string[]; countedIds: string[] };
export const EMPTY_AWARDS: AlbumAwards = { rare: [], season: [], countedIds: [] };
const MAX_COUNTED_IDS = 300;

const STICKER_IDS = new Set(ALL_STICKERS.map((sticker) => sticker.id));

export function normalizeAwards(raw: unknown): AlbumAwards {
  const value = (raw && typeof raw === "object" ? raw : {}) as Partial<AlbumAwards>;
  const ids = (list: unknown, kind: StickerKind) => Array.isArray(list)
    ? [...new Set(list.filter((id): id is string => typeof id === "string" && STICKER_IDS.has(id)
      && ALL_STICKERS.find((sticker) => sticker.id === id)?.kind === kind))]
    : [];
  return {
    rare: ids(value.rare, "rare"),
    season: ids(value.season, "season"),
    countedIds: Array.isArray(value.countedIds)
      ? value.countedIds.filter((id): id is string => typeof id === "string").slice(-MAX_COUNTED_IDS)
      : [],
  };
}

/**
 * Adds the Sunday and seasonal stickers earned by completed sessions not counted yet. Each session
 * counts once, so a sync that delivers it again gives nothing more. Returns null when unchanged.
 */
export function awardStickers(awards: AlbumAwards, sessions: readonly BrushSession[]): AlbumAwards | null {
  const counted = new Set(awards.countedIds);
  const fresh = sessions
    .filter((session) => session.completed && !counted.has(session.id))
    .sort((first, second) => first.startedAt - second.startedAt);
  if (!fresh.length) return null;
  const rare = [...awards.rare];
  const season = [...awards.season];
  for (const session of fresh) {
    const current = seasonAt(session.startedAt);
    if (current) {
      const next = SEASON_STICKERS.find((sticker) => sticker.season === current && !season.includes(sticker.id));
      if (next) season.push(next.id);
    }
    if (new Date(session.startedAt).getDay() === 0) {
      const next = RARE_STICKERS.find((sticker) => !rare.includes(sticker.id));
      if (next) rare.push(next.id);
    }
  }
  return {
    rare,
    season,
    countedIds: [...awards.countedIds, ...fresh.map((session) => session.id)].slice(-MAX_COUNTED_IDS),
  };
}

export type AlbumView = {
  owned: Set<string>;
  /** Completed sessions beyond the six full pages: the doubles to swap. */
  doubles: number;
  bossWins: number;
  total: number;
  ownedCount: number;
  /** The golden egg being kept warm, with the sessions left before it hatches. */
  nextEgg: { id: string; sessionsLeft: number; found: boolean } | null;
};

export function albumView(completedSessions: number, awards: AlbumAwards, bossWins: number): AlbumView {
  const owned = new Set<string>();
  COMMON_ORDER.slice(0, Math.max(0, completedSessions)).forEach((sticker) => owned.add(sticker.id));
  awards.rare.forEach((id) => owned.add(id));
  awards.season.forEach((id) => owned.add(id));
  for (const egg of GOLDEN_EGGS) if (completedSessions >= egg.hatchAt) owned.add(egg.id);
  if (bossWins > 0) owned.add(BOSS_STICKER.id);
  const egg = GOLDEN_EGGS.find((item) => completedSessions < item.hatchAt);
  return {
    owned,
    doubles: Math.max(0, completedSessions - COMMON_ORDER.length),
    bossWins,
    total: ALL_STICKERS.length,
    ownedCount: owned.size,
    nextEgg: egg ? { id: egg.id, sessionsLeft: egg.hatchAt - completedSessions, found: completedSessions >= egg.foundAt } : null,
  };
}
