import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { LocalizedError } from "@/lib/localized-error";
import { reminderIdPrefix } from "@/lib/reminder-plan";
import { reminderIdentifiers, type ReminderAdapter } from "@/lib/reminders";

const NORMAL_CHANNEL = "brushlings-routine";
const QUIET_CHANNEL = "brushlings-routine-quiet";

Notifications.setNotificationHandler({
  handleNotification: async (notification) => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: notification.request.content.data?.quiet !== true,
    shouldSetBadge: false,
  }),
});

const isAllowed = (permission: Notifications.NotificationPermissionsStatus) =>
  permission.granted
  || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

/**
 * This child's reminders: the daily ones of earlier versions and the dated ones planned since
 * 27 October 2026 (voce 59), all named after the profile.
 */
async function cancelAll(profileId: string): Promise<void> {
  const prefix = reminderIdPrefix(profileId);
  const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  const ids = new Set([
    ...reminderIdentifiers(profileId),
    ...scheduled.map((item) => item.identifier).filter((id) => id.startsWith(prefix)),
  ]);
  await Promise.all([...ids].map((id) => Notifications.cancelScheduledNotificationAsync(id)));
}

export const reminderAdapter: ReminderAdapter = {
  available: true,
  permissionGranted: async () => isAllowed(await Notifications.getPermissionsAsync()),
  replace: async (profileId, settings, requestPermission, text, plan) => {
    if (!settings.enabled) {
      await cancelAll(profileId);
      return;
    }
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(NORMAL_CHANNEL, {
        name: text.channel,
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: "default",
      });
      await Notifications.setNotificationChannelAsync(QUIET_CHANNEL, {
        name: text.quietChannel,
        importance: Notifications.AndroidImportance.LOW,
        sound: null,
        enableVibrate: false,
      });
    }
    let permission = await Notifications.getPermissionsAsync();
    if (!isAllowed(permission) && requestPermission && permission.canAskAgain) {
      permission = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowSound: true, allowBadge: false },
      });
    }
    if (!isAllowed(permission)) {
      await cancelAll(profileId);
      throw new LocalizedError("reminders.error.permissionDenied");
    }
    await cancelAll(profileId);
    for (const reminder of plan) {
      await Notifications.scheduleNotificationAsync({
        identifier: reminder.id,
        content: {
          title: text.title,
          body: reminder.slot === "lastCall" ? text.lastCallBody : text.body,
          sound: settings.quiet ? false : "default",
          data: { brushlingsProfile: profileId, quiet: settings.quiet },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(reminder.at),
          channelId: settings.quiet ? QUIET_CHANNEL : NORMAL_CHANNEL,
        },
      });
    }
  },
};

const handledResponses = new Set<string>();

/** Opening a reminder switches to the child it was scheduled for. */
export function subscribeReminderTap(
  listener: (profileId: string) => void,
): () => void {
  let active = true;
  const receive = (response: Notifications.NotificationResponse | null) => {
    const id = response?.notification.request.content.data?.brushlingsProfile;
    if (!active || !response || typeof id !== "string") return;
    const key = `${response.notification.request.identifier}:${response.notification.date}`;
    if (handledResponses.has(key)) return;
    handledResponses.add(key);
    if (handledResponses.size > 32) {
      const oldest = handledResponses.values().next().value;
      if (oldest !== undefined) handledResponses.delete(oldest);
    }
    listener(id);
    void Notifications.clearLastNotificationResponseAsync().catch(() => {});
  };
  const subscription = Notifications.addNotificationResponseReceivedListener(receive);
  void Notifications.getLastNotificationResponseAsync().then(receive).catch(() => {});
  return () => {
    active = false;
    subscription.remove();
  };
}

/** One notification per child a few days before the dentist visit (voce 32); null removes it. */
export async function scheduleDentistReminder(
  profileId: string,
  at: number | null,
  text: { title: string; body: string },
): Promise<void> {
  const identifier = `brushlings-dentist-${profileId}`;
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined);
  if (at === null || at <= Date.now()) return;
  if (!isAllowed(await Notifications.getPermissionsAsync())) return;
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: { title: text.title, body: text.body, data: { brushlingsProfile: profileId, quiet: false } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(at), channelId: NORMAL_CHANNEL },
  });
}

/** Sunday-evening notification with the weekly summary (voce 31); null cancels it. */
export async function scheduleWeeklySummary(
  profileId: string,
  at: number | null,
  text: { title: string; body: string },
): Promise<void> {
  const identifier = `brushlings-weekly-${profileId}`;
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined);
  if (at === null || at <= Date.now()) return;
  if (!isAllowed(await Notifications.getPermissionsAsync())) return;
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: { title: text.title, body: text.body, data: { brushlingsProfile: profileId, quiet: false } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(at), channelId: NORMAL_CHANNEL },
  });
}

/** Every scheduled reminder of every child (voce 70, delete all family data). */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
