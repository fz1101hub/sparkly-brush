import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import { VillageButton } from "@/components/village-ui";
import { useExtras } from "@/contexts/extras-context";
import { useI18n } from "@/contexts/locale-context";
import { useColors } from "@/hooks/use-colors";
import type { BrushlingId } from "@/lib/brushlings";
import { cleanCreatureName, MAX_NAME_LENGTH } from "@/lib/extras";

/** The child names their own creature (voce 66); an empty name brings back the original one. */
export function CreatureNameEditor({ id, originalName }: { id: BrushlingId; originalName: string }) {
  const colors = useColors();
  const { t } = useI18n();
  const { extras, apply, ready } = useExtras();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const name = extras.creatureNames[id];

  const save = () => {
    const clean = cleanCreatureName(draft);
    void apply((previous) => {
      const creatureNames = { ...previous.creatureNames };
      if (clean) creatureNames[id] = clean;
      else delete creatureNames[id];
      return { ...previous, creatureNames };
    }).then(() => setEditing(false));
  };

  if (!editing) {
    return (
      <View style={styles.row}>
        {name ? (
          <Text style={[styles.hint, { color: colors.muted }]}>{t("creatureName.original", { name: originalName })}</Text>
        ) : null}
        <VillageButton
          secondary
          testID="creature-name-edit"
          icon="edit"
          label={t(name ? "creatureName.change" : "creatureName.give")}
          disabled={!ready}
          onPress={() => {
            setDraft(name ?? "");
            setEditing(true);
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.editor}>
      <Text style={[styles.label, { color: colors.foreground }]}>{t("creatureName.label")}</Text>
      <TextInput
        testID="creature-name-input"
        accessibilityLabel={t("creatureName.label")}
        value={draft}
        onChangeText={setDraft}
        maxLength={MAX_NAME_LENGTH}
        placeholder={originalName}
        placeholderTextColor={colors.muted}
        autoFocus
        onSubmitEditing={save}
        style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
      />
      <View style={styles.row}>
        <VillageButton testID="creature-name-save" icon="check" label={t("creatureName.save")} onPress={save} />
        <VillageButton secondary label={t("common.cancel")} onPress={() => setEditing(false)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10, justifyContent: "center" },
  hint: { fontSize: 13, lineHeight: 19 },
  editor: { gap: 8, alignSelf: "stretch" },
  label: { fontSize: 15, lineHeight: 22, fontWeight: "700" },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 17 },
});
