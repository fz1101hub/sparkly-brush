import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { useFamily } from "@/contexts/family-context";
import { useI18n } from "@/contexts/locale-context";
import { useColors } from "@/hooks/use-colors";
import { errorText } from "@/lib/localized-error";
import { getReminderService, reminderText } from "@/lib/reminders";
import { reminderAdapter, subscribeReminderTap } from "@/lib/reminder-platform";

/** Keeps every child's scheduled reminders in step and opens the child a reminder was for. */
export function ReminderLifecycle() {
  const family = useFamily();
  const colors = useColors();
  const router = useRouter();
  const { locale, t } = useI18n();
  const [error, setError] = useState<unknown>(null);
  const { profiles, switchProfile } = family;
  const activeId = family.active.id;

  // Also after a language change: the scheduled copy is written in the family language.
  useEffect(() => {
    for (const profile of profiles) {
      void getReminderService(profile.id)
        .reconcile(reminderText(t, profile.name), reminderAdapter)
        .catch(() => {});
    }
  }, [locale, profiles, t]);

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
