import { useOptionalPreferences } from "@/contexts/preferences-context";
import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Whether the person asked the system to reduce motion. react-native-web answers from the
 * `prefers-reduced-motion` media query, iOS and Android from the accessibility setting.
 */
export function useReducedMotion(): boolean {
  const calm = useOptionalPreferences()?.preferences.care?.calmMode === true;
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReduced(enabled);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduced || calm;
}
