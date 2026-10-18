import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
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

export const reminderAdapter: ReminderAdapter = {
  available: true,
  permissionGranted: async () => {
    const permission = await Notifications.getPermissionsAsync();
    return (
      permission.granted ||
      permission.ios?.status ===
        Notifications.IosAuthorizationStatus.PROVISIONAL
    );
  },
  replace: async (profileId, name, settings, requestPermission) => {
    const identifiers = reminderIdentifiers(profileId);
    if (!settings.enabled) {
      await Promise.all(
        identifiers.map((id) =>
          Notifications.cancelScheduledNotificationAsync(id),
        ),
      );
      return;
    }
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(NORMAL_CHANNEL, {
        name: "Routine mattina e sera",
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: "default",
      });
      await Notifications.setNotificationChannelAsync(QUIET_CHANNEL, {
        name: "Routine silenziosa",
        importance: Notifications.AndroidImportance.LOW,
        sound: null,
        enableVibrate: false,
      });
    }
    let permission = await Notifications.getPermissionsAsync();
    if (
      !permission.granted &&
      permission.ios?.status !==
        Notifications.IosAuthorizationStatus.PROVISIONAL &&
      requestPermission &&
      permission.canAskAgain
    ) {
      permission = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowSound: true, allowBadge: false },
      });
    }
    const allowed =
      permission.granted ||
      permission.ios?.status ===
        Notifications.IosAuthorizationStatus.PROVISIONAL;
    if (!allowed) {
      await Promise.all(
        identifiers.map((id) =>
          Notifications.cancelScheduledNotificationAsync(id),
        ),
      );
      throw new Error(
        "Consenti le notifiche nelle impostazioni del telefono per attivare i promemoria",
      );
    }
    await Promise.all(
      identifiers.map((id) =>
        Notifications.cancelScheduledNotificationAsync(id),
      ),
    );
    for (const [index, time] of [
      settings.morning,
      settings.evening,
    ].entries()) {
      const [hour, minute] = time.split(":").map(Number);
      await Notifications.scheduleNotificationAsync({
        identifier: identifiers[index],
        content: {
          title: `${name}, è l’ora del sorriso`,
          body: "Il tuo Brushling ti aspetta per due minuti insieme.",
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

export function subscribeReminderTap(
  listener: (profileId: string) => void,
): () => void {
  let active = true;
  const receive = (response: Notifications.NotificationResponse | null) => {
    const id = response?.notification.request.content.data?.brushlingsProfile;
    if (!active || typeof id !== "string") return;
    const key = `${response!.notification.request.identifier}:${response!.notification.date}`;
    if (handledResponses.has(key)) return;
    handledResponses.add(key);
    if (handledResponses.size > 32)
      handledResponses.delete(handledResponses.values().next().value!);
    listener(id);
    void Notifications.clearLastNotificationResponseAsync().catch(() => {});
  };
  const subscription =
    Notifications.addNotificationResponseReceivedListener(receive);
  void Notifications.getLastNotificationResponseAsync()
    .then(receive)
    .catch(() => {});
  return () => {
    active = false;
    subscription.remove();
  };
}

const handledResponses = new Set<string>();
