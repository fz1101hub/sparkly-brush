import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { BrushlingDefinition, BrushlingId } from "@/lib/brushlings";

const ICONS: Record<BrushlingId, ComponentProps<typeof MaterialIcons>["name"]> = {
  bloopi: "water-drop",
  spriggo: "eco",
  flarello: "local-fire-department",
  voltuff: "bolt",
  moonbit: "dark-mode",
};

export function BrushlingAvatar({
  creature,
  size = 120,
  level,
}: {
  creature: BrushlingDefinition;
  size?: number;
  level?: number;
}) {
  const eyeSize = Math.max(8, Math.round(size * 0.09));

  return (
    <View
      accessibilityLabel={`${creature.name}, creatura di elemento ${creature.element}`}
      style={[
        styles.shell,
        {
          width: size,
          height: size,
          borderRadius: size * 0.36,
          backgroundColor: creature.soft,
          borderColor: creature.accent,
        },
      ]}
    >
      <MaterialIcons
        name={ICONS[creature.id]}
        size={Math.round(size * 0.28)}
        color={creature.accent}
        style={styles.elementIcon}
      />
      <View style={styles.face}>
        <View style={[styles.eye, { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2 }]} />
        <View style={[styles.eye, { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2 }]} />
      </View>
      <View
        style={[
          styles.smile,
          {
            width: size * 0.27,
            height: size * 0.12,
            borderBottomWidth: Math.max(3, Math.round(size * 0.025)),
            borderColor: creature.accent,
            borderRadius: size,
          },
        ]}
      />
      {level !== undefined ? (
        <View style={[styles.levelBadge, { backgroundColor: creature.accent }]}>
          <Text style={styles.levelText}>Lv {level}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    shadowColor: "#17213C",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
    overflow: "hidden",
  },
  elementIcon: {
    position: "absolute",
    top: "12%",
    right: "12%",
    opacity: 0.9,
  },
  face: {
    flexDirection: "row",
    gap: 18,
    marginTop: 12,
  },
  eye: {
    backgroundColor: "#17213C",
  },
  smile: {
    marginTop: 4,
  },
  levelBadge: {
    position: "absolute",
    bottom: 7,
    right: 7,
    minWidth: 42,
    minHeight: 24,
    paddingHorizontal: 8,
    borderRadius: 99,
    alignItems: "center",
    justifyContent: "center",
  },
  levelText: {
    color: "#FFFFFF",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "900",
  },
});
