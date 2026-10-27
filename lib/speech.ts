import * as Speech from "expo-speech";

/**
 * Reads a word or a question aloud with the phone's own voice, offline when the voice is
 * installed. Speech is a help, never required: any failure is silent and the text stays on screen.
 */
export function speak(text: string, language: string): void {
  try {
    Speech.stop();
    Speech.speak(text, { language, rate: 0.9 });
  } catch {
    // No voice for this language: the written word is enough.
  }
}

export function stopSpeaking(): void {
  try {
    Speech.stop();
  } catch {
    // Nothing was being read.
  }
}
