import { useAudioPlayer, type AudioPlayer } from "expo-audio";
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo } from "react";

import { usePreferences } from "@/contexts/preferences-context";
import { BRUSHLINGS_MUSIC_URI, REWARD_CHIME_URI } from "@/lib/audio-tones";

type AudioFeedbackContextValue = {
  playSuccess: () => void;
};

const AudioFeedbackContext = createContext<AudioFeedbackContextValue | null>(null);

function playBackgroundMusic(player: AudioPlayer): void {
  player.replace(BRUSHLINGS_MUSIC_URI);
  player.loop = true;
  player.volume = 0.08;
  player.play();
}

function playRewardChime(player: AudioPlayer): void {
  player.replace(REWARD_CHIME_URI);
  player.volume = 0.32;
  player.play();
}

export function AudioFeedbackProvider({ children }: PropsWithChildren) {
  const { preferences, ready } = usePreferences();
  const effectPlayer = useAudioPlayer(null);
  const musicPlayer = useAudioPlayer(null);

  useEffect(() => {
    if (!ready || (!preferences.musicEnabled || preferences.care?.calmMode)) {
      musicPlayer.pause();
      return;
    }
    playBackgroundMusic(musicPlayer);
    return () => musicPlayer.pause();
  }, [musicPlayer, preferences.musicEnabled, preferences.care?.calmMode, ready]);

  const playSuccess = useCallback(() => {
    if (!preferences.soundsEnabled || preferences.care?.calmMode) return;
    playRewardChime(effectPlayer);
  }, [effectPlayer, preferences.soundsEnabled, preferences.care?.calmMode]);

  const value = useMemo(() => ({ playSuccess }), [playSuccess]);
  return <AudioFeedbackContext.Provider value={value}>{children}</AudioFeedbackContext.Provider>;
}

export function useAudioFeedback(): AudioFeedbackContextValue {
  const value = useContext(AudioFeedbackContext);
  if (!value) throw new Error("useAudioFeedback deve essere usato dentro AudioFeedbackProvider");
  return value;
}
