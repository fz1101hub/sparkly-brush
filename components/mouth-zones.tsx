import { Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";

const ZONES = [
  "Alto a destra",
  "Alto a sinistra",
  "Basso a sinistra",
  "Basso a destra",
];

export function MouthZones({ activeZone, isActive }: { activeZone: number; isActive: boolean }) {
  const colors = useColors();

  return (
    <View accessibilityLabel={isActive ? `Zona attiva: ${ZONES[activeZone]}` : "Guida a quattro zone"}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {ZONES.map((label, index) => {
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
              <Text style={{ color: selected ? colors.primary : colors.foreground, fontWeight: "800", fontSize: 13, lineHeight: 18 }}>
                {completed ? "Fatto · " : selected ? "Ora · " : ""}{label}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>30 secondi</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
