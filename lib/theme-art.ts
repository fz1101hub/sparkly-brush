import type { ImageSourcePropType } from "react-native";
import type { AppThemeId } from "@/lib/app-themes";

// Static imports keep all six themes available offline in native and web bundles.
export const THEME_ART: Record<AppThemeId, ImageSourcePropType> = {
  adventure: require("@/assets/themes/adventure.webp"),
  arcade: require("@/assets/themes/arcade.webp"),
  cosmos: require("@/assets/themes/cosmos.webp"),
  garden: require("@/assets/themes/garden.webp"),
  bubbles: require("@/assets/themes/bubbles.webp"),
  underwater: require("@/assets/themes/underwater.webp"),
};
