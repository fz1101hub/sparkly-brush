import { useEffect } from "react";
import { Platform, StyleSheet, Switch, View } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import { VillageButton } from "@/components/village-ui";
import { VoiceRecorder } from "@/components/voice-recorder";
import { useExtras } from "@/contexts/extras-context";
import { useFamily } from "@/contexts/family-context";
import { useI18n } from "@/contexts/locale-context";
import { useColors } from "@/hooks/use-colors";
import { playVoiceMessage, stopVoiceMessage } from "@/lib/voice-playback";
import { VOICE_MAX_SECONDS } from "@/lib/voice-message";

function Row({ testID, label, hint, value, disabled, onChange }: {
  testID: string;
  label: string;
  hint: string;
  value: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.text, { color: colors.muted }]}>{hint}</Text>
      </View>
      <Switch testID={testID} style={styles.switch} accessibilityLabel={label} value={value} disabled={disabled} onValueChange={onChange} />
    </View>
  );
}

/**
 * Settings → «Messaggio e specchio» (lotto 10): the parent's voice message for this child (voce 61)
 * and the front-camera mirror during the session (voce 76). Microphone and camera are asked only
 * when used, and neither sends anything anywhere.
 */
export function MediaSettings() {
  const colors = useColors();
  const { t, formatDate } = useI18n();
  const { active } = useFamily();
  const { extras, apply, ready } = useExtras();
  useEffect(() => () => stopVoiceMessage(), []);
  if (!ready) return null;
  const message = extras.voiceMessage;
  const name = active.name;
  const when = (timestamp: number) => formatDate(timestamp, { day: "numeric", month: "long" });
  return (
    <View testID="media-settings" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>{t("voiceMessage.title", { name })}</Text>
      <Text style={[styles.text, { color: colors.muted }]}>{t("voiceMessage.text", { name, max: VOICE_MAX_SECONDS })}</Text>
      {message ? (
        <View testID="voice-message-saved" style={[styles.panel, { backgroundColor: colors.primarySoft }]}>
          <Text style={[styles.label, { color: colors.foreground }]}>
            {t("voiceMessage.saved", { date: when(message.recordedAt), seconds: message.seconds })}
          </Text>
          <Text testID="voice-message-heard" style={[styles.text, { color: colors.muted }]}>
            {message.heardAt === null ? t("voiceMessage.notHeard", { name }) : t("voiceMessage.heard", { name, date: when(message.heardAt) })}
          </Text>
          <View style={styles.buttons}>
            <VillageButton testID="voice-play" secondary icon="play-arrow" label={t("voiceMessage.play")} onPress={() => void playVoiceMessage(message).catch(() => undefined)} />
            <VillageButton
              testID="voice-delete"
              secondary
              icon="delete-outline"
              label={t("voiceMessage.delete")}
              onPress={() => {
                stopVoiceMessage();
                void apply((previous) => ({ ...previous, voiceMessage: null }));
              }}
            />
          </View>
          <Row
            testID="voice-repeat"
            label={t("voiceMessage.repeat")}
            hint={t("voiceMessage.repeatHint", { name })}
            value={message.repeat}
            onChange={(repeat) =>
              void apply((previous) => (previous.voiceMessage ? { ...previous, voiceMessage: { ...previous.voiceMessage, repeat } } : previous))
            }
          />
        </View>
      ) : null}
      <VoiceRecorder
        onRecorded={(recorded) =>
          void apply((previous) => ({
            ...previous,
            // A new recording is heard again, with the parent's choice about repeating it kept.
            voiceMessage: { ...recorded, repeat: previous.voiceMessage?.repeat ?? false, heardAt: null },
          }))
        }
      />
      <Row
        testID="mirror-setting"
        label={t("mirror.setting")}
        hint={t(Platform.OS === "web" ? "mirror.appOnly" : "mirror.settingHint")}
        value={extras.mirror && Platform.OS !== "web"}
        disabled={Platform.OS === "web"}
        onChange={(mirror) => void apply((previous) => ({ ...previous, mirror }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 22, padding: 18, gap: 12 },
  title: { fontSize: 20, lineHeight: 28, fontWeight: "800" },
  label: { fontSize: 15, lineHeight: 21, fontWeight: "800" },
  text: { fontSize: 14, lineHeight: 20 },
  panel: { borderRadius: 16, padding: 12, gap: 6 },
  buttons: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  copy: { flex: 1, gap: 2 },
  switch: { minHeight: 44, minWidth: 48 },
});
