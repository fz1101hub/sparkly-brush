import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useI18n } from "@/contexts/locale-context";
import { useColors } from "@/hooks/use-colors";

export default function TabLayout() {
  const colors = useColors();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "800", marginTop: 2 },
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: 60 + bottomPadding,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.today"),
          tabBarButtonTestID: "tab-today",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          title: t("tabs.creatures"),
          tabBarButtonTestID: "tab-creatures",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="pawprint.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t("tabs.explore"),
          tabBarButtonTestID: "tab-explore",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="map.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="habitat"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="missions"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="parent"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="backup"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="hardware-test"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t("tabs.history"),
          tabBarButtonTestID: "tab-history",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="clock.arrow.circlepath" color={color} />,
        }}
      />
      <Tabs.Screen
        name="device"
        options={{
          title: t("tabs.toothbrush"),
          tabBarButtonTestID: "tab-device",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="antenna.radiowaves.left.and.right" color={color} />,
        }}
      />
    </Tabs>
  );
}
