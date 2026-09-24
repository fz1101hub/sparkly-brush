import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useState } from "react";
import { Animated, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { AnimatedBrushling } from "@/components/animated-brushling";
import { useI18n } from "@/contexts/locale-context";
import { usePreferences } from "@/contexts/preferences-context";
import { getBrushling } from "@/lib/brushlings";

export function OnboardingOverlay() {
  const { preferences, ready, completeOnboarding } = usePreferences();
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [fade] = useState(() => new Animated.Value(1));
  const bloopi = getBrushling("bloopi");
  const slides = [
    {
      icon: "pets" as const,
      eyebrow: t("onboarding.slide1.eyebrow"),
      title: t("onboarding.slide1.title"),
      body: t("onboarding.slide1.body"),
    },
    {
      icon: "auto-awesome" as const,
      eyebrow: t("onboarding.slide2.eyebrow"),
      title: t("onboarding.slide2.title"),
      body: t("onboarding.slide2.body"),
    },
    {
      icon: "family-restroom" as const,
      eyebrow: t("onboarding.slide3.eyebrow"),
      title: t("onboarding.slide3.title"),
      body: t("onboarding.slide3.body"),
    },
    {
      icon: "shield" as const,
      eyebrow: t("onboarding.slide4.eyebrow"),
      title: t("onboarding.slide4.title"),
      body: t("onboarding.slide4.body"),
    },
  ];

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 280, useNativeDriver: Platform.OS !== "web" }).start();
  }, [fade, index]);

  if (!ready || preferences.onboardingCompleted) return null;
  const slide = slides[index];
  const finalSlide = index === slides.length - 1;

  return (
    <Modal visible animationType="fade" statusBarTranslucent>
      <View
        testID="onboarding-overlay"
        role="dialog"
        accessibilityViewIsModal={Platform.OS !== "web"}
        accessibilityLabel={t("onboarding.dialogLabel", {
          current: index + 1,
          total: slides.length,
        })}
        style={styles.backdrop}
      >
        <View style={styles.orbOne} />
        <View style={styles.orbTwo} />
        <Animated.View style={[styles.card, { opacity: fade }]}>
          <View style={styles.avatarHalo}>
            <AnimatedBrushling creature={bloopi} size={132} level={1} active />
          </View>
          <View style={styles.iconBadge}>
            <MaterialIcons name={slide.icon} size={24} color="#2457D6" />
          </View>
          <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
          <Text accessibilityRole="header" style={styles.title}>{slide.title}</Text>
          <Text style={styles.body}>{slide.body}</Text>

          <View style={styles.dots}>
            {slides.map((_, dotIndex) => (
              <View
                key={dotIndex}
                style={[styles.dot, dotIndex === index && styles.dotActive]}
              />
            ))}
          </View>
          <Text style={styles.pageCount}>
            {t("onboarding.pageCount", {
              current: index + 1,
              total: slides.length,
            })}
          </Text>

          <View style={styles.actions}>
            {index > 0 ? (
              <Pressable
                testID="onboarding-back"
                accessibilityRole="button"
                accessibilityLabel={t("onboarding.backLabel")}
                onPress={() => setIndex((value) => value - 1)}
                style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryText}>{t("onboarding.back")}</Text>
              </Pressable>
            ) : <View style={styles.secondaryPlaceholder} />}
            <Pressable
              testID="onboarding-next"
              accessibilityRole="button"
              accessibilityLabel={t(
                finalSlide
                  ? "onboarding.completeLabel"
                  : "onboarding.nextLabel",
              )}
              onPress={() =>
                finalSlide
                  ? void completeOnboarding()
                  : setIndex((value) => value + 1)
              }
              style={({ pressed }) => [
                styles.primary,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.primaryText}>
                {finalSlide ? t("onboarding.start") : t("common.continue")}
              </Text>
              <MaterialIcons
                name={finalSlide ? "rocket-launch" : "arrow-forward"}
                size={18}
                color="#FFFFFF"
              />
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#EEF4FF", alignItems: "center", justifyContent: "center", padding: 22, overflow: "hidden" },
  orbOne: { position: "absolute", width: 250, height: 250, borderRadius: 125, backgroundColor: "#D7E7FF", top: -70, right: -80 },
  orbTwo: { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: "#FFF0D8", bottom: -60, left: -70 },
  card: {
    width: "100%",
    maxWidth: 430,
    borderRadius: 34,
    backgroundColor: "#FFFFFF",
    padding: 22,
    alignItems: "center",
    ...Platform.select({
      web: { boxShadow: "0 18px 30px rgba(23, 33, 60, 0.16)" },
      default: {
        shadowColor: "#17213C",
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.16,
        shadowRadius: 30,
        elevation: 8,
      },
    }),
  },
  avatarHalo: { padding: 8, borderRadius: 44, backgroundColor: "#E7F1FF" },
  iconBadge: { width: 46, height: 46, borderRadius: 16, backgroundColor: "#EEF4FF", alignItems: "center", justifyContent: "center", marginTop: 16 },
  eyebrow: { color: "#2457D6", fontSize: 9, lineHeight: 13, fontWeight: "900", letterSpacing: 1.2, marginTop: 12 },
  title: { color: "#17213C", fontSize: 26, lineHeight: 32, fontWeight: "900", textAlign: "center", marginTop: 5 },
  body: { color: "#6A7284", fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 9 },
  dots: { flexDirection: "row", gap: 7, marginTop: 18 },
  pageCount: { color: "#56617D", fontSize: 11, lineHeight: 15, fontWeight: "800", marginTop: 7 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#D6DAE4" },
  dotActive: { width: 24, backgroundColor: "#2457D6" },
  actions: { width: "100%", flexDirection: "row", alignItems: "center", gap: 9, marginTop: 20 },
  secondary: { minHeight: 50, minWidth: 100, borderRadius: 17, borderWidth: 1, borderColor: "#D8DCE6", alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  secondaryPlaceholder: { minWidth: 100 },
  secondaryText: { color: "#5D6474", fontSize: 12, lineHeight: 17, fontWeight: "900" },
  primary: { flex: 1, minHeight: 50, borderRadius: 17, backgroundColor: "#2457D6", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 14 },
  primaryText: { color: "#FFFFFF", fontSize: 12, lineHeight: 17, fontWeight: "900" },
  pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
});
