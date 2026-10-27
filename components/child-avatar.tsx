import { StyleSheet, View } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import { ChoiceChips } from "@/components/village-ui";
import { useExtras } from "@/contexts/extras-context";
import { useI18n } from "@/contexts/locale-context";
import { useColors } from "@/hooks/use-colors";
import { avatarEmoji, AVATAR_FACES, AVATAR_HATS, AVATAR_TONES, type AvatarFace, type AvatarHat, type AvatarTone } from "@/lib/avatar";

/** The child's own character next to the creature (voce 68), chosen by the child. */
export function ChildAvatarEditor({ creatureEmoji }: { creatureEmoji: string }) {
  const colors = useColors();
  const { t } = useI18n();
  const { extras, apply, ready } = useExtras();
  if (!ready) return null;
  const avatar = extras.avatar;
  const set = (change: Partial<typeof avatar>) => void apply((previous) => ({ ...previous, avatar: { ...previous.avatar, ...change } }));
  return (
    <View testID="child-avatar" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>{t("avatar.title")}</Text>
      <Text testID="child-avatar-preview" accessibilityLabel={t("avatar.preview")} style={styles.preview}>
        {avatarEmoji(avatar)} {creatureEmoji}
      </Text>
      <ChoiceChips<AvatarFace>
        label={t("avatar.face")}
        testIDPrefix="avatar-face"
        value={avatar.face}
        onChange={(face) => set({ face })}
        options={AVATAR_FACES.map((face) => ({ value: face, label: t(`avatar.face.${face}`) }))}
      />
      <ChoiceChips<AvatarTone>
        label={t("avatar.tone")}
        testIDPrefix="avatar-tone"
        value={avatar.tone}
        onChange={(tone) => set({ tone })}
        options={AVATAR_TONES.map((tone) => ({ value: tone, label: t(`avatar.tone.${tone}`) }))}
      />
      <ChoiceChips<AvatarHat>
        label={t("avatar.hat")}
        testIDPrefix="avatar-hat"
        value={avatar.hat}
        onChange={(hat) => set({ hat })}
        options={AVATAR_HATS.map((hat) => ({ value: hat, label: t(`avatar.hat.${hat}`) }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 22, padding: 16, gap: 10 },
  title: { fontSize: 18, lineHeight: 24, fontWeight: "900" },
  preview: { fontSize: 44, lineHeight: 56, textAlign: "center" },
});
