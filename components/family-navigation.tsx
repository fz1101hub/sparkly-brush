import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import { useI18n } from "@/contexts/locale-context";
import { useColors } from "@/hooks/use-colors";

/** The family tab's way into the screens that left the tab bar (from PR #10). */
export function FamilyNavigation() {
  const router = useRouter();
  const colors = useColors();
  const { t } = useI18n();
  const items = [
    { title: t("family.nav.profilesThemes"), icon: "palette", route: "/(tabs)/settings", testID: "family-nav-settings" },
    { title: t("tabs.toothbrush"), icon: "bluetooth", route: "/(tabs)/device", testID: "family-nav-device" },
    { title: t("tabs.history"), icon: "history", route: "/(tabs)/history", testID: "family-nav-history" },
    { title: t("family.nav.backup"), icon: "backup", route: "/(tabs)/backup", testID: "family-nav-backup" },
  ] as const;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      {items.map((item) => (
        <Pressable
          key={item.route}
          testID={item.testID}
          accessibilityRole="button"
          accessibilityLabel={item.title}
          onPress={() => router.push(item.route)}
          style={({ pressed }) => ({
            flexGrow: 1,
            flexBasis: "45%",
            minHeight: 76,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
            padding: 12,
            gap: 6,
            opacity: pressed ? 0.84 : 1,
          })}
        >
          <MaterialIcons accessible={false} name={item.icon} size={26} color={colors.primary} />
          <Text style={{ color: colors.foreground, fontFamily: "BrushlingsBlack", fontSize: 15, textAlign: "center" }}>
            {item.title}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
