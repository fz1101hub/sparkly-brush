import { useEffect, useState } from "react";
import { AppState } from "react-native";

/**
 * The time, refreshed every minute and when the app comes back to the foreground: for what
 * depends on the hour (the weekly summary on Sunday evening), without reading the clock in render.
 */
export function useMinuteClock(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const interval = setInterval(refresh, 60_000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);
  return now;
}
