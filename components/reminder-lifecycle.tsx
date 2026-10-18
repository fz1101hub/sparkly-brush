import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useFamily } from "@/contexts/family-context";
import { useColors } from "@/hooks/use-colors";
import { getReminderService } from "@/lib/reminders";
import { reminderAdapter, subscribeReminderTap } from "@/lib/reminder-platform";

export function ReminderLifecycle() {
  const family = useFamily();
  const colors = useColors();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const profiles = family.profiles;
  const switchProfile = family.switchProfile;
  const activeId = family.active.id;
  useEffect(() => {
    for (const profile of profiles)
      void getReminderService(profile.id)
        .reconcile(profile.name, reminderAdapter)
        .catch(() => {});
  }, [profiles]);
  useEffect(
    () =>
      subscribeReminderTap((id) => {
        if (!profiles.some((p) => p.id === id)) return;
        void (async () => {
          try {
            if (id !== activeId) await switchProfile(id);
            else router.replace("/(tabs)");
          } catch (caught) {
            setError(
              caught instanceof Error
                ? caught.message
                : "Termina la sessione prima di cambiare profilo",
            );
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
      <Text style={{ color: colors.foreground, fontSize: 16 }}>{error}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => setError(null)}
        style={{ minHeight: 48, justifyContent: "center" }}
      >
        <Text style={{ color: colors.primary, fontSize: 16 }}>
          Chiudi avviso
        </Text>
      </Pressable>
    </View>
  ) : null;
}
