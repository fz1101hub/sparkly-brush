import type { CollectibleItemId } from "@/lib/game-inventory";
import type { SupportedLocale } from "@/lib/locale-types";

/**
 * «Laboratorio delle bolle»: the collectibles found by brushing are the materials. Owning enough
 * of them lets the child brew a bubble; nothing is used up, so coins, the den and the lifetime
 * progress never change here.
 */
export type BubbleRecipe = {
  id: string;
  picture: string;
  color: string;
  needs: Partial<Record<CollectibleItemId, number>>;
  name: Record<SupportedLocale, string>;
};

export const BUBBLE_RECIPES: readonly BubbleRecipe[] = [
  {
    id: "rainbow",
    picture: "🌈",
    color: "#F9D7F0",
    needs: { "bubble-pearl": 1, "smile-star": 1 },
    name: { it: "Bolla arcobaleno", en: "Rainbow bubble", de: "Regenbogenblase", fr: "Bulle arc-en-ciel", es: "Burbuja arcoíris" },
  },
  {
    id: "forest",
    picture: "🌿",
    color: "#D5F2D9",
    needs: { "fresh-leaf": 2, "bubble-pearl": 1 },
    name: { it: "Bolla del bosco", en: "Forest bubble", de: "Waldblase", fr: "Bulle de la forêt", es: "Burbuja del bosque" },
  },
  {
    id: "spark",
    picture: "⚡",
    color: "#FFF1B8",
    needs: { "spark-crystal": 2, "bubble-pearl": 1 },
    name: { it: "Bolla scintilla", en: "Spark bubble", de: "Funkenblase", fr: "Bulle étincelle", es: "Burbuja chispa" },
  },
  {
    id: "moon",
    picture: "🌙",
    color: "#DCD6FF",
    needs: { "moon-shard": 2, "spark-crystal": 1 },
    name: { it: "Bolla di luna", en: "Moon bubble", de: "Mondblase", fr: "Bulle de lune", es: "Burbuja de luna" },
  },
  {
    id: "smile",
    picture: "😁",
    color: "#FFE0B8",
    needs: { "bubble-pearl": 2, "fresh-leaf": 2, "spark-crystal": 2, "moon-shard": 2, "smile-star": 2 },
    name: { it: "Super bolla del sorriso", en: "Super smile bubble", de: "Super-Lächelblase", fr: "Super bulle du sourire", es: "Súper burbuja de la sonrisa" },
  },
];

/** What is still missing for a recipe, given the collectibles found so far. */
export function missingMaterials(
  recipe: BubbleRecipe,
  owned: Readonly<Record<CollectibleItemId, number>>,
): Partial<Record<CollectibleItemId, number>> {
  const missing: Partial<Record<CollectibleItemId, number>> = {};
  for (const [id, count] of Object.entries(recipe.needs) as [CollectibleItemId, number][]) {
    const have = owned[id] ?? 0;
    if (have < count) missing[id] = count - have;
  }
  return missing;
}

export function canBrew(recipe: BubbleRecipe, owned: Readonly<Record<CollectibleItemId, number>>): boolean {
  return Object.keys(missingMaterials(recipe, owned)).length === 0;
}

export function bubbleRecipeById(id: string): BubbleRecipe | undefined {
  return BUBBLE_RECIPES.find((recipe) => recipe.id === id);
}
