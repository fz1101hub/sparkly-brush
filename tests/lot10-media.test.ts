import { describe, expect, it } from "vitest";

import { createBackupManifest, parseBackupManifest } from "@/lib/backup";
import { DEFAULT_CUSTOMIZATION_STATE } from "@/lib/customization";
import { DEFAULT_EXTRAS, normalizeExtras } from "@/lib/extras";
import { createLifetimeProgress } from "@/lib/lifetime-progress";
import { DEFAULT_APP_PREFERENCES } from "@/lib/preferences";
import { MAX_VOICE_BASE64, normalizeVoiceMessage, voiceDataUri, voiceMessageWaiting, type VoiceMessage } from "@/lib/voice-message";

const message: VoiceMessage = { audio: "AAAAGGZ0eXBNNEEg", mimeType: "audio/mp4", seconds: 7, recordedAt: 1_793_000_000_000, repeat: false, heardAt: null };

describe("messaggio vocale e specchio (lotto 10)", () => {
  it("accetta solo audio base64 di un tipo noto e di misura ragionevole", () => {
    expect(normalizeVoiceMessage(message)).toEqual(message);
    expect(normalizeVoiceMessage({ ...message, audio: "not base64!" })).toBeNull();
    expect(normalizeVoiceMessage({ ...message, audio: "A".repeat(MAX_VOICE_BASE64 + 4) })).toBeNull();
    expect(normalizeVoiceMessage({ ...message, mimeType: "text/html" })).toBeNull();
    expect(normalizeVoiceMessage({ ...message, recordedAt: "ieri" })).toBeNull();
    expect(normalizeVoiceMessage({ ...message, seconds: 95 })?.seconds).toBe(20);
    expect(normalizeVoiceMessage(null)).toBeNull();
  });

  it("propone il messaggio finché non è ascoltato, o sempre se il genitore lo chiede", () => {
    expect(voiceMessageWaiting(null)).toBe(false);
    expect(voiceMessageWaiting(message)).toBe(true);
    expect(voiceMessageWaiting({ ...message, heardAt: 1 })).toBe(false);
    expect(voiceMessageWaiting({ ...message, heardAt: 1, repeat: true })).toBe(true);
    expect(voiceDataUri(message)).toBe("data:audio/mp4;base64,AAAAGGZ0eXBNNEEg");
  });

  it("messaggio e specchio sono negli extra del bambino e quindi nel backup completo", () => {
    expect(DEFAULT_EXTRAS.voiceMessage).toBeNull();
    expect(DEFAULT_EXTRAS.mirror).toBe(false);
    const extras = normalizeExtras({ ...DEFAULT_EXTRAS, voiceMessage: { ...message, heardAt: 5 }, mirror: true });
    expect(extras.voiceMessage?.heardAt).toBe(5);
    expect(extras.mirror).toBe(true);
    const manifest = createBackupManifest({ selectedId: "bloopi", hasChosenStarter: true }, DEFAULT_CUSTOMIZATION_STATE, createLifetimeProgress([]), 1, {
      preferences: DEFAULT_APP_PREFERENCES,
      parentRewards: [],
      extras,
    });
    const restored = parseBackupManifest(JSON.stringify(manifest));
    expect(restored.extras?.voiceMessage).toEqual({ ...message, heardAt: 5 });
    expect(restored.extras?.mirror).toBe(true);
  });
});
