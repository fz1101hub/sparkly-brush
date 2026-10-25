import type { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DesignText as Text } from "@/components/design-text";
import { ReferenceArtwork } from "@/components/reference-artwork";
import { useBrush } from "@/contexts/brush-context";
import { useI18n } from "@/contexts/locale-context";
import type { AppThemeId } from "@/lib/app-themes";
import { APPROVED_DESIGN, getTabArtwork } from "@/lib/approved-design";
import type { TranslationKey } from "@/lib/i18n";
import { useThemeContext } from "@/lib/theme-provider";

// expo-router bundles its own react-navigation, so the bar's props come from its Tabs layout.
type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

const DESTINATIONS = [
  { route: "index", title: "tabs.today", testID: "tab-today" },
  { route: "collection", title: "tabs.world", testID: "tab-world" },
  { route: "rewards", title: "tabs.rewards", testID: "tab-rewards" },
  { route: "parent", title: "tabs.family", testID: "tab-family" },
] as const satisfies readonly { route: string; title: TranslationKey; testID: string }[];

/** Selected label colour per theme, checked against each theme's panel colour. */
const SELECTED_INK: Partial<Record<AppThemeId, string>> = {
  arcade: "#CFF425",
  cosmos: "#FFC09B",
  bubbles: "#C84232",
  underwater: "#83F0D7",
};

/** The approved four-destination bar (from PR #10); it hides while a session runs on Today. */
export function ApprovedTabBar({ state, navigation }: BottomTabBarProps) {
  const { theme } = useThemeContext();
  const { isActive } = useBrush();
  const { t } = useI18n();
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
        const route = state.routes.find((candidate) => candidate.name === item.route);
        if (!route) return null;
        const color = selected
          ? SELECTED_INK[theme.id] ?? d.ink
          : theme.scheme === "dark"
            ? "#CCC9EF"
            : "#476477";
        const title = t(item.title);
        return (
          <Pressable
            key={item.route}
            testID={item.testID}
            accessibilityRole="tab"
            accessibilityLabel={title}
            accessibilityState={{ selected }}
            aria-selected={selected}
            onPress={() => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!selected && !event.defaultPrevented) navigation.navigate(item.route);
            }}
            onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
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
              {title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
