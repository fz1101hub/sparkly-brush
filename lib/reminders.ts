import type { TranslationKey, TranslationParams } from "@/lib/i18n";
import { LocalizedError } from "@/lib/localized-error";
import { createProfileStorage, createProfileStore } from "@/lib/profile-scope";
import { planReminders, type DoneToday, type PlannedReminder } from "@/lib/reminder-plan";

/** Two daily local notifications per child (from PR #10); nothing leaves the phone. */
export type ReminderSettings = {
  enabled: boolean;
  morning: string;
  evening: string;
  quiet: boolean;
  /** «Ultimo richiamo gentile» (voce 60): a second evening reminder, only if the parent wants it. */
  lastCall?: boolean;
  lastCallTime?: string;
};
export const DEFAULT_REMINDERS: ReminderSettings = {
  enabled: false,
  morning: "08:00",
  evening: "20:00",
  quiet: false,
  lastCall: false,
  lastCallTime: "21:00",
};
export const REMINDERS_KEY = "sparkly-brush.reminders.v1";

/** Notification copy in the family language, prepared by the caller. */
export type ReminderText = {
  title: string;
  body: string;
  lastCallBody: string;
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
    lastCallBody: t("reminders.notification.lastCallBody"),
    channel: t("reminders.channel.normal"),
    quietChannel: t("reminders.channel.quiet"),
  };
}

export type ReminderAdapter = {
  available: boolean;
  permissionGranted?: () => Promise<boolean>;
  /** Replaces this child's scheduled reminders with the planned ones (none when disabled). */
  replace: (
    profileId: string,
    settings: ReminderSettings,
    requestPermission: boolean,
    text: ReminderText,
    plan: PlannedReminder[],
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
  const lastCall = value.lastCall === true;
  const lastCallTime = typeof value.lastCallTime === "string" ? value.lastCallTime : "21:00";
  if (!TIME.test(lastCallTime)) throw new LocalizedError("reminders.error.invalidTime");
  if (lastCall && lastCallTime <= value.evening) throw new LocalizedError("reminders.error.lastCallBeforeEvening");
  return {
    enabled: value.enabled,
    morning: value.morning,
    evening: value.evening,
    quiet: value.quiet,
    lastCall,
    lastCallTime,
  };
}

/** The dated reminders of the next days, leaving out today's brushings already done (voce 59). */
export function reminderPlan(profileId: string, settings: ReminderSettings, now: number, doneToday?: DoneToday): PlannedReminder[] {
  return planReminders(
    profileId,
    {
      enabled: settings.enabled,
      morning: settings.morning,
      evening: settings.evening,
      lastCall: settings.lastCall === true,
      lastCallTime: settings.lastCallTime ?? "21:00",
    },
    now,
    doneToday,
  );
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
    reconcile: (text: ReminderText, adapter: ReminderAdapter, requestPermission = false, doneToday?: DoneToday) =>
      serialize(async () => {
        if (!adapter.available) return;
        const settings = await load();
        await adapter.replace(profileId, settings, requestPermission, text, reminderPlan(profileId, settings, Date.now(), doneToday));
      }),
    /** Stores a backup's settings without scheduling: `reconcile` schedules them afterwards. */
    restoreSettings: (settings: ReminderSettings) =>
      serialize(async () => {
        const next = validateReminders(settings);
        await storage.setItem(REMINDERS_KEY, JSON.stringify(next));
        listeners.forEach((listener) => listener(next));
      }),
    save: (settings: ReminderSettings, text: ReminderText, adapter: ReminderAdapter, doneToday?: DoneToday) =>
      serialize(async () => {
        const next = validateReminders(settings);
        if (next.enabled && !adapter.available) throw new LocalizedError("reminders.error.unavailable");
        const previous = await load().catch(() => ({ ...DEFAULT_REMINDERS }));
        try {
          await adapter.replace(profileId, next, true, text, reminderPlan(profileId, next, Date.now(), doneToday));
          await storage.setItem(REMINDERS_KEY, JSON.stringify(next));
        } catch (error) {
          try {
            await adapter.replace(profileId, previous, false, text, reminderPlan(profileId, previous, Date.now(), doneToday));
          } catch {
            throw new LocalizedError("reminders.error.rollbackFailed");
          }
          throw error;
        }
        return next;
      }),
  };
});
