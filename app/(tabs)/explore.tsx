import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { ComponentProps } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { BrushlingAvatar } from "@/components/brushling-avatar";
import { ScreenContainer } from "@/components/screen-container";
import { useBrushling } from "@/contexts/brushling-context";
import { useColors } from "@/hooks/use-colors";
import {
  ADVENTURE_ZONES,
  getCurrentAdventureZone,
  getNextAdventureZone,
  isAdventureZoneUnlocked,
  sessionsUntilZone,
  type AdventureZoneId,
} from "@/lib/adventure";
import { getEvolution } from "@/lib/brushlings";

const ZONE_ICONS: Record<AdventureZoneId, ComponentProps<typeof MaterialIcons>["name"]> = {
  "bubble-bay": "opacity",
  "fresh-forest": "nature",
  "spark-mountain": "terrain",
  "crystal-lake": "ac-unit",
  "smile-valley": "sentiment-very-satisfied",
};

export default function ExploreScreen() {
  const colors = useColors();
  const { selected, stats, hasChosenStarter } = useBrushling();
  const currentZone = getCurrentAdventureZone(stats.completedSessions);
  const nextZone = getNextAdventureZone(stats.completedSessions);
  const evolution = getEvolution(selected, stats.level);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader eyebrow="Avventura" title="Isola Sorridente" connected={false} />

        <View style={[styles.hero, { backgroundColor: "#EAF6FF", borderColor: "#B8DFFF" }]}>
          <View style={styles.heroCopy}>
            <Text style={[styles.heroEyebrow, { color: "#0B67B2" }]}>OGNI SPAZZOLATA TI PORTA PIÙ LONTANO</Text>
            <Text style={[styles.heroTitle, { color: colors.foreground }]}>
              {hasChosenStarter ? `${evolution.name} esplora con te` : "Scegli prima il tuo compagno"}
            </Text>
            <Text style={[styles.heroText, { color: colors.muted }]}>
              {nextZone
                ? `Mancano ${sessionsUntilZone(nextZone, stats.completedSessions)} sessioni complete per raggiungere ${nextZone.name}.`
                : "Hai aperto tutte le zone disponibili in questa prima versione dell'isola!"}
            </Text>
          </View>
          <BrushlingAvatar creature={selected} size={104} level={stats.level} />
        </View>

        <View style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.progressTop}>
            <View>
              <Text style={[styles.progressEyebrow, { color: currentZone.accent }]}>ZONA ATTUALE</Text>
              <Text style={[styles.progressTitle, { color: colors.foreground }]}>{currentZone.name}</Text>
            </View>
            <View style={[styles.sessionBadge, { backgroundColor: currentZone.soft }]}>
              <MaterialIcons name="done-all" size={17} color={currentZone.accent} />
              <Text style={[styles.sessionBadgeText, { color: currentZone.accent }]}>
                {stats.completedSessions} sessioni
              </Text>
            </View>
          </View>
          <Text style={[styles.progressCopy, { color: colors.muted }]}>{currentZone.subtitle}</Text>
        </View>

        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Mappa dell'isola</Text>
          <Text style={[styles.sectionCopy, { color: colors.muted }]}>
            Completa le sessioni da due minuti per aprire nuovi luoghi e preparare futuri incontri, uova e premi.
          </Text>
        </View>

        <View style={styles.map}>
          {ADVENTURE_ZONES.map((zone, index) => {
            const unlocked = isAdventureZoneUnlocked(zone, stats.completedSessions);
            const active = zone.id === currentZone.id;
            const remaining = sessionsUntilZone(zone, stats.completedSessions);
            const alignLeft = index % 2 === 0;

            return (
              <View key={zone.id} style={styles.mapStep}>
                {index > 0 ? (
                  <View
                    style={[
                      styles.connector,
                      {
                        backgroundColor: unlocked ? zone.accent : colors.border,
                        alignSelf: alignLeft ? "flex-start" : "flex-end",
                        marginLeft: alignLeft ? 55 : 0,
                        marginRight: alignLeft ? 0 : 55,
                      },
                    ]}
                  />
                ) : null}

                <View style={[styles.zoneRow, { justifyContent: alignLeft ? "flex-start" : "flex-end" }]}>
                  <View
                    style={[
                      styles.zoneCard,
                      {
                        backgroundColor: unlocked ? zone.soft : colors.surface,
                        borderColor: active ? zone.accent : colors.border,
                        opacity: unlocked ? 1 : 0.66,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.zoneIcon,
                        { backgroundColor: unlocked ? zone.accent : "#80889A" },
                      ]}
                    >
                      <MaterialIcons
                        name={unlocked ? ZONE_ICONS[zone.id] : "lock"}
                        size={27}
                        color="#FFFFFF"
                      />
                    </View>

                    <View style={styles.zoneCopy}>
                      <View style={styles.zoneTitleRow}>
                        <Text style={[styles.zoneTitle, { color: colors.foreground }]}>{zone.name}</Text>
                        {active ? (
                          <View style={[styles.hereBadge, { backgroundColor: zone.accent }]}>
                            <Text style={styles.hereText}>SEI QUI</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={[styles.zoneSubtitle, { color: colors.muted }]}>{zone.subtitle}</Text>
                      <Text style={[styles.zoneStatus, { color: unlocked ? zone.accent : colors.muted }]}>
                        {unlocked
                          ? "Zona sbloccata"
                          : `Si apre tra ${remaining} session${remaining === 1 ? "e" : "i"}`}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View style={[styles.futureCard, { backgroundColor: "#FFF8E8", borderColor: "#F2D588" }]}>
          <MaterialIcons name="card-giftcard" size={25} color="#B98A00" />
          <View style={styles.futureCopy}>
            <Text style={[styles.futureTitle, { color: colors.foreground }]}>Prossimo passo: uova e incontri</Text>
            <Text style={[styles.futureText, { color: colors.muted }]}>
              La mappa è già agganciata alle sessioni reali. Nel prossimo incremento possiamo far trovare uova, oggetti e Brushlings rari nelle zone sbloccate.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 120, gap: 18 },
  hero: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroCopy: { flex: 1 },
  heroEyebrow: { fontSize: 9, lineHeight: 13, fontWeight: "900", letterSpacing: 0.8 },
  heroTitle: { fontSize: 22, lineHeight: 27, fontWeight: "900", marginTop: 4 },
  heroText: { fontSize: 12, lineHeight: 18, fontWeight: "600", marginTop: 5 },
  progressCard: { borderWidth: 1, borderRadius: 22, padding: 15 },
  progressTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  progressEyebrow: { fontSize: 9, lineHeight: 13, fontWeight: "900", letterSpacing: 1 },
  progressTitle: { fontSize: 19, lineHeight: 24, fontWeight: "900", marginTop: 2 },
  progressCopy: { fontSize: 12, lineHeight: 18, marginTop: 5 },
  sessionBadge: {
    minHeight: 34,
    borderRadius: 99,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sessionBadgeText: { fontSize: 10, lineHeight: 14, fontWeight: "900" },
  sectionTitle: { fontSize: 22, lineHeight: 28, fontWeight: "900" },
  sectionCopy: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  map: { paddingVertical: 2 },
  mapStep: { width: "100%" },
  connector: { width: 4, height: 34, borderRadius: 99 },
  zoneRow: { width: "100%", flexDirection: "row" },
  zoneCard: {
    width: "88%",
    borderWidth: 2,
    borderRadius: 24,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  zoneIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  zoneCopy: { flex: 1 },
  zoneTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  zoneTitle: { fontSize: 16, lineHeight: 21, fontWeight: "900" },
  hereBadge: { borderRadius: 99, paddingHorizontal: 7, paddingVertical: 3 },
  hereText: { color: "#FFFFFF", fontSize: 8, lineHeight: 10, fontWeight: "900", letterSpacing: 0.4 },
  zoneSubtitle: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  zoneStatus: { fontSize: 10, lineHeight: 15, fontWeight: "900", marginTop: 4 },
  futureCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 15,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  futureCopy: { flex: 1 },
  futureTitle: { fontSize: 14, lineHeight: 19, fontWeight: "900" },
  futureText: { fontSize: 11, lineHeight: 17, marginTop: 3 },
});
