import { fromByteArray } from "base64-js";

import type { AppThemeId } from "@/lib/app-themes";

/**
 * «La canzone che finisce a 2:00» (voce 9): a short tune for each theme, made by the app itself
 * (no licensed music), played in a loop while the child brushes and stopped exactly when the
 * session ends, followed by the reward chime. Notes are frequencies in Hz, one beat each.
 */
const C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23, G4 = 392, A4 = 440, B4 = 493.88;
const C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 783.99;

const TUNES: Record<string, { notes: number[]; beat: number }> = {
  underwater: { notes: [D4, F4, A4, D5, C5, A4, G4, A4, F4, E4, D4, A4], beat: 0.36 },
  default: { notes: [C5, E5, G5, E5, D5, F4 * 2, G5, E5, C5, D5, E5, C5], beat: 0.3 },
  bubbles: { notes: [E4, G4, C5, G4, A4, C5, E5, C5, D5, B4, G4, B4], beat: 0.28 },
  adventure: { notes: [G4, G4, D5, D5, E5, E5, D5, C5, C5, B4, A4, G4], beat: 0.26 },
  cosmos: { notes: [C4, G4, C5, E5, D5, G4, B4, D5, C5, G4, E4, G4], beat: 0.34 },
  arcade: { notes: [C5, C5, G4, A4, B4, C5, E5, D5, C5, B4, A4, G4], beat: 0.22 },
  garden: { notes: [F4, A4, C5, A4, G4, B4, D5, B4, A4, C5, F4 * 2, C5], beat: 0.3 },
};

export function tuneFor(theme: AppThemeId | string): { notes: number[]; beat: number } {
  return TUNES[theme] ?? TUNES.default;
}

/** One loop of the tune as an 8-bit WAV data URI: small, so it is built when the session starts. */
export function sessionSongUri(theme: AppThemeId | string, sampleRate = 8000): string {
  const { notes, beat } = tuneFor(theme);
  const perNote = Math.floor(sampleRate * beat);
  const length = perNote * notes.length;
  const bytes = new Uint8Array(44 + length);
  const view = new DataView(bytes.buffer);
  const ascii = (offset: number, text: string) => [...text].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
  ascii(0, "RIFF");
  view.setUint32(4, 36 + length, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  ascii(36, "data");
  view.setUint32(40, length, true);
  for (let index = 0; index < length; index += 1) {
    const note = Math.floor(index / perNote);
    const local = (index % perNote) / sampleRate;
    const envelope = Math.min(1, local / 0.02) * Math.min(1, (beat - local) / 0.06);
    const wave = Math.sin(2 * Math.PI * notes[note] * local) * 0.7 + Math.sin(4 * Math.PI * notes[note] * local) * 0.2;
    bytes[44 + index] = Math.round(128 + wave * envelope * 46);
  }
  return `data:audio/wav;base64,${fromByteArray(bytes)}`;
}
