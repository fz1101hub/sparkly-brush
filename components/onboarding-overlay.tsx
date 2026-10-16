import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AnimatedBrushling } from "@/components/animated-brushling";
import { usePreferences } from "@/contexts/preferences-context";
import { useColors } from "@/hooks/use-colors";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { getBrushling } from "@/lib/brushlings";

export function OnboardingOverlay() {
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const { preferences, ready, saving, completeOnboarding } = usePreferences();
  const [details, setDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!ready || preferences.onboardingCompleted) return null;
  const finish = async () => {
    setError(null);
    try { await completeOnboarding(); }
    catch { setError("Non riesco a salvare la scelta. Riprova: i tuoi dati restano al sicuro."); }
  };
  return <Modal visible animationType={reducedMotion ? "none" : "fade"} statusBarTranslucent onRequestClose={() => {}}>
    <ScrollView contentContainerStyle={[styles.backdrop, { backgroundColor: colors.background }]}>
      <View accessibilityViewIsModal style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <AnimatedBrushling creature={getBrushling("bloopi")} size={120} level={1} active />
        <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>Due minuti per un sorriso</Text>
        <Text style={[styles.copy, { color: colors.muted }]}>Scegli un piccolo compagno e inizia a spazzolare. Puoi usare il timer anche senza uno spazzolino Bluetooth.</Text>
        <Pressable accessibilityRole="button" disabled={saving} accessibilityState={{ disabled: saving }} onPress={() => void finish()} style={[styles.button, { backgroundColor: colors.primary }]}>
          <Text style={[styles.label, { color: colors.primaryText }]}>{saving ? "Preparo l’avventura…" : "Scegli il tuo compagno"}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: details }} onPress={() => setDetails(value => !value)} style={styles.button}>
          <Text style={[styles.label, { color: colors.primary }]}>{details ? "Chiudi i dettagli" : "Come funziona?"}</Text>
        </Pressable>
        {details ? <View style={styles.details}>
          <Text style={[styles.copy, { color: colors.foreground }]}>Mattina e sera, quattro zone da 30 secondi. Le sessioni completate fanno crescere il tuo compagno.</Text>
          <Text style={[styles.copy, { color: colors.foreground }]}>Un genitore può creare profili separati e premi di famiglia nelle Impostazioni.</Text>
          <Text style={[styles.copy, { color: colors.foreground }]}>I dati restano su questo dispositivo. Puoi esportare un backup quando vuoi; non serve un account.</Text>
        </View> : null}
        {error ? <Text accessibilityRole="alert" style={[styles.copy, { color: colors.error }]}>{error}</Text> : null}
      </View>
    </ScrollView>
  </Modal>;
}
const styles = StyleSheet.create({
  backdrop: { flexGrow: 1, justifyContent: "center", padding: 20 },
  card: { width: "100%", maxWidth: 480, alignSelf: "center", borderWidth: 1, borderRadius: 28, padding: 22, alignItems: "center", gap: 16 },
  title: { fontSize: 28, lineHeight: 36, fontWeight: "900", textAlign: "center" },
  copy: { fontSize: 16, lineHeight: 24, textAlign: "center" },
  button: { width: "100%", minHeight: 52, borderRadius: 16, padding: 14, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 16, lineHeight: 24, fontWeight: "800", textAlign: "center" },
  details: { gap: 12 },
});
