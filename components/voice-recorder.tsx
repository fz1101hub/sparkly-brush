import { StyleSheet } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import { useI18n } from "@/contexts/locale-context";
import { useColors } from "@/hooks/use-colors";
import type { VoiceMessage } from "@/lib/voice-message";

type Recorded = Pick<VoiceMessage, "audio" | "mimeType" | "seconds" | "recordedAt">;

/** On the web the microphone is not used: the message is recorded from the app on the phone. */
export function VoiceRecorder(_props: { onRecorded: (recorded: Recorded) => void }) {
  const colors = useColors();
  const { t } = useI18n();
  return <Text testID="voice-app-only" style={[styles.text, { color: colors.muted }]}>{t("voiceMessage.appOnly")}</Text>;
}

const styles = StyleSheet.create({
  text: { fontSize: 14, lineHeight: 20 },
});
