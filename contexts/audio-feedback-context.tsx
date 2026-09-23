import { useAudioPlayer } from "expo-audio";
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo } from "react";

import { usePreferences } from "@/contexts/preferences-context";
import { BRUSHLINGS_MUSIC_URI, REWARD_CHIME_URI } from "@/lib/audio-tones";

type AudioFeedbackContextValue = {
  playSuccess: () => void;
};

const AudioFeedbackContext = createContext<AudioFeedbackContextValue | null>(null);

export function AudioFeedbackProvider({ children }: PropsWithChildren) {
  const { preferences, ready } = usePreferences();
  const effectPlayer = useAudioPlayer(null);
  const musicPlayer = useAudioPlayer(null);

  useEffect(() => {
    musicPlayer.volume = 0.08;
    musicPlayer.loop = true;
    if (!ready || !preferences.musicEnabled) {
      musicPlayer.pause();
      return;
    }
    musicPlayer.replace(BRUSHLINGS_MUSIC_URI);
    musicPlayer.loop = true;
    musicPlayer.volume = 0.08;
    musicPlayer.play();
    return () => musicPlayer.pause();
  }, [musicPlayer, preferences.musicEnabled, ready]);

  const playSuccess = useCallback(() => {
    if (!preferences.soundsEnabled) return;
    effectPlayer.replace(REWARD_CHIME_URI);
    effectPlayer.volume = 0.32;
    effectPlayer.play();
  }, [effectPlayer, preferences.soundsEnabled]);

  const value = useMemo(() => ({ playSuccess }), [playSuccess]);
  return <AudioFeedbackContext.Provider value={value}>{children}</AudioFeedbackContext.Provider>;
}

export function useAudioFeedback(): AudioFeedbackContextValue {
  const value = useContext(AudioFeedbackContext);
  if (!value) throw new Error("useAudioFeedback deve essere usato dentro AudioFeedbackProvider");
  return value;
}