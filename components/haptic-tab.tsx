import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";

import { usePreferences } from "@/contexts/preferences-context";

export function HapticTab(props: BottomTabBarButtonProps) {
  const { preferences } = usePreferences();
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === "ios" && preferences.hapticsEnabled) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}
