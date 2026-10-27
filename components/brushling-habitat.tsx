import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { StyleSheet, View } from "react-native";
import { DesignText as Text } from "@/components/design-text";

import { BrushlingAvatar } from "@/components/brushling-avatar";
import { useCreatureBraces } from "@/contexts/braces-context";
import { readableAccent } from "@/constants/accessibility-colors";
import { useI18n } from "@/contexts/locale-context";
import type { BrushlingDefinition } from "@/lib/brushlings";
import {
  getCustomizationItem,
  localizeCustomizationItem,
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
  const { t } = useI18n();
  const habitat = getCustomizationItem(customization.equippedHabitatId);
  const accessory = getCustomizationItem(customization.equippedAccessoryId);
  const decor = getCustomizationItem(customization.equippedDecorId);
  const localizedHabitat = habitat
    ? localizeCustomizationItem(habitat, t)
    : null;
  const braces = useCreatureBraces();
  const accent = readableAccent(habitat?.accent ?? creature.accent);

  return (
    <View
      accessibilityLabel={t("game.habitat.sceneLabel", {
        name: creature.name,
        habitat: localizedHabitat?.name ?? t("game.habitat.defaultHome"),
      })}
      style={[
        styles.scene,
        {
          minHeight: height,
          backgroundColor: habitat?.soft ?? creature.soft,
          borderColor: habitat?.accent ?? creature.accent,
        },
      ]}
    >
      <View style={styles.sky}>
        <MaterialIcons
          name={habitat?.icon ?? "opacity"}
          size={34}
          color={accent}
          style={styles.skyIcon}
        />
        <View style={styles.cloudOne} />
        <View style={styles.cloudTwo} />
      </View>

      {decor ? (
        <View
          style={[
            styles.decor,
            { backgroundColor: "#FFFFFFCC", borderColor: decor.accent },
          ]}
        >
          <MaterialIcons
            name={decor.icon}
            size={34}
            color={readableAccent(decor.accent)}
          />
        </View>
      ) : (
        <View
          style={[
            styles.decor,
            { backgroundColor: "#FFFFFF88", borderColor: "#FFFFFF" },
          ]}
        >
          <MaterialIcons name="home" size={30} color={accent} />
        </View>
      )}

      <View style={styles.creatureWrap}>
        {accessory ? (
          <View
            style={[
              styles.accessoryBadge,
              { backgroundColor: readableAccent(accessory.accent) },
            ]}
          >
            <MaterialIcons name={accessory.icon} size={24} color="#FFFFFF" />
          </View>
        ) : null}
        <BrushlingAvatar framed={false} creature={creature} size={152} level={level} braces={braces} />
      </View>

      <View style={[styles.ground, { backgroundColor: habitat?.accent ?? creature.accent }]} />

      <View style={styles.label}>
        <Text style={styles.labelText}>
          {localizedHabitat?.name ?? t("game.habitat.defaultHome")}
        </Text>
      </View>
    </View>
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
  sky: { ...StyleSheet.absoluteFill },
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
