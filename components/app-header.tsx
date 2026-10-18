import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { View } from "react-native";
import { DesignText as Text } from "@/components/design-text";

import { useColors } from "@/hooks/use-colors";

export function AppHeader({ eyebrow, title, connected }: { eyebrow: string; title: string; connected?: boolean }) {
  const colors = useColors();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={{ color: colors.primary, fontFamily: "BrushlingsBlack", fontSize: 12, lineHeight: 17, fontWeight: "800", letterSpacing: 1.4, textTransform: "uppercase" }}>
          {eyebrow}
        </Text>
        <Text style={{ color: colors.foreground, fontFamily: "BrushlingsDisplay", fontSize: 30, lineHeight: 37, fontWeight: "400" }}>
          {title}
        </Text>
      </View>
      <View
        accessibilityLabel={connected ? "Spazzolino collegato" : "Spazzolino non collegato"}
        style={{
          width: 52,
          height: 52,
          borderRadius: 18,
          backgroundColor: colors.primarySoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialIcons name={connected ? "bluetooth-connected" : "electric-bolt"} size={28} color={connected ? colors.success : colors.primary} />
      </View>
    </View>
  );
}

