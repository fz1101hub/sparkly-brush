import type { SupportedLocale } from "@/lib/locale-types";

/** The six kinds of teeth the games name. Baby teeth have no premolars and no wisdom teeth. */
export type ToothType = "centralIncisor" | "lateralIncisor" | "canine" | "premolar" | "molar" | "wisdom";
export const TOOTH_TYPES: readonly ToothType[] = ["centralIncisor", "lateralIncisor", "canine", "premolar", "molar", "wisdom"];

export type Dentition = "primary" | "permanent";

/**
 * The words children and parents use; the dentist's term where it differs is in the content
 * review document. To be checked by a native speaker of each language.
 */
export const TOOTH_NAMES: Record<SupportedLocale, Record<ToothType, string>> = {
  it: { centralIncisor: "incisivo centrale", lateralIncisor: "incisivo laterale", canine: "canino", premolar: "premolare", molar: "molare", wisdom: "dente del giudizio" },
  en: { centralIncisor: "central incisor", lateralIncisor: "lateral incisor", canine: "canine", premolar: "premolar", molar: "molar", wisdom: "wisdom tooth" },
  de: { centralIncisor: "mittlerer Schneidezahn", lateralIncisor: "seitlicher Schneidezahn", canine: "Eckzahn", premolar: "kleiner Backenzahn", molar: "großer Backenzahn", wisdom: "Weisheitszahn" },
  fr: { centralIncisor: "incisive centrale", lateralIncisor: "incisive latérale", canine: "canine", premolar: "prémolaire", molar: "molaire", wisdom: "dent de sagesse" },
  es: { centralIncisor: "incisivo central", lateralIncisor: "incisivo lateral", canine: "colmillo", premolar: "premolar", molar: "muela", wisdom: "muela del juicio" },
};

/** Voice used to pronounce the names, when the phone has it installed. */
export const SPEECH_LANGUAGE: Record<SupportedLocale, string> = {
  it: "it-IT",
  en: "en-GB",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
};

/** From the middle of the mouth to the back, the same in each of the four quarters. */
const QUADRANT: Record<Dentition, readonly ToothType[]> = {
  primary: ["centralIncisor", "lateralIncisor", "canine", "molar", "molar"],
  permanent: ["centralIncisor", "lateralIncisor", "canine", "premolar", "premolar", "molar", "molar", "wisdom"],
};

export type Tooth = {
  id: string;
  arch: "upper" | "lower";
  /** The child's own right or left. */
  side: "right" | "left";
  /** 0 next to the middle, growing towards the back. */
  position: number;
  type: ToothType;
};

export function teethFor(dentition: Dentition): Tooth[] {
  const teeth: Tooth[] = [];
  for (const arch of ["upper", "lower"] as const) {
    for (const side of ["right", "left"] as const) {
      QUADRANT[dentition].forEach((type, position) => {
        teeth.push({ id: `${arch}-${side}-${position}`, arch, side, position, type });
      });
    }
  }
  return teeth;
}

export function typesIn(dentition: Dentition): ToothType[] {
  return TOOTH_TYPES.filter((type) => QUADRANT[dentition].includes(type));
}

/** Prompts for «Trova il dente»: every kind present in the mouth, never twice in a row. */
export function findToothRound(dentition: Dentition, random: () => number = Math.random, size = 5): ToothType[] {
  const types = typesIn(dentition);
  const round: ToothType[] = [];
  while (round.length < size) {
    const candidates = types.filter((type) => type !== round[round.length - 1]);
    round.push(candidates[Math.floor(random() * candidates.length)]);
  }
  return round;
}

export type MemoryCard = { id: string; type: ToothType; locale: SupportedLocale; label: string };

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

/** «Memory delle lingue»: each kind appears once in each of the two languages. */
export function memoryDeck(
  locale: SupportedLocale,
  learning: SupportedLocale,
  random: () => number = Math.random,
  pairs = 4,
): MemoryCard[] {
  const chosen = shuffle(TOOTH_TYPES, random).slice(0, pairs);
  return shuffle(
    chosen.flatMap((type) => [
      { id: `${type}-${locale}`, type, locale, label: TOOTH_NAMES[locale][type] },
      { id: `${type}-${learning}`, type, locale: learning, label: TOOTH_NAMES[learning][type] },
    ]),
    random,
  );
}

/** A language different from the app's: English, or Italian for an English-speaking family. */
export function defaultLearningLanguage(locale: SupportedLocale): SupportedLocale {
  return locale === "en" ? "it" : "en";
}
