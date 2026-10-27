import { describe, expect, it } from "vitest";

import { EPISODES, nextEpisode, SEASON_TITLE } from "@/lib/learning/serial-story";
import { stainsLeft, storyPartCue, voiceCue } from "@/lib/session-companions";
import { sessionSongUri, tuneFor } from "@/lib/session-song";

describe("la creatura si lava i denti con te (voce 6)", () => {
  it("le macchie si sciolgono zona per zona e a metà restano quelle dopo", () => {
    expect(stainsLeft(0, 120)).toEqual([3, 3, 3, 3]);
    expect(stainsLeft(15, 120)).toEqual([2, 3, 3, 3]);
    expect(stainsLeft(30, 120)).toEqual([0, 3, 3, 3]);
    expect(stainsLeft(60, 120)).toEqual([0, 0, 3, 3]);
    expect(stainsLeft(120, 120)).toEqual([0, 0, 0, 0]);
    expect(stainsLeft(45, 60)).toEqual([0, 0, 0, 3]);
  });
});

describe("voce della creatura e storia a puntate (voci 7 e 8)", () => {
  it("parla all'inizio, alla seconda zona, a metà e all'ultima zona", () => {
    expect(voiceCue(0, 1, 120)).toBe("voice.start");
    expect(voiceCue(29, 30, 120)).toBe("voice.zone1");
    expect(voiceCue(59, 61, 120)).toBe("voice.half");
    expect(voiceCue(89, 90, 120)).toBe("voice.last");
    expect(voiceCue(40, 41, 120)).toBeNull();
    expect(voiceCue(41, 41, 120)).toBeNull();
  });

  it("una parte di storia per zona", () => {
    expect(storyPartCue(0, 1, 120)).toBe(0);
    expect(storyPartCue(29, 30, 120)).toBe(1);
    expect(storyPartCue(44, 45, 60)).toBe(3);
    expect(storyPartCue(31, 32, 120)).toBeNull();
  });

  it("14 episodi completi in cinque lingue; quello saltato torna", () => {
    expect(EPISODES).toHaveLength(14);
    for (const episode of EPISODES) {
      for (const locale of ["it", "en", "de", "fr", "es"] as const) {
        expect(episode[locale].title.length).toBeGreaterThan(3);
        expect(episode[locale].parts.every((part) => part.length > 10)).toBe(true);
      }
    }
    expect(Object.keys(SEASON_TITLE)).toHaveLength(5);
    expect(nextEpisode([])).toBe(0);
    expect(nextEpisode([0, 1, 3])).toBe(2);
    expect(nextEpisode(EPISODES.map((_, index) => index))).toBe(0);
  });
});

describe("canzone della spazzolata (voce 9)", () => {
  it("una melodia diversa per tema, come WAV valido", () => {
    const uri = sessionSongUri("arcade");
    expect(uri.startsWith("data:audio/wav;base64,UklGR")).toBe(true);
    expect(tuneFor("arcade")).not.toEqual(tuneFor("cosmos"));
    expect(tuneFor("sconosciuto")).toEqual(tuneFor("default"));
  });
});

describe("impostazioni del rito della giornata (voci 25 e 28)", async () => {
  const { normalizeExtras } = await import("@/lib/extras");
  const { bedtimeAllowed, onHoliday } = await import("@/lib/bedtime");

  it("collutorio solo dai 7 anni e vacanza fino al giorno scelto incluso", () => {
    expect(bedtimeAllowed("mouthwash", "3to6")).toBe(false);
    expect(bedtimeAllowed("mouthwash", "over6")).toBe(true);
    expect(bedtimeAllowed("floss", null)).toBe(true);
    expect(onHoliday("2026-11-03", "2026-11-03")).toBe(true);
    expect(onHoliday("2026-11-03", "2026-11-04")).toBe(false);
    expect(onHoliday(null, "2026-11-04")).toBe(false);
  });

  it("normalizza i nuovi campi", () => {
    expect(normalizeExtras({
      serialHeard: [0, 3, 3, 99, -1, 1.5],
      bedtimeItems: ["floss", "candy", "floss"],
      bedtimeDone: { day: "2026-10-27", items: ["pajamas", "x"] },
      vacationUntil: "domani",
      creatureVoice: true,
    })).toMatchObject({
      serialHeard: [0, 3],
      bedtimeItems: ["floss"],
      bedtimeDone: { day: "2026-10-27", items: ["pajamas"] },
      vacationUntil: null,
      creatureVoice: true,
      serialStory: false,
    });
  });
});
