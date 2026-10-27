import { Image, StyleSheet, View, type ViewProps } from "react-native";
import { getAppTheme, type AppThemeId } from "@/lib/app-themes";
import { THEME_ART } from "@/lib/theme-art";

export function ThemeScene({ themeId, children, style, ...props }: ViewProps & { themeId: AppThemeId }) {
  const theme = getAppTheme(themeId);
  return (
    <View {...props} style={[styles.scene, { backgroundColor: theme.colors.primarySoft }, style]}>
      <Image accessible={false} source={THEME_ART[themeId]} resizeMode="cover" style={StyleSheet.absoluteFill} />
      {children}
    </View>
  );
}
const styles = StyleSheet.create({
  scene: { overflow: "hidden", borderRadius: 28, position: "relative" },
});
