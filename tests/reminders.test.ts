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
import {
  DEFAULT_REMINDERS,
  getReminderService,
  reminderIdentifiers,
  validateReminders,
  type ReminderAdapter,
} from "@/lib/reminders";
beforeEach(() => {
  data.clear();
  vi.clearAllMocks();
});
const enabled = { ...DEFAULT_REMINDERS, enabled: true, quiet: true };

describe("local routine reminders", () => {
  it("validates times and avoids two notifications at the same time", () => {
    expect(() => validateReminders({ ...enabled, morning: "25:00" })).toThrow();
    expect(() => validateReminders({ ...enabled, morning: "8:0" })).toThrow();
    expect(() => validateReminders({ ...enabled, evening: "08:00" })).toThrow(
      /diversi/,
    );
  });
  it("saves independently for each child and schedules the correct name", async () => {
    const adapter: ReminderAdapter = {
      available: true,
      replace: vi.fn(async () => {}),
    };
    await getReminderService("child-a").save("Emma", enabled, adapter);
    expect(adapter.replace).toHaveBeenCalledWith(
      "child-a",
      "Emma",
      enabled,
      true,
    );
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
      getReminderService("primary").save("Emma", enabled, {
        available: true,
        replace,
      }),
    ).rejects.toThrow(/Permission denied/);
    expect(await getReminderService("primary").load()).toEqual(
      DEFAULT_REMINDERS,
    );
    expect(replace).toHaveBeenLastCalledWith(
      "primary",
      "Emma",
      DEFAULT_REMINDERS,
      false,
    );
  });
  it("rolls the OS schedule back when storing the new configuration fails", async () => {
    const replace = vi.fn(async () => {});
    vi.mocked(AsyncStorage.setItem).mockRejectedValueOnce(
      new Error("Storage full"),
    );
    await expect(
      getReminderService("child-a").save("Emma", enabled, {
        available: true,
        replace,
      }),
    ).rejects.toThrow(/Storage full/);
    expect(replace).toHaveBeenLastCalledWith(
      "child-a",
      "Emma",
      DEFAULT_REMINDERS,
      false,
    );
    expect(await getReminderService("child-a").load()).toEqual(
      DEFAULT_REMINDERS,
    );
  });
  it("reconciles existing schedules without requesting permission at startup", async () => {
    const adapter = { available: true, replace: vi.fn(async () => {}) };
    await getReminderService("primary").reconcile("Emma", adapter);
    expect(adapter.replace).toHaveBeenCalledWith(
      "primary",
      "Emma",
      DEFAULT_REMINDERS,
      false,
    );
  });
  it("does not claim browser background notifications are available", async () => {
    await expect(
      getReminderService("primary").save("Emma", enabled, {
        available: false,
        replace: vi.fn(),
      }),
    ).rejects.toThrow(/iOS e Android/);
    expect(await getReminderService("primary").load()).toEqual(
      DEFAULT_REMINDERS,
    );
  });
});
