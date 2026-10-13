import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Text, View } from "react-native";

import { useOptionalBrush } from "@/contexts/brush-context";
import { useI18n } from "@/contexts/locale-context";
import { useColors } from "@/hooks/use-colors";

export function AppHeader({ eyebrow, title, connected }: { eyebrow: string; title: string; connected?: boolean }) {
  const colors = useColors();
  const { t } = useI18n();
  // Screens that do not pass `connected` still show the live toothbrush state.
  const brushConnected = useOptionalBrush()?.status === "connected";
  const isConnected = connected ?? brushConnected;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={{ color: colors.primary, fontSize: 12, lineHeight: 17, fontWeight: "800", letterSpacing: 1.4, textTransform: "uppercase" }}>
          {eyebrow}
        </Text>
        <Text style={{ color: colors.foreground, fontSize: 30, lineHeight: 37, fontWeight: "900" }}>
          {title}
        </Text>
      </View>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={t(
          isConnected
            ? "header.toothbrushConnected"
            : "header.toothbrushDisconnected",
        )}
        style={{
          width: 52,
          height: 52,
          borderRadius: 18,
          backgroundColor: isConnected ? "#E1F7EF" : "#E7EEFF",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialIcons name={isConnected ? "bluetooth-connected" : "electric-bolt"} size={28} color={isConnected ? colors.success : colors.primary} />
      </View>
    </View>
  );
}
