import { Text, View } from "react-native";

import { CREATURE_CELL_SIZE, CREATURE_MOUTHS } from "@/lib/creature-mouths";

/** Offsets from the mouth centre, in fractions of the creature's size. */
const SPARKLES = [
  { dx: -0.2, dy: -0.06, scale: 1 },
  { dx: 0.21, dy: -0.1, scale: 0.85 },
  { dx: 0.15, dy: 0.12, scale: 0.7 },
] as const;

/**
 * The creature's new smile after the braces come off: three sparkles around the mouth of the
 * approved illustration, for the two weeks after the big day.
 */
export function NewSmileOverlay({ cell, size }: { cell: number; size: number }) {
  const mouth = CREATURE_MOUTHS[cell];
  if (!mouth) return null;
  const scale = size / CREATURE_CELL_SIZE;
  const centerX = (mouth.x + mouth.width / 2) * scale;
  const centerY = (mouth.y + mouth.height / 2) * scale;
  const fontSize = Math.max(12, size * 0.13);
  return (
    <View
      testID="creature-new-smile"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ pointerEvents: "none", position: "absolute", left: 0, top: 0, width: size, height: size }}
    >
      {SPARKLES.map((sparkle) => (
        <Text
          key={`${sparkle.dx}-${sparkle.dy}`}
          style={{
            position: "absolute",
            left: centerX + sparkle.dx * size - (fontSize * sparkle.scale) / 2,
            top: centerY + sparkle.dy * size - (fontSize * sparkle.scale) / 2,
            fontSize: fontSize * sparkle.scale,
            lineHeight: fontSize * sparkle.scale * 1.2,
          }}
        >
          ✨
        </Text>
      ))}
    </View>
  );
}
