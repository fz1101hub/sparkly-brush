import "@/global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { ActivityIndicator, BackHandler, Platform, StyleSheet, Text, View } from "react-native";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

import { AudioFeedbackProvider } from "@/contexts/audio-feedback-context";
import { BrushProvider } from "@/contexts/brush-context";
import { BrushlingProvider } from "@/contexts/brushling-context";
import { ParentRewardsProvider } from "@/contexts/parent-rewards-context";
import { PreferencesProvider } from "@/contexts/preferences-context";
import { AppLocaleProvider } from "@/contexts/app-locale-provider";
import { useI18n } from "@/contexts/locale-context";
import { DataRecoveryGate } from "@/components/data-recovery-gate";
import { OnboardingOverlay } from "@/components/onboarding-overlay";
import { initManusRuntime, subscribeSafeAreaInsets } from "@/lib/_core/manus-runtime";
import { isRestoreOperationActive, subscribeRestoreOperation } from "@/lib/history-operation";

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = {
  anchor: "(tabs)",
};

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

export default function RootLayout() {
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);

  // Initialize Manus runtime for cookie injection from parent container
  useEffect(() => {
    initManusRuntime();
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    document.title = "Sparkly Brush";
  }, []);

  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, [handleSafeAreaUpdate]);

  // Ensure minimum 8px padding for top and bottom on mobile
  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PreferencesProvider>
        <AppLocaleProvider>
          <DataRecoveryGate>
            <BrushProvider>
              <AudioFeedbackProvider>
                <BrushlingProvider>
                  <ParentRewardsProvider>
                    <Stack screenOptions={{ headerShown: false }}>
                      <Stack.Screen name="(tabs)" />
                    </Stack>
                    <OnboardingOverlay />
                    <RestoreOperationOverlay />
                    <StatusBar style="dark" />
                  </ParentRewardsProvider>
                </BrushlingProvider>
              </AudioFeedbackProvider>
            </BrushProvider>
          </DataRecoveryGate>
        </AppLocaleProvider>
      </PreferencesProvider>
    </GestureHandlerRootView>
  );

  const shouldOverrideSafeArea = Platform.OS === "web";

  if (shouldOverrideSafeArea) {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={frame}>
            <SafeAreaInsetsContext.Provider value={insets}>
              {content}
            </SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>
    </ThemeProvider>
  );
}
