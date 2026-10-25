import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import { useBrush } from "@/contexts/brush-context";
import { useFamily } from "@/contexts/family-context";
import { useI18n } from "@/contexts/locale-context";
import { useColors } from "@/hooks/use-colors";
import { MAX_FAMILY_PROFILES, MAX_PROFILE_NAME_LENGTH } from "@/lib/family-profiles";
import { errorText } from "@/lib/localized-error";

/** Switch, rename and add children (from PR #10); each child has their own records. */
export function FamilyPicker() {
  const colors = useColors();
  const family = useFamily();
  const { t } = useI18n();
  const { isActive, hasPendingManualSession, isSavingManualSession, manualStartPending } = useBrush();
  const [name, setName] = useState("");
  const [rename, setRename] = useState(family.active.name);
  const [error, setError] = useState<unknown>(null);
  const blocked =
    family.busy || isActive || hasPendingManualSession || isSavingManualSession || manualStartPending;
  const run = async (operation: () => Promise<void>) => {
    setError(null);
    try {
      await operation();
      setName("");
    } catch (caught) {
      setError(caught);
    }
  };
  const inputStyle = [
    styles.input,
    { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background },
  ];
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>
        {t("familyPicker.title")}
      </Text>
      <Text style={[styles.copy, { color: colors.muted }]}>{t("familyPicker.copy")}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={t("familyPicker.activeLabel")} style={styles.list}>
        {family.profiles.map((profile) => {
          const selected = profile.id === family.active.id;
          return (
            <Pressable
              key={profile.id}
              testID={`profile-${profile.id}`}
              accessibilityRole="radio"
              aria-checked={selected}
              accessibilityState={{ checked: selected, disabled: blocked }}
              disabled={blocked || selected}
              onPress={() => void run(() => family.switchProfile(profile.id))}
              style={[
                styles.button,
                {
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.primarySoft : colors.background,
                },
              ]}
            >
              <Text style={[styles.label, { color: colors.foreground }]}>
                {selected ? t("familyPicker.activeName", { name: profile.name }) : profile.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {blocked ? (
        <Text style={[styles.copy, { color: colors.muted }]}>{t("family.switch.error.sessionActive")}</Text>
      ) : null}
      <Text style={[styles.label, { color: colors.foreground }]}>{t("familyPicker.renameLabel")}</Text>
      <TextInput
        testID="profile-rename-input"
        accessibilityLabel={t("familyPicker.renameLabel")}
        value={rename}
        onChangeText={setRename}
        maxLength={MAX_PROFILE_NAME_LENGTH}
        editable={!family.busy}
        style={inputStyle}
      />
      <Pressable
        testID="profile-rename"
        accessibilityRole="button"
        disabled={family.busy || !rename.trim()}
        onPress={() => void run(() => family.renameProfile(family.active.id, rename))}
        style={[styles.button, { backgroundColor: colors.primarySoft }]}
      >
        <Text style={[styles.label, { color: colors.foreground }]}>{t("familyPicker.saveName")}</Text>
      </Pressable>
      {family.profiles.length < MAX_FAMILY_PROFILES ? (
        <>
          <Text style={[styles.label, { color: colors.foreground }]}>{t("familyPicker.addLabel")}</Text>
          <TextInput
            testID="profile-new-name"
            accessibilityLabel={t("familyPicker.newNameLabel")}
            value={name}
            onChangeText={setName}
            maxLength={MAX_PROFILE_NAME_LENGTH}
            editable={!blocked}
            placeholder={t("familyPicker.newNamePlaceholder")}
            placeholderTextColor={colors.muted}
            style={inputStyle}
          />
          <Pressable
            testID="profile-create"
            accessibilityRole="button"
            accessibilityState={{ disabled: blocked || !name.trim() }}
            disabled={blocked || !name.trim()}
            onPress={() => void run(() => family.addProfile(name))}
            style={[styles.button, { backgroundColor: colors.primary }, (blocked || !name.trim()) && styles.disabled]}
          >
            <Text style={[styles.label, { color: colors.primaryText }]}>{t("familyPicker.create")}</Text>
          </Pressable>
        </>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={[styles.copy, { color: colors.error }]}>
          {errorText(error, t, "familyPicker.saveFailed")}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 22, padding: 18, gap: 12 },
  title: { fontSize: 20, lineHeight: 28, fontWeight: "800" },
  copy: { fontSize: 14, lineHeight: 22 },
  label: { fontSize: 16, lineHeight: 24, fontWeight: "700", flexShrink: 1 },
  list: { gap: 8 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16 },
  button: { minHeight: 48, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "transparent", justifyContent: "center" },
  disabled: { opacity: 0.5 },
});
