import { View } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import { ReferenceArtwork } from "@/components/reference-artwork";
import { useI18n } from "@/contexts/locale-context";
import { APPROVED_DESIGN } from "@/lib/approved-design";
import { useThemeContext } from "@/lib/theme-provider";

/** The drawing shows the upper right quarter: flipping it highlights each zone in turn. */
const FLIPS = [
  [1, 1],
  [-1, 1],
  [-1, -1],
  [1, -1],
] as const;

/**
 * The approved mouth drawing (from PR #10) with the progress semantics of this branch: screen
 * readers hear how many zones are done and which one is active.
 */
export function MouthZones({
  activeZone,
  isActive,
  size = 215,
  showSteps = false,
}: {
  activeZone: number;
  isActive: boolean;
  size?: number;
  showSteps?: boolean;
}) {
  const { theme } = useThemeContext();
  const { t } = useI18n();
  const design = APPROVED_DESIGN[theme.id];
  const zones = [
    t("timer.zone.upperRight"),
    t("timer.zone.upperLeft"),
    t("timer.zone.lowerLeft"),
    t("timer.zone.lowerRight"),
  ];
  const zone = Math.min(zones.length - 1, Math.max(0, activeZone));
  const completedZones = isActive ? zone : 0;
  const progressText = t("mouthZones.progressText", { completed: completedZones, total: zones.length });
  const stepSize = Math.min(62, Math.max(38, size * 0.235));
  const labelPanel =
    theme.id === "cosmos" ? "#211A3B" : theme.id === "garden" ? "#FFE39B" : theme.id === "bubbles" ? "#CFEFFF" : undefined;
  return (
    <View
      testID="mouth-zones-progress"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t("mouthZones.progressLabel")}
      accessibilityHint={isActive ? t("mouthZones.activeHint", { zone: zones[zone] }) : t("mouthZones.inactiveHint")}
      accessibilityValue={{ min: 0, now: completedZones, max: zones.length, text: progressText }}
      aria-valuemin={0}
      aria-valuenow={completedZones}
      aria-valuemax={zones.length}
      aria-valuetext={progressText}
      style={{ alignItems: "center", gap: 6, maxWidth: "100%" }}
    >
      <View
        style={{
          transform: [{ scaleX: FLIPS[zone][0] }, { scaleY: FLIPS[zone][1] }],
          opacity: isActive ? 1 : 0.7,
          borderRadius: size / 2,
          overflow: "hidden",
        }}
      >
        <ReferenceArtwork
          region={design.mouth}
          width={size}
          height={(size * design.mouth.rect[3]) / design.mouth.rect[2]}
          fit="contain"
          fadeColor={theme.id === "adventure" ? "#C4EEE4" : theme.id === "bubbles" ? "#DDF5FF" : design.base}
          fadeSize={8}
        />
      </View>
      <View style={{ alignItems: "center", gap: 3, maxWidth: "100%" }}>
        <View
          style={{
            maxWidth: "100%",
            borderRadius: 28,
            paddingHorizontal: labelPanel ? 20 : 0,
            paddingVertical: labelPanel ? 4 : 0,
            backgroundColor: labelPanel,
            borderWidth: labelPanel ? 1 : 0,
            borderColor: theme.id === "cosmos" ? "#B99CD4" : "#FFFFFFA0",
          }}
        >
          <Text
            style={{ color: design.ink, fontFamily: "BrushlingsDisplay", fontSize: 28, lineHeight: 34, textAlign: "center" }}
          >
            {isActive ? zones[zone] : t("mouthZones.idleTitle")}
          </Text>
        </View>
        {theme.id !== "arcade" ? (
          <Text style={{ color: design.ink, fontFamily: "BrushlingsBody", fontSize: 18, lineHeight: 24 }}>
            {isActive
              ? theme.id === "adventure"
                ? t("mouthZones.brushFor", { seconds: 30 })
                : t("mouthZones.zoneOf", { zone: zone + 1, total: zones.length })
              : t("mouthZones.perZone", { seconds: 30 })}
          </Text>
        ) : null}
      </View>
      {showSteps ? (
        <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
          {FLIPS.map(([x, y], index) => (
            <View
              key={index}
              style={{
                width: stepSize,
                height: stepSize,
                borderRadius: stepSize / 2,
                borderWidth: index === zone ? 2 : 1,
                borderColor: index === zone ? design.timer : "#FFFFFF80",
                backgroundColor: design.panel,
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                opacity: index === zone ? 1 : 0.6,
              }}
            >
              <View style={{ transform: [{ scaleX: x }, { scaleY: y }] }}>
                <ReferenceArtwork region={design.mouth} width={stepSize * 0.82} height={stepSize * 0.82} fit="contain" />
              </View>
              {index !== zone ? (
                <View style={{ pointerEvents: "none", position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "#6C9CEF66" }}
                />
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
