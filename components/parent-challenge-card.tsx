import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { DesignText as Text } from "@/components/design-text";

import { useI18n } from "@/contexts/locale-context";
import { authenticateParent } from "@/lib/parent-biometrics";
import { createParentChallenge, isParentAnswer } from "@/lib/parent-gate";
import { createRecoveryChallenge, isPinCorrect, type ParentLock } from "@/lib/parent-lock";

type Mode = "math" | "pin" | "recovery";

/**
 * What separates the parent areas from a curious child: the parents' PIN (with fingerprint or
 * Face ID when chosen, voce 65), or else an arithmetic question. A forgotten PIN is replaced by a
 * harder multiplication.
 */
export function ParentChallengeCard({
  onSolved,
  onCancel,
  cancelLabel,
  lock,
}: {
  onSolved: () => void;
  onCancel: () => void;
  cancelLabel?: string;
  /** The parents' PIN and biometrics; null while they are read. */
  lock: ParentLock | null;
}) {
  const { t } = useI18n();
  const [recovering, setRecovering] = useState(false);
  const mode: Mode = lock?.pin ? (recovering ? "recovery" : "pin") : "math";
  const [challenge, setChallenge] = useState(() => createParentChallenge());
  const [input, setInput] = useState("");
  const [wrong, setWrong] = useState(false);
  const [checking, setChecking] = useState(false);
  const solvedRef = useRef(false);
  const biometrics = mode === "pin" && lock?.biometrics === true;

  const solve = () => {
    if (solvedRef.current) return;
    solvedRef.current = true;
    onSolved();
  };

  const askBiometrics = () => {
    void authenticateParent(t("parentGate.biometricPrompt"), t("parentGate.usePin")).then((success) => {
      if (success) solve();
    });
  };

  // Offered once when the card opens; the PIN stays available if it is dismissed.
  const biometricsAsked = useRef(false);
  useEffect(() => {
    if (!biometrics || biometricsAsked.current) return;
    biometricsAsked.current = true;
    askBiometrics();
  });

  const fail = () => {
    setWrong(true);
    setInput("");
    if (mode === "math") setChallenge(createParentChallenge());
    if (mode === "recovery") setChallenge(createRecoveryChallenge());
  };

  const confirm = () => {
    if (checking) return;
    if (mode === "pin") {
      if (!lock?.pin) return;
      setChecking(true);
      void isPinCorrect(lock.pin, input).then((correct) => {
        setChecking(false);
        if (correct) solve();
        else fail();
      }, () => {
        setChecking(false);
        fail();
      });
      return;
    }
    if (isParentAnswer(challenge, input)) {
      solve();
      return;
    }
    fail();
  };

  if (!lock) return null;
  const maxLength = mode === "pin" ? 6 : 3;
  return (
    <View testID="parent-gate-card" style={styles.card}>
      <View style={styles.icon}>
        <MaterialIcons name="lock" size={26} color="#2457D6" />
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        {t("parentGate.title")}
      </Text>
      <Text style={styles.message}>
        {mode === "pin" ? t("parentGate.pinMessage") : mode === "recovery" ? t("parentGate.recoveryMessage") : t("parentGate.message")}
      </Text>
      {mode === "pin" ? null : (
        <Text testID="parent-gate-question" style={styles.question}>
          {t("parentGate.question", { first: challenge.first, second: challenge.second })}
        </Text>
      )}
      <TextInput
        testID="parent-gate-input"
        accessibilityLabel={mode === "pin" ? t("parentGate.pinLabel") : t("parentGate.inputLabel")}
        value={input}
        onChangeText={(text) => {
          setInput(text.replace(/[^0-9]/g, "").slice(0, maxLength));
          setWrong(false);
        }}
        onSubmitEditing={confirm}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={maxLength}
        secureTextEntry={mode === "pin"}
        placeholder={mode === "pin" ? t("parentGate.pinPlaceholder") : t("parentGate.placeholder")}
        placeholderTextColor="#5E6A86"
        style={[styles.input, wrong && styles.inputWrong]}
      />
      {wrong ? (
        <Text testID="parent-gate-wrong" accessibilityLiveRegion="polite" style={styles.wrong}>
          {mode === "pin" ? t("parentGate.pinWrong") : t("parentGate.wrong")}
        </Text>
      ) : null}
      {mode === "pin" ? (
        <View style={styles.links}>
          {biometrics ? (
            <Pressable
              testID="parent-gate-biometric"
              accessibilityRole="button"
              onPress={askBiometrics}
              style={({ pressed }) => [styles.link, pressed && styles.pressed]}
            >
              <MaterialIcons accessible={false} name="fingerprint" size={20} color="#173F9F" />
              <Text style={styles.linkText}>{t("parentGate.useBiometrics")}</Text>
            </Pressable>
          ) : null}
          <Pressable
            testID="parent-gate-forgot"
            accessibilityRole="button"
            onPress={() => {
              setRecovering(true);
              setChallenge(createRecoveryChallenge());
              setInput("");
              setWrong(false);
            }}
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}
          >
            <Text style={styles.linkText}>{t("parentGate.forgotPin")}</Text>
          </Pressable>
        </View>
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
          accessibilityState={{ busy: checking }}
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
  links: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  link: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4 },
  linkText: { color: "#173F9F", fontSize: 13, lineHeight: 18, fontWeight: "800", textDecorationLine: "underline" },
  secondary: { flex: 1, minHeight: 48, borderRadius: 15, borderWidth: 1, borderColor: "#C8D9FF", alignItems: "center", justifyContent: "center" },
  secondaryText: { color: "#173F9F", fontSize: 13, lineHeight: 18, fontWeight: "900" },
  primary: { flex: 1, minHeight: 48, borderRadius: 15, backgroundColor: "#2457D6", alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#FFFFFF", fontSize: 13, lineHeight: 18, fontWeight: "900" },
  pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
});
