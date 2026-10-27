import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";

import { useBrush } from "@/contexts/brush-context";
import { useBrushling } from "@/contexts/brushling-context";
import { useI18n } from "@/contexts/locale-context";
import { useOptionalPreferences } from "@/contexts/preferences-context";
import { useColors } from "@/hooks/use-colors";

/**
 * sparklybrush://start (voce 43): the app shortcut, a Siri shortcut «Open URL» or the Android
 * widget start the guided timer and show Today. Before the first run is done it only opens Today.
 */
export default function StartScreen() {
  const router = useRouter();
  const colors = useColors();
  const { t } = useI18n();
  const brush = useBrush();
  const { hasChosenStarter } = useBrushling();
  const onboarded = useOptionalPreferences()?.preferences.onboardingCompleted === true;
  const handled = useRef(false);
  const ready = brush.manualRecoveryReady && brush.historyReady;

  useEffect(() => {
    if (handled.current) return;
    // Back to the tabs already on the stack (a deep link may open on top of them), else to Today.
    const leave = () => (router.canGoBack() ? router.back() : router.replace("/"));
    const timeout = setTimeout(() => {
      if (handled.current) return;
      handled.current = true;
      leave();
    }, 4_000);
    if (!ready) return () => clearTimeout(timeout);
    handled.current = true;
    clearTimeout(timeout);
    const canStart = onboarded && hasChosenStarter && !brush.isActive && !brush.recoveredManualSession && !brush.hasPendingManualSession;
    void (canStart ? brush.startManual() : Promise.resolve()).finally(leave);
    return () => clearTimeout(timeout);
  }, [brush, hasChosenStarter, onboarded, ready, router]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
      <ActivityIndicator accessibilityLabel={t("theme.loading")} color={colors.primary} />
    </View>
  );
}
