import { beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({ os: "ios", announce: vi.fn() }));

vi.mock("react-native", () => ({
  Platform: {
    get OS() {
      return native.os;
    },
  },
  AccessibilityInfo: {
    announceForAccessibility: (message: string) => native.announce(message),
  },
}));

import { announce } from "@/lib/announce";

describe("announce", () => {
  beforeEach(() => {
    native.announce.mockReset();
    native.os = "ios";
  });

  it("su iOS e Android passa il messaggio a VoiceOver/TalkBack e ignora i messaggi vuoti", () => {
    announce("Zona in alto a destra");
    announce("");
    expect(native.announce).toHaveBeenCalledTimes(1);
    expect(native.announce).toHaveBeenCalledWith("Zona in alto a destra");
  });

  it("sul web scrive in una regione live educata, una sola volta nel documento", () => {
    native.os = "web";
    const appended: { textContent: string; attributes: Record<string, string>; style: Record<string, string> }[] = [];
    const fakeDocument = {
      createElement: () => {
        const element = {
          textContent: "",
          attributes: {} as Record<string, string>,
          style: {} as Record<string, string>,
          setAttribute(name: string, value: string) {
            this.attributes[name] = value;
          },
        };
        return element;
      },
      body: { appendChild: (element: (typeof appended)[number]) => appended.push(element) },
    };
    vi.stubGlobal("document", fakeDocument);
    try {
      announce("Sessione completata");
      announce("Zona in basso a sinistra");
      expect(appended).toHaveLength(1);
      expect(appended[0].attributes).toMatchObject({ role: "status", "aria-live": "polite" });
      expect(appended[0].textContent).toBe("Zona in basso a sinistra");
      expect(native.announce).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
