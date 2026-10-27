import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

import { useOptionalExtras } from "@/contexts/extras-context";

/**
 * Whether the person asked the system to reduce motion. react-native-web answers from the
 * `prefers-reduced-motion` media query, iOS and Android from the accessibility setting.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  // The calm mode (voce 39) asks for reduced motion too, whatever the system setting.
  const calm = useOptionalExtras()?.extras.calmMode === true;

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
