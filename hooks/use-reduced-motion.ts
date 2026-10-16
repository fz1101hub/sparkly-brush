import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

export function useReducedMotion() {
  // Avoid motion until the accessibility preference has been read.
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let current = true;
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (current) setReduced(value);
    }).catch(() => undefined);
    return () => { current = false; subscription.remove(); };
  }, []);
  return reduced;
}
