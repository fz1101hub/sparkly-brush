import { beforeEach, describe, expect, it, vi } from "vitest";
const sdk = vi.hoisted(() => ({
  getPermissionsAsync: vi.fn(),
  requestPermissionsAsync: vi.fn(),
  setNotificationChannelAsync: vi.fn(async () => {}),
  cancelScheduledNotificationAsync: vi.fn(async () => {}),
  scheduleNotificationAsync: vi.fn(async () => "scheduled"),
  getAllScheduledNotificationsAsync: vi.fn(async () => [] as { identifier: string }[]),
  setNotificationHandler: vi.fn(),
  addNotificationResponseReceivedListener: vi.fn(
    (_listener: (value: unknown) => void) => ({ remove: vi.fn() }),
  ),
  getLastNotificationResponseAsync: vi.fn(async () => null),
  clearLastNotificationResponseAsync: vi.fn(async () => {}),
}));
vi.mock("expo-notifications", () => ({
  ...sdk,
  AndroidImportance: { DEFAULT: 3, LOW: 2 },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  SchedulableTriggerInputTypes: { DAILY: "daily", DATE: "date" },
}));
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: vi.fn(async () => null), setItem: vi.fn(async () => {}) },
}));
import {
  reminderAdapter,
  subscribeReminderTap,
} from "@/lib/reminder-platform.native";
import { translateDynamic } from "@/lib/i18n";
import { DEFAULT_REMINDERS, reminderPlan, reminderText, type ReminderSettings } from "@/lib/reminders";

const NOW = new Date(2026, 9, 27, 6).getTime();
const planFor = (profile: string, settings: ReminderSettings) => reminderPlan(profile, settings, NOW);

const TEXT = reminderText((key, params) => translateDynamic("it", key, params), "Emma");

beforeEach(() => {
  vi.clearAllMocks();
  sdk.getPermissionsAsync.mockResolvedValue({
    granted: true,
    canAskAgain: true,
  });
  sdk.requestPermissionsAsync.mockResolvedValue({ granted: true });
});
describe("native notification boundary", () => {
  it("schedules dated notifications for the next days, for this child only", async () => {
    const settings = { ...DEFAULT_REMINDERS, enabled: true, morning: "07:45", evening: "19:30" };
    sdk.getAllScheduledNotificationsAsync.mockResolvedValueOnce([
      { identifier: "brushlings-child-emma-morning-2026-10-26" },
      { identifier: "brushlings-child-luca-morning-2026-10-27" },
    ]);
    await reminderAdapter.replace("child-emma", settings, true, TEXT, planFor("child-emma", settings));
    expect(sdk.scheduleNotificationAsync).toHaveBeenCalledTimes(12);
    expect(sdk.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: "brushlings-child-emma-morning-2026-10-27",
        trigger: {
          type: "date",
          date: new Date(2026, 9, 27, 7, 45),
          channelId: "brushlings-routine",
        },
        content: expect.objectContaining({
          title: expect.stringContaining("Emma"),
          data: { brushlingsProfile: "child-emma", quiet: false },
        }),
      }),
    );
    // The daily reminders of earlier versions and this child's old plan go; the sibling's stay.
    expect(sdk.cancelScheduledNotificationAsync.mock.calls.flat().sort()).toEqual([
      "brushlings-child-emma-evening",
      "brushlings-child-emma-morning",
      "brushlings-child-emma-morning-2026-10-26",
    ]);
  });
  it("skips today's brushing already done and adds the gentle last call", async () => {
    const settings = { ...DEFAULT_REMINDERS, enabled: true, lastCall: true, lastCallTime: "21:00" };
    const plan = reminderPlan("primary", settings, NOW, { morning: true, evening: false });
    await reminderAdapter.replace("primary", settings, true, TEXT, plan);
    const ids = (sdk.scheduleNotificationAsync.mock.calls as unknown as [{ identifier: string }][]).map(([request]) => request.identifier);
    expect(ids).not.toContain("brushlings-primary-morning-2026-10-27");
    expect(ids).toContain("brushlings-primary-evening-2026-10-27");
    expect(sdk.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: "brushlings-primary-lastCall-2026-10-27",
        content: expect.objectContaining({ body: TEXT.lastCallBody }),
      }),
    );
  });
  it("uses the quiet channel and disables sound when requested", async () => {
    await reminderAdapter.replace("primary", { ...DEFAULT_REMINDERS, enabled: true, quiet: true }, true, TEXT, planFor("primary", { ...DEFAULT_REMINDERS, enabled: true, quiet: true }));
    expect(sdk.setNotificationChannelAsync).toHaveBeenCalledWith(
      "brushlings-routine-quiet",
      expect.objectContaining({ sound: null, enableVibrate: false }),
    );
    expect(sdk.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ sound: false }),
        trigger: expect.objectContaining({
          channelId: "brushlings-routine-quiet",
        }),
      }),
    );
  });
  it("does not ask for permission when turning reminders off", async () => {
    await reminderAdapter.replace("primary", DEFAULT_REMINDERS, true, TEXT, []);
    expect(sdk.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(sdk.getPermissionsAsync).not.toHaveBeenCalled();
    expect(sdk.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
  it("does not repeatedly ask after a permanent denial", async () => {
    sdk.getPermissionsAsync.mockResolvedValueOnce({
      granted: false,
      canAskAgain: false,
    });
    await expect(
      reminderAdapter.replace("primary", { ...DEFAULT_REMINDERS, enabled: true }, true, TEXT, planFor("primary", { ...DEFAULT_REMINDERS, enabled: true })),
    ).rejects.toMatchObject({ key: "reminders.error.permissionDenied" });
    expect(sdk.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(sdk.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
  it("only requests permission as part of the user's explicit enable action", async () => {
    sdk.getPermissionsAsync.mockResolvedValueOnce({
      granted: false,
      canAskAgain: true,
    });
    await reminderAdapter.replace("primary", { ...DEFAULT_REMINDERS, enabled: true }, true, TEXT, planFor("primary", { ...DEFAULT_REMINDERS, enabled: true }));
    expect(sdk.requestPermissionsAsync).toHaveBeenCalledOnce();
    sdk.getPermissionsAsync.mockResolvedValueOnce({
      granted: false,
      canAskAgain: true,
    });
    await expect(
      reminderAdapter.replace("primary", { ...DEFAULT_REMINDERS, enabled: true }, false, TEXT, planFor("primary", { ...DEFAULT_REMINDERS, enabled: true })),
    ).rejects.toThrow();
    expect(sdk.requestPermissionsAsync).toHaveBeenCalledOnce();
  });
  it("accepts provisional iOS permission without asking again and detects revoked permission", async () => {
    sdk.getPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: true,
      ios: { status: 3 },
    });
    await reminderAdapter.replace("primary", { ...DEFAULT_REMINDERS, enabled: true }, true, TEXT, planFor("primary", { ...DEFAULT_REMINDERS, enabled: true }));
    expect(sdk.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(await reminderAdapter.permissionGranted!()).toBe(true);
    sdk.getPermissionsAsync.mockResolvedValueOnce({
      granted: false,
      canAskAgain: false,
    });
    expect(await reminderAdapter.permissionGranted!()).toBe(false);
  });
  it("dispatches the child's identity from a notification response", async () => {
    const listener = vi.fn();
    const stop = subscribeReminderTap(listener);
    const callback = sdk.addNotificationResponseReceivedListener.mock
      .calls[0][0] as (value: unknown) => void;
    const response = {
      notification: {
        date: 12345,
        request: {
          identifier: "reminder",
          content: { data: { brushlingsProfile: "child-emma" } },
        },
      },
    };
    callback(response);
    callback(response);
    expect(listener).toHaveBeenCalledExactlyOnceWith("child-emma");
    expect(sdk.clearLastNotificationResponseAsync).toHaveBeenCalledOnce();
    stop();
    callback({
      ...response,
      notification: { ...response.notification, date: 67890 },
    });
    expect(listener).toHaveBeenCalledOnce();
  });
});
