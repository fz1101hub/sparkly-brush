import { useEffect } from "react";
import { AccessibilityInfo, Platform, Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { useColors } from "@/hooks/use-colors";

const ZONES = ["Alto a destra", "Alto a sinistra", "Basso a sinistra", "Basso a destra"];
const QUADRANTS = [
  "M114 8 C48 8 12 33 12 71 L114 71 Z",
  "M126 8 C192 8 228 33 228 71 L126 71 Z",
  "M126 83 L228 83 C228 122 192 146 126 146 Z",
  "M114 83 L12 83 C12 122 48 146 114 146 Z",
];
const TEETH = [
  [[96, 20], [73, 25], [51, 36], [34, 53]],
  [[133, 20], [156, 25], [178, 36], [195, 53]],
  [[133, 117], [156, 112], [178, 101], [195, 84]],
  [[96, 117], [73, 112], [51, 101], [34, 84]],
];

export function MouthZones({ activeZone, isActive }: { activeZone: number; isActive: boolean }) {
  const colors = useColors();
  const zone = Math.min(3, Math.max(0, activeZone));
  useEffect(() => {
    if (isActive && Platform.OS !== "web") AccessibilityInfo.announceForAccessibility(`Zona ${zone + 1} di 4: ${ZONES[zone]}`);
  }, [isActive, zone]);
  return (
    <View style={{ gap: 10 }}>
      <Svg accessible={false} width="100%" height={150} viewBox="0 0 240 154">
        {QUADRANTS.map((path, index) => (
          <Path key={path} d={path} fill={isActive && index === zone ? colors.primarySoft : colors.background}
            stroke={isActive && index === zone ? colors.primary : colors.border} strokeWidth={isActive && index === zone ? 3 : 1.5} />
        ))}
        {TEETH.flatMap((teeth, index) => teeth.map(([x, y], tooth) => (
          <Rect key={index + "-" + tooth} x={x} y={y} width={15} height={18} rx={5}
            fill={isActive && index === zone ? colors.primary : colors.surface} stroke={colors.border} />
        )))}
        {isActive ? <Circle cx={[98, 142, 142, 98][zone]} cy={[54, 54, 100, 100][zone]} r={5} fill={colors.primary} /> : null}
      </Svg>
      <View accessibilityLiveRegion="polite">
        <Text style={{ color: colors.foreground, fontSize: 21, lineHeight: 28, fontWeight: "900", textAlign: "center" }}>
          {isActive ? ZONES[zone] : "Quattro zone, la stessa attenzione"}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 4 }}>
          {isActive ? "Zona " + (zone + 1) + " di 4 · 30 secondi per zona" : "30 secondi per zona"}
        </Text>
      </View>
    </View>
  );
}

