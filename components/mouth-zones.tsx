import { useEffect } from "react";
import { AccessibilityInfo, Platform, Text, View } from "react-native";
import { ReferenceArtwork } from "@/components/reference-artwork";
import { useThemeContext } from "@/lib/theme-provider";
import { APPROVED_DESIGN } from "@/lib/approved-design";

const ZONES = [
  "In alto a destra",
  "In alto a sinistra",
  "In basso a sinistra",
  "In basso a destra",
];
const FLIPS = [
  [1, 1],
  [-1, 1],
  [-1, -1],
  [1, -1],
];
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
  const design = APPROVED_DESIGN[theme.id];
  const zone = Math.min(3, Math.max(0, activeZone));
  useEffect(() => {
    if (isActive && Platform.OS !== "web")
      AccessibilityInfo.announceForAccessibility(
        `Zona ${zone + 1} di 4: ${ZONES[zone]}`,
      );
  }, [isActive, zone]);
  return (
    <View style={{ alignItems: "center", gap: 6 }}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Dentatura divisa in quattro zone. ${ZONES[zone]} evidenziata`}
        style={{
          transform: [{ scaleX: FLIPS[zone][0] }, { scaleY: FLIPS[zone][1] }],
          opacity: isActive ? 1 : 0.7,
        }}
      >
        <ReferenceArtwork
          region={design.mouth}
          width={size}
          height={(size * design.mouth.rect[3]) / design.mouth.rect[2]}
          fit="contain"
        />
      </View>
      <View
        accessibilityLiveRegion="polite"
        style={{ alignItems: "center", gap: 3 }}
      >
        <Text
          style={{
            color: design.ink,
            fontFamily: "BrushlingsDisplay",
            fontSize: 28,
            lineHeight: 34,
            textAlign: "center",
          }}
        >
          {isActive ? ZONES[zone] : "Quattro zone, la stessa attenzione"}
        </Text>
        {theme.id !== "arcade" ? (
          <Text
            style={{
              color: design.ink,
              fontFamily: "BrushlingsBody",
              fontSize: 18,
              lineHeight: 24,
            }}
          >
            {isActive
              ? theme.id === "adventure"
                ? "Spazzola per 30 secondi"
                : `Zona ${zone + 1} di 4`
              : "30 secondi per zona"}
          </Text>
        ) : null}
      </View>
      {showSteps ? (
        <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
          {FLIPS.map(([x, y], index) => (
            <View
              key={index}
              style={{
                width: 38,
                height: 38,
                borderRadius: 22,
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
                <ReferenceArtwork
                  region={design.mouth}
                  width={29}
                  height={29}
                  fit="contain"
                />
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
