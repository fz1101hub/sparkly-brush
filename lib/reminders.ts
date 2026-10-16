import { createProfileStorage, createProfileStore } from "@/lib/profile-scope";

export type ReminderSettings = {
  enabled: boolean;
  morning: string;
  evening: string;
  quiet: boolean;
};
export const DEFAULT_REMINDERS: ReminderSettings = {
  enabled: false,
  morning: "08:00",
  evening: "20:00",
  quiet: false,
};
export const REMINDERS_KEY = "sparkly-brush.reminders.v1";
export type ReminderAdapter = {
  available: boolean;
  permissionGranted?: () => Promise<boolean>;
  replace: (
    profileId: string,
    name: string,
    settings: ReminderSettings,
    requestPermission: boolean,
  ) => Promise<void>;
};

export function validateReminders(value: ReminderSettings): ReminderSettings {
  if (
    typeof value?.enabled !== "boolean" ||
    typeof value.quiet !== "boolean" ||
    !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.morning) ||
    !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.evening)
  ) {
    throw new Error("Usa orari validi nel formato 08:00");
  }
  if (value.morning === value.evening)
    throw new Error("Scegli due orari diversi per mattina e sera");
  return {
    enabled: value.enabled,
    morning: value.morning,
    evening: value.evening,
    quiet: value.quiet,
  };
}

export function reminderIdentifiers(profileId: string): [string, string] {
  return [`brushlings-${profileId}-morning`, `brushlings-${profileId}-evening`];
}

export const getReminderService = createProfileStore((profileId: string) => {
  const storage = createProfileStorage(profileId);
  let queue: Promise<unknown> = Promise.resolve();
  const load = async (): Promise<ReminderSettings> => {
    const raw = await storage.getItem(REMINDERS_KEY);
    return raw ? validateReminders(JSON.parse(raw)) : { ...DEFAULT_REMINDERS };
  };
  const serialize = <T>(operation: () => Promise<T>) => {
    const next = queue.then(operation, operation);
    queue = next.catch(() => {});
    return next;
  };
  return {
    load,
    reconcile: (name: string, adapter: ReminderAdapter) =>
      serialize(async () => {
        if (adapter.available)
          await adapter.replace(profileId, name, await load(), false);
      }),
    save: (
      name: string,
      settings: ReminderSettings,
      adapter: ReminderAdapter,
    ) =>
      serialize(async () => {
        const next = validateReminders(settings);
        if (next.enabled && !adapter.available)
          throw new Error(
            "I promemoria locali sono disponibili nell’app iOS e Android",
          );
        const previous = await load();
        try {
          await adapter.replace(profileId, name, next, true);
          await storage.setItem(REMINDERS_KEY, JSON.stringify(next));
        } catch (error) {
          try {
            await adapter.replace(profileId, name, previous, false);
          } catch {
            throw new Error(
              "Promemoria non aggiornati. Riapri le impostazioni e verifica il permesso notifiche del telefono.",
            );
          }
          throw error;
        }
        return next;
      }),
  };
});
