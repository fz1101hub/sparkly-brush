import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Text, View } from "react-native";

import { useI18n } from "@/contexts/locale-context";
import { useColors } from "@/hooks/use-colors";

export function AppHeader({ eyebrow, title, connected }: { eyebrow: string; title: string; connected?: boolean }) {
  const colors = useColors();
  const { t } = useI18n();

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
        accessibilityLabel={t(
          connected
            ? "header.toothbrushConnected"
            : "header.toothbrushDisconnected",
        )}
        style={{
          width: 52,
          height: 52,
          borderRadius: 18,
          backgroundColor: connected ? "#E1F7EF" : "#E7EEFF",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialIcons name={connected ? "bluetooth-connected" : "electric-bolt"} size={28} color={connected ? colors.success : colors.primary} />
      </View>
    </View>
  );
}
