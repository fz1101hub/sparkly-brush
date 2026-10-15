import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { BrushlingHabitat } from "@/components/brushling-habitat";
import { ScreenContainer } from "@/components/screen-container";
import { useBrushling } from "@/contexts/brushling-context";
import { useColors } from "@/hooks/use-colors";
import {
  CUSTOMIZATION_ITEMS,
  getCustomizationItem,
  type CustomizationCategory,
  type CustomizationItem,
} from "@/lib/customization";
import { getEvolution } from "@/lib/brushlings";

const CATEGORY_LABELS: Record<CustomizationCategory, string> = {
  habitat: "Habitat",
  accessory: "Accessori",
  decor: "Decorazioni",
};

export default function HabitatScreen() {
  const colors = useColors();
  const router = useRouter();
  const {
    selected,
    stats,
    customization,
    walletCoins,
    buyCustomization,
    equipCustomization,
  } = useBrushling();
  const [message, setMessage] = useState<string | null>(null);
  const evolution = getEvolution(selected, stats.level);

  const groups = useMemo(
    () => (["habitat", "accessory", "decor"] as const).map((category) => ({
      category,
      items: CUSTOMIZATION_ITEMS.filter((item) => item.category === category),
    })),
    [],
  );

  const isEquipped = (item: CustomizationItem) => {
    if (item.category === "habitat") return customization.equippedHabitatId === item.id;
    if (item.category === "accessory") return customization.equippedAccessoryId === item.id;
    return customization.equippedDecorId === item.id;
  };

  const handleItem = async (item: CustomizationItem) => {
    setMessage(null);

    if (customization.ownedIds.includes(item.id)) {
      const equipped = await equipCustomization(item.id);
      setMessage(equipped ? `${item.name} equipaggiato!` : "Non riesco a equipaggiare questo oggetto.");
      return;
    }

    const result = await buyCustomization(item.id);
    if (result === "insufficient") {
      setMessage(`Servono ${item.cost - walletCoins} monete sorriso in più.`);
    } else if (result === "purchased") {
      setMessage(`${item.name} acquistato ed equipaggiato!`);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Torna indietro"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, { backgroundColor: colors.surface }, pressed && styles.pressed]}
          >
            <MaterialIcons name="arrow-back" size={22} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerWrap}>
            <AppHeader eyebrow="Casa Brushling" title="La tana" connected={false} />
          </View>
        </View>

        <BrushlingHabitat
          creature={selected}
          level={stats.level}
          customization={customization}
          height={320}
        />

        <View style={[styles.walletCard, { backgroundColor: colors.primarySoft, borderColor: "#F2D588" }]}>
          <View style={styles.walletIcon}>
            <MaterialIcons name="stars" size={27} color="#B98A00" />
          </View>
          <View style={styles.walletCopy}>
            <Text style={[styles.walletEyebrow, { color: colors.primary }]}>PORTAFOGLIO</Text>
            <Text style={[styles.walletValue, { color: colors.foreground }]}>{walletCoins} monete sorriso</Text>
            <Text style={[styles.walletText, { color: colors.muted }]}>
              Le guadagni spazzolando; ciò che acquisti resta salvato su questo telefono.
            </Text>
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.primarySoft, borderColor: selected.accent }]}>
          <MaterialIcons name="pets" size={24} color={selected.accent} />
          <View style={styles.infoCopy}>
            <Text style={[styles.infoTitle, { color: colors.foreground }]}>{evolution.name}</Text>
            <Text style={[styles.infoText, { color: colors.muted }]}>
              Personalizza il suo spazio con un habitat, un accessorio e una decorazione.
            </Text>
          </View>
        </View>

        {message ? (
          <View style={[styles.messageCard, { backgroundColor: colors.primarySoft, borderColor: "#C8D9FF" }]}>
            <MaterialIcons name="check-circle" size={20} color="#2457D6" />
            <Text style={[styles.messageText, { color: colors.foreground }]}>{message}</Text>
          </View>
        ) : null}

        {groups.map(({ category, items }) => (
          <View key={category} style={styles.section}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{CATEGORY_LABELS[category]}</Text>
              <Text style={[styles.sectionCopy, { color: colors.muted }]}>
                {category === "habitat"
                  ? "Cambia l’ambiente in cui vive il tuo Brushling."
                  : category === "accessory"
                    ? "Aggiungi un dettaglio speciale al tuo compagno."
                    : "Rendi la tana più personale e accogliente."}
              </Text>
            </View>

            <View style={styles.grid}>
              {items.map((item) => {
                const owned = customization.ownedIds.includes(item.id);
                const equipped = isEquipped(item);
                const affordable = walletCoins >= item.cost;

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.itemCard,
                      {
                        backgroundColor: owned ? colors.primarySoft : colors.surface,
                        borderColor: equipped ? item.accent : colors.border,
                      },
                    ]}
                  >
                    <View style={[styles.itemIcon, { backgroundColor: colors.primarySoft }]}>
                      <MaterialIcons name={item.icon} size={27} color={item.accent} />
                    </View>

                    <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                    <Text style={[styles.itemDescription, { color: colors.muted }]} numberOfLines={3}>
                      {item.description}
                    </Text>

                    <View style={styles.itemMeta}>
                      {item.cost === 0 ? (
                        <Text style={[styles.cost, { color: colors.primary }]}>Incluso</Text>
                      ) : (
                        <View style={styles.costRow}>
                          <MaterialIcons name="stars" size={15} color="#B98A00" />
                          <Text style={[styles.cost, { color: owned || affordable ? "#8A6900" : "#A14C4C" }]}>
                            {item.cost}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      disabled={equipped}
                      onPress={() => void handleItem(item)}
                      style={({ pressed }) => [
                        styles.itemButton,
                        {
                          backgroundColor: equipped
                            ? item.accent
                            : owned
                              ? "#FFFFFF"
                              : affordable || item.cost === 0
                                ? item.accent
                                : "#D9DCE4",
                          borderColor: equipped || !owned ? item.accent : colors.border,
                        },
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.itemButtonText,
                          { color: equipped || !owned ? "#FFFFFF" : colors.foreground },
                        ]}
                      >
                        {equipped
                          ? "Equipaggiato"
                          : owned
                            ? "Equipaggia"
                            : item.cost === 0
                              ? "Usa"
                              : affordable
                                ? "Acquista"
                                : "Servono monete"}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        <View style={[styles.currentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MaterialIcons name="home" size={22} color={colors.primary} />
          <View style={styles.currentCopy}>
            <Text style={[styles.currentTitle, { color: colors.foreground }]}>Configurazione attuale</Text>
            <Text style={[styles.currentText, { color: colors.muted }]}>
              {getCustomizationItem(customization.equippedHabitatId)?.name}
              {customization.equippedAccessoryId
                ? ` · ${getCustomizationItem(customization.equippedAccessoryId)?.name}`
                : ""}
              {customization.equippedDecorId
                ? ` · ${getCustomizationItem(customization.equippedDecorId)?.name}`
                : ""}
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 80, gap: 18 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerWrap: { flex: 1 },
  walletCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  walletIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FFFFFFAA",
    alignItems: "center",
    justifyContent: "center",
  },
  walletCopy: { flex: 1 },
  walletEyebrow: { fontSize: 9, lineHeight: 13, fontWeight: "900", letterSpacing: 0.8 },
  walletValue: { fontSize: 18, lineHeight: 23, fontWeight: "900" },
  walletText: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  infoCard: { borderWidth: 1.5, borderRadius: 20, padding: 13, flexDirection: "row", alignItems: "center", gap: 10 },
  infoCopy: { flex: 1 },
  infoTitle: { fontSize: 15, lineHeight: 20, fontWeight: "900" },
  infoText: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  messageCard: { borderWidth: 1, borderRadius: 18, padding: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  messageText: { flex: 1, fontSize: 11, lineHeight: 16, fontWeight: "800" },
  section: { gap: 11 },
  sectionTitle: { fontSize: 22, lineHeight: 28, fontWeight: "900" },
  sectionCopy: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  itemCard: {
    width: "48%",
    minHeight: 245,
    borderWidth: 2,
    borderRadius: 22,
    padding: 13,
  },
  itemIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  itemName: { fontSize: 14, lineHeight: 19, fontWeight: "900", marginTop: 8 },
  itemDescription: { fontSize: 10, lineHeight: 15, marginTop: 4, minHeight: 45 },
  itemMeta: { minHeight: 24, justifyContent: "center", marginTop: 6 },
  costRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  cost: { fontSize: 11, lineHeight: 15, fontWeight: "900" },
  itemButton: {
    minHeight: 40,
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
  },
  itemButtonText: { fontSize: 10, lineHeight: 14, fontWeight: "900", textAlign: "center" },
  currentCard: { borderWidth: 1, borderRadius: 19, padding: 13, flexDirection: "row", alignItems: "center", gap: 9 },
  currentCopy: { flex: 1 },
  currentTitle: { fontSize: 13, lineHeight: 18, fontWeight: "900" },
  currentText: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
});

