import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View, type DimensionValue } from "react-native";

import { AppHeader } from "@/components/app-header";
import { ScreenContainer } from "@/components/screen-container";
import { useBrushling } from "@/contexts/brushling-context";
import { useColors } from "@/hooks/use-colors";

export default function MissionsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { missionCenter, walletCoins } = useBrushling();
  const today = missionCenter.today;
  const unlockedAchievements = missionCenter.achievements.filter((achievement) => achievement.unlocked).length;

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
            <AppHeader eyebrow="Avventura quotidiana" title="Missioni" connected={false} />
          </View>
        </View>

        <View style={[styles.hero, { backgroundColor: colors.primarySoft, borderColor: "#B8DFFF" }]}>
          <View style={styles.heroIcon}>
            <MaterialIcons name="flag" size={32} color="#0B67B2" />
          </View>
          <View style={styles.heroCopy}>
            <Text style={[styles.heroEyebrow, { color: colors.primary }]}>OGGI</Text>
            <Text style={[styles.heroTitle, { color: colors.foreground }]}>
              {today.completedCount}/3 missioni complete
            </Text>
            <Text style={[styles.heroText, { color: colors.muted }]}>
              Completa mattina e sera per aprire lo Scrigno del Sorriso.
            </Text>
          </View>
        </View>

        <View style={styles.missionStack}>
          {today.missions.map((mission) => {
            const progress = Math.min(1, mission.progress / mission.target);
            const width = (String(Math.round(progress * 100)) + "%") as DimensionValue;

            return (
              <View
                key={mission.id}
                style={[
                  styles.missionCard,
                  {
                    backgroundColor: mission.completed ? colors.primarySoft : colors.surface,
                    borderColor: mission.completed ? "#55B987" : colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.missionIcon,
                    { backgroundColor: mission.completed ? "#55B987" : colors.primarySoft },
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
                    <Text style={[styles.missionTitle, { color: colors.foreground }]}>{mission.title}</Text>
                    <View style={styles.coinMini}>
                      <MaterialIcons name="stars" size={14} color="#B98A00" />
                      <Text style={[styles.coinMiniText, { color: colors.warning }]}>+{mission.rewardCoins}</Text>
                    </View>
                  </View>
                  <Text style={[styles.missionText, { color: colors.muted }]}>{mission.description}</Text>
                  <View style={[styles.track, { backgroundColor: colors.primarySoft }]}>
                    <View
                      style={[
                        styles.fill,
                        {
                          width,
                          backgroundColor: mission.completed ? "#55B987" : colors.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressText, { color: mission.completed ? "#2E8A60" : colors.muted }]}>
                    {mission.completed ? "Completata!" : String(mission.progress) + "/" + String(mission.target)}
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
              backgroundColor: colors.primarySoft,
              borderColor: today.allCompleted ? "#E8BE38" : colors.border,
            },
          ]}
        >
          <View style={[styles.chestIcon, { backgroundColor: today.allCompleted ? "#E8BE38" : "#CDD1DA" }]}>
            <MaterialIcons name={today.allCompleted ? "card-giftcard" : "lock"} size={29} color="#FFFFFF" />
          </View>
          <View style={styles.chestCopy}>
            <Text style={[styles.chestEyebrow, { color: today.allCompleted ? "#9A7200" : colors.muted }]}>
              SCRIGNO DEL SORRISO
            </Text>
            <Text style={[styles.chestTitle, { color: colors.foreground }]}>
              {today.allCompleted ? "Scrigno aperto!" : "Completa tutte le missioni"}
            </Text>
            <Text style={[styles.chestText, { color: colors.muted }]}>
              Bonus giornaliero: +{today.chestRewardCoins} monete sorriso.
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Obiettivi</Text>
            <Text style={[styles.sectionCopy, { color: colors.muted }]}>
              Badge permanenti che premiano costanza e routine.
            </Text>
          </View>
          <Text style={[styles.badgeCount, { color: colors.primary }]}>
            {unlockedAchievements}/{missionCenter.achievements.length}
          </Text>
        </View>

        <View style={styles.achievementStack}>
          {missionCenter.achievements.map((achievement) => {
            const progress = Math.min(1, achievement.progress / achievement.target);
            const width = (String(Math.round(progress * 100)) + "%") as DimensionValue;

            return (
              <View
                key={achievement.id}
                style={[
                  styles.achievementCard,
                  {
                    backgroundColor: achievement.unlocked ? colors.primarySoft : colors.surface,
                    borderColor: achievement.unlocked ? "#9C86E8" : colors.border,
                    opacity: achievement.unlocked ? 1 : 0.76,
                  },
                ]}
              >
                <View
                  style={[
                    styles.achievementIcon,
                    { backgroundColor: achievement.unlocked ? "#7357C7" : "#E5E7ED" },
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
                    <Text style={[styles.achievementTitle, { color: colors.foreground }]}>
                      {achievement.title}
                    </Text>
                    <View style={styles.coinMini}>
                      <MaterialIcons name="stars" size={14} color="#B98A00" />
                      <Text style={[styles.coinMiniText, { color: colors.warning }]}>+{achievement.rewardCoins}</Text>
                    </View>
                  </View>
                  <Text style={[styles.achievementText, { color: colors.muted }]}>
                    {achievement.description}
                  </Text>
                  <View style={[styles.track, { backgroundColor: colors.primarySoft }]}>
                    <View
                      style={[
                        styles.fill,
                        {
                          width,
                          backgroundColor: achievement.unlocked ? "#7357C7" : colors.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressText, { color: achievement.unlocked ? "#7357C7" : colors.muted }]}>
                    {achievement.unlocked
                      ? "Badge sbloccato"
                      : String(achievement.progress) + "/" + String(achievement.target)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/(tabs)/habitat")}
          style={({ pressed }) => [
            styles.walletCard,
            { backgroundColor: colors.primarySoft, borderColor: "#F2D588" },
            pressed && styles.pressed,
          ]}
        >
          <MaterialIcons name="stars" size={27} color="#B98A00" />
          <View style={styles.walletCopy}>
            <Text style={[styles.walletTitle, { color: colors.foreground }]}>
              {walletCoins} monete disponibili
            </Text>
            <Text style={[styles.walletText, { color: colors.muted }]}>
              Bonus missioni e obiettivi: +{missionCenter.totalBonusCoins} guadagnate finora.
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
  hero: { borderWidth: 1, borderRadius: 24, padding: 15, flexDirection: "row", alignItems: "center", gap: 12 },
  heroIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: "#FFFFFFAA", alignItems: "center", justifyContent: "center" },
  heroCopy: { flex: 1 },
  heroEyebrow: { fontSize: 9, lineHeight: 13, fontWeight: "900", letterSpacing: 1 },
  heroTitle: { fontSize: 19, lineHeight: 24, fontWeight: "900" },
  heroText: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  missionStack: { gap: 10 },
  missionCard: { borderWidth: 1.5, borderRadius: 21, padding: 12, flexDirection: "row", gap: 11 },
  missionIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  missionCopy: { flex: 1 },
  missionTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  missionTitle: { flex: 1, fontSize: 14, lineHeight: 19, fontWeight: "900" },
  missionText: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  coinMini: { flexDirection: "row", alignItems: "center", gap: 2 },
  coinMiniText: { color: "#8A6900", fontSize: 10, lineHeight: 14, fontWeight: "900" },
  track: { height: 7, borderRadius: 99, overflow: "hidden", marginTop: 8 },
  fill: { height: "100%", borderRadius: 99 },
  progressText: { fontSize: 9, lineHeight: 13, fontWeight: "800", marginTop: 4 },
  chestCard: { borderWidth: 2, borderRadius: 23, padding: 14, flexDirection: "row", alignItems: "center", gap: 11 },
  chestIcon: { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  chestCopy: { flex: 1 },
  chestEyebrow: { fontSize: 9, lineHeight: 13, fontWeight: "900", letterSpacing: 0.8 },
  chestTitle: { fontSize: 16, lineHeight: 21, fontWeight: "900" },
  chestText: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  sectionHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 12 },
  sectionTitle: { fontSize: 22, lineHeight: 28, fontWeight: "900" },
  sectionCopy: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  badgeCount: { fontSize: 14, lineHeight: 19, fontWeight: "900" },
  achievementStack: { gap: 10 },
  achievementCard: { borderWidth: 1.5, borderRadius: 21, padding: 12, flexDirection: "row", gap: 11 },
  achievementIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  achievementCopy: { flex: 1 },
  achievementTitle: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: "900" },
  achievementText: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  walletCard: { borderWidth: 1, borderRadius: 20, padding: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  walletCopy: { flex: 1 },
  walletTitle: { fontSize: 14, lineHeight: 19, fontWeight: "900" },
  walletText: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
});

