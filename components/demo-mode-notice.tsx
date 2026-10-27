import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, StyleSheet, View } from "react-native";
import { DesignText as Text } from "@/components/design-text";

import { useI18n } from "@/contexts/locale-context";

// Fixed palette in both themes: the notice has its own pastel background, on which the dark
// theme's light text colors are unreadable. Every text pair below is at least 4.5:1.
const NOTICE_BACKGROUND = "#FFF4C9";
const NOTICE_TEXT = "#17213A";
const NOTICE_MUTED = "#56617D";
const NOTICE_ACCENT = "#8A6400";

type DemoModeNoticeProps = {
  onExit: () => void;
};

/** Marks every screen that shows simulated data, so sample sessions are never mistaken for real ones. */
export function DemoModeNotice({ onExit }: DemoModeNoticeProps) {
  const { t } = useI18n();
  return (
    <View testID="demo-mode-notice" style={styles.banner}>
      <View style={styles.icon}>
        <MaterialIcons name="science" size={22} color="#FFFFFF" />
      </View>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>{t("home.demo.eyebrow")}</Text>
        <Text style={styles.title}>{t("home.demo.title")}</Text>
        <Text style={styles.text}>{t("home.demo.description")}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("home.demo.exitLabel")}
        onPress={onExit}
        style={({ pressed }) => [styles.exit, pressed && styles.pressed]}
      >
        <Text style={styles.exitText}>{t("home.demo.exit")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderColor: "#E8BE38",
    backgroundColor: NOTICE_BACKGROUND,
    borderRadius: 20,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#B07D00",
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1 },
  eyebrow: { color: NOTICE_ACCENT, fontSize: 8, lineHeight: 12, fontWeight: "900", letterSpacing: 0.8 },
  title: { color: NOTICE_TEXT, fontSize: 13, lineHeight: 18, fontWeight: "900" },
  text: { color: NOTICE_MUTED, fontSize: 9, lineHeight: 14, marginTop: 1 },
  exit: {
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: NOTICE_ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  exitText: { color: "#FFFFFF", fontSize: 9, lineHeight: 13, fontWeight: "900" },
  pressed: { opacity: 0.86, transform: [{ scale: 0.98 }] },
});
