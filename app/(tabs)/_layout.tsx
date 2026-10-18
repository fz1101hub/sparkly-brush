import { Tabs } from "expo-router";
import { ApprovedTabBar } from "@/components/approved-tab-bar";
export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <ApprovedTabBar {...props} />}
      screenOptions={{ headerShown: false, animation: "none" }}
    >
      <Tabs.Screen name="index" options={{ title: "Oggi" }} />
      <Tabs.Screen name="collection" options={{ title: "Mondo" }} />
      <Tabs.Screen name="rewards" options={{ title: "Premi" }} />
      <Tabs.Screen name="parent" options={{ title: "Famiglia" }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="habitat" options={{ href: null }} />
      <Tabs.Screen name="missions" options={{ href: null }} />
      <Tabs.Screen name="backup" options={{ href: null }} />
      <Tabs.Screen name="hardware-test" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="history" options={{ href: null }} />
      <Tabs.Screen name="device" options={{ href: null }} />
    </Tabs>
  );
}
