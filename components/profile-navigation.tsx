import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useFamily } from "@/contexts/family-context";
import { useBrush } from "@/contexts/brush-context";
import { useBrushling } from "@/contexts/brushling-context";
import { usePreferences } from "@/contexts/preferences-context";

// Wait for the new profile's providers and navigator to mount before navigating.
export function ProfileNavigation() {
  const { homeRequested, acknowledgeNavigation } = useFamily();
  const { historyReady } = useBrush();
  const { profileReady } = useBrushling();
  const { ready } = usePreferences();
  const router = useRouter();
  useEffect(() => {
    if (!homeRequested || !historyReady || !profileReady || !ready) return;
    router.replace("/(tabs)");
    acknowledgeNavigation();
  }, [
    homeRequested,
    historyReady,
    profileReady,
    ready,
    router,
    acknowledgeNavigation,
  ]);
  return null;
}
