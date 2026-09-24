import { describe, expect, it } from "vitest";

import { readableAccent } from "@/constants/accessibility-colors";
import { ADVENTURE_ZONES } from "@/lib/adventure";
import { BRUSHLINGS } from "@/lib/brushlings";
import { CUSTOMIZATION_ITEMS } from "@/lib/customization";
import { COLLECTIBLE_ITEMS, EGG_DEFINITIONS } from "@/lib/game-inventory";

function relativeLuminance(hex: string): number {
  const channels = hex
    .replace("#", "")
    .match(/.{2}/g)!
    .map((value) => Number.parseInt(value, 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4),
    );

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(first: string, second: string): number {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

const PALETTES = [
  ...BRUSHLINGS.map(({ id, accent, soft }) => ({
    id: `brushling-${id}`,
    accent,
    soft,
  })),
  ...ADVENTURE_ZONES.map(({ id, accent, soft }) => ({
    id: `zone-${id}`,
    accent,
    soft,
  })),
  ...COLLECTIBLE_ITEMS.map(({ id, accent, soft }) => ({
    id: `collectible-${id}`,
    accent,
    soft,
  })),
  ...EGG_DEFINITIONS.map(({ id, accent, soft }) => ({
    id: `egg-${id}`,
    accent,
    soft,
  })),
  ...CUSTOMIZATION_ITEMS.map(({ id, accent, soft }) => ({
    id: `customization-${id}`,
    accent,
    soft,
  })),
];

describe("accessible pastel colors", () => {
  it.each(PALETTES)(
    "keeps $id readable on its pastel surface",
    ({ accent, soft }) => {
      expect(
        contrastRatio(readableAccent(accent), soft),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(PALETTES)("keeps white button text readable on $id", ({ accent }) => {
    expect(
      contrastRatio("#FFFFFF", readableAccent(accent)),
    ).toBeGreaterThanOrEqual(4.5);
  });
});
