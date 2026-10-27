import { Tabs } from "expo-router";

import { ApprovedTabBar } from "@/components/approved-tab-bar";
import { useI18n } from "@/contexts/locale-context";

/**
 * Four destinations (from PR #10): Today, World, Rewards and Family. Every other screen opens
 * from one of them and is kept out of the bar.
 */
export default function TabLayout() {
  const { t } = useI18n();
  return (
    <Tabs
      // Hidden screens (habitat, backup, settings…) go back to where they were opened from.
      backBehavior="history"
      tabBar={(props) => <ApprovedTabBar {...props} />}
      screenOptions={{ headerShown: false, animation: "none" }}
    >
      <Tabs.Screen name="index" options={{ title: t("tabs.today") }} />
      <Tabs.Screen name="collection" options={{ title: t("tabs.world") }} />
      <Tabs.Screen name="rewards" options={{ title: t("tabs.rewards") }} />
      <Tabs.Screen name="parent" options={{ title: t("tabs.family") }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="habitat" options={{ href: null }} />
      <Tabs.Screen name="missions" options={{ href: null }} />
      <Tabs.Screen name="backup" options={{ href: null }} />
      <Tabs.Screen name="hardware-test" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="history" options={{ href: null }} />
      <Tabs.Screen name="device" options={{ href: null }} />
      <Tabs.Screen name="quiz" options={{ href: null }} />
      <Tabs.Screen name="tooth-names" options={{ href: null }} />
      <Tabs.Screen name="museum" options={{ href: null }} />
      <Tabs.Screen name="dentist-visit" options={{ href: null }} />
      <Tabs.Screen name="braces" options={{ href: null }} />
      <Tabs.Screen name="garden" options={{ href: null }} />
      <Tabs.Screen name="bubble-lab" options={{ href: null }} />
      <Tabs.Screen name="square" options={{ href: null }} />
      <Tabs.Screen name="library" options={{ href: null }} />
      <Tabs.Screen name="tooth-mouse" options={{ href: null }} />
    </Tabs>
  );
}
