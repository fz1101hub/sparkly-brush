import { useEffect, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, View } from "react-native";

import { BrushlingAvatar } from "@/components/brushling-avatar";
import type { BrushlingDefinition } from "@/lib/brushlings";

export function AnimatedBrushling({
  creature,
  level,
  size = 118,
  active,
}: {
  creature: BrushlingDefinition;
  level: number;
  size?: number;
  active: boolean;
}) {
  const [bounce] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!active) {
      bounce.stopAnimation();
      bounce.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: 1,
          duration: 460,
          easing: Easing.out(Easing.quad),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration: 460,
          easing: Easing.in(Easing.quad),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [active, bounce]);

  const translateY = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });
  const rotate = bounce.interpolate({ inputRange: [0, 0.5, 1], outputRange: ["-1deg", "1deg", "-1deg"] });
  const scale = bounce.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });

  return (
    <View style={[styles.frame, { width: size, height: size + 8 }]}>
      <Animated.View style={{ transform: [{ translateY }, { rotate }, { scale }] }}>
        <BrushlingAvatar creature={creature} size={size} level={level} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignItems: "center", justifyContent: "flex-end" },
});
