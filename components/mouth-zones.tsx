import { View } from "react-native";
import { DesignText as Text } from "@/components/design-text";

import { useI18n } from "@/contexts/locale-context";
import { useColors } from "@/hooks/use-colors";

export function MouthZones({
  activeZone,
  isActive,
}: {
  activeZone: number;
  isActive: boolean;
}) {
  const colors = useColors();
  const { t } = useI18n();
  const zones = [
    t("timer.zone.upperRight"),
    t("timer.zone.upperLeft"),
    t("timer.zone.lowerLeft"),
    t("timer.zone.lowerRight"),
  ];
  const safeZone = Math.max(0, Math.min(activeZone, zones.length - 1));
  const completedZones = isActive ? safeZone : 0;
  const progressText = t("mouthZones.progressText", {
    completed: completedZones,
    total: zones.length,
  });

  return (
    <View
      testID="mouth-zones-progress"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t("mouthZones.progressLabel")}
      accessibilityHint={
        isActive
          ? t("mouthZones.activeHint", { zone: zones[safeZone] })
          : t("mouthZones.inactiveHint")
      }
      accessibilityValue={{
        min: 0,
        now: completedZones,
        max: zones.length,
        text: progressText,
      }}
      aria-valuemin={0}
      aria-valuenow={completedZones}
      aria-valuemax={zones.length}
      aria-valuetext={progressText}
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {zones.map((label, index) => {
          const selected = isActive && index === activeZone;
          const completed = isActive && index < activeZone;
          return (
            <View
              key={label}
              style={{
                width: "48%",
                minHeight: 68,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: selected ? colors.primary : colors.border,
                backgroundColor: selected ? "#E7EEFF" : completed ? "#E7F7F1" : colors.surface,
                paddingHorizontal: 12,
                paddingVertical: 10,
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: selected ? colors.primary : colors.foreground,
                  fontWeight: "800",
                  fontSize: 13,
                  lineHeight: 18,
                }}
              >
                {completed
                  ? t("mouthZones.completedZone", { zone: label })
                  : selected
                    ? t("mouthZones.activeZone", { zone: label })
                    : label}
              </Text>
              <Text
                style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}
              >
                {t("mouthZones.duration", { seconds: 30 })}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
