import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import { useOptionalExtras } from "@/contexts/extras-context";
import { useI18n } from "@/contexts/locale-context";
import { playVoiceMessage, stopVoiceMessage } from "@/lib/voice-playback";
import { voiceMessageWaiting } from "@/lib/voice-message";

/** In the reward of a complete brushing: «C'è un messaggio per te», heard when the child taps it. */
export function VoiceMessageReward({ onDark }: { onDark: boolean }) {
  const { t } = useI18n();
  const record = useOptionalExtras();
  // What the reward offers is fixed when it opens: listening must not make the card vanish.
  const [message] = useState(() => record?.extras.voiceMessage ?? null);
  const [heard, setHeard] = useState(false);
  useEffect(() => () => stopVoiceMessage(), []);
  if (!record || !message || !voiceMessageWaiting(message)) return null;
  const ink = onDark ? "#FFFFFF" : "#17213C";
  const panel = onDark ? "#FFFFFF18" : "#F3F6FB";
  const listen = () => {
    setHeard(true);
    const at = Date.now();
    void playVoiceMessage(message).catch(() => undefined);
    void record.apply((previous) =>
      previous.voiceMessage && previous.voiceMessage.recordedAt === message.recordedAt
        ? { ...previous, voiceMessage: { ...previous.voiceMessage, heardAt: at } }
        : previous,
    );
  };
  return (
    <View testID="reward-voice-message" style={[styles.panel, { backgroundColor: panel }]}>
      <Text style={[styles.label, { color: ink }]}>🎙️ {t("voiceMessage.forYou")}</Text>
      <Pressable
        testID="reward-voice-play"
        accessibilityRole="button"
        onPress={listen}
        style={({ pressed }) => [styles.button, { borderColor: ink }, pressed && { opacity: 0.8 }]}
      >
        <Text style={[styles.buttonText, { color: ink }]}>{heard ? t("voiceMessage.again") : t("voiceMessage.listen")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 16, padding: 12, gap: 6, alignSelf: "stretch", marginTop: 10 },
  label: { fontSize: 15, lineHeight: 21, fontWeight: "800" },
  button: { minHeight: 44, borderWidth: 1.5, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 4 },
  buttonText: { fontSize: 15, lineHeight: 21, fontWeight: "800" },
});
