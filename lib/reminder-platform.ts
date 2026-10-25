import { LocalizedError } from "@/lib/localized-error";
import type { ReminderAdapter } from "@/lib/reminders";

// Web has no scheduled local notifications: reminders exist only in the installed app.
export const reminderAdapter: ReminderAdapter = {
  available: false,
  replace: async (_id, settings) => {
    if (settings.enabled) throw new LocalizedError("reminders.error.unavailable");
  },
};

export function subscribeReminderTap(
  _listener: (profileId: string) => void,
): () => void {
  return () => {};
}
