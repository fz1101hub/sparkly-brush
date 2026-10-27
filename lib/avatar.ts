import type { BrushlingId } from "@/lib/brushlings";

/**
 * The child's avatar (voce 68), drawn with emoji (up to Unicode 10, so older phones show it):
 * a face, a skin tone and a hat, next to the creature.
 */
export const AVATAR_FACES = ["child", "girl", "boy"] as const;
export type AvatarFace = (typeof AVATAR_FACES)[number];
export const AVATAR_TONES = ["none", "light", "mediumLight", "medium", "mediumDark", "dark"] as const;
export type AvatarTone = (typeof AVATAR_TONES)[number];
export const AVATAR_HATS = ["none", "crown", "cap", "bow", "top"] as const;
export type AvatarHat = (typeof AVATAR_HATS)[number];
export type Avatar = { face: AvatarFace; tone: AvatarTone; hat: AvatarHat };
export const DEFAULT_AVATAR: Avatar = { face: "child", tone: "none", hat: "none" };

const FACE: Record<AvatarFace, string> = { child: "🧒", girl: "👧", boy: "👦" };
const TONE: Record<AvatarTone, string> = { none: "", light: "🏻", mediumLight: "🏼", medium: "🏽", mediumDark: "🏾", dark: "🏿" };
const HAT: Record<AvatarHat, string> = { none: "", crown: "👑", cap: "🧢", bow: "🎀", top: "🎩" };

export function avatarEmoji(avatar: Avatar): string {
  return `${HAT[avatar.hat]}${FACE[avatar.face]}${TONE[avatar.tone]}`;
}

export function normalizeAvatar(raw: unknown): Avatar {
  const value = (raw && typeof raw === "object" ? raw : {}) as Partial<Avatar>;
  return {
    face: AVATAR_FACES.includes(value.face as AvatarFace) ? (value.face as AvatarFace) : "child",
    tone: AVATAR_TONES.includes(value.tone as AvatarTone) ? (value.tone as AvatarTone) : "none",
    hat: AVATAR_HATS.includes(value.hat as AvatarHat) ? (value.hat as AvatarHat) : "none",
  };
}

/** One emoji for each creature, for printed sheets and the avatar next to it. */
export const CREATURE_EMOJI: Record<BrushlingId, string> = {
  bloopi: "💧",
  spriggo: "🌱",
  flarello: "🔥",
  voltuff: "⚡",
  moonbit: "🌙",
};
