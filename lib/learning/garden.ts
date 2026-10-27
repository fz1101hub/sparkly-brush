import { shuffle } from "@/lib/learning/shuffle";
import type { SupportedLocale } from "@/lib/locale-types";

/**
 * «Orto dei cibi»: sort foods into «amici dei denti» and «ogni tanto». The two groups follow the
 * usual paediatric advice (fewer and less frequent free sugars, water as the drink); like every
 * educational text it is listed in docs/contenuti-da-validare-2026-10-27.md for dentist review.
 * Pictures are emoji from Unicode 10 or older, so older Android phones draw them too.
 */
export type FoodGroup = "friend" | "sometimes";

export type Food = {
  id: string;
  group: FoodGroup;
  picture: string;
  name: Record<SupportedLocale, string>;
};

export const FOODS: readonly Food[] = [
  { id: "cheese", group: "friend", picture: "🧀", name: { it: "Formaggio", en: "Cheese", de: "Käse", fr: "Fromage", es: "Queso" } },
  { id: "carrot", group: "friend", picture: "🥕", name: { it: "Carota", en: "Carrot", de: "Karotte", fr: "Carotte", es: "Zanahoria" } },
  { id: "apple", group: "friend", picture: "🍎", name: { it: "Mela", en: "Apple", de: "Apfel", fr: "Pomme", es: "Manzana" } },
  { id: "water", group: "friend", picture: "💧", name: { it: "Acqua", en: "Water", de: "Wasser", fr: "Eau", es: "Agua" } },
  { id: "milk", group: "friend", picture: "🥛", name: { it: "Latte", en: "Milk", de: "Milch", fr: "Lait", es: "Leche" } },
  { id: "broccoli", group: "friend", picture: "🥦", name: { it: "Broccoli", en: "Broccoli", de: "Brokkoli", fr: "Brocoli", es: "Brócoli" } },
  { id: "egg", group: "friend", picture: "🥚", name: { it: "Uovo", en: "Egg", de: "Ei", fr: "Œuf", es: "Huevo" } },
  { id: "cucumber", group: "friend", picture: "🥒", name: { it: "Cetriolo", en: "Cucumber", de: "Gurke", fr: "Concombre", es: "Pepino" } },
  { id: "candy", group: "sometimes", picture: "🍬", name: { it: "Caramelle", en: "Sweets", de: "Bonbons", fr: "Bonbons", es: "Caramelos" } },
  { id: "lollipop", group: "sometimes", picture: "🍭", name: { it: "Lecca-lecca", en: "Lollipop", de: "Lutscher", fr: "Sucette", es: "Piruleta" } },
  { id: "fizzy", group: "sometimes", picture: "🥤", name: { it: "Bibita gassata", en: "Fizzy drink", de: "Limonade", fr: "Soda", es: "Refresco" } },
  { id: "chocolate", group: "sometimes", picture: "🍫", name: { it: "Cioccolato", en: "Chocolate", de: "Schokolade", fr: "Chocolat", es: "Chocolate" } },
  { id: "cookies", group: "sometimes", picture: "🍪", name: { it: "Biscotti", en: "Biscuits", de: "Kekse", fr: "Biscuits", es: "Galletas" } },
  { id: "donut", group: "sometimes", picture: "🍩", name: { it: "Ciambella", en: "Doughnut", de: "Donut", fr: "Beignet", es: "Dónut" } },
  { id: "cake", group: "sometimes", picture: "🍰", name: { it: "Torta", en: "Cake", de: "Kuchen", fr: "Gâteau", es: "Pastel" } },
  { id: "honey", group: "sometimes", picture: "🍯", name: { it: "Miele", en: "Honey", de: "Honig", fr: "Miel", es: "Miel" } },
];

export const GARDEN_ROUND_SIZE = 6;

/** A round with as many friends as «sometimes» foods, in random order. */
export function gardenRound(random: () => number = Math.random, size = GARDEN_ROUND_SIZE): Food[] {
  const pick = (group: FoodGroup, count: number) => shuffle(FOODS.filter((food) => food.group === group), random).slice(0, count);
  const friends = Math.ceil(size / 2);
  return shuffle([...pick("friend", friends), ...pick("sometimes", size - friends)], random);
}
