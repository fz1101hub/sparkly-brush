import type { TranslationKey, TranslationParams } from "@/lib/i18n";
import { LocalizedError } from "@/lib/localized-error";
import { createProfileStorage, createProfileStore } from "@/lib/profile-scope";

/** Two daily local notifications per child (from PR #10); nothing leaves the phone. */
export type ReminderSettings = {
  skipCompleted?: boolean;
  lastCall?: boolean;
  enabled: boolean;
  morning: string;
  evening: string;
  quiet: boolean;
};
export const DEFAULT_REMINDERS: ReminderSettings = {
  skipCompleted: false,
  lastCall: false,
  enabled: false,
  morning: "08:00",
  evening: "20:00",
  quiet: false,
};
export const REMINDERS_KEY = "sparkly-brush.reminders.v1";

/** Notification copy in the family language, prepared by the caller. */
export type ReminderText = {
  lastCallBody?: string;
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
    lastCallBody: t("care.lastCallBody"),
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
    || (value.skipCompleted !== undefined && typeof value.skipCompleted !== "boolean")
    || (value.lastCall !== undefined && typeof value.lastCall !== "boolean")
  ) {
    throw new LocalizedError("reminders.error.invalidTime");
  }
  if (value.morning === value.evening) throw new LocalizedError("reminders.error.sameTime");
  return {
    ...(value.skipCompleted !== undefined ? { skipCompleted: value.skipCompleted } : {}),
    ...(value.lastCall !== undefined ? { lastCall: value.lastCall } : {}),
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
  return {
    load,
    /** Re-schedules what is saved, e.g. after a reinstall or a language change. */
    reconcile: (text: ReminderText, adapter: ReminderAdapter) =>
      serialize(async () => {
        if (adapter.available) await adapter.replace(profileId, await load(), false, text);
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
