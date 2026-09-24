import type { BottomTabBarButtonProps } from "expo-router/js-tabs";
import { PlatformPressable } from "expo-router/react-navigation";
import * as Haptics from "expo-haptics";

import { usePreferences } from "@/contexts/preferences-context";

export function HapticTab(props: BottomTabBarButtonProps) {
  const { preferences } = usePreferences();
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === "ios" && preferences.hapticsEnabled) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}
