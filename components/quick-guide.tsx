import { useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { DesignText as Text } from "@/components/design-text";
import { useColors } from "@/hooks/use-colors";

export function QuickGuide() {
  const colors = useColors();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const copy = { color: colors.foreground, fontSize: 16, lineHeight: 24 };
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        borderRadius: 22,
        padding: 18,
        gap: 12,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        style={{ minHeight: 48, justifyContent: "center" }}
      >
        <Text style={{ ...copy, color: colors.primary, fontWeight: "800" }}>
          {open ? "Chiudi la guida rapida" : "Guida rapida"}
        </Text>
      </Pressable>
      {open ? (
        <>
          <Text style={copy}>
            1. Scegli il profilo giusto e il tuo compagno. Tocca «Inizia · 2
            minuti» nella schermata Oggi, anche senza Bluetooth.
          </Text>
          <Text style={copy}>
            2. Segui le quattro zone della bocca, 30 secondi ciascuna. Puoi
            mettere in pausa e riprendere; il tempo a telefono chiuso non viene
            contato.
          </Text>
          <Text style={copy}>
            3. Le sessioni completate fanno crescere creature e progressi. La
            demo resta separata dalla routine reale.
          </Text>
          <Text style={copy}>
            4. Per la famiglia: profili, promemoria e preferenze sono qui. I
            dati restano sul dispositivo: esporta un backup per proteggerli.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/(tabs)/parent")}
            style={{ minHeight: 48, justifyContent: "center" }}
          >
            <Text style={{ ...copy, color: colors.primary, fontWeight: "700" }}>
              Apri i premi di famiglia
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/(tabs)/backup")}
            style={{ minHeight: 48, justifyContent: "center" }}
          >
            <Text style={{ ...copy, color: colors.primary, fontWeight: "700" }}>
              Proteggi i progressi con un backup
            </Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}
