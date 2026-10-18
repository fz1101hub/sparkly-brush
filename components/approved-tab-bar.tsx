import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBrush } from "@/contexts/brush-context";
import { APPROVED_DESIGN, getTabArtwork } from "@/lib/approved-design";
import { ReferenceArtwork } from "@/components/reference-artwork";
import { useThemeContext } from "@/lib/theme-provider";

const DESTINATIONS = [
  { route: "index", title: "Oggi", icon: "home" },
  { route: "collection", title: "Mondo", icon: "public" },
  { route: "rewards", title: "Premi", icon: "star" },
  { route: "parent", title: "Famiglia", icon: "groups" },
] as const;

export function ApprovedTabBar({ state, navigation }: BottomTabBarProps) {
  const { theme } = useThemeContext();
  const { isActive } = useBrush();
  const { fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const activeRoute = state.routes[state.index].name;
  const d = APPROVED_DESIGN[theme.id];
  if (isActive && activeRoute === "index") return null;
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: "row",
        backgroundColor: d.panel,
        borderTopWidth: 1,
        borderColor: theme.scheme === "dark" ? "#FFFFFF60" : "#E6DCC1",
        paddingTop: 7,
        paddingBottom: Math.max(9, insets.bottom),
        minHeight: 84 + Math.max(0, fontScale - 1) * 20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
      }}
    >
      {DESTINATIONS.map((item, index) => {
        const selected = item.route === activeRoute;
        const route = state.routes.find(
          (candidate) => candidate.name === item.route,
        )!;
        const color = selected
          ? theme.id === "arcade"
            ? "#CFF425"
            : theme.id === "cosmos"
              ? "#FFC09B"
              : theme.id === "bubbles"
                ? "#C84232"
                : theme.id === "underwater"
                  ? "#83F0D7"
                  : d.ink
          : theme.scheme === "dark"
            ? "#CCC9EF"
            : "#476477";
        return (
          <Pressable
            key={item.route}
            accessibilityRole="tab"
            accessibilityLabel={item.title}
            accessibilityState={{ selected }}
            aria-selected={selected}
            onPress={() => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!selected && !event.defaultPrevented)
                navigation.navigate(item.route);
            }}
            onLongPress={() =>
              navigation.emit({ type: "tabLongPress", target: route.key })
            }
            style={{
              flex: 1,
              minHeight: 56,
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
            }}
          >
            <ReferenceArtwork
              region={getTabArtwork(theme.id, index)}
              width={36}
              height={36}
              fit="contain"
              fadeColor={d.panel}
              fadeSize={4}
            />
            <Text
              style={{
                color,
                fontFamily: "BrushlingsBody",
                fontSize: 14,
                lineHeight: 20,
                maxWidth: "100%",
                flexShrink: 1,
                textAlign: "center",
              }}
            >
              {item.title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
