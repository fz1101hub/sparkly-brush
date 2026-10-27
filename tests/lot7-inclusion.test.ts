import { describe, expect, it } from "vitest";

import { avatarEmoji, normalizeAvatar } from "@/lib/avatar";
import { highContrastColors } from "@/lib/contrast";
import { normalizeExtras } from "@/lib/extras";

describe("inclusione (lotto 7)", () => {
  it("avatar con faccia, carnagione e cappello; valori sconosciuti tornano predefiniti", () => {
    expect(avatarEmoji({ face: "girl", tone: "medium", hat: "crown" })).toBe("👑👧🏽");
    expect(avatarEmoji({ face: "child", tone: "none", hat: "none" })).toBe("🧒");
    expect(normalizeAvatar({ face: "alien", tone: "blue", hat: "cap" })).toEqual({ face: "child", tone: "none", hat: "cap" });
  });

  it("alto contrasto: nero su bianco o bianco su nero", () => {
    const base = { foreground: "#334", muted: "#889", background: "#F7F9FF", surface: "#FFF", border: "#DDE", primary: "#2457D6", primaryText: "#FFF", primarySoft: "#E7F1FF" };
    expect(highContrastColors(base, "light")).toMatchObject({ foreground: "#000000", muted: "#000000", background: "#FFFFFF", border: "#000000" });
    expect(highContrastColors(base, "dark")).toMatchObject({ foreground: "#FFFFFF", background: "#000000", primary: "#FFE14D", primaryText: "#000000" });
  });

  it("le modalità restano spente finché il genitore non le accende", () => {
    expect(normalizeExtras({})).toMatchObject({ calmMode: false, preReader: false, legibleFont: false, highContrast: false });
    expect(normalizeExtras({ calmMode: true, highContrast: "yes" })).toMatchObject({ calmMode: true, highContrast: false });
  });
});
