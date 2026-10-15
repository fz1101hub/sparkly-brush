import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { BrushlingAvatar } from "@/components/brushling-avatar";
import { ScreenContainer } from "@/components/screen-container";
import { useBrushling } from "@/contexts/brushling-context";
import { useColors } from "@/hooks/use-colors";
import {
  COLLECTIBLE_ITEMS,
  EGG_DEFINITIONS,
} from "@/lib/game-inventory";
import { getBrushling, getEvolution } from "@/lib/brushlings";

export default function RewardsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { inventory, walletCoins } = useBrushling();

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Torna alla mappa"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, { backgroundColor: colors.surface }, pressed && styles.pressed]}
          >
            <MaterialIcons name="arrow-back" size={22} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerWrap}>
            <AppHeader eyebrow="Collezione" title="I tuoi premi" connected={false} />
          </View>
        </View>

        <View style={[styles.hero, { backgroundColor: colors.primarySoft, borderColor: "#F2D588" }]}>
          <MaterialIcons name="stars" size={34} color="#B98A00" />
          <View style={styles.heroCopy}>
            <Text style={[styles.heroTitle, { color: colors.foreground }]}>
              {inventory.completedSessions} avventure completate
            </Text>
            <Text style={[styles.heroText, { color: colors.muted }]}>
              Ogni sessione completa lascia un ricordo della zona esplorata. Le uova richiedono altre sessioni per schiudersi.
            </Text>
          </View>
        </View>

        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Oggetti trovati</Text>
          <Text style={[styles.sectionCopy, { color: colors.muted }]}>
            La tua piccola collezione cresce insieme alle buone abitudini.
          </Text>
        </View>

        <View style={styles.itemGrid}>
          {COLLECTIBLE_ITEMS.map((item) => {
            const count = inventory.itemCounts[item.id];
            return (
              <View
                key={item.id}
                style={[
                  styles.itemCard,
                  {
                    backgroundColor: count > 0 ? colors.primarySoft : colors.surface,
                    borderColor: count > 0 ? item.accent : colors.border,
                    opacity: count > 0 ? 1 : 0.55,
                  },
                ]}
              >
                <View style={[styles.itemIcon, { backgroundColor: count > 0 ? item.accent : "#8C93A3" }]}>
                  <MaterialIcons name={item.icon} size={25} color="#FFFFFF" />
                </View>
                <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                <Text style={[styles.itemCount, { color: count > 0 ? colors.primary : colors.muted }]}>
                  {count > 0 ? `x${count}` : "???"}
                </Text>
                <Text style={[styles.itemDescription, { color: colors.muted }]} numberOfLines={3}>
                  {count > 0 ? item.description : "Continua a esplorare per scoprire questo oggetto."}
                </Text>
              </View>
            );
          })}
        </View>

        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Uova misteriose</Text>
          <Text style={[styles.sectionCopy, { color: colors.muted }]}>
            Quando un uovo si schiude, il nuovo Brushling entra nella tua collezione.
          </Text>
        </View>

        <View style={styles.eggStack}>
          {EGG_DEFINITIONS.map((definition) => {
            const egg = inventory.eggs.find((candidate) => candidate.id === definition.id)!;
            const creature = getBrushling(definition.brushlingId);
            const evolution = getEvolution(creature, 1);
            const progressWidth = `${Math.round(egg.progress * 100)}%` as `${number}%`;

            return (
              <View
                key={egg.id}
                style={[
                  styles.eggCard,
                  {
                    backgroundColor: egg.found ? colors.primarySoft : colors.surface,
                    borderColor: egg.hatched ? creature.accent : egg.found ? egg.accent : colors.border,
                    opacity: egg.found ? 1 : 0.58,
                  },
                ]}
              >
                <View style={[styles.eggVisual, { backgroundColor: egg.found ? colors.primarySoft : "#ECEEF3" }]}>
                  {egg.hatched ? (
                    <BrushlingAvatar creature={creature} size={92} level={1} />
                  ) : (
                    <MaterialIcons
                      name={egg.found ? "egg" : "lock"}
                      size={52}
                      color={egg.found ? egg.accent : "#7D8494"}
                    />
                  )}
                </View>

                <View style={styles.eggCopy}>
                  <Text style={[styles.eggEyebrow, { color: egg.found ? colors.primary : colors.muted }]}>
                    {egg.hatched ? "SCHIUSO" : egg.found ? "IN COVA" : "NON ANCORA TROVATO"}
                  </Text>
                  <Text style={[styles.eggName, { color: colors.foreground }]}>
                    {egg.hatched ? evolution.name : egg.found ? egg.name : "Uovo misterioso"}
                  </Text>
                  <Text style={[styles.eggDescription, { color: colors.muted }]}>
                    {egg.hatched
                      ? `${evolution.name} è entrato nella tua squadra!`
                      : egg.found
                        ? egg.description
                        : `Si può trovare dopo ${egg.foundAtCompletedSessions} sessioni complete.`}
                  </Text>

                  {egg.found && !egg.hatched ? (
                    <>
                      <View style={[styles.progressTrack, { backgroundColor: colors.primarySoft }]}>
                        <View style={[styles.progressFill, { width: progressWidth, backgroundColor: egg.accent }]} />
                      </View>
                      <Text style={[styles.progressText, { color: colors.muted }]}>
                        {egg.sessionsRemaining} session{egg.sessionsRemaining === 1 ? "e" : "i"} alla schiusa
                      </Text>
                    </>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/(tabs)/habitat")}
          style={({ pressed }) => [
            styles.footerCard,
            { backgroundColor: colors.primarySoft, borderColor: "#DCE3FF" },
            pressed && styles.pressed,
          ]}
        >
          <MaterialIcons name="home" size={22} color={colors.primary} />
          <View style={styles.footerCopy}>
            <Text style={[styles.footerTitle, { color: colors.foreground }]}>Vai alla tana</Text>
            <Text style={[styles.footerText, { color: colors.muted }]}>
              Hai {walletCoins} monete sorriso da spendere in habitat, accessori e decorazioni.
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.muted} />
        </Pressable>
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
  hero: { borderWidth: 1, borderRadius: 24, padding: 15, flexDirection: "row", gap: 12, alignItems: "center" },
  heroCopy: { flex: 1 },
  heroTitle: { fontSize: 17, lineHeight: 22, fontWeight: "900" },
  heroText: { fontSize: 11, lineHeight: 17, marginTop: 3 },
  sectionTitle: { fontSize: 22, lineHeight: 28, fontWeight: "900" },
  sectionCopy: { fontSize: 12, lineHeight: 18, marginTop: 3 },
  itemGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  itemCard: {
    width: "48%",
    minHeight: 184,
    borderWidth: 1.5,
    borderRadius: 21,
    padding: 13,
  },
  itemIcon: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  itemName: { fontSize: 14, lineHeight: 19, fontWeight: "900", marginTop: 9 },
  itemCount: { fontSize: 13, lineHeight: 18, fontWeight: "900", marginTop: 1 },
  itemDescription: { fontSize: 10, lineHeight: 15, marginTop: 5 },
  eggStack: { gap: 12 },
  eggCard: {
    borderWidth: 2,
    borderRadius: 24,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  eggVisual: { width: 102, height: 102, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  eggCopy: { flex: 1 },
  eggEyebrow: { fontSize: 9, lineHeight: 13, fontWeight: "900", letterSpacing: 0.8 },
  eggName: { fontSize: 17, lineHeight: 22, fontWeight: "900", marginTop: 2 },
  eggDescription: { fontSize: 10, lineHeight: 15, marginTop: 3 },
  progressTrack: { height: 8, borderRadius: 99, overflow: "hidden", marginTop: 9 },
  progressFill: { height: "100%", borderRadius: 99 },
  progressText: { fontSize: 9, lineHeight: 13, fontWeight: "800", marginTop: 4 },
  footerCard: { borderWidth: 1, borderRadius: 20, padding: 14, flexDirection: "row", alignItems: "flex-start", gap: 9 },
  footerCopy: { flex: 1 },
  footerTitle: { fontSize: 13, lineHeight: 18, fontWeight: "900" },
  footerText: { fontSize: 10, lineHeight: 15, fontWeight: "600", marginTop: 2 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
});

