import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { BrushlingAvatar } from "@/components/brushling-avatar";
import { useBrushling } from "@/contexts/brushling-context";
import { useColors } from "@/hooks/use-colors";
import { getBrushling, getEvolution } from "@/lib/brushlings";

export function SessionRewardModal() {
  const colors = useColors();
  const { reward, discovery, progressReward, dismissReward, selected } = useBrushling();

  if (!reward) return null;

  const evolved = Boolean(reward.evolvedTo);
  const hatchDefinition = discovery?.eggHatched;
  const hatchedCreature = hatchDefinition ? getBrushling(hatchDefinition.brushlingId) : null;
  const specialProgress = Boolean(progressReward && progressReward.totalBonusCoins > 0);
  const celebration = evolved || Boolean(hatchedCreature) || Boolean(progressReward?.chestUnlocked) || Boolean(progressReward?.achievementTitles.length);
  const displayCreature = hatchedCreature ?? selected;
  const displayLevel = hatchedCreature ? 1 : reward.level;
  const displayEvolution = getEvolution(displayCreature, displayLevel);

  return (
    <Modal
      animationType="fade"
      transparent
      visible
      onRequestClose={dismissReward}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: celebration ? "#0C4F9C" : colors.surface,
              borderColor: celebration ? "#58B9FF" : selected.accent,
            },
          ]}
        >
          <View style={styles.stars}>
            <MaterialIcons name="star" size={28} color="#FFD65A" />
            <MaterialIcons name="star" size={38} color="#FFD65A" />
            <MaterialIcons name="star" size={28} color="#FFD65A" />
          </View>

          <Text style={[styles.eyebrow, { color: celebration ? "#BFE3FF" : selected.accent }]}>
            {evolved
              ? "EVOLUZIONE!"
              : hatchedCreature
                ? "L'UOVO SI È SCHIUSO!"
                : reward.completed
                  ? "SESSIONE COMPLETATA"
                  : "BEL TENTATIVO"}
          </Text>

          <Text style={[styles.title, { color: celebration ? "#FFFFFF" : colors.foreground }]}>
            {evolved
              ? `${reward.evolvedFrom} si è evoluto in ${reward.evolvedTo}!`
              : hatchedCreature
                ? `Hai incontrato ${displayEvolution.name}!`
                : reward.completed
                  ? "Fantastico lavoro!"
                  : "Ogni secondo conta!"}
          </Text>

          <View style={styles.avatarWrap}>
            <BrushlingAvatar creature={displayCreature} size={156} level={displayLevel} />
          </View>

          <Text style={[styles.creatureName, { color: celebration ? "#FFFFFF" : colors.foreground }]}>
            {displayEvolution.name}
          </Text>
          <Text style={[styles.creatureTitle, { color: celebration ? "#BFE3FF" : displayCreature.accent }]}>
            {displayEvolution.title}
          </Text>

          <View style={styles.rewardRow}>
            <View style={[styles.rewardPill, { backgroundColor: celebration ? "#FFFFFF18" : selected.soft }]}>
              <MaterialIcons name="auto-awesome" size={21} color={celebration ? "#FFE68A" : selected.accent} />
              <Text style={[styles.rewardValue, { color: celebration ? "#FFFFFF" : colors.foreground }]}>
                +{reward.xpEarned} XP
              </Text>
            </View>
            <View style={[styles.rewardPill, { backgroundColor: celebration ? "#FFFFFF18" : "#FFF7D7" }]}>
              <MaterialIcons name="stars" size={21} color="#D69C00" />
              <Text style={[styles.rewardValue, { color: celebration ? "#FFFFFF" : colors.foreground }]}>
                +{reward.coinsEarned}
              </Text>
            </View>
          </View>

          {discovery ? (
            <View style={[styles.discoveryCard, { backgroundColor: celebration ? "#FFFFFF14" : "#F7F8FC" }]}>
              <View style={[styles.discoveryIcon, { backgroundColor: discovery.item.soft }]}>
                <MaterialIcons name={discovery.item.icon} size={22} color={discovery.item.accent} />
              </View>
              <View style={styles.discoveryCopy}>
                <Text style={[styles.discoveryEyebrow, { color: celebration ? "#BFE3FF" : colors.muted }]}>
                  HAI TROVATO
                </Text>
                <Text style={[styles.discoveryTitle, { color: celebration ? "#FFFFFF" : colors.foreground }]}>
                  {discovery.item.name}
                </Text>
                {discovery.eggFound ? (
                  <Text style={[styles.discoveryExtra, { color: celebration ? "#E9F5FF" : discovery.eggFound.accent }]}>
                    + {discovery.eggFound.name}: continua a spazzolare per farlo schiudere!
                  </Text>
                ) : null}
                {discovery.eggHatched ? (
                  <Text style={[styles.discoveryExtra, { color: "#FFE68A" }]}>
                    {discovery.eggHatched.name} si è schiuso: nuovo Brushling in squadra.
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {progressReward && specialProgress ? (
            <View style={[styles.progressRewardCard, { backgroundColor: celebration ? "#FFFFFF16" : "#FFF8E8" }]}>
              <View style={[styles.progressRewardIcon, { backgroundColor: progressReward.chestUnlocked ? "#E8BE38" : "#7357C7" }]}>
                <MaterialIcons
                  name={progressReward.chestUnlocked ? "card-giftcard" : progressReward.achievementTitles.length ? "emoji-events" : "flag"}
                  size={22}
                  color="#FFFFFF"
                />
              </View>
              <View style={styles.progressRewardCopy}>
                <Text style={[styles.progressRewardEyebrow, { color: celebration ? "#FFE68A" : "#8A6900" }]}>
                  BONUS AVVENTURA +{progressReward.totalBonusCoins}
                </Text>
                <Text style={[styles.progressRewardTitle, { color: celebration ? "#FFFFFF" : colors.foreground }]}>
                  {progressReward.chestUnlocked
                    ? "Scrigno del Sorriso aperto!"
                    : progressReward.achievementTitles.length
                      ? "Nuovo badge sbloccato!"
                      : "Missione completata!"}
                </Text>
                <Text style={[styles.progressRewardText, { color: celebration ? "#E9F5FF" : colors.muted }]} numberOfLines={2}>
                  {[...progressReward.missionTitles, ...progressReward.achievementTitles].join(" · ")}
                </Text>
              </View>
            </View>
          ) : null}

          {reward.level > reward.previousLevel ? (
            <View style={[styles.levelBanner, { backgroundColor: celebration ? "#FFFFFF18" : "#EEF4FF" }]}>
              <MaterialIcons name="arrow-upward" size={18} color={celebration ? "#BFE3FF" : "#2457D6"} />
              <Text style={[styles.levelText, { color: celebration ? "#FFFFFF" : colors.foreground }]}>
                Nuovo livello: {reward.level}
              </Text>
            </View>
          ) : null}

          <Text style={[styles.message, { color: celebration ? "#E9F5FF" : colors.muted }]}>
            {hatchedCreature
              ? `${displayEvolution.name} ora è disponibile nella schermata Creature. Continua l'avventura per scoprire altri premi.`
              : reward.completed
                ? "Hai dato al tuo sorriso due minuti di super potere. Il tuo Brushling è diventato più forte!"
                : "La prossima volta prova ad arrivare fino alla fine: il tuo Brushling ti aspetta."}
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={dismissReward}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: celebration ? "#2C97F4" : selected.accent },
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.buttonText}>
              {hatchedCreature ? "Conosci il nuovo amico" : evolved ? "Continua l'avventura" : "Fantastico!"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#07162ECC",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderWidth: 2,
    borderRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.28,
    shadowRadius: 30,
    elevation: 9,
  },
  stars: { flexDirection: "row", alignItems: "center", gap: 5 },
  eyebrow: { fontSize: 10, lineHeight: 14, fontWeight: "900", letterSpacing: 1.4, marginTop: 6 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: "900", textAlign: "center", marginTop: 4 },
  avatarWrap: { marginTop: 8 },
  creatureName: { fontSize: 21, lineHeight: 26, fontWeight: "900", marginTop: 2 },
  creatureTitle: { fontSize: 9, lineHeight: 13, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 },
  rewardRow: { flexDirection: "row", gap: 10, marginTop: 13, width: "100%" },
  rewardPill: {
    flex: 1,
    minHeight: 46,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  rewardValue: { fontSize: 14, lineHeight: 19, fontWeight: "900" },
  discoveryCard: {
    width: "100%",
    borderRadius: 18,
    padding: 11,
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  discoveryIcon: { width: 43, height: 43, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  discoveryCopy: { flex: 1 },
  discoveryEyebrow: { fontSize: 8, lineHeight: 11, fontWeight: "900", letterSpacing: 0.8 },
  discoveryTitle: { fontSize: 13, lineHeight: 18, fontWeight: "900" },
  discoveryExtra: { fontSize: 9, lineHeight: 14, fontWeight: "800", marginTop: 2 },
  progressRewardCard: {
    width: "100%",
    borderRadius: 18,
    padding: 10,
    marginTop: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  progressRewardIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  progressRewardCopy: { flex: 1 },
  progressRewardEyebrow: { fontSize: 8, lineHeight: 11, fontWeight: "900", letterSpacing: 0.7 },
  progressRewardTitle: { fontSize: 12, lineHeight: 17, fontWeight: "900" },
  progressRewardText: { fontSize: 9, lineHeight: 13, marginTop: 1 },
  levelBanner: {
    marginTop: 9,
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  levelText: { fontSize: 12, lineHeight: 17, fontWeight: "900" },
  message: { fontSize: 11, lineHeight: 17, textAlign: "center", marginTop: 11, fontWeight: "600" },
  button: {
    width: "100%",
    minHeight: 52,
    borderRadius: 18,
    marginTop: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "#FFFFFF", fontSize: 15, lineHeight: 20, fontWeight: "900" },
  pressed: { opacity: 0.86, transform: [{ scale: 0.985 }] },
});
