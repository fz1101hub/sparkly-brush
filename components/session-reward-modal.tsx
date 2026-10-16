import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { BrushlingAvatar } from "@/components/brushling-avatar";
import { CelebrationBurst } from "@/components/celebration-burst";
import { useAudioFeedback } from "@/contexts/audio-feedback-context";
import { useBrushling } from "@/contexts/brushling-context";
import { usePreferences } from "@/contexts/preferences-context";
import { useColors } from "@/hooks/use-colors";
import { getBrushling, getEvolution } from "@/lib/brushlings";
import {
  celebrationShowsSelectedCreature,
  sessionCelebrationKind,
} from "@/lib/session-reward-presentation";

export function SessionRewardModal() {
  const colors = useColors();
  const { playSuccess } = useAudioFeedback();
  const { preferences } = usePreferences();
  const { reward, discovery, progressReward, dismissReward, selected } = useBrushling();

  useEffect(() => {
    if (!reward) return;
    if (reward.completed) playSuccess();
    if (!preferences.hapticsEnabled || Platform.OS === "web") return;
    void Haptics.notificationAsync(
      reward.completed
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning,
    ).catch(() => {});
  }, [playSuccess, preferences.hapticsEnabled, reward]);

  if (!reward) return null;

  const hatchDefinition = discovery?.eggHatched;
  const hatchedCreature = hatchDefinition ? getBrushling(hatchDefinition.brushlingId) : null;
  const celebrationKind = sessionCelebrationKind(reward, Boolean(hatchedCreature));
  const evolved = celebrationKind === "evolution" || celebrationKind === "double";
  const doubleSurprise = celebrationKind === "double";
  const specialProgress = Boolean(progressReward && progressReward.totalBonusCoins > 0);
  const celebration = evolved || Boolean(hatchedCreature) || Boolean(progressReward?.chestUnlocked) || Boolean(progressReward?.achievementTitles.length);
  const showSelectedCreature = celebrationShowsSelectedCreature(celebrationKind);
  const displayCreature = showSelectedCreature ? selected : hatchedCreature ?? selected;
  const displayLevel = showSelectedCreature ? reward.level : 1;
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
              backgroundColor: colors.surface,
              borderColor: celebration ? "#58B9FF" : selected.accent,
            },
          ]}
        >
          <CelebrationBurst active={celebration || reward.completed} />
          <View style={styles.stars}>
            <MaterialIcons name="star" size={28} color="#FFD65A" />
            <MaterialIcons name="star" size={38} color="#FFD65A" />
            <MaterialIcons name="star" size={28} color="#FFD65A" />
          </View>

          <Text style={[styles.eyebrow, { color: colors.primary }]}>
            {doubleSurprise
              ? "DOPPIA SORPRESA!"
              : evolved
              ? "EVOLUZIONE!"
              : hatchedCreature
                ? "L'UOVO SI È SCHIUSO!"
                : reward.completed
                  ? "SESSIONE COMPLETATA"
                  : "BEL TENTATIVO"}
          </Text>

          <Text style={[styles.title, { color: colors.foreground }]}>
            {doubleSurprise
              ? `${reward.evolvedFrom} è diventato ${reward.evolvedTo} e ${hatchedCreature?.name} è entrato nella squadra!`
              : evolved
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

          <Text style={[styles.creatureName, { color: colors.foreground }]}>
            {displayEvolution.name}
          </Text>
          <Text style={[styles.creatureTitle, { color: colors.primary }]}>
            {displayEvolution.title}
          </Text>

          <View style={styles.rewardRow}>
            <View style={[styles.rewardPill, { backgroundColor: colors.primarySoft }]}>
              <MaterialIcons name="auto-awesome" size={21} color={celebration ? "#FFE68A" : selected.accent} />
              <Text style={[styles.rewardValue, { color: colors.foreground }]}>
                +{reward.xpEarned} XP
              </Text>
            </View>
            <View style={[styles.rewardPill, { backgroundColor: colors.primarySoft }]}>
              <MaterialIcons name="stars" size={21} color="#D69C00" />
              <Text style={[styles.rewardValue, { color: colors.foreground }]}>
                +{reward.coinsEarned}
              </Text>
            </View>
          </View>

          {discovery ? (
            <View style={[styles.discoveryCard, { backgroundColor: colors.primarySoft }]}>
              <View style={[styles.discoveryIcon, { backgroundColor: colors.primarySoft }]}>
                <MaterialIcons name={discovery.item.icon} size={22} color={discovery.item.accent} />
              </View>
              <View style={styles.discoveryCopy}>
                <Text style={[styles.discoveryEyebrow, { color: colors.muted }]}>
                  HAI TROVATO
                </Text>
                <Text style={[styles.discoveryTitle, { color: colors.foreground }]}>
                  {discovery.item.name}
                </Text>
                {discovery.eggFound ? (
                  <Text style={[styles.discoveryExtra, { color: colors.primary }]}>
                    + {discovery.eggFound.name}: continua a spazzolare per farlo schiudere!
                  </Text>
                ) : null}
                {discovery.eggHatched ? (
                  <Text style={[styles.discoveryExtra, { color: colors.primary }]}>
                    {discovery.eggHatched.name} si è schiuso: nuovo Brushling in squadra.
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {progressReward && specialProgress ? (
            <View style={[styles.progressRewardCard, { backgroundColor: colors.primarySoft }]}>
              <View style={[styles.progressRewardIcon, { backgroundColor: progressReward.chestUnlocked ? "#E8BE38" : "#7357C7" }]}>
                <MaterialIcons
                  name={progressReward.chestUnlocked ? "card-giftcard" : progressReward.achievementTitles.length ? "emoji-events" : "flag"}
                  size={22}
                  color="#FFFFFF"
                />
              </View>
              <View style={styles.progressRewardCopy}>
                <Text style={[styles.progressRewardEyebrow, { color: colors.primary }]}>
                  BONUS AVVENTURA +{progressReward.totalBonusCoins}
                </Text>
                <Text style={[styles.progressRewardTitle, { color: colors.foreground }]}>
                  {progressReward.chestUnlocked
                    ? "Scrigno del Sorriso aperto!"
                    : progressReward.achievementTitles.length
                      ? "Nuovo badge sbloccato!"
                      : "Missione completata!"}
                </Text>
                <Text style={[styles.progressRewardText, { color: colors.muted }]} numberOfLines={2}>
                  {[...progressReward.missionTitles, ...progressReward.achievementTitles].join(" · ")}
                </Text>
              </View>
            </View>
          ) : null}

          {reward.level > reward.previousLevel ? (
            <View style={[styles.levelBanner, { backgroundColor: colors.primarySoft }]}>
              <MaterialIcons name="arrow-upward" size={18} color={celebration ? "#BFE3FF" : "#2457D6"} />
              <Text style={[styles.levelText, { color: colors.foreground }]}>
                Nuovo livello: {reward.level}
              </Text>
            </View>
          ) : null}

          <Text style={[styles.message, { color: colors.muted }]}>
            {doubleSurprise
              ? `${reward.evolvedTo} è più forte e ${hatchedCreature?.name} ti aspetta nella schermata Creature.`
              : hatchedCreature
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
              { backgroundColor: colors.primary },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.buttonText, { color: colors.primaryText }]}>
              {doubleSurprise
                ? "Scopri le sorprese"
                : hatchedCreature
                  ? "Conosci il nuovo amico"
                  : evolved
                    ? "Continua l'avventura"
                    : "Fantastico!"}
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

