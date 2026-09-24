import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { BrushlingAvatar } from "@/components/brushling-avatar";
import { useBrushling } from "@/contexts/brushling-context";
import { useColors } from "@/hooks/use-colors";
import { STARTER_IDS, getBrushling, type BrushlingId } from "@/lib/brushlings";

export function StarterChooser() {
  const colors = useColors();
  const { selectedId, chooseStarter } = useBrushling();
  const [candidate, setCandidate] = useState<BrushlingId>(
    STARTER_IDS.includes(selectedId) ? selectedId : STARTER_IDS[0],
  );
  const [saving, setSaving] = useState(false);

  const chosen = getBrushling(candidate);

  const confirm = async () => {
    setSaving(true);
    await chooseStarter(candidate);
    setSaving(false);
  };

  return (
    <View style={[styles.panel, { backgroundColor: "#0B4F9C" }]}>
      <View style={styles.sparkleRow}>
        <MaterialIcons name="auto-awesome" size={19} color="#FFE68A" />
        <Text style={styles.eyebrow}>INIZIA L’AVVENTURA</Text>
        <MaterialIcons name="auto-awesome" size={19} color="#FFE68A" />
      </View>

      <Text accessibilityRole="header" style={styles.title}>Scegli il tuo primo Brushling!</Text>
      <Text style={styles.copy}>
        Ogni grande avventura inizia con un piccolo compagno. Potrai cambiare squadra più avanti.
      </Text>

      <View
        testID="starter-chooser"
        accessibilityRole="radiogroup"
        accessibilityLabel="Scegli il tuo primo Brushling"
        style={styles.starterRow}
      >
        {STARTER_IDS.map((id) => {
          const creature = getBrushling(id);
          const selected = candidate === id;
          return (
            <Pressable
              key={id}
              testID={`starter-${id}`}
              accessibilityRole="radio"
              accessibilityLabel={`${creature.name}, tipo ${creature.element}`}
              accessibilityState={{ checked: selected }}
              aria-checked={selected}
              onPress={() => setCandidate(id)}
              style={({ pressed }) => [
                styles.starterCard,
                {
                  backgroundColor: selected ? "#FFFFFF" : "#FFFFFF20",
                  borderColor: selected ? creature.accent : "#FFFFFF55",
                },
                pressed && styles.pressed,
              ]}
            >
              <BrushlingAvatar creature={creature} size={82} level={1} />
              <Text style={[styles.starterName, { color: selected ? colors.foreground : "#FFFFFF" }]}>
                {creature.name}
              </Text>
              <Text style={[styles.starterType, { color: selected ? creature.accent : "#DDEBFF" }]}>
                {creature.element}
              </Text>
              {selected ? (
                <View style={[styles.checkBadge, { backgroundColor: creature.accent }]}>
                  <MaterialIcons name="check" size={16} color="#FFFFFF" />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.choiceNote, { backgroundColor: chosen.soft }]}>
        <BrushlingAvatar creature={chosen} size={62} level={1} />
        <View style={styles.choiceCopy}>
          <Text style={[styles.choiceName, { color: colors.foreground }]}>{chosen.name}</Text>
          <Text style={[styles.choiceTagline, { color: colors.muted }]}>{chosen.tagline}</Text>
        </View>
      </View>

      <Pressable
        testID="starter-confirm"
        accessibilityRole="button"
        accessibilityLabel={`Conferma ${chosen.name} come primo Brushling`}
        accessibilityState={{ disabled: saving, busy: saving }}
        disabled={saving}
        onPress={() => void confirm()}
        style={({ pressed }) => [
          styles.confirmButton,
          { backgroundColor: chosen.accent },
          pressed && styles.pressed,
          saving && styles.disabled,
        ]}
      >
        <MaterialIcons name="favorite" size={20} color="#FFFFFF" />
        <Text style={styles.confirmText}>{saving ? "Salvo..." : `Parti con ${chosen.name}`}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 30,
    padding: 20,
    overflow: "hidden",
    ...Platform.select({
      web: { boxShadow: "0 12px 26px rgba(9, 42, 86, 0.22)" },
      default: {
        shadowColor: "#092A56",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.22,
        shadowRadius: 26,
        elevation: 5,
      },
    }),
  },
  sparkleRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 7 },
  eyebrow: { color: "#FFE68A", fontSize: 10, lineHeight: 14, fontWeight: "900", letterSpacing: 1.2 },
  title: { color: "#FFFFFF", fontSize: 27, lineHeight: 33, fontWeight: "900", textAlign: "center", marginTop: 8 },
  copy: { color: "#DDEBFF", fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 6 },
  starterRow: { flexDirection: "row", gap: 8, marginTop: 18 },
  starterCard: {
    flex: 1,
    minHeight: 145,
    borderWidth: 2,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    position: "relative",
  },
  starterName: { fontSize: 13, lineHeight: 18, fontWeight: "900", marginTop: 5 },
  starterType: { fontSize: 9, lineHeight: 13, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.6 },
  checkBadge: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceNote: {
    borderRadius: 20,
    padding: 10,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  choiceCopy: { flex: 1 },
  choiceName: { fontSize: 16, lineHeight: 20, fontWeight: "900" },
  choiceTagline: { fontSize: 11, lineHeight: 16, fontWeight: "600", marginTop: 2 },
  confirmButton: {
    minHeight: 54,
    borderRadius: 18,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  confirmText: { color: "#FFFFFF", fontSize: 15, lineHeight: 20, fontWeight: "900" },
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.6 },
});
