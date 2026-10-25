import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { DesignText as Text } from "@/components/design-text";

import { BrushlingAvatar } from "@/components/brushling-avatar";
import { CelebrationBurst } from "@/components/celebration-burst";
import { useAudioFeedback } from "@/contexts/audio-feedback-context";
import { useBrushling } from "@/contexts/brushling-context";
import { useI18n } from "@/contexts/locale-context";
import { usePreferences } from "@/contexts/preferences-context";
import { useColors } from "@/hooks/use-colors";
import { announce } from "@/lib/announce";
import { getBrushling, getEvolution } from "@/lib/brushlings";
import {
  celebrationShowsSelectedCreature,
  sessionCelebrationKind,
} from "@/lib/session-reward-presentation";

export function SessionRewardModal() {
  const colors = useColors();
  const { playSuccess } = useAudioFeedback();
  const { preferences } = usePreferences();
  const { reward, discovery, progressReward, dismissReward, selected } =
    useBrushling();
  const { t } = useI18n();

  useEffect(() => {
    if (!reward) return;
    announce(t(reward.completed ? "sessionReward.completedLabel" : "sessionReward.interruptedLabel"));
    if (reward.completed) playSuccess();
    if (!preferences.hapticsEnabled || Platform.OS === "web") return;
    void Haptics.notificationAsync(
      reward.completed
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning,
    );
  }, [playSuccess, preferences.hapticsEnabled, reward, t]);

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
      <ScrollView
        testID="session-reward-modal"
        role="dialog"
        accessibilityViewIsModal={Platform.OS !== "web"}
        accessibilityLabel={t(
          reward.completed
            ? "sessionReward.completedLabel"
            : "sessionReward.interruptedLabel",
        )}
        style={styles.backdrop}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: celebration ? "#0C4F9C" : colors.surface,
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

          <Text style={[styles.eyebrow, { color: celebration ? "#BFE3FF" : selected.accent }]}>
            {doubleSurprise
              ? t("sessionReward.doubleSurpriseEyebrow")
              : evolved
                ? t("sessionReward.evolutionEyebrow")
                : hatchedCreature
                  ? t("sessionReward.hatchedEyebrow")
                  : reward.completed
                    ? t("sessionReward.completedEyebrow")
                    : t("sessionReward.interruptedEyebrow")}
          </Text>

          <Text style={[styles.title, { color: celebration ? "#FFFFFF" : colors.foreground }]}>
            {doubleSurprise
              ? t("sessionReward.doubleSurpriseTitle", {
                  from: reward.evolvedFrom ?? "",
                  to: reward.evolvedTo ?? "",
                  name: hatchedCreature?.name ?? "",
                })
              : evolved
                ? t("sessionReward.evolutionTitle", {
                    from: reward.evolvedFrom ?? "",
                    to: reward.evolvedTo ?? "",
                  })
                : hatchedCreature
                  ? t("sessionReward.encounterTitle", {
                      name: displayEvolution.name,
                    })
                  : reward.completed
                    ? t("sessionReward.completedTitle")
                    : t("sessionReward.interruptedTitle")}
          </Text>

          <View style={styles.avatarWrap}>
            <BrushlingAvatar creature={displayCreature} size={156} level={displayLevel} />
          </View>

          <Text style={[styles.creatureName, { color: celebration ? "#FFFFFF" : colors.foreground }]}>
            {displayEvolution.name}
          </Text>
          <Text style={[styles.creatureTitle, { color: celebration ? "#BFE3FF" : displayCreature.textAccent }]}>
            {displayEvolution.title}
          </Text>

          <View style={styles.rewardRow}>
            <View
              style={[
                styles.rewardPill,
                { backgroundColor: celebration ? "#FFFFFF18" : selected.soft },
              ]}
            >
              <MaterialIcons
                name="auto-awesome"
                size={21}
                color={celebration ? "#FFE68A" : selected.accent}
              />
              <Text
                style={[
                  styles.rewardValue,
                  { color: celebration ? "#FFFFFF" : colors.foreground },
                ]}
              >
                {t("sessionReward.xpEarned", { xp: reward.xpEarned })}
              </Text>
            </View>
            <View style={[styles.rewardPill, { backgroundColor: celebration ? "#FFFFFF18" : "#FFF7D7" }]}>
              <MaterialIcons name="stars" size={21} color="#D69C00" />
              <Text
                style={[
                  styles.rewardValue,
                  { color: celebration ? "#FFFFFF" : colors.foreground },
                ]}
              >
                {t("sessionReward.coinsEarned", { coins: reward.coinsEarned })}
              </Text>
            </View>
          </View>

          {discovery ? (
            <View style={[styles.discoveryCard, { backgroundColor: celebration ? "#FFFFFF14" : "#F7F8FC" }]}>
              <View style={[styles.discoveryIcon, { backgroundColor: discovery.item.soft }]}>
                <MaterialIcons name={discovery.item.icon} size={22} color={discovery.item.accent} />
              </View>
              <View style={styles.discoveryCopy}>
                <Text
                  style={[
                    styles.discoveryEyebrow,
                    { color: celebration ? "#BFE3FF" : colors.muted },
                  ]}
                >
                  {t("sessionReward.discoveryEyebrow")}
                </Text>
                <Text style={[styles.discoveryTitle, { color: celebration ? "#FFFFFF" : colors.foreground }]}>
                  {discovery.item.name}
                </Text>
                {discovery.eggFound ? (
                  <Text
                    style={[
                      styles.discoveryExtra,
                      {
                        color: celebration
                          ? "#E9F5FF"
                          : discovery.eggFound.accent,
                      },
                    ]}
                  >
                    {t("sessionReward.eggFound", {
                      name: discovery.eggFound.name,
                    })}
                  </Text>
                ) : null}
                {discovery.eggHatched ? (
                  <Text style={[styles.discoveryExtra, { color: "#FFE68A" }]}>
                    {t("sessionReward.eggHatched", {
                      name: discovery.eggHatched.name,
                    })}
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
                <Text
                  style={[
                    styles.progressRewardEyebrow,
                    { color: celebration ? "#FFE68A" : "#8A6900" },
                  ]}
                >
                  {t("sessionReward.adventureBonus", {
                    coins: progressReward.totalBonusCoins,
                  })}
                </Text>
                <Text style={[styles.progressRewardTitle, { color: celebration ? "#FFFFFF" : colors.foreground }]}>
                  {progressReward.chestUnlocked
                    ? t("sessionReward.chestUnlocked")
                    : progressReward.achievementTitles.length
                      ? t("sessionReward.newBadge")
                      : t("sessionReward.missionCompleted")}
                </Text>
                <Text style={[styles.progressRewardText, { color: celebration ? "#E9F5FF" : colors.muted }]} numberOfLines={2}>
                  {[...progressReward.missionTitles, ...progressReward.achievementTitles].join(" · ")}
                </Text>
              </View>
            </View>
          ) : null}

          {reward.level > reward.previousLevel ? (
            <View
              style={[
                styles.levelBanner,
                { backgroundColor: celebration ? "#FFFFFF18" : "#EEF4FF" },
              ]}
            >
              <MaterialIcons
                name="arrow-upward"
                size={18}
                color={celebration ? "#BFE3FF" : "#2457D6"}
              />
              <Text
                style={[
                  styles.levelText,
                  { color: celebration ? "#FFFFFF" : colors.foreground },
                ]}
              >
                {t("sessionReward.newLevel", { level: reward.level })}
              </Text>
            </View>
          ) : null}

          <Text style={[styles.message, { color: celebration ? "#E9F5FF" : colors.muted }]}>
            {doubleSurprise
              ? t("sessionReward.doubleSurpriseMessage", {
                  evolvedName: reward.evolvedTo ?? "",
                  hatchedName: hatchedCreature?.name ?? "",
                })
              : hatchedCreature
                ? t("sessionReward.hatchedMessage", {
                    name: displayEvolution.name,
                  })
                : reward.completed
                  ? t("sessionReward.completedMessage")
                  : t("sessionReward.interruptedMessage")}
          </Text>

          <Pressable
            testID="session-reward-dismiss"
            accessibilityRole="button"
            accessibilityLabel={t("sessionReward.dismissLabel")}
            onPress={dismissReward}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: celebration ? "#006ABF" : selected.textAccent },
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.buttonText}>
              {doubleSurprise
                ? t("sessionReward.doubleSurpriseAction")
                : hatchedCreature
                  ? t("sessionReward.hatchedAction")
                  : evolved
                    ? t("sessionReward.evolutionAction")
                    : t("sessionReward.defaultAction")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#07162ECC",
    padding: 20,
  },
  scrollContent: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingVertical: 8 },
  card: {
    width: "100%",
    maxWidth: 420,
    borderWidth: 2,
    borderRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    alignItems: "center",
    ...Platform.select({
      web: { boxShadow: "0 18px 30px rgba(0, 0, 0, 0.28)" },
      default: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.28,
        shadowRadius: 30,
        elevation: 9,
      },
    }),
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
