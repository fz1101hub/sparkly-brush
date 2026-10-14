import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useI18n } from "@/contexts/locale-context";
import { useColors } from "@/hooks/use-colors";

// Fixed like the other primary buttons: the dark-theme primary is too light for white text.
const BUTTON_BACKGROUND = "#2457D6";

/** Shown for unknown deep links and web paths instead of expo-router's English placeholder. */
export default function NotFoundScreen() {
  const colors = useColors();
  const { t } = useI18n();
  const router = useRouter();
  const goHome = () => {
    // The (tabs) anchor usually sits beneath this screen: reveal it instead of stacking a copy.
    if (router.canDismiss()) router.dismissAll();
    else router.replace("/");
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <View testID="not-found-screen" style={styles.content}>
        <View style={[styles.icon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MaterialIcons name="explore-off" size={34} color={colors.primary} />
        </View>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>
          {t("notFound.title")}
        </Text>
        <Text style={[styles.message, { color: colors.muted }]}>{t("notFound.message")}</Text>
        <Pressable
          testID="not-found-home"
          accessibilityRole="button"
          accessibilityLabel={t("notFound.actionLabel")}
          onPress={goHome}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <MaterialIcons name="home" size={22} color="#FFFFFF" />
          <Text style={styles.buttonText}>{t("notFound.action")}</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, gap: 14 },
  icon: { width: 72, height: 72, borderRadius: 24, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, lineHeight: 30, fontWeight: "900", textAlign: "center" },
  message: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  button: { minHeight: 52, borderRadius: 17, backgroundColor: BUTTON_BACKGROUND, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 22, marginTop: 8 },
  buttonText: { color: "#FFFFFF", fontSize: 14, lineHeight: 19, fontWeight: "900" },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
});
