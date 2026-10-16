import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFamily } from "@/contexts/family-context";
import { useBrush } from "@/contexts/brush-context";
import { useColors } from "@/hooks/use-colors";
import { MAX_FAMILY_PROFILES } from "@/lib/family-profiles";

export function FamilyPicker() {
  const colors = useColors();
  const family = useFamily();
  const {
    isActive,
    hasPendingManualSession,
    isSavingManualSession,
    manualStartPending,
  } = useBrush();
  const [name, setName] = useState("");
  const [rename, setRename] = useState(family.active.name);
  const [error, setError] = useState<string | null>(null);
  const blocked =
    family.busy ||
    isActive ||
    hasPendingManualSession ||
    isSavingManualSession ||
    manualStartPending;
  const run = async (operation: () => Promise<void>) => {
    setError(null);
    try {
      await operation();
      setName("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Non riesco a salvare il profilo",
      );
    }
  };
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: colors.foreground }]}
      >
        I profili della famiglia
      </Text>
      <Text style={[styles.copy, { color: colors.muted }]}>
        Ogni bambino ha creature, progressi, temi e preferenze propri. I dati
        già presenti restano nel primo profilo. Ogni spazzolino Bluetooth è
        associato a un solo profilo; il timer manuale è disponibile per tutti.
      </Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Profilo attivo"
        style={styles.list}
      >
        {family.profiles.map((profile) => (
          <Pressable
            key={profile.id}
            accessibilityRole="radio"
            aria-checked={profile.id === family.active.id}
            accessibilityState={{
              checked: profile.id === family.active.id,
              disabled: blocked,
            }}
            disabled={blocked || profile.id === family.active.id}
            onPress={() => void run(() => family.switchProfile(profile.id))}
            style={[
              styles.button,
              {
                borderColor:
                  profile.id === family.active.id
                    ? colors.primary
                    : colors.border,
                backgroundColor:
                  profile.id === family.active.id
                    ? colors.primarySoft
                    : colors.background,
              },
            ]}
          >
            <Text style={[styles.label, { color: colors.foreground }]}>
              {profile.name}
              {profile.id === family.active.id ? " · attivo" : ""}
            </Text>
          </Pressable>
        ))}
      </View>
      {blocked ? (
        <Text style={[styles.copy, { color: colors.muted }]}>
          Termina e salva la sessione prima di cambiare profilo.
        </Text>
      ) : null}
      <Text style={[styles.label, { color: colors.foreground }]}>
        Nome del profilo attivo
      </Text>
      <TextInput
        accessibilityLabel="Nome del profilo attivo"
        value={rename}
        onChangeText={setRename}
        maxLength={48}
        editable={!family.busy}
        style={[
          styles.input,
          {
            color: colors.foreground,
            borderColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      />
      <Pressable
        accessibilityRole="button"
        disabled={family.busy || !rename.trim()}
        onPress={() =>
          void run(() => family.renameProfile(family.active.id, rename))
        }
        style={[styles.button, { backgroundColor: colors.primarySoft }]}
      >
        <Text style={[styles.label, { color: colors.primary }]}>
          Salva nome
        </Text>
      </Pressable>
      {family.profiles.length < MAX_FAMILY_PROFILES ? (
        <>
          <Text style={[styles.label, { color: colors.foreground }]}>
            Aggiungi un bambino
          </Text>
          <TextInput
            accessibilityLabel="Nome del nuovo profilo"
            value={name}
            onChangeText={setName}
            maxLength={48}
            editable={!blocked}
            placeholder="Nome o soprannome"
            placeholderTextColor={colors.muted}
            style={[
              styles.input,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: blocked || !name.trim() }}
            disabled={blocked || !name.trim()}
            onPress={() => void run(() => family.addProfile(name))}
            style={[
              styles.button,
              { backgroundColor: colors.primary },
              (blocked || !name.trim()) && styles.disabled,
            ]}
          >
            <Text style={[styles.label, { color: colors.primaryText }]}>
              Crea profilo
            </Text>
          </Pressable>
        </>
      ) : null}
      {error ? (
        <Text
          accessibilityRole="alert"
          style={[styles.copy, { color: colors.error }]}
        >
          {error}
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
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  button: {
    minHeight: 48,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "transparent",
    justifyContent: "center",
  },
  disabled: { opacity: 0.5 },
});
