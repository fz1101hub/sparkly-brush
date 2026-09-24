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
  const safeZone = Math.max(0, Math.min(activeZone, ZONES.length - 1));
  const completedZones = isActive ? safeZone : 0;

  return (
    <View
      testID="mouth-zones-progress"
      accessibilityRole="progressbar"
      accessibilityLabel="Avanzamento delle zone di spazzolamento"
      accessibilityHint={isActive ? `Zona attiva: ${ZONES[safeZone]}` : "La sessione non è ancora iniziata"}
      accessibilityValue={{
        min: 0,
        now: completedZones,
        max: ZONES.length,
        text: isActive ? `${completedZones} zone completate su ${ZONES.length}` : "0 zone completate su 4",
      }}
      aria-valuemin={0}
      aria-valuenow={completedZones}
      aria-valuemax={ZONES.length}
      aria-valuetext={isActive ? `${completedZones} zone completate su ${ZONES.length}` : "0 zone completate su 4"}
    >
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
