import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { ComponentProps, ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { AppHeader } from "@/components/app-header";
import { DesignText as Text } from "@/components/design-text";
import { ScreenContainer } from "@/components/screen-container";
import { useI18n } from "@/contexts/locale-context";
import { useVillage } from "@/contexts/village-context";
import { useBack } from "@/hooks/use-back";
import { useColors } from "@/hooks/use-colors";

type IconName = ComponentProps<typeof MaterialIcons>["name"];

/** Shared frame of the village activities: back to the village, header, scrolling content. */
export function VillageScreen({
  testID,
  eyebrow,
  title,
  children,
}: {
  testID: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  const colors = useColors();
  const { t } = useI18n();
  const goBack = useBack("/(tabs)/collection");
  return (
    <ScreenContainer>
      <ScrollView testID={testID} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("village.back")}
            onPress={goBack}
            style={({ pressed }) => [styles.back, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}
          >
            <MaterialIcons name="arrow-back" size={22} color={colors.foreground} />
          </Pressable>
          <View style={styles.header}>
            <AppHeader eyebrow={eyebrow} title={title} />
          </View>
        </View>
        {children}
      </ScrollView>
    </ScreenContainer>
  );
}

export function VillageCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>{children}</View>;
}

export function VillageButton({
  label,
  onPress,
  disabled = false,
  secondary = false,
  icon,
  testID,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  icon?: IconName;
  testID?: string;
  accessibilityLabel?: string;
}) {
  const colors = useColors();
  const foreground = secondary ? colors.foreground : colors.primaryText;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary
          ? { backgroundColor: colors.primarySoft, borderColor: colors.border, borderWidth: 1 }
          : { backgroundColor: colors.primary },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {icon ? <MaterialIcons accessible={false} name={icon} size={22} color={foreground} /> : null}
      <Text style={[styles.buttonText, { color: foreground }]}>{label}</Text>
    </Pressable>
  );
}

/** A row of mutually exclusive choices (level, language, type…). */
export function ChoiceChips<T extends string | number>({
  label,
  options,
  value,
  onChange,
  testIDPrefix,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  testIDPrefix: string;
}) {
  const colors = useColors();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.chips}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            testID={`${testIDPrefix}-${option.value}`}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            aria-checked={selected}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: selected ? colors.primary : colors.surface,
                borderColor: selected ? colors.primary : colors.border,
              },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.chipText, { color: selected ? colors.primaryText : colors.foreground }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Today's energy, earned by brushing. */
export function EnergyPill() {
  const colors = useColors();
  const { t } = useI18n();
  const { energy } = useVillage();
  const text = energy.limited
    ? t("village.energy.count", { available: energy.available, max: energy.max })
    : t("village.energy.unlimited");
  return (
    <View
      testID="village-energy"
      accessible
      accessibilityLabel={text}
      style={[styles.energy, { backgroundColor: colors.primarySoft, borderColor: colors.border }]}
    >
      <MaterialIcons accessible={false} name="bolt" size={22} color={colors.foreground} />
      <Text style={[styles.energyText, { color: colors.foreground }]}>{text}</Text>
    </View>
  );
}

/** Shown when today's energy is used up: brushing is the only way to get more. */
export function NoEnergyNotice() {
  const colors = useColors();
  const { t } = useI18n();
  return (
    <View testID="village-no-energy" accessibilityRole="alert" style={[styles.notice, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <MaterialIcons accessible={false} name="bedtime" size={24} color={colors.foreground} />
      <Text style={[styles.noticeText, { color: colors.foreground }]}>{t("village.energy.empty")}</Text>
    </View>
  );
}

export const villageStyles = StyleSheet.create({
  title: { fontSize: 20, lineHeight: 28, fontWeight: "800" },
  body: { fontSize: 16, lineHeight: 24 },
  small: { fontSize: 14, lineHeight: 21 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "center" },
});

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 110, gap: 16 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  back: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  header: { flex: 1 },
  card: { borderWidth: 1, borderRadius: 22, padding: 16, gap: 12 },
  button: {
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonText: { fontSize: 17, lineHeight: 24, fontWeight: "800", textAlign: "center", flexShrink: 1 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 44, borderRadius: 22, borderWidth: 1.5, paddingHorizontal: 14, justifyContent: "center" },
  chipText: { fontSize: 15, lineHeight: 21, fontWeight: "700" },
  energy: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, minHeight: 40 },
  energyText: { fontSize: 15, lineHeight: 21, fontWeight: "800" },
  notice: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 18, padding: 14 },
  noticeText: { flex: 1, fontSize: 15, lineHeight: 22 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
