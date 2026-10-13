import { useCallback } from "react";

import { useI18n } from "@/contexts/locale-context";
import { showMessage } from "@/lib/dialogs";

/**
 * Runs a fire-and-forget action started from a button. A rejected promise would otherwise be
 * swallowed silently: the person tapped, nothing happened and no one said why.
 */
export function useAsyncAction(): (action: Promise<unknown>) => void {
  const { t } = useI18n();
  return useCallback(
    (action: Promise<unknown>) => {
      action.catch(() => {
        showMessage(t("common.actionFailedTitle"), t("common.actionFailedMessage"));
      });
    },
    [t],
  );
}
