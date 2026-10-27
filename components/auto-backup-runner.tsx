import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import { useBrush } from "@/contexts/brush-context";
import { useI18n } from "@/contexts/locale-context";
import { runAutoBackupIfDue } from "@/lib/family-backup";

/**
 * The automatic weekly family backup (voce 44): checked when the app starts and when it comes back
 * to the foreground, never while a child is brushing. Failures are silent: the next check retries.
 */
export function AutoBackupRunner() {
  const { isActive, demoMode, historyReady } = useBrush();
  const { t } = useI18n();
  const running = useRef(false);
  const blocked = isActive || demoMode || !historyReady;
  const defaultName = t("family.profile.defaultName");

  useEffect(() => {
    const check = () => {
      if (blocked || running.current) return;
      running.current = true;
      void runAutoBackupIfDue(Date.now(), defaultName).catch(() => false).finally(() => {
        running.current = false;
      });
    };
    check();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });
    return () => subscription.remove();
  }, [blocked, defaultName]);

  return null;
}
