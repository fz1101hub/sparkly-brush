import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { DesignText as Text } from "@/components/design-text";

import { AppHeader } from "@/components/app-header";
import { FamilyPicker } from "@/components/family-picker";
import { ParentGuard } from "@/components/parent-guard";
import { QuickGuide } from "@/components/quick-guide";
import { ReminderSettings } from "@/components/reminder-settings";
import { ScreenContainer } from "@/components/screen-container";
import { ThemePicker } from "@/components/theme-picker";
import {
  LIGHT_CARD_FOREGROUND,
  LIGHT_CARD_MUTED,
  readableAccent,
} from "@/constants/accessibility-colors";
import { useI18n } from "@/contexts/locale-context";
import { usePreferences } from "@/contexts/preferences-context";
import { useBack } from "@/hooks/use-back";
import { useAsyncAction } from "@/hooks/use-async-action";
import { useColors } from "@/hooks/use-colors";
import type { LanguagePreference } from "@/lib/locale-types";

const LANGUAGE_OPTIONS = [
  { value: "system", labelKey: "language.system" },
  { value: "it", labelKey: "language.it" },
  { value: "en", labelKey: "language.en" },
  { value: "de", labelKey: "language.de" },
  { value: "fr", labelKey: "language.fr" },
  { value: "es", labelKey: "language.es" },
] as const satisfies readonly {
  value: LanguagePreference;
  labelKey:
    | "language.system"
    | "language.it"
    | "language.en"
    | "language.de"
    | "language.fr"
    | "language.es";
}[];

export default function SettingsScreen() {
  const colors = useColors();
  const goBack = useBack();
  const { preferences, setPreference } = usePreferences();
  const { languagePreference, setLanguagePreference, t } = useI18n();
  const runAction = useAsyncAction();

  const rows = [
    {
      key: "parentGateEnabled" as const,
      icon: "lock" as const,
      testID: "settings-parent-gate",
      title: t("family.settings.parentGateTitle"),
      text: t("family.settings.parentGateDescription"),
    },
    {
      key: "soundsEnabled" as const,
      icon: "volume-up" as const,
      title: t("family.settings.soundsTitle"),
      text: t("family.settings.soundsDescription"),
    },
    {
      key: "musicEnabled" as const,
      icon: "music-note" as const,
      title: t("family.settings.musicTitle"),
      text: t("family.settings.musicDescription"),
    },
    {
      key: "hapticsEnabled" as const,
      icon: "vibration" as const,
      title: t("family.settings.hapticsTitle"),
      text: t("family.settings.hapticsDescription"),
    },
  ];

  return (
    <ScreenContainer>
      <ParentGuard>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.back")}
            hitSlop={4}
            onPress={goBack}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            <MaterialIcons
              name="arrow-back"
              size={22}
              color={LIGHT_CARD_FOREGROUND}
            />
          </Pressable>
          <View style={styles.headerWrap}>
            <AppHeader
              eyebrow={t("family.settings.eyebrow")}
              title={t("family.settings.title")}
            />
          </View>
        </View>

        <ThemePicker />
        <FamilyPicker />
        <ReminderSettings />
        <QuickGuide />

        <View
          style={[
            styles.hero,
            { backgroundColor: "#F0ECFF", borderColor: "#D4C9F5" },
          ]}
        >
          <MaterialIcons name="tune" size={28} color="#51369C" />
          <View style={styles.heroCopy}>
            <Text style={[styles.heroTitle, { color: LIGHT_CARD_FOREGROUND }]}>
              {t("family.settings.heroTitle")}
            </Text>
            <Text style={[styles.heroText, { color: LIGHT_CARD_MUTED }]}>
              {t("family.settings.heroDescription")}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.languageCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.languageTitle, { color: colors.foreground }]}>
            {t("language.title")}
          </Text>
          <Text style={[styles.languageDescription, { color: colors.muted }]}>
            {t("language.description")}
          </Text>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={t("language.title")}
            style={styles.languageOptions}
          >
            {LANGUAGE_OPTIONS.map(({ value, labelKey }) => {
              const selected = languagePreference === value;
              const label = t(labelKey);
              return (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityLabel={label}
                  accessibilityState={{ checked: selected }}
                  aria-checked={selected}
                  onPress={() => runAction(setLanguagePreference(value))}
                  style={({ pressed }) => [
                    styles.languageOption,
                    {
                      backgroundColor: selected ? "#EEF4FF" : colors.background,
                      borderColor: selected ? "#173F9F" : colors.border,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <MaterialIcons
                    name={
                      selected ? "radio-button-checked" : "radio-button-off"
                    }
                    size={20}
                    color={selected ? "#173F9F" : colors.muted}
                  />
                  <Text
                    style={[
                      styles.languageOptionLabel,
                      { color: selected ? "#173F9F" : colors.foreground },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View
          style={[
            styles.list,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {rows.map((row, index) => (
            <View key={row.key}>
              <View style={styles.row}>
                <View style={styles.rowIcon}>
                  <MaterialIcons
                    name={row.icon}
                    size={22}
                    color={readableAccent("#2457D6")}
                  />
                </View>
                <View style={styles.rowCopy}>
                  <Text style={[styles.rowTitle, { color: colors.foreground }]}>
                    {row.title}
                  </Text>
                  <Text style={[styles.rowText, { color: colors.muted }]}>
                    {row.text}
                  </Text>
                </View>
                <Switch
                  testID={"testID" in row ? row.testID : undefined}
                  accessibilityLabel={row.title}
                  value={preferences[row.key]}
                  onValueChange={(value) => runAction(setPreference(row.key, value))}
                  trackColor={{ false: "#D3D7E0", true: "#9EC0FF" }}
                  thumbColor={preferences[row.key] ? "#2457D6" : "#F5F5F5"}
                />
              </View>
              {index < rows.length - 1 ? (
                <View
                  style={[styles.divider, { backgroundColor: colors.border }]}
                />
              ) : null}
            </View>
          ))}
        </View>

        <View
          style={[
            styles.note,
            { backgroundColor: "#FFF8E8", borderColor: "#F2D588" },
          ]}
        >
          <MaterialIcons name="hearing" size={21} color="#6F5100" />
          <Text style={[styles.noteText, { color: LIGHT_CARD_FOREGROUND }]}>
            {t("family.settings.audioNote")}
          </Text>
        </View>
      </ScrollView>
      </ParentGuard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 80,
    gap: 18,
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  back: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerWrap: { flex: 1 },
  hero: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  heroCopy: { flex: 1 },
  heroTitle: { fontSize: 15, lineHeight: 20, fontWeight: "900" },
  heroText: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  languageCard: { borderWidth: 1, borderRadius: 22, padding: 14 },
  languageTitle: { fontSize: 16, lineHeight: 21, fontWeight: "900" },
  languageDescription: { fontSize: 11, lineHeight: 16, marginTop: 3 },
  languageOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  languageOption: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
  },
  languageOptionLabel: { fontSize: 12, lineHeight: 17, fontWeight: "800" },
  list: { borderWidth: 1, borderRadius: 22, overflow: "hidden" },
  row: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 14,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  rowCopy: { flex: 1 },
  rowTitle: { fontSize: 14, lineHeight: 19, fontWeight: "900" },
  rowText: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 67 },
  note: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  noteText: { flex: 1, fontSize: 10, lineHeight: 15, fontWeight: "600" },
  pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
});
