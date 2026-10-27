import {
  AudioQuality,
  IOSOutputFormat,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingOptions,
} from "expo-audio";
import { File } from "expo-file-system";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import { VillageButton } from "@/components/village-ui";
import { useI18n } from "@/contexts/locale-context";
import { useColors } from "@/hooks/use-colors";
import { stopVoiceMessage } from "@/lib/voice-playback";
import { MAX_VOICE_BASE64, VOICE_MAX_SECONDS, type VoiceMessage } from "@/lib/voice-message";

/** Mono AAC at 32 kbit/s: enough for a voice, about 80 kB for 20 seconds. */
const VOICE_RECORDING: RecordingOptions = {
  extension: ".m4a",
  sampleRate: 22_050,
  numberOfChannels: 1,
  bitRate: 32_000,
  android: { outputFormat: "mpeg4", audioEncoder: "aac" },
  ios: {
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.LOW,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: { mimeType: "audio/webm", bitsPerSecond: 32_000 },
};

type Recorded = Pick<VoiceMessage, "audio" | "mimeType" | "seconds" | "recordedAt">;

/**
 * Records the parent's message (voce 61): the microphone is asked only when the parent presses
 * «Registra», recording stops by itself after 20 seconds and the file is removed once its audio
 * is in the child's extras.
 */
export function VoiceRecorder({ onRecorded }: { onRecorded: (recorded: Recorded) => void }) {
  const colors = useColors();
  const { t } = useI18n();
  const recorder = useAudioRecorder(VOICE_RECORDING);
  const state = useAudioRecorderState(recorder, 250);
  const [phase, setPhase] = useState<"idle" | "recording" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAt = useRef(0);
  const finishing = useRef(false);

  const finish = async () => {
    if (finishing.current) return;
    finishing.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setPhase("saving");
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error("no recording");
      const file = new File(uri);
      try {
        const audio = await file.base64();
        if (!audio || audio.length > MAX_VOICE_BASE64) throw new Error("too large");
        // Measured here: after stop() some recorders report a duration of 0.
        const seconds = Math.min(VOICE_MAX_SECONDS, Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)));
        onRecorded({ audio, mimeType: "audio/mp4", seconds, recordedAt: Date.now() });
      } finally {
        if (file.exists) file.delete();
      }
      setError(null);
    } catch {
      setError(t("voiceMessage.error"));
    } finally {
      await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
      finishing.current = false;
      setPhase("idle");
    }
  };

  const start = async () => {
    setError(null);
    stopVoiceMessage();
    const permission = await requestRecordingPermissionsAsync().catch(() => null);
    if (!permission?.granted) {
      setError(t("voiceMessage.permissionDenied"));
      return;
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      startedAt.current = Date.now();
      setPhase("recording");
      timer.current = setTimeout(() => void finish(), VOICE_MAX_SECONDS * 1000);
    } catch {
      await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
      setError(t("voiceMessage.error"));
    }
  };

  // Leaving the screen while recording stops the microphone and keeps nothing.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    try {
      if (recorder.isRecording) void recorder.stop().catch(() => undefined);
    } catch {
      // The hook may have released the recorder already, which also stops it.
    }
    void setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
  }, [recorder]);

  const elapsed = Math.min(VOICE_MAX_SECONDS, Math.floor(state.durationMillis / 1000));
  return (
    <View style={styles.stack}>
      {phase === "recording" ? (
        <>
          <Text testID="voice-recording" accessibilityLiveRegion="polite" style={[styles.live, { color: colors.error }]}>
            {t("voiceMessage.recording", { seconds: elapsed, max: VOICE_MAX_SECONDS })}
          </Text>
          <VillageButton testID="voice-stop" icon="stop" label={t("voiceMessage.stop")} onPress={() => void finish()} />
        </>
      ) : (
        <VillageButton testID="voice-record" icon="mic" label={t("voiceMessage.record")} disabled={phase === "saving"} onPress={() => void start()} />
      )}
      {error ? <Text testID="voice-error" style={[styles.text, { color: colors.error }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 8 },
  live: { fontSize: 15, lineHeight: 21, fontWeight: "800" },
  text: { fontSize: 14, lineHeight: 20 },
});
