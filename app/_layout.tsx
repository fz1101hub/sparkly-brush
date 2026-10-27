import "@/global.css";
import { Stack, type ErrorBoundaryProps } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { ActivityIndicator, BackHandler, Platform, StyleSheet, Text, View } from "react-native";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import type { EdgeInsets, Rect } from "react-native-safe-area-context";

import { AudioFeedbackProvider } from "@/contexts/audio-feedback-context";
import { BracesProvider } from "@/contexts/braces-context";
import { BrushProvider } from "@/contexts/brush-context";
import { ExtrasProvider } from "@/contexts/extras-context";
import { BrushlingProvider } from "@/contexts/brushling-context";
import { FamilyProvider, useFamily } from "@/contexts/family-context";
import { ParentGateProvider } from "@/contexts/parent-gate-context";
import { ParentRewardsProvider } from "@/contexts/parent-rewards-context";
import { PreferencesProvider } from "@/contexts/preferences-context";
import { AppLocaleProvider } from "@/contexts/app-locale-provider";
import { useI18n } from "@/contexts/locale-context";
import { VillageProvider } from "@/contexts/village-context";
import { AppErrorScreen } from "@/components/app-error-screen";
import { DataRecoveryGate } from "@/components/data-recovery-gate";
import { OnboardingOverlay } from "@/components/onboarding-overlay";
import { ProfileNavigation } from "@/components/profile-navigation";
import { ReminderLifecycle } from "@/components/reminder-lifecycle";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { isRestoreOperationActive, subscribeRestoreOperation } from "@/lib/history-operation";

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = {
  anchor: "(tabs)",
};

/** Replaces expo-router's English fallback for uncaught rendering errors. */
export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <AppErrorScreen {...props} />;
}

function RestoreOperationOverlay() {
  const { t } = useI18n();
  const active = useSyncExternalStore(
    subscribeRestoreOperation,
    isRestoreOperationActive,
    isRestoreOperationActive,
  );

  useEffect(() => {
    if (!active || Platform.OS === "web") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => subscription.remove();
  }, [active]);

  if (!active) return null;
  return (
    <View
      accessibilityViewIsModal
      accessibilityLabel={t("recovery.inProgressLabel")}
      style={recoveryStyles.overlay}
    >
      <View style={recoveryStyles.overlayCard}>
        <ActivityIndicator size="large" color="#2457D6" />
        <Text style={recoveryStyles.title}>
          {t("recovery.inProgressTitle")}
        </Text>
        <Text style={recoveryStyles.message}>
          {t("recovery.inProgressMessage")}
        </Text>
      </View>
    </View>
  );
}

const recoveryStyles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  message: { marginTop: 8, textAlign: "center" },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(247, 248, 250, 0.96)",
    zIndex: 10000,
  },
  overlayCard: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    padding: 24,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
  },
});

function ThemedStatusBar() {
  const colorScheme = useColorScheme();
  return <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />;
}

/**
 * Everything that belongs to one child (from PR #10). Keyed by the active profile, so a switch
 * remounts every provider and each one reads only that child's history, creatures and theme.
 */
function ProfileLayout() {
  const { active } = useFamily();

  // Ensure minimum padding for top and bottom on mobile before the first native measurement.
  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: DEFAULT_WEB_INSETS, frame: DEFAULT_WEB_FRAME };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, []);

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PreferencesProvider>
        <AppLocaleProvider>
          <ParentGateProvider>
          <DataRecoveryGate>
            <ExtrasProvider>
            <BrushProvider>
              <AudioFeedbackProvider>
                <BrushlingProvider>
                  <ParentRewardsProvider>
                    <BracesProvider>
                    <VillageProvider>
                    <Stack screenOptions={{ headerShown: false }}>
                      <Stack.Screen name="(tabs)" />
                    </Stack>
                    <OnboardingOverlay />
                    <ReminderLifecycle />
                    <ProfileNavigation />
                    <RestoreOperationOverlay />
                    <ThemedStatusBar />
                    </VillageProvider>
                    </BracesProvider>
                  </ParentRewardsProvider>
                </BrushlingProvider>
              </AudioFeedbackProvider>
            </BrushProvider>
            </ExtrasProvider>
          </DataRecoveryGate>
          </ParentGateProvider>
        </AppLocaleProvider>
      </PreferencesProvider>
    </GestureHandlerRootView>
  );

  return (
    <ThemeProvider key={active.id}>
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    document.title = "Sparkly Brush";
  }, []);

  return (
    <FamilyProvider>
      <ProfileLayout />
    </FamilyProvider>
  );
}
