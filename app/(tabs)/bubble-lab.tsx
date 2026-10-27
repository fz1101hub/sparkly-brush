import MaterialIcons from "@expo/vector-icons/MaterialIcons";
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
import { useBrushling } from "@/contexts/brushling-context";
import { useI18n } from "@/contexts/locale-context";
import { contentLocale } from "@/lib/locale-types";
import { useVillage } from "@/contexts/village-context";
import { useColors } from "@/hooks/use-colors";
import { COLLECTIBLE_ITEM_TEXT_KEYS, type CollectibleItemId } from "@/lib/game-inventory";
import { BUBBLE_RECIPES, canBrew, missingMaterials } from "@/lib/village-lab";

/**
 * «Laboratorio delle bolle»: the collectibles found by brushing are the materials of five
 * bubbles. Nothing is used up; brewing costs one energy.
 */
export default function BubbleLabScreen() {
  const colors = useColors();
  const { t, locale: appLocale } = useI18n();
  // Educational content in the languages it exists in (voce 71: newer UI languages read English).
  const locale = contentLocale(appLocale);
  const village = useVillage();
  const { inventory } = useBrushling();
  const [blocked, setBlocked] = useState(false);
  const [brewing, setBrewing] = useState<string | null>(null);
  const [brewed, setBrewed] = useState<string | null>(null);

  const brew = async (id: string) => {
    setBrewing(id);
    try {
      const paid = await village.spendEnergy();
      setBlocked(!paid);
      if (!paid) return;
      await village.apply((state) => (state.bubbles.includes(id) ? state : { ...state, bubbles: [...state.bubbles, id] }));
      setBrewed(id);
    } finally {
      setBrewing(null);
    }
  };

  return (
    <VillageScreen testID="bubble-lab-screen" eyebrow={t("village.title")} title={t("village.lab.title")}>
      <EnergyPill />
      <Text style={[villageStyles.body, { color: colors.foreground }]}>{t("lab.intro")}</Text>
      <Text testID="lab-count" style={[villageStyles.small, { color: colors.muted }]}>
        {t("lab.count", { count: village.state.bubbles.length, total: BUBBLE_RECIPES.length })}
      </Text>
      {blocked ? <NoEnergyNotice /> : null}
      {BUBBLE_RECIPES.map((recipe) => {
        const owned = village.state.bubbles.includes(recipe.id);
        const missing = missingMaterials(recipe, inventory.itemCounts);
        const ready = canBrew(recipe, inventory.itemCounts);
        return (
          <VillageCard key={recipe.id}>
            <View style={villageStyles.row}>
              <View style={[styles.bubble, { backgroundColor: recipe.color, borderColor: colors.border }]}>
                <Text accessible={false} importantForAccessibility="no" style={styles.picture}>
                  {recipe.picture}
                </Text>
              </View>
              <View style={styles.copy}>
                <Text accessibilityRole="header" style={[villageStyles.title, { color: colors.foreground }]}>{recipe.name[locale]}</Text>
                {(Object.entries(recipe.needs) as [CollectibleItemId, number][]).map(([item, count]) => (
                  <Text key={item} style={[villageStyles.small, { color: colors.foreground }]}>
                    {t("lab.material", {
                      name: t(COLLECTIBLE_ITEM_TEXT_KEYS[item].name),
                      have: Math.min(inventory.itemCounts[item] ?? 0, count),
                      need: count,
                    })}
                  </Text>
                ))}
              </View>
            </View>
            {owned ? (
              <View style={villageStyles.row}>
                <MaterialIcons accessible={false} name="check-circle" size={22} color="#17633F" />
                <Text testID={`lab-owned-${recipe.id}`} style={[villageStyles.body, { color: colors.foreground, fontWeight: "800" }]}>
                  {brewed === recipe.id ? t("lab.brewed") : t("lab.owned")}
                </Text>
              </View>
            ) : (
              <>
                {!ready ? (
                  <Text style={[villageStyles.small, { color: colors.muted }]}>
                    {t("lab.missing", { count: Object.values(missing).reduce((total, value) => total + (value ?? 0), 0) })}
                  </Text>
                ) : null}
                <VillageButton
                  testID={`lab-brew-${recipe.id}`}
                  icon="science"
                  label={t("lab.brew")}
                  disabled={!ready || brewing !== null || !village.ready}
                  onPress={() => void brew(recipe.id)}
                />
              </>
            )}
          </VillageCard>
        );
      })}
    </VillageScreen>
  );
}

const styles = StyleSheet.create({
  bubble: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  picture: { fontSize: 30, lineHeight: 38 },
  copy: { flex: 1, minWidth: 160, gap: 2 },
});
