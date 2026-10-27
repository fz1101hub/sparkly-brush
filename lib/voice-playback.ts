import { createAudioPlayer, type AudioPlayer } from "expo-audio";

import { voiceDataUri, type VoiceMessage } from "@/lib/voice-message";

/** On the web a message (from a backup) can be heard; recording needs the app on the phone. */
let current: AudioPlayer | null = null;

export function stopVoiceMessage(): void {
  const player = current;
  current = null;
  if (!player) return;
  try {
    player.pause();
    player.remove();
  } catch {
    // Already released.
  }
}

export async function playVoiceMessage(message: VoiceMessage): Promise<void> {
  stopVoiceMessage();
  const player = createAudioPlayer(voiceDataUri(message));
  current = player;
  player.addListener("playbackStatusUpdate", (status) => {
    if (status.didJustFinish && current === player) stopVoiceMessage();
  });
  player.play();
}
