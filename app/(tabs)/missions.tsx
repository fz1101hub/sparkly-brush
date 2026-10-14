import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
} from "react-native";

import { AppHeader } from "@/components/app-header";
import { ScreenContainer } from "@/components/screen-container";
import {
  GOLD_TEXT,
  LIGHT_CARD_FOREGROUND,
  LIGHT_CARD_MUTED,
} from "@/constants/accessibility-colors";
import { useBrushling } from "@/contexts/brushling-context";
import { useI18n } from "@/contexts/locale-context";
import { useBack } from "@/hooks/use-back";
import { useColors } from "@/hooks/use-colors";
import { localizeAchievement, localizeDailyMission } from "@/lib/missions";

export default function MissionsScreen() {
  const colors = useColors();
  const router = useRouter();
  const goBack = useBack();
  const { t, formatNumber } = useI18n();
  const { missionCenter, walletCoins } = useBrushling();
  const today = missionCenter.today;
  const missions = today.missions.map((mission) =>
    localizeDailyMission(mission, t),
  );
  const achievements = missionCenter.achievements.map((achievement) =>
    localizeAchievement(achievement, t),
  );
  const unlockedAchievements = achievements.filter(
    (achievement) => achievement.unlocked,
  ).length;
  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("game.missions.backLabel")}
            hitSlop={4}
            onPress={goBack}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <MaterialIcons
              name="arrow-back"
              size={22}
              color={LIGHT_CARD_FOREGROUND}
            />
          </Pressable>
          <View style={styles.headerWrap}>
            <AppHeader
              eyebrow={t("game.missions.eyebrow")}
              title={t("game.missions.title")}
            />
          </View>
        </View>
        <View
          style={[
            styles.hero,
            { backgroundColor: "#EAF6FF", borderColor: "#B8DFFF" },
          ]}
        >
          <View style={styles.heroIcon}>
            <MaterialIcons name="flag" size={32} color="#0B67B2" />
          </View>
          <View style={styles.heroCopy}>
            <Text style={[styles.heroEyebrow, { color: "#0B67B2" }]}>
              {t("game.missions.today")}
            </Text>
            <Text style={[styles.heroTitle, { color: LIGHT_CARD_FOREGROUND }]}>
              {t("game.missions.completeCount", {
                completed: today.completedCount,
              })}
            </Text>
            <Text style={[styles.heroText, { color: LIGHT_CARD_MUTED }]}>
              {t("game.missions.heroDescription")}
            </Text>
          </View>
        </View>
        <View style={styles.missionStack}>
          {missions.map((mission) => {
            const progress = Math.min(1, mission.progress / mission.target);
            const width = `${Math.round(progress * 100)}%` as DimensionValue;
            return (
              <View
                key={mission.id}
                style={[
                  styles.missionCard,
                  {
                    backgroundColor: mission.completed
                      ? "#E8F8EF"
                      : colors.surface,
                    borderColor: mission.completed ? "#55B987" : colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.missionIcon,
                    {
                      backgroundColor: mission.completed
                        ? "#55B987"
                        : "#E7EEFF",
                    },
                  ]}
                >
                  <MaterialIcons
                    name={mission.icon}
                    size={25}
                    color={mission.completed ? "#FFFFFF" : colors.primary}
                  />
                </View>
                <View style={styles.missionCopy}>
                  <View style={styles.missionTitleRow}>
                    <Text
                      style={[
                        styles.missionTitle,
                        {
                          color: mission.completed
                            ? LIGHT_CARD_FOREGROUND
                            : colors.foreground,
                        },
                      ]}
                    >
                      {mission.title}
                    </Text>
                    <View style={styles.coinMini}>
                      <MaterialIcons name="stars" size={14} color="#B98A00" />
                      <Text
                        style={[
                          styles.coinMiniText,
                          {
                            color: mission.completed
                              ? GOLD_TEXT
                              : colors.foreground,
                          },
                        ]}
                      >
                        +{formatNumber(mission.rewardCoins)}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.missionText,
                      {
                        color: mission.completed
                          ? LIGHT_CARD_MUTED
                          : colors.muted,
                      },
                    ]}
                  >
                    {mission.description}
                  </Text>
                  <View style={[styles.track, { backgroundColor: "#E6E9F0" }]}>
                    <View
                      style={[
                        styles.fill,
                        {
                          width,
                          backgroundColor: mission.completed
                            ? "#55B987"
                            : colors.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.progressText,
                      { color: mission.completed ? "#17633F" : colors.muted },
                    ]}
                  >
                    {mission.completed
                      ? t("game.missions.completed")
                      : `${formatNumber(mission.progress)}/${formatNumber(mission.target)}`}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
        <View
          style={[
            styles.chestCard,
            {
              backgroundColor: today.allCompleted ? "#FFF4C9" : "#F5F6F9",
              borderColor: today.allCompleted ? "#E8BE38" : colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.chestIcon,
              { backgroundColor: today.allCompleted ? "#E8BE38" : "#CDD1DA" },
            ]}
          >
            <MaterialIcons
              name={today.allCompleted ? "card-giftcard" : "lock"}
              size={29}
              color="#FFFFFF"
            />
          </View>
          <View style={styles.chestCopy}>
            <Text
              style={[
                styles.chestEyebrow,
                { color: today.allCompleted ? GOLD_TEXT : LIGHT_CARD_MUTED },
              ]}
            >
              {t("game.missions.smileChest")}
            </Text>
            <Text style={[styles.chestTitle, { color: LIGHT_CARD_FOREGROUND }]}>
              {today.allCompleted
                ? t("game.missions.chestOpen")
                : t("game.missions.completeAll")}
            </Text>
            <Text style={[styles.chestText, { color: LIGHT_CARD_MUTED }]}>
              {t("game.missions.chestBonus", {
                coins: formatNumber(today.chestRewardCoins),
              })}
            </Text>
          </View>
        </View>
        <View style={styles.sectionHeading}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              {t("game.missions.achievements")}
            </Text>
            <Text style={[styles.sectionCopy, { color: colors.muted }]}>
              {t("game.missions.achievementsDescription")}
            </Text>
          </View>
          <Text style={[styles.badgeCount, { color: colors.primary }]}>
            {formatNumber(unlockedAchievements)}/
            {formatNumber(achievements.length)}
          </Text>
        </View>
        <View style={styles.achievementStack}>
          {achievements.map((achievement) => {
            const progress = Math.min(
              1,
              achievement.progress / achievement.target,
            );
            const width = `${Math.round(progress * 100)}%` as DimensionValue;
            return (
              <View
                key={achievement.id}
                style={[
                  styles.achievementCard,
                  {
                    backgroundColor: achievement.unlocked
                      ? "#F2EEFF"
                      : colors.surface,
                    borderColor: achievement.unlocked
                      ? "#9C86E8"
                      : colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.achievementIcon,
                    {
                      backgroundColor: achievement.unlocked
                        ? "#7357C7"
                        : "#E5E7ED",
                    },
                  ]}
                >
                  <MaterialIcons
                    name={achievement.icon}
                    size={24}
                    color={achievement.unlocked ? "#FFFFFF" : "#737A8B"}
                  />
                </View>
                <View style={styles.achievementCopy}>
                  <View style={styles.missionTitleRow}>
                    <Text
                      style={[
                        styles.achievementTitle,
                        {
                          color: achievement.unlocked
                            ? LIGHT_CARD_FOREGROUND
                            : colors.foreground,
                        },
                      ]}
                    >
                      {achievement.title}
                    </Text>
                    <View style={styles.coinMini}>
                      <MaterialIcons name="stars" size={14} color="#B98A00" />
                      <Text
                        style={[
                          styles.coinMiniText,
                          {
                            color: achievement.unlocked
                              ? GOLD_TEXT
                              : colors.foreground,
                          },
                        ]}
                      >
                        +{formatNumber(achievement.rewardCoins)}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.achievementText,
                      {
                        color: achievement.unlocked
                          ? LIGHT_CARD_MUTED
                          : colors.muted,
                      },
                    ]}
                  >
                    {achievement.description}
                  </Text>
                  <View style={[styles.track, { backgroundColor: "#E6E9F0" }]}>
                    <View
                      style={[
                        styles.fill,
                        {
                          width,
                          backgroundColor: achievement.unlocked
                            ? "#7357C7"
                            : colors.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.progressText,
                      {
                        color: achievement.unlocked ? "#51369C" : colors.muted,
                      },
                    ]}
                  >
                    {achievement.unlocked
                      ? t("game.missions.badgeUnlocked")
                      : `${formatNumber(achievement.progress)}/${formatNumber(achievement.target)}`}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("game.missions.openHabitat")}
          onPress={() => router.push("/(tabs)/habitat")}
          style={({ pressed }) => [
            styles.walletCard,
            { backgroundColor: "#FFF8E8", borderColor: "#F2D588" },
            pressed && styles.pressed,
          ]}
        >
          <MaterialIcons name="stars" size={27} color="#B98A00" />
          <View style={styles.walletCopy}>
            <Text
              style={[styles.walletTitle, { color: LIGHT_CARD_FOREGROUND }]}
            >
              {t("game.missions.walletTitle", {
                coins: formatNumber(walletCoins),
              })}
            </Text>
            <Text style={[styles.walletText, { color: LIGHT_CARD_MUTED }]}>
              {t("game.missions.walletDescription", {
                coins: formatNumber(missionCenter.totalBonusCoins),
              })}
            </Text>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={24}
            color={LIGHT_CARD_MUTED}
          />
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 80,
    gap: 18,
  },
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
  hero: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#FFFFFFAA",
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: { flex: 1 },
  heroEyebrow: {
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "900",
    letterSpacing: 1,
  },
  heroTitle: { fontSize: 19, lineHeight: 24, fontWeight: "900" },
  heroText: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  missionStack: { gap: 10 },
  missionCard: {
    borderWidth: 1.5,
    borderRadius: 21,
    padding: 12,
    flexDirection: "row",
    gap: 11,
  },
  missionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  missionCopy: { flex: 1 },
  missionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  missionTitle: { flex: 1, fontSize: 14, lineHeight: 19, fontWeight: "900" },
  missionText: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  coinMini: { flexDirection: "row", alignItems: "center", gap: 2 },
  coinMiniText: { fontSize: 10, lineHeight: 14, fontWeight: "900" },
  track: { height: 7, borderRadius: 99, overflow: "hidden", marginTop: 8 },
  fill: { height: "100%", borderRadius: 99 },
  progressText: {
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "800",
    marginTop: 4,
  },
  chestCard: {
    borderWidth: 2,
    borderRadius: 23,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  chestIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  chestCopy: { flex: 1 },
  chestEyebrow: {
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  chestTitle: { fontSize: 16, lineHeight: 21, fontWeight: "900" },
  chestText: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  sectionHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
  },
  sectionTitle: { fontSize: 22, lineHeight: 28, fontWeight: "900" },
  sectionCopy: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  badgeCount: { fontSize: 14, lineHeight: 19, fontWeight: "900" },
  achievementStack: { gap: 10 },
  achievementCard: {
    borderWidth: 1.5,
    borderRadius: 21,
    padding: 12,
    flexDirection: "row",
    gap: 11,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  achievementCopy: { flex: 1 },
  achievementTitle: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
  },
  achievementText: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  walletCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  walletCopy: { flex: 1 },
  walletTitle: { fontSize: 14, lineHeight: 19, fontWeight: "900" },
  walletText: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
});
