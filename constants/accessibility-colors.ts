export const LIGHT_CARD_FOREGROUND = "#17213C";
export const LIGHT_CARD_MUTED = "#4B5563";
export const GOLD_TEXT = "#6F5100";

const READABLE_ACCENTS: Record<string, string> = {
  "#2457D6": "#173F9F",
  "#2E9B67": "#17633F",
  "#55B987": "#17633F",
  "#E76A2C": "#9A3F0D",
  "#B98A00": GOLD_TEXT,
  "#D7A900": GOLD_TEXT,
  "#E8BE38": GOLD_TEXT,
  "#7357C7": "#51369C",
  "#9C86E8": "#51369C",
};

export function readableAccent(accent: string): string {
  return READABLE_ACCENTS[accent.toUpperCase()] ?? LIGHT_CARD_FOREGROUND;
}
