import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";

export function FamilyNavigation() {
  const router = useRouter();
  const colors = useColors();
  const items = [
    { title: "Profili e temi", icon: "palette", route: "/(tabs)/settings" },
    { title: "Spazzolino", icon: "bluetooth", route: "/(tabs)/device" },
    { title: "Storico", icon: "history", route: "/(tabs)/history" },
    { title: "Backup", icon: "backup", route: "/(tabs)/backup" },
  ] as const;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      {items.map((item) => (
        <Pressable
          key={item.title}
          accessibilityRole="button"
          accessibilityLabel={item.title}
          onPress={() => router.push(item.route)}
          style={{
            flexGrow: 1,
            flexBasis: "45%",
            minHeight: 76,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
            padding: 12,
            gap: 6,
          }}
        >
          <MaterialIcons
            accessible={false}
            name={item.icon}
            size={26}
            color={colors.primary}
          />
          <Text
            style={{
              color: colors.foreground,
              fontFamily: "BrushlingsBlack",
              fontSize: 15,
            }}
          >
            {item.title}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
