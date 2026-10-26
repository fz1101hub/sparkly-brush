import type { SupportedLocale } from "./locale-types";

export type LearningContent = {
  id: string;
  roadmap: number;
  version: number;
  status: "draft" | "approved";
  sourceUrls: readonly string[];
  draft: string;
  review: null | {
    professional: string;
    role: "pediatric-dentist" | "orthodontist";
    reviewedVersion: number;
    reviewedAt: number;
    approvedLocales: readonly SupportedLocale[];
  };
};

/** Compiled editorial data, never controlled by a child's preferences or a remote server. */
export const LEARNING_DRAFTS: readonly LearningContent[] = [
  { id: "smile-quiz", roadmap: 1, version: 1, status: "draft", review: null,
    sourceUrls: ["https://www.nhs.uk/live-well/healthy-teeth-and-gums/taking-care-of-childrens-teeth/"],
    draft: "Quiz: chi può aiutarmi a pulire i denti? Un adulto. Nessuna penalità per gli errori; tre domande dopo una sessione completa." },
  { id: "tooth-names", roadmap: 2, version: 1, status: "draft", review: null,
    sourceUrls: ["https://www.mouthhealthy.org/all-topics-a-z/eruption-charts"],
    draft: "Bocca da latte e permanente separate; dizionario tecnico e parole per bambini da rivedere in tutte le lingue. Nessuna inferenza sull'eruzione del singolo bambino." },
  { id: "braces", roadmap: 3, version: 1, status: "draft", review: null,
    sourceUrls: ["https://bos.org.uk/patients/patient-information-leaflets/"],
    draft: "Fisso, mobile, allineatori ed espansore: solo fasi, tempi e orari inseriti dal genitore dalla prescrizione; nessuna durata terapeutica preimpostata." },
  { id: "small-facts", roadmap: 23, version: 1, status: "draft", review: null,
    sourceUrls: ["https://www.mouthhealthy.org/all-topics-a-z/eruption-charts"],
    draft: "Curiosità proposta: i denti non hanno tutti la stessa forma. Lessico, immagini ed età da validare." },
  { id: "food-game", roadmap: 24, version: 1, status: "draft", review: null,
    sourceUrls: ["https://www.nhs.uk/start-for-life/how-to-take-care-of-your-baby-or-toddlers-teeth/"],
    draft: "Gioco di scelte e frequenza dei cibi, evitando categorie colpevolizzanti buono/cattivo e prescrizioni individuali." },
  { id: "bedtime-routine", roadmap: 28, version: 1, status: "draft", review: null,
    sourceUrls: ["https://www.nhs.uk/live-well/healthy-teeth-and-gums/how-to-keep-your-teeth-clean/"],
    draft: "Pigiama come attività non clinica; filo e collutorio solo se previsti dal professionista e abilitati dal genitore. Nessun premio per quantità di prodotto." },
  { id: "handle-intensity", roadmap: 36, version: 1, status: "draft", review: null,
    sourceUrls: ["https://www.philips.com/c-p/HX6322_04/sonicare-for-kids-sonic-electric-toothbrush"],
    draft: "Mostrare l'intensità letta dal manico; non suggerirne una per età prima di revisione clinica e verifica delle istruzioni del modello." },
  { id: "three-surfaces", roadmap: 55, version: 1, status: "draft", review: null,
    sourceUrls: ["https://www.nhs.uk/live-well/healthy-teeth-and-gums/how-to-keep-your-teeth-clean/"],
    draft: "Tre icone: superficie esterna, interna e masticante. La ripartizione rigida in dieci secondi è una proposta di interfaccia, non una raccomandazione clinica validata." },
  { id: "extra-step", roadmap: 56, version: 1, status: "draft", review: null,
    sourceUrls: ["https://www.nhs.uk/live-well/healthy-teeth-and-gums/taking-care-of-childrens-teeth/"],
    draft: "Passi extra selezionabili dal genitore solo tra contenuti approvati per età; non generati liberamente." },
  { id: "after-brushing", roadmap: 58, version: 1, status: "draft", review: null,
    sourceUrls: ["https://www.nhs.uk/live-well/healthy-teeth-and-gums/taking-care-of-childrens-teeth/"],
    draft: "Bozza: sputa l'eccesso, senza sciacquare subito. Quantità e concentrazione del dentifricio richiedono una scheda per età e revisione locale; nessuna indicazione sugli integratori." },
];

export function learningContentApproved(content: LearningContent, locale: SupportedLocale, now = Date.now()): boolean {
  const review = content.review;
  return content.status === "approved"
    && content.sourceUrls.length > 0
    && content.sourceUrls.every((url) => /^https:\/\//.test(url))
    && review !== null
    && review.professional.trim().length > 0
    && (review.role === "pediatric-dentist" || review.role === "orthodontist")
    && review.reviewedVersion === content.version
    && Number.isSafeInteger(review.reviewedAt)
    && review.reviewedAt > 0
    && review.reviewedAt <= now
    && review.approvedLocales.includes(locale);
}

/** There are currently no approved clinical cards, in any locale. */
export function approvedLearningContent(locale: SupportedLocale): readonly LearningContent[] {
  return LEARNING_DRAFTS.filter((content) => learningContentApproved(content, locale));
}
