import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { useBrush } from "@/contexts/brush-context";
import { useFamily } from "@/contexts/family-context";
import { useI18n } from "@/contexts/locale-context";
import { useColors } from "@/hooks/use-colors";
import { useCurrentDayTimestamp } from "@/hooks/use-current-day";
import { errorText } from "@/lib/localized-error";
import { doneTodayFrom } from "@/lib/reminder-plan";
import { getReminderService, reminderText } from "@/lib/reminders";
import { reminderAdapter, scheduleDentistReminder, subscribeReminderTap } from "@/lib/reminder-platform";
import { useExtras } from "@/contexts/extras-context";
import { dentistReminderAt } from "@/lib/dental-care";

/** Keeps every child's scheduled reminders in step and opens the child a reminder was for. */
export function ReminderLifecycle() {
  const family = useFamily();
  const colors = useColors();
  const router = useRouter();
  const { locale, t } = useI18n();
  const [error, setError] = useState<unknown>(null);
  const { profiles, switchProfile } = family;
  const activeId = family.active.id;
  const activeName = family.active.name;
  const { history, demoMode } = useBrush();
  // Real sessions only: a demo session must not silence tonight's reminder.
  const today = useCurrentDayTimestamp();
  const done = doneTodayFrom(demoMode ? [] : history, today);
  const doneMorning = done.morning;
  const doneEvening = done.evening;

  // Also after a language change: the scheduled copy is written in the family language.
  useEffect(() => {
    for (const profile of profiles) {
      if (profile.id === activeId) continue;
      void getReminderService(profile.id)
        .reconcile(reminderText(t, profile.name), reminderAdapter)
        .catch(() => {});
    }
  }, [activeId, locale, profiles, t]);

  // The dentist visit of the active child (voce 32): set in the family area or restored.
  const visit = useExtras().extras.dentistVisit;
  const visitDay = visit?.day ?? null;
  const visitNotice = visit?.noticeDays ?? null;
  useEffect(() => {
    const at = visitDay && visitNotice ? dentistReminderAt(visitDay, visitNotice) : null;
    void scheduleDentistReminder(activeId, at, {
      title: t("dentist.notification.title", { name: activeName }),
      body: t("dentist.notification.body", { count: visitNotice ?? 0 }),
    }).catch(() => {});
  }, [activeId, activeName, locale, t, visitDay, visitNotice]);

  // The active child's reminders skip what is already brushed today (voce 59).
  useEffect(() => {
    void getReminderService(activeId)
      .reconcile(reminderText(t, activeName), reminderAdapter, false, { morning: doneMorning, evening: doneEvening })
      .catch(() => {});
  }, [activeId, activeName, doneEvening, doneMorning, locale, t]);

  useEffect(
    () =>
      subscribeReminderTap((id) => {
        if (!profiles.some((p) => p.id === id)) return;
        void (async () => {
          try {
            if (id !== activeId) await switchProfile(id);
            else router.replace("/(tabs)");
          } catch (caught) {
            setError(caught);
          }
        })();
      }),
    [activeId, profiles, router, switchProfile],
  );

  return error ? (
    <View
      accessibilityLiveRegion="polite"
      style={{
        padding: 16,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text style={{ color: colors.foreground, fontSize: 16 }}>
        {errorText(error, t, "family.switch.error.sessionActive")}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => setError(null)}
        style={{ minHeight: 48, justifyContent: "center" }}
      >
        <Text style={{ color: colors.primary, fontSize: 16 }}>{t("reminders.tap.dismiss")}</Text>
      </Pressable>
    </View>
  ) : null;
}
