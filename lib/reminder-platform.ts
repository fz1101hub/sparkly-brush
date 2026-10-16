import type { ReminderAdapter } from "@/lib/reminders";
export const reminderAdapter: ReminderAdapter = {
  available: false,
  replace: async (_id, _name, settings) => {
    if (settings.enabled)
      throw new Error(
        "I promemoria sono disponibili nell’app installata su iOS o Android",
      );
  },
};
export function subscribeReminderTap(
  _listener: (profileId: string) => void,
): () => void {
  return () => {};
}
