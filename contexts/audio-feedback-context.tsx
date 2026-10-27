import { useAudioPlayer, type AudioPlayer } from "expo-audio";
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo } from "react";

import { useBrush } from "@/contexts/brush-context";
import { useOptionalExtras } from "@/contexts/extras-context";
import { usePreferences } from "@/contexts/preferences-context";
import { sessionSongUri } from "@/lib/session-song";
import { useThemeContext } from "@/lib/theme-provider";
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

function playSessionSong(player: AudioPlayer, themeId: string): void {
  player.replace(sessionSongUri(themeId));
  player.loop = true;
  player.volume = 0.3;
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
  const { isActive } = useBrush();
  const songChosen = useOptionalExtras()?.extras.sessionSong === true;
  const { theme } = useThemeContext();
  const songPlaying = isActive && songChosen;

  useEffect(() => {
    // The brushing song (voce 9) replaces the background music while the child brushes and stops
    // with the session: when the music ends, brushing is done.
    if (songPlaying) {
      playSessionSong(musicPlayer, theme.id);
      return () => musicPlayer.pause();
    }
    if (!ready || !preferences.musicEnabled) {
      musicPlayer.pause();
      return;
    }
    playBackgroundMusic(musicPlayer);
    return () => musicPlayer.pause();
  }, [musicPlayer, preferences.musicEnabled, ready, songPlaying, theme.id]);

  const playSuccess = useCallback(() => {
    if (!preferences.soundsEnabled) return;
    playRewardChime(effectPlayer);
  }, [effectPlayer, preferences.soundsEnabled]);

  const value = useMemo(() => ({ playSuccess }), [playSuccess]);
  return <AudioFeedbackContext.Provider value={value}>{children}</AudioFeedbackContext.Provider>;
}

export function useAudioFeedback(): AudioFeedbackContextValue {
  const value = useContext(AudioFeedbackContext);
  if (!value) throw new Error("useAudioFeedback deve essere usato dentro AudioFeedbackProvider");
  return value;
}
