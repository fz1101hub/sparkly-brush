import "@/global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { type ReactNode, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { ActivityIndicator, BackHandler, Platform, StyleSheet, Text, View } from "react-native";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider, useThemeContext } from "@/lib/theme-provider";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

import { FamilyProvider, useFamily } from "@/contexts/family-context";
import { AudioFeedbackProvider } from "@/contexts/audio-feedback-context";
import { BrushProvider } from "@/contexts/brush-context";
import { BrushlingProvider } from "@/contexts/brushling-context";
import { ParentRewardsProvider } from "@/contexts/parent-rewards-context";
import { PreferencesProvider } from "@/contexts/preferences-context";
import { ProfileNavigation } from "@/components/profile-navigation";
import { ReminderLifecycle } from "@/components/reminder-lifecycle";
import { OnboardingOverlay } from "@/components/onboarding-overlay";
import { initManusRuntime, subscribeSafeAreaInsets } from "@/lib/_core/manus-runtime";
import { initializeHistoryStorage } from "@/lib/brush-storage";
import { isRestoreOperationActive, subscribeRestoreOperation } from "@/lib/history-operation";

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = {
  anchor: "(tabs)",
};

function ThemedStatusBar() {
  const { colorScheme } = useThemeContext();
  return <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />;
}

function DataRecoveryGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void initializeHistoryStorage()
      .then(() => setReady(true))
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Ripristino dati non riuscito"));
  }, []);

  if (error) {
    return (
      <View style={recoveryStyles.container}>
        <Text style={recoveryStyles.title}>Dati protetti</Text>
        <Text style={recoveryStyles.message}>{error}. Riavvia l’app senza cancellarne i dati.</Text>
      </View>
    );
  }
  return ready ? children : null;
}

function RestoreOperationOverlay() {
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
      accessibilityLabel="Ripristino dei dati in corso"
      style={recoveryStyles.overlay}
    >
      <View style={recoveryStyles.overlayCard}>
        <ActivityIndicator size="large" color="#2457D6" />
        <Text style={recoveryStyles.title}>Ripristino protetto in corso</Text>
        <Text style={recoveryStyles.message}>Non chiudere l’app. Le modifiche torneranno disponibili tra pochi istanti.</Text>
      </View>
    </View>
  );
}

const recoveryStyles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  message: { marginTop: 8, textAlign: "center" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
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

function ProfileLayout() {
  const { active } = useFamily();
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);

  // Initialize Manus runtime for cookie injection from parent container
  useEffect(() => {
    initManusRuntime();
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
      <DataRecoveryGate>
        <PreferencesProvider>
          <BrushProvider>
            <AudioFeedbackProvider>
              <BrushlingProvider>
                <ParentRewardsProvider>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(tabs)" />
                  </Stack>
                  <OnboardingOverlay />
                  <ReminderLifecycle />
                  <ProfileNavigation />
                  <RestoreOperationOverlay />
                  <ThemedStatusBar />
                </ParentRewardsProvider>
              </BrushlingProvider>
            </AudioFeedbackProvider>
          </BrushProvider>
        </PreferencesProvider>
      </DataRecoveryGate>
    </GestureHandlerRootView>
  );

  const shouldOverrideSafeArea = Platform.OS === "web";

  if (shouldOverrideSafeArea) {
    return (
      <ThemeProvider key={active.id}>
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
    <ThemeProvider key={active.id}>
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>
    </ThemeProvider>
  );
}


export default function RootLayout() {
  return <FamilyProvider><ProfileLayout /></FamilyProvider>;
}
