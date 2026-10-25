import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { DesignText as Text } from "@/components/design-text";

import { useI18n } from "@/contexts/locale-context";
import { createParentChallenge, isParentAnswer } from "@/lib/parent-gate";

/** The arithmetic question that separates the parent areas from a curious child. */
export function ParentChallengeCard({
  onSolved,
  onCancel,
  cancelLabel,
}: {
  onSolved: () => void;
  onCancel: () => void;
  cancelLabel?: string;
}) {
  const { t } = useI18n();
  const [challenge, setChallenge] = useState(() => createParentChallenge());
  const [input, setInput] = useState("");
  const [wrong, setWrong] = useState(false);

  const confirm = () => {
    if (isParentAnswer(challenge, input)) {
      onSolved();
      return;
    }
    setWrong(true);
    setInput("");
    setChallenge(createParentChallenge());
  };

  return (
    <View testID="parent-gate-card" style={styles.card}>
      <View style={styles.icon}>
        <MaterialIcons name="lock" size={26} color="#2457D6" />
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        {t("parentGate.title")}
      </Text>
      <Text style={styles.message}>{t("parentGate.message")}</Text>
      <Text testID="parent-gate-question" style={styles.question}>
        {t("parentGate.question", { first: challenge.first, second: challenge.second })}
      </Text>
      <TextInput
        testID="parent-gate-input"
        accessibilityLabel={t("parentGate.inputLabel")}
        value={input}
        onChangeText={(text) => {
          setInput(text.replace(/[^0-9]/g, "").slice(0, 3));
          setWrong(false);
        }}
        onSubmitEditing={confirm}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={3}
        placeholder={t("parentGate.placeholder")}
        placeholderTextColor="#5E6A86"
        style={[styles.input, wrong && styles.inputWrong]}
      />
      {wrong ? (
        <Text testID="parent-gate-wrong" accessibilityLiveRegion="polite" style={styles.wrong}>
          {t("parentGate.wrong")}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Pressable
          testID="parent-gate-cancel"
          accessibilityRole="button"
          accessibilityLabel={cancelLabel ?? t("common.cancel")}
          onPress={onCancel}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryText}>{cancelLabel ?? t("common.cancel")}</Text>
        </Pressable>
        <Pressable
          testID="parent-gate-confirm"
          accessibilityRole="button"
          accessibilityLabel={t("parentGate.confirm")}
          onPress={confirm}
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
        >
          <Text style={styles.primaryText}>{t("parentGate.confirm")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%", maxWidth: 420, alignSelf: "center", backgroundColor: "#FFFFFF", borderRadius: 24, padding: 22, gap: 10 },
  icon: { width: 52, height: 52, borderRadius: 18, backgroundColor: "#EEF4FF", alignItems: "center", justifyContent: "center" },
  title: { color: "#17213A", fontSize: 20, lineHeight: 26, fontWeight: "900" },
  message: { color: "#56617D", fontSize: 13, lineHeight: 19 },
  question: { color: "#17213A", fontSize: 24, lineHeight: 30, fontWeight: "900", marginTop: 4 },
  input: { minHeight: 52, borderWidth: 1.5, borderColor: "#C8D9FF", borderRadius: 14, paddingHorizontal: 14, fontSize: 20, fontWeight: "800", color: "#17213A", backgroundColor: "#F7F9FF" },
  inputWrong: { borderColor: "#BE2D4C" },
  wrong: { color: "#BE2D4C", fontSize: 12, lineHeight: 17, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 10, marginTop: 6 },
  secondary: { flex: 1, minHeight: 48, borderRadius: 15, borderWidth: 1, borderColor: "#C8D9FF", alignItems: "center", justifyContent: "center" },
  secondaryText: { color: "#173F9F", fontSize: 13, lineHeight: 18, fontWeight: "900" },
  primary: { flex: 1, minHeight: 48, borderRadius: 15, backgroundColor: "#2457D6", alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#FFFFFF", fontSize: 13, lineHeight: 18, fontWeight: "900" },
  pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
});
