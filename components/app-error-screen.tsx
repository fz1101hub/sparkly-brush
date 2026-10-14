import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { ErrorBoundaryProps } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { translateDynamic, type TranslationKey } from "@/lib/i18n";
import { getDeviceLocale } from "@/lib/locale";

/**
 * Shown when a screen throws in production. It renders outside every provider (the providers
 * may be what crashed), so it translates on its own with the device language.
 */
export function AppErrorScreen({ error, retry }: ErrorBoundaryProps) {
  const [retrying, setRetrying] = useState(false);
  const locale = getDeviceLocale();
  const t = (key: TranslationKey) => translateDynamic(locale, key);

  const onRetry = async () => {
    setRetrying(true);
    try {
      await retry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <ScrollView testID="app-error-screen" style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.icon}>
        <MaterialIcons name="healing" size={34} color="#2457D6" />
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        {t("error.title")}
      </Text>
      <Text style={styles.message}>{t("error.message")}</Text>
      <Pressable
        testID="app-error-retry"
        accessibilityRole="button"
        accessibilityLabel={t("error.retry")}
        accessibilityState={{ disabled: retrying, busy: retrying }}
        disabled={retrying}
        onPress={() => void onRetry()}
        style={({ pressed }) => [styles.button, pressed && styles.pressed, retrying && styles.disabled]}
      >
        <MaterialIcons name="refresh" size={22} color="#FFFFFF" />
        <Text style={styles.buttonText}>{t("error.retry")}</Text>
      </Pressable>
      <Text style={styles.detailsLabel}>{t("error.detailsLabel")}</Text>
      <Text testID="app-error-details" style={styles.details} selectable>
        {error.message || String(error)}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F9FF" },
  content: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, paddingVertical: 48, gap: 14 },
  icon: { width: 72, height: 72, borderRadius: 24, borderWidth: 1, borderColor: "#DCE3FF", backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  title: { color: "#17213A", fontSize: 24, lineHeight: 30, fontWeight: "900", textAlign: "center" },
  message: { color: "#56617D", fontSize: 14, lineHeight: 20, textAlign: "center" },
  button: { minHeight: 52, borderRadius: 17, backgroundColor: "#2457D6", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 22, marginTop: 8 },
  buttonText: { color: "#FFFFFF", fontSize: 14, lineHeight: 19, fontWeight: "900" },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.5 },
  detailsLabel: { color: "#56617D", fontSize: 11, lineHeight: 16, fontWeight: "800", marginTop: 20, letterSpacing: 0.6, textTransform: "uppercase" },
  details: { color: "#56617D", fontSize: 11, lineHeight: 16, textAlign: "center" },
});
