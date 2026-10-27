import { useEffect, useState } from "react";
import { AppState } from "react-native";

import { localDateKey } from "@/lib/day-progress";

const DAY_CHECK_INTERVAL_MS = 60_000;

/**
 * A timestamp inside the current local day that changes only when the day does: within a minute
 * of local midnight, and as soon as the app returns to the foreground on a new day (timers do not
 * run while the app is suspended).
 *
 * Pass it to "today" computations instead of reading the clock during render: the React Compiler
 * and `useMemo` memoize them on their data alone, so a clock read in render keeps yesterday's
 * missions and counters on screen after midnight until the history changes.
 */
export function useCurrentDayTimestamp(): number {
  const [timestamp, setTimestamp] = useState(() => Date.now());

  useEffect(() => {
    const refresh = () => {
      const now = Date.now();
      setTimestamp((current) => (localDateKey(current) === localDateKey(now) ? current : now));
    };
    const interval = setInterval(refresh, DAY_CHECK_INTERVAL_MS);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  return timestamp;
}
