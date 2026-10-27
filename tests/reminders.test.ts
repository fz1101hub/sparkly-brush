import { beforeEach, describe, expect, it, vi } from "vitest";
const data = vi.hoisted(() => new Map<string, string>());
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => data.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      data.set(key, value);
    }),
  },
}));
import AsyncStorage from "@react-native-async-storage/async-storage";
import { translateDynamic } from "@/lib/i18n";
import {
  DEFAULT_REMINDERS,
  getReminderService,
  reminderText,
  reminderIdentifiers,
  validateReminders,
  type ReminderAdapter,
} from "@/lib/reminders";
beforeEach(() => {
  data.clear();
  vi.clearAllMocks();
});
const enabled = { ...DEFAULT_REMINDERS, enabled: true, quiet: true };
const TEXT = reminderText((key, params) => translateDynamic("it", key, params), "Emma");

describe("local routine reminders", () => {
  it("validates times and avoids two notifications at the same time", () => {
    expect(() => validateReminders({ ...enabled, morning: "25:00" })).toThrow();
    expect(() => validateReminders({ ...enabled, morning: "8:0" })).toThrow();
    expect(() => validateReminders({ ...enabled, evening: "08:00" })).toThrow(
      "reminders.error.sameTime",
    );
  });
  it("saves independently for each child and schedules the correct name", async () => {
    const adapter: ReminderAdapter = {
      available: true,
      replace: vi.fn(async () => {}),
    };
    await getReminderService("child-a").save(enabled, TEXT, adapter);
    expect(adapter.replace).toHaveBeenCalledWith("child-a", enabled, true, TEXT);
    expect(await getReminderService("child-b").load()).toEqual(
      DEFAULT_REMINDERS,
    );
    expect(reminderIdentifiers("child-a")).not.toEqual(
      reminderIdentifiers("child-b"),
    );
  });
  it("preserves settings when permission is denied", async () => {
    const replace = vi
      .fn()
      .mockRejectedValueOnce(new Error("Permission denied"))
      .mockResolvedValueOnce(undefined);
    await expect(
      getReminderService("primary").save(enabled, TEXT, {
        available: true,
        replace,
      }),
    ).rejects.toThrow(/Permission denied/);
    expect(await getReminderService("primary").load()).toEqual(
      DEFAULT_REMINDERS,
    );
    expect(replace).toHaveBeenLastCalledWith("primary", DEFAULT_REMINDERS, false, TEXT);
  });
  it("rolls the OS schedule back when storing the new configuration fails", async () => {
    const replace = vi.fn(async () => {});
    vi.mocked(AsyncStorage.setItem).mockRejectedValueOnce(
      new Error("Storage full"),
    );
    await expect(
      getReminderService("child-a").save(enabled, TEXT, {
        available: true,
        replace,
      }),
    ).rejects.toThrow(/Storage full/);
    expect(replace).toHaveBeenLastCalledWith("child-a", DEFAULT_REMINDERS, false, TEXT);
    expect(await getReminderService("child-a").load()).toEqual(
      DEFAULT_REMINDERS,
    );
  });
  it("reconciles existing schedules without requesting permission at startup", async () => {
    const adapter = { available: true, replace: vi.fn(async () => {}) };
    await getReminderService("primary").reconcile(TEXT, adapter);
    expect(adapter.replace).toHaveBeenCalledWith("primary", DEFAULT_REMINDERS, false, TEXT);
  });
  it("restores a backup's settings, tells the open screen and then schedules with permission", async () => {
    const service = getReminderService("child-a");
    const seen = vi.fn();
    const stop = service.subscribe(seen);
    const restored = { enabled: true, morning: "07:15", evening: "19:30", quiet: false };
    await service.restoreSettings(restored);
    stop();
    await service.restoreSettings(DEFAULT_REMINDERS);

    expect(seen).toHaveBeenCalledTimes(1);
    expect(seen).toHaveBeenCalledWith(restored);
    await expect(service.restoreSettings({ ...restored, morning: "99:00" })).rejects.toThrow();
    await service.restoreSettings(restored);
    const adapter = { available: true, replace: vi.fn(async () => {}) };
    await service.reconcile(TEXT, adapter, true);
    expect(adapter.replace).toHaveBeenCalledWith("child-a", restored, true, TEXT);
  });
  it("does not claim browser background notifications are available", async () => {
    await expect(
      getReminderService("primary").save(enabled, TEXT, {
        available: false,
        replace: vi.fn(),
      }),
    ).rejects.toThrow("reminders.error.unavailable");
    expect(await getReminderService("primary").load()).toEqual(
      DEFAULT_REMINDERS,
    );
  });
});
