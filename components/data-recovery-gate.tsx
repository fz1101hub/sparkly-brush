import { type ReactNode, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { DesignText as Text } from "@/components/design-text";

import { useI18n } from "@/contexts/locale-context";
import { initializeHistoryStorage } from "@/lib/brush-storage";

type GateState = "loading" | "ready" | "failed";

/**
 * Keeps the app away from the history until storage recovery (interrupted restores, journals)
 * has finished. A failed initialization is not cached by the storage layer, so the user can
 * retry in place instead of having to force-quit the app.
 */
export function DataRecoveryGate({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [state, setState] = useState<GateState>("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void initializeHistoryStorage()
      .then(() => {
        if (active) setState("ready");
      })
      .catch(() => {
        if (active) setState("failed");
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  if (state === "failed") {
    return (
      <View testID="data-recovery-failed" style={styles.container}>
        <Text accessibilityRole="header" style={styles.title}>
          {t("recovery.protectedTitle")}
        </Text>
        <Text style={styles.message}>
          {t("recovery.restart", { error: t("recovery.failed") })}
        </Text>
        <Pressable
          testID="data-recovery-retry"
          accessibilityRole="button"
          onPress={() => {
            setState("loading");
            setAttempt((current) => current + 1);
          }}
          style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
        >
          <Text style={styles.retryText}>{t("recovery.retry")}</Text>
        </Pressable>
      </View>
    );
  }
  return state === "ready" ? children : null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F7F9FF",
  },
  title: { color: "#142044", fontSize: 18, fontWeight: "700", textAlign: "center" },
  message: { color: "#142044", marginTop: 8, textAlign: "center" },
  retry: {
    marginTop: 20,
    minHeight: 44,
    minWidth: 160,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: "#2457D6",
    alignItems: "center",
    justifyContent: "center",
  },
  retryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  pressed: { opacity: 0.86 },
});
