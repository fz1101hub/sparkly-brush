import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { BrushlingAvatar } from "@/components/brushling-avatar";
import { useBrushling } from "@/contexts/brushling-context";
import { useColors } from "@/hooks/use-colors";
import { getEvolution } from "@/lib/brushlings";

export function SessionRewardModal() {
  const colors = useColors();
  const { reward, dismissReward, selected } = useBrushling();

  if (!reward) return null;

  const evolution = getEvolution(selected, reward.level);
  const evolved = Boolean(reward.evolvedTo);

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
              backgroundColor: evolved ? "#0C4F9C" : colors.surface,
              borderColor: evolved ? "#58B9FF" : selected.accent,
            },
          ]}
        >
          <View style={styles.stars}>
            <MaterialIcons name="star" size={28} color="#FFD65A" />
            <MaterialIcons name="star" size={38} color="#FFD65A" />
            <MaterialIcons name="star" size={28} color="#FFD65A" />
          </View>

          <Text style={[styles.eyebrow, { color: evolved ? "#BFE3FF" : selected.accent }]}>
            {evolved ? "EVOLUZIONE!" : reward.completed ? "SESSIONE COMPLETATA" : "BEL TENTATIVO"}
          </Text>
          <Text style={[styles.title, { color: evolved ? "#FFFFFF" : colors.foreground }]}>
            {evolved
              ? `${reward.evolvedFrom} si è evoluto in ${reward.evolvedTo}!`
              : reward.completed
                ? "Fantastico lavoro!"
                : "Ogni secondo conta!"}
          </Text>

          <View style={styles.avatarWrap}>
            <BrushlingAvatar creature={selected} size={156} level={reward.level} />
          </View>

          <Text style={[styles.creatureName, { color: evolved ? "#FFFFFF" : colors.foreground }]}>
            {evolution.name}
          </Text>
          <Text style={[styles.creatureTitle, { color: evolved ? "#BFE3FF" : selected.accent }]}>
            {evolution.title}
          </Text>

          <View style={styles.rewardRow}>
            <View style={[styles.rewardPill, { backgroundColor: evolved ? "#FFFFFF18" : selected.soft }]}>
              <MaterialIcons name="auto-awesome" size={21} color={evolved ? "#FFE68A" : selected.accent} />
              <Text style={[styles.rewardValue, { color: evolved ? "#FFFFFF" : colors.foreground }]}>
                +{reward.xpEarned} XP
              </Text>
            </View>
            <View style={[styles.rewardPill, { backgroundColor: evolved ? "#FFFFFF18" : "#FFF7D7" }]}>
              <MaterialIcons name="stars" size={21} color="#D69C00" />
              <Text style={[styles.rewardValue, { color: evolved ? "#FFFFFF" : colors.foreground }]}>
                +{reward.coinsEarned}
              </Text>
            </View>
          </View>

          {reward.level > reward.previousLevel ? (
            <View style={[styles.levelBanner, { backgroundColor: evolved ? "#FFFFFF18" : "#EEF4FF" }]}>
              <MaterialIcons name="arrow-upward" size={18} color={evolved ? "#BFE3FF" : "#2457D6"} />
              <Text style={[styles.levelText, { color: evolved ? "#FFFFFF" : colors.foreground }]}>
                Nuovo livello: {reward.level}
              </Text>
            </View>
          ) : null}

          <Text style={[styles.message, { color: evolved ? "#E9F5FF" : colors.muted }]}>
            {reward.completed
              ? "Hai dato al tuo sorriso due minuti di super potere. Il tuo Brushling è diventato più forte!"
              : "La prossima volta prova ad arrivare fino alla fine: il tuo Brushling ti aspetta."}
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={dismissReward}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: evolved ? "#2C97F4" : selected.accent },
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.buttonText}>{evolved ? "Continua l'avventura" : "Fantastico!"}</Text>
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
    paddingTop: 22,
    paddingBottom: 20,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.28,
    shadowRadius: 30,
    elevation: 9,
  },
  stars: { flexDirection: "row", alignItems: "center", gap: 5 },
  eyebrow: { fontSize: 10, lineHeight: 14, fontWeight: "900", letterSpacing: 1.4, marginTop: 8 },
  title: { fontSize: 25, lineHeight: 31, fontWeight: "900", textAlign: "center", marginTop: 4 },
  avatarWrap: { marginTop: 10 },
  creatureName: { fontSize: 22, lineHeight: 27, fontWeight: "900", marginTop: 4 },
  creatureTitle: { fontSize: 10, lineHeight: 14, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 },
  rewardRow: { flexDirection: "row", gap: 10, marginTop: 16, width: "100%" },
  rewardPill: {
    flex: 1,
    minHeight: 48,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  rewardValue: { fontSize: 15, lineHeight: 20, fontWeight: "900" },
  levelBanner: {
    marginTop: 10,
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  levelText: { fontSize: 12, lineHeight: 17, fontWeight: "900" },
  message: { fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 14, fontWeight: "600" },
  button: {
    width: "100%",
    minHeight: 54,
    borderRadius: 18,
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "#FFFFFF", fontSize: 15, lineHeight: 20, fontWeight: "900" },
  pressed: { opacity: 0.86, transform: [{ scale: 0.985 }] },
});
