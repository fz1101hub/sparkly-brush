import { useEffect, useMemo, useState } from "react";
import { Animated, Platform, StyleSheet, View } from "react-native";

import { useReducedMotion } from "@/hooks/use-reduced-motion";

const PARTICLES = Array.from({ length: 16 }, (_, index) => index);
const COLORS = ["#FFD65A", "#58B9FF", "#7DD790", "#FF8B66", "#B9A8F3"];

export function CelebrationBurst({ active }: { active: boolean }) {
  const [progress] = useState(() => new Animated.Value(0));
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!active || reducedMotion) {
      progress.setValue(0);
      return;
    }
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [active, progress, reducedMotion]);

  const particles = useMemo(() => PARTICLES.map((index) => ({
    index,
    angle: (Math.PI * 2 * index) / PARTICLES.length,
    distance: 95 + (index % 4) * 14,
    color: COLORS[index % COLORS.length],
  })), []);

  // Confetti is purely decorative: skip it entirely when motion is reduced.
  if (!active || reducedMotion) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.container]}>
      {particles.map((particle) => {
        const x = Math.cos(particle.angle) * particle.distance;
        const y = Math.sin(particle.angle) * particle.distance;
        const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, x] });
        const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, y] });
        const opacity = progress.interpolate({ inputRange: [0, 0.72, 1], outputRange: [0, 1, 0] });
        const scale = progress.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.3, 1.15, 0.7] });
        return (
          <Animated.View
            key={particle.index}
            style={[
              styles.particle,
              {
                backgroundColor: particle.color,
                opacity,
                transform: [{ translateX }, { translateY }, { scale }, { rotate: `${particle.index * 31}deg` }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    pointerEvents: "none",
  },
  particle: {
    position: "absolute",
    left: "50%",
    top: "42%",
    width: 10,
    height: 18,
    borderRadius: 4,
    marginLeft: -5,
    marginTop: -9,
  },
});
