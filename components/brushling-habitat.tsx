import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { StyleSheet, Text, View } from "react-native";

import { ThemeScene } from "@/components/theme-scene";
import { useThemeContext } from "@/lib/theme-provider";
import { BrushlingAvatar } from "@/components/brushling-avatar";
import type { BrushlingDefinition } from "@/lib/brushlings";
import {
  getCustomizationItem,
  type CustomizationState,
} from "@/lib/customization";

export function BrushlingHabitat({
  creature,
  level,
  customization,
  height = 300,
}: {
  creature: BrushlingDefinition;
  level: number;
  customization: CustomizationState;
  height?: number;
}) {
  const { theme } = useThemeContext();
  const habitat = getCustomizationItem(customization.equippedHabitatId);
  const accessory = getCustomizationItem(customization.equippedAccessoryId);
  const decor = getCustomizationItem(customization.equippedDecorId);

  return (
    <ThemeScene
      themeId={theme.id}
      style={[
        styles.scene,
        {
          minHeight: height,
          backgroundColor: theme.colors.primarySoft,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.sky}>
        <MaterialIcons
          name={habitat?.icon ?? "opacity"}
          size={34}
          color={habitat?.accent ?? creature.accent}
          style={styles.skyIcon}
        />
        <View style={styles.cloudOne} />
        <View style={styles.cloudTwo} />
      </View>

      {decor ? (
        <View style={[styles.decor, { backgroundColor: "#FFFFFFCC", borderColor: decor.accent }]}>
          <MaterialIcons name={decor.icon} size={34} color={decor.accent} />
        </View>
      ) : (
        <View style={[styles.decor, { backgroundColor: "#FFFFFF88", borderColor: "#FFFFFF" }]}>
          <MaterialIcons name="home" size={30} color={habitat?.accent ?? creature.accent} />
        </View>
      )}

      <View style={styles.creatureWrap}>
        {accessory ? (
          <View style={[styles.accessoryBadge, { backgroundColor: accessory.accent }]}>
            <MaterialIcons name={accessory.icon} size={24} color="#FFFFFF" />
          </View>
        ) : null}
        <BrushlingAvatar framed={false} creature={creature} size={152} level={level} />
      </View>

      <View style={[styles.ground, { backgroundColor: habitat?.accent ?? creature.accent }]} />

      <View style={styles.label}>
        <Text style={styles.labelText}>{habitat?.name ?? "La tua tana"}</Text>
      </View>
    </ThemeScene>
  );
}

const styles = StyleSheet.create({
  scene: {
    width: "100%",
    borderWidth: 2,
    borderRadius: 30,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "flex-end",
    position: "relative",
  },
  sky: { ...StyleSheet.absoluteFillObject },
  skyIcon: { position: "absolute", top: 22, right: 25, opacity: 0.55 },
  cloudOne: {
    position: "absolute",
    top: 38,
    left: 26,
    width: 76,
    height: 25,
    borderRadius: 99,
    backgroundColor: "#FFFFFFAA",
  },
  cloudTwo: {
    position: "absolute",
    top: 72,
    right: 72,
    width: 52,
    height: 18,
    borderRadius: 99,
    backgroundColor: "#FFFFFF88",
  },
  creatureWrap: {
    marginBottom: 47,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    zIndex: 3,
  },
  accessoryBadge: {
    position: "absolute",
    top: -11,
    right: -8,
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 7,
  },
  decor: {
    position: "absolute",
    left: 24,
    bottom: 50,
    width: 72,
    height: 72,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 4,
  },
  ground: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 58,
    opacity: 0.23,
  },
  label: {
    position: "absolute",
    left: 14,
    top: 14,
    backgroundColor: "#FFFFFFCC",
    borderRadius: 99,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  labelText: { color: "#17213C", fontSize: 10, lineHeight: 14, fontWeight: "900" },
});

