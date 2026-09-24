import { useEffect, useMemo, useState } from "react";
import { Animated, Platform, StyleSheet, View } from "react-native";

const PARTICLES = Array.from({ length: 16 }, (_, index) => index);
const COLORS = ["#FFD65A", "#58B9FF", "#7DD790", "#FF8B66", "#B9A8F3"];

export function CelebrationBurst({ active }: { active: boolean }) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!active) {
      progress.setValue(0);
      return;
    }
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [active, progress]);

  const particles = useMemo(() => PARTICLES.map((index) => ({
    index,
    angle: (Math.PI * 2 * index) / PARTICLES.length,
    distance: 95 + (index % 4) * 14,
    color: COLORS[index % COLORS.length],
  })), []);

  if (!active) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
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
