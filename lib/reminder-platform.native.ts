import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { LocalizedError } from "@/lib/localized-error";
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

const cancelAll = (identifiers: readonly string[]) =>
  Promise.all(identifiers.map((id) => Notifications.cancelScheduledNotificationAsync(id)));

export const reminderAdapter: ReminderAdapter = {
  available: true,
  permissionGranted: async () => isAllowed(await Notifications.getPermissionsAsync()),
  replace: async (profileId, settings, requestPermission, text) => {
    const identifiers = reminderIdentifiers(profileId);
    if (!settings.enabled) {
      await cancelAll(identifiers);
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
      await cancelAll(identifiers);
      throw new LocalizedError("reminders.error.permissionDenied");
    }
    await cancelAll(identifiers);
    for (const [index, time] of [settings.morning, settings.evening].entries()) {
      const [hour, minute] = time.split(":").map(Number);
      await Notifications.scheduleNotificationAsync({
        identifier: identifiers[index],
        content: {
          title: text.title,
          body: text.body,
          sound: settings.quiet ? false : "default",
          data: { brushlingsProfile: profileId, quiet: settings.quiet },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
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
