import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import {
  EnergyPill,
  NoEnergyNotice,
  VillageButton,
  VillageCard,
  VillageScreen,
  villageStyles,
} from "@/components/village-ui";
import { useI18n } from "@/contexts/locale-context";
import { useVillage } from "@/contexts/village-context";
import { useColors } from "@/hooks/use-colors";
import { gardenRound, type Food, type FoodGroup } from "@/lib/learning/garden";

type Game = { foods: Food[]; index: number; score: number; answer: FoodGroup | null };

/** «Orto dei cibi»: put each food in the right basket. One round costs one energy. */
export default function GardenScreen() {
  const colors = useColors();
  const { t, locale } = useI18n();
  const village = useVillage();
  const [game, setGame] = useState<Game | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [starting, setStarting] = useState(false);

  const start = async () => {
    setStarting(true);
    try {
      const paid = await village.spendEnergy();
      setBlocked(!paid);
      if (paid) setGame({ foods: gardenRound(), index: 0, score: 0, answer: null });
    } finally {
      setStarting(false);
    }
  };

  const choose = (group: FoodGroup) => {
    if (!game || game.answer) return;
    const right = game.foods[game.index].group === group;
    setGame({ ...game, answer: group, score: game.score + (right ? 1 : 0) });
  };

  const next = () => {
    if (!game) return;
    const index = game.index + 1;
    setGame({ ...game, index, answer: null });
    if (index >= game.foods.length && game.score > village.state.gardenBest) void village.update({ gardenBest: game.score });
  };

  if (!game) {
    return (
      <VillageScreen testID="garden-screen" eyebrow={t("village.title")} title={t("village.garden.title")}>
        <EnergyPill />
        <VillageCard>
          <Text style={[villageStyles.body, { color: colors.foreground }]}>{t("garden.intro")}</Text>
          {village.state.gardenBest ? (
            <Text style={[villageStyles.small, { color: colors.muted }]}>{t("garden.best", { score: village.state.gardenBest })}</Text>
          ) : null}
          <VillageButton testID="garden-start" icon="play-arrow" label={t("toothNames.startGame")} disabled={starting || !village.ready} onPress={() => void start()} />
        </VillageCard>
        {blocked ? <NoEnergyNotice /> : null}
        <Text style={[villageStyles.small, { color: colors.muted }]}>{t("quiz.reviewNote")}</Text>
      </VillageScreen>
    );
  }

  if (game.index >= game.foods.length) {
    return (
      <VillageScreen testID="garden-screen" eyebrow={t("village.title")} title={t("village.garden.title")}>
        <VillageCard>
          <Text testID="garden-result" accessibilityRole="header" style={[villageStyles.title, { color: colors.foreground }]}>
            {t("garden.result", { score: game.score, total: game.foods.length })}
          </Text>
          <Text style={[villageStyles.body, { color: colors.foreground }]}>{t("garden.tip")}</Text>
          <VillageButton secondary label={t("quiz.again")} onPress={() => setGame(null)} />
        </VillageCard>
      </VillageScreen>
    );
  }

  const food = game.foods[game.index];
  const right = game.answer !== null && game.answer === food.group;
  return (
    <VillageScreen
      testID="garden-screen"
      eyebrow={t("village.garden.title")}
      title={t("toothNames.findProgress", { current: game.index + 1, total: game.foods.length })}
    >
      <VillageCard style={styles.center}>
        <Text accessible={false} importantForAccessibility="no" style={styles.picture}>
          {food.picture}
        </Text>
        <Text testID="garden-food" accessibilityRole="header" style={[villageStyles.title, { color: colors.foreground }]}>
          {food.name[locale]}
        </Text>
        <Text style={[villageStyles.small, { color: colors.muted }]}>{t("garden.question")}</Text>
        <View style={styles.baskets}>
          <View style={styles.basket}>
            <VillageButton
              testID="garden-friend"
              icon="sentiment-very-satisfied"
              label={t("garden.friend")}
              disabled={game.answer !== null}
              onPress={() => choose("friend")}
            />
          </View>
          <View style={styles.basket}>
            <VillageButton
              secondary
              testID="garden-sometimes"
              icon="schedule"
              label={t("garden.sometimes")}
              disabled={game.answer !== null}
              onPress={() => choose("sometimes")}
            />
          </View>
        </View>
      </VillageCard>
      {game.answer ? (
        <VillageCard>
          <Text testID="garden-feedback" accessibilityRole="alert" style={[villageStyles.title, { color: colors.foreground }]}>
            {right ? t("quiz.right") : t("garden.wrong")}
          </Text>
          <Text style={[villageStyles.body, { color: colors.foreground }]}>
            {t(food.group === "friend" ? "garden.whyFriend" : "garden.whySometimes")}
          </Text>
          <VillageButton testID="garden-next" icon="arrow-forward" label={t("quiz.next")} onPress={next} />
        </VillageCard>
      ) : null}
    </VillageScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center" },
  picture: { fontSize: 72, lineHeight: 88 },
  baskets: { flexDirection: "row", flexWrap: "wrap", gap: 10, alignSelf: "stretch" },
  basket: { flexGrow: 1, flexBasis: 140 },
});
