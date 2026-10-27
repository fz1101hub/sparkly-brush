import type { TranslationKey, TranslationParams } from "@/lib/i18n";
import { LocalizedError } from "@/lib/localized-error";
import { createProfileStorage, createProfileStore } from "@/lib/profile-scope";

/** Two daily local notifications per child (from PR #10); nothing leaves the phone. */
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

/** Notification copy in the family language, prepared by the caller. */
export type ReminderText = {
  title: string;
  body: string;
  channel: string;
  quietChannel: string;
};

export function reminderText(
  t: (key: TranslationKey, params?: TranslationParams) => string,
  name: string,
): ReminderText {
  return {
    title: t("reminders.notification.title", { name }),
    body: t("reminders.notification.body"),
    channel: t("reminders.channel.normal"),
    quietChannel: t("reminders.channel.quiet"),
  };
}

export type ReminderAdapter = {
  available: boolean;
  permissionGranted?: () => Promise<boolean>;
  replace: (
    profileId: string,
    settings: ReminderSettings,
    requestPermission: boolean,
    text: ReminderText,
  ) => Promise<void>;
};

const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function validateReminders(value: ReminderSettings): ReminderSettings {
  if (
    typeof value?.enabled !== "boolean" ||
    typeof value.quiet !== "boolean" ||
    typeof value.morning !== "string" ||
    typeof value.evening !== "string" ||
    !TIME.test(value.morning) ||
    !TIME.test(value.evening)
  ) {
    throw new LocalizedError("reminders.error.invalidTime");
  }
  if (value.morning === value.evening) throw new LocalizedError("reminders.error.sameTime");
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
    if (!raw) return { ...DEFAULT_REMINDERS };
    let parsed: ReminderSettings;
    try {
      parsed = JSON.parse(raw) as ReminderSettings;
    } catch {
      throw new LocalizedError("reminders.error.unreadable");
    }
    return validateReminders(parsed);
  };
  const serialize = <T,>(operation: () => Promise<T>) => {
    const next = queue.then(operation, operation);
    queue = next.catch(() => {});
    return next;
  };
  const listeners = new Set<(settings: ReminderSettings) => void>();
  return {
    load,
    /** Told when a backup restore replaces the settings, so an open settings screen reloads. */
    subscribe: (listener: (settings: ReminderSettings) => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /**
     * Re-schedules what is saved, e.g. after a reinstall, a language change or a restore (which
     * may ask for the notification permission on a new phone).
     */
    reconcile: (text: ReminderText, adapter: ReminderAdapter, requestPermission = false) =>
      serialize(async () => {
        if (adapter.available) await adapter.replace(profileId, await load(), requestPermission, text);
      }),
    /** Stores a backup's settings without scheduling: `reconcile` schedules them afterwards. */
    restoreSettings: (settings: ReminderSettings) =>
      serialize(async () => {
        const next = validateReminders(settings);
        await storage.setItem(REMINDERS_KEY, JSON.stringify(next));
        listeners.forEach((listener) => listener(next));
      }),
    save: (settings: ReminderSettings, text: ReminderText, adapter: ReminderAdapter) =>
      serialize(async () => {
        const next = validateReminders(settings);
        if (next.enabled && !adapter.available) throw new LocalizedError("reminders.error.unavailable");
        const previous = await load().catch(() => ({ ...DEFAULT_REMINDERS }));
        try {
          await adapter.replace(profileId, next, true, text);
          await storage.setItem(REMINDERS_KEY, JSON.stringify(next));
        } catch (error) {
          try {
            await adapter.replace(profileId, previous, false, text);
          } catch {
            throw new LocalizedError("reminders.error.rollbackFailed");
          }
          throw error;
        }
        return next;
      }),
  };
});
