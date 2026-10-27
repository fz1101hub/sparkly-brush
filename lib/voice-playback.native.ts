import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { File, Paths } from "expo-file-system";

import type { VoiceMessage } from "@/lib/voice-message";

let current: { player: AudioPlayer; file: File } | null = null;

export function stopVoiceMessage(): void {
  const playing = current;
  current = null;
  if (!playing) return;
  try {
    playing.player.pause();
    playing.player.remove();
  } catch {
    // Already released.
  }
  try {
    if (playing.file.exists) playing.file.delete();
  } catch {
    // The cache is cleaned by the system anyway.
  }
}

/** The audio is written to the cache only while it plays, then removed. */
export async function playVoiceMessage(message: VoiceMessage): Promise<void> {
  stopVoiceMessage();
  const file = new File(Paths.cache, `sparkly-voice-${message.recordedAt}.m4a`);
  if (file.exists) file.delete();
  file.create();
  file.write(message.audio, { encoding: "base64" });
  const player = createAudioPlayer(file.uri);
  current = { player, file };
  player.addListener("playbackStatusUpdate", (status) => {
    if (status.didJustFinish && current?.player === player) stopVoiceMessage();
  });
  player.play();
}
