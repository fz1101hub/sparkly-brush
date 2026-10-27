import type { ContentLocale } from "@/lib/locale-types";

/**
 * «Quiz del sorriso»: 39 questions in five languages (choice, true/false, «di chi è questo
 * dente?» with pictures and «metti in ordine nel tempo»). Every question carries the source a
 * reviewer can check; medical and historical content must be approved by a paediatric dentist
 * before release (see docs/contenuti-da-validare-2026-10-27.md). In the data the correct answer
 * of a choice question is always the first: the screen shuffles them.
 */
export type QuizCategory = "body" | "hygiene" | "food" | "animals" | "history" | "world";

type ChoiceText = { question: string; answers: readonly [string, string, string]; fact: string };
type TrueFalseText = { question: string; fact: string };
/** The items in the right order (oldest or first first); the screen shuffles them. */
type OrderText = { question: string; items: readonly [string, string, string]; fact: string };

export type QuizQuestion =
  | {
      id: string;
      category: QuizCategory;
      /** 1: suitable for 4–6 year olds; 2: for 7–9 year olds. */
      level: 1 | 2;
      kind: "choice";
      /** Optional pictures for the answers (emoji, same order as the answers). */
      pictures?: readonly [string, string, string];
      source: string;
      text: Record<ContentLocale, ChoiceText>;
    }
  | {
      id: string;
      category: QuizCategory;
      level: 1 | 2;
      kind: "truefalse";
      answer: boolean;
      source: string;
      text: Record<ContentLocale, TrueFalseText>;
    }
  | {
      id: string;
      category: QuizCategory;
      level: 1 | 2;
      kind: "order";
      source: string;
      text: Record<ContentLocale, OrderText>;
    };

export const QUIZ_QUESTIONS: readonly QuizQuestion[] = [
  // Body and teeth
  {
    id: "body-enamel",
    category: "body",
    level: 1,
    kind: "truefalse",
    answer: true,
    source: "Anatomia dentale: lo smalto è il tessuto più mineralizzato del corpo.",
    text: {
      it: { question: "Lo smalto dei denti è la parte più dura del corpo umano.", fact: "Vero! Lo smalto è più duro delle ossa. Però non si ripara da solo: per questo va protetto ogni giorno." },
      en: { question: "Tooth enamel is the hardest part of the human body.", fact: "True! Enamel is harder than bone. But it can’t repair itself, so it needs looking after every day." },
      de: { question: "Zahnschmelz ist der härteste Teil des menschlichen Körpers.", fact: "Richtig! Zahnschmelz ist härter als Knochen. Er kann sich aber nicht selbst reparieren, deshalb braucht er jeden Tag Pflege." },
      fr: { question: "L’émail des dents est la partie la plus dure du corps humain.", fact: "Vrai ! L’émail est plus dur que les os. Mais il ne se répare pas tout seul : il faut le protéger chaque jour." },
      es: { question: "El esmalte de los dientes es la parte más dura del cuerpo humano.", fact: "¡Verdadero! El esmalte es más duro que los huesos. Pero no se repara solo: hay que cuidarlo cada día." },
    },
  },
  {
    id: "body-baby-teeth",
    category: "body",
    level: 1,
    kind: "choice",
    source: "Dentatura decidua: 20 elementi.",
    text: {
      it: { question: "Quanti denti da latte ha un bambino?", answers: ["20", "32", "10"], fact: "I denti da latte sono 20. Poi, uno alla volta, lasciano il posto ai denti definitivi." },
      en: { question: "How many baby teeth does a child have?", answers: ["20", "32", "10"], fact: "Children have 20 baby teeth. One by one, they make room for adult teeth." },
      de: { question: "Wie viele Milchzähne hat ein Kind?", answers: ["20", "32", "10"], fact: "Kinder haben 20 Milchzähne. Nach und nach machen sie Platz für die bleibenden Zähne." },
      fr: { question: "Combien de dents de lait a un enfant ?", answers: ["20", "32", "10"], fact: "Les enfants ont 20 dents de lait. Une à une, elles laissent la place aux dents définitives." },
      es: { question: "¿Cuántos dientes de leche tiene un niño?", answers: ["20", "32", "10"], fact: "Los niños tienen 20 dientes de leche. Uno a uno, dejan sitio a los dientes definitivos." },
    },
  },
  {
    id: "body-adult-teeth",
    category: "body",
    level: 2,
    kind: "choice",
    source: "Dentatura permanente: 32 elementi compresi i terzi molari.",
    text: {
      it: { question: "Quanti denti ha un adulto, contando quelli del giudizio?", answers: ["32", "20", "40"], fact: "Un adulto ha 32 denti, compresi i 4 denti del giudizio, che a volte non spuntano mai." },
      en: { question: "How many teeth does an adult have, counting wisdom teeth?", answers: ["32", "20", "40"], fact: "An adult has 32 teeth, including 4 wisdom teeth, which sometimes never come through." },
      de: { question: "Wie viele Zähne hat ein Erwachsener mit den Weisheitszähnen?", answers: ["32", "20", "40"], fact: "Ein Erwachsener hat 32 Zähne, einschließlich der 4 Weisheitszähne, die manchmal gar nicht durchbrechen." },
      fr: { question: "Combien de dents a un adulte, en comptant les dents de sagesse ?", answers: ["32", "20", "40"], fact: "Un adulte a 32 dents, dont 4 dents de sagesse, qui parfois ne sortent jamais." },
      es: { question: "¿Cuántos dientes tiene un adulto, contando las muelas del juicio?", answers: ["32", "20", "40"], fact: "Un adulto tiene 32 dientes, incluidas 4 muelas del juicio, que a veces nunca salen." },
    },
  },
  {
    id: "body-incisors",
    category: "body",
    level: 1,
    kind: "choice",
    source: "Funzione dei gruppi dentari: incisivi, canini, molari.",
    text: {
      it: { question: "Quali denti servono per tagliare il cibo, come quando mordi una mela?", answers: ["Gli incisivi", "I molari", "I denti del giudizio"], fact: "Gli incisivi, davanti, tagliano. I canini strappano e i molari, in fondo, macinano il cibo." },
      en: { question: "Which teeth cut food, like when you bite an apple?", answers: ["The incisors", "The molars", "The wisdom teeth"], fact: "The incisors at the front cut. Canines tear, and the molars at the back grind food." },
      de: { question: "Welche Zähne schneiden das Essen, zum Beispiel beim Biss in einen Apfel?", answers: ["Die Schneidezähne", "Die Backenzähne", "Die Weisheitszähne"], fact: "Die Schneidezähne vorne schneiden. Die Eckzähne reißen, und die Backenzähne hinten zermahlen das Essen." },
      fr: { question: "Quelles dents coupent les aliments, comme quand tu croques une pomme ?", answers: ["Les incisives", "Les molaires", "Les dents de sagesse"], fact: "Les incisives, devant, coupent. Les canines déchirent et les molaires, au fond, broient les aliments." },
      es: { question: "¿Qué dientes cortan la comida, como cuando muerdes una manzana?", answers: ["Los incisivos", "Las muelas", "Las muelas del juicio"], fact: "Los incisivos, delante, cortan. Los colmillos desgarran y las muelas, al fondo, trituran la comida." },
    },
  },
  {
    id: "body-six-year-molars",
    category: "body",
    level: 2,
    kind: "truefalse",
    answer: true,
    source: "Eruzione dei primi molari permanenti verso i 6 anni, distalmente ai secondi molari decidui.",
    text: {
      it: { question: "Verso i 6 anni spuntano i primi molari definitivi, dietro i denti da latte, senza che ne cada nessuno.", fact: "Vero! Sono i «molari dei sei anni»: arrivano in fondo alla bocca e vanno spazzolati bene, perché sono difficili da raggiungere." },
      en: { question: "Around age 6 the first adult molars come through behind the baby teeth, without any tooth falling out.", fact: "True! They are the “six-year molars”: they arrive at the back of the mouth and need careful brushing because they are hard to reach." },
      de: { question: "Mit etwa 6 Jahren brechen hinter den Milchzähnen die ersten bleibenden Backenzähne durch, ohne dass ein Zahn ausfällt.", fact: "Richtig! Das sind die „Sechsjahrmolaren“: Sie wachsen ganz hinten und müssen gut geputzt werden, weil man schwer an sie herankommt." },
      fr: { question: "Vers 6 ans, les premières molaires définitives poussent derrière les dents de lait, sans qu’aucune dent ne tombe.", fact: "Vrai ! Ce sont les « molaires de six ans » : elles arrivent au fond de la bouche et doivent être bien brossées, car elles sont difficiles à atteindre." },
      es: { question: "Hacia los 6 años salen las primeras muelas definitivas, detrás de los dientes de leche, sin que se caiga ninguno.", fact: "¡Verdadero! Son las «muelas de los seis años»: salen al fondo de la boca y hay que cepillarlas bien, porque cuesta llegar a ellas." },
    },
  },
  // Hygiene
  {
    id: "hygiene-twice",
    category: "hygiene",
    level: 1,
    kind: "choice",
    source: "Raccomandazioni di igiene orale: spazzolare almeno due volte al giorno.",
    text: {
      it: { question: "Quante volte al giorno bisogna lavarsi i denti?", answers: ["Almeno 2", "Una alla settimana", "Solo quando fanno male"], fact: "Almeno 2 volte al giorno: al mattino e soprattutto la sera, prima di dormire." },
      en: { question: "How many times a day should you brush your teeth?", answers: ["At least twice", "Once a week", "Only when they hurt"], fact: "At least twice a day: in the morning and especially in the evening, before bed." },
      de: { question: "Wie oft am Tag sollte man die Zähne putzen?", answers: ["Mindestens zweimal", "Einmal pro Woche", "Nur wenn sie wehtun"], fact: "Mindestens zweimal am Tag: morgens und vor allem abends vor dem Schlafen." },
      fr: { question: "Combien de fois par jour faut-il se brosser les dents ?", answers: ["Au moins 2 fois", "Une fois par semaine", "Seulement quand elles font mal"], fact: "Au moins 2 fois par jour : le matin et surtout le soir, avant de dormir." },
      es: { question: "¿Cuántas veces al día hay que lavarse los dientes?", answers: ["Al menos 2", "Una vez a la semana", "Solo cuando duelen"], fact: "Al menos 2 veces al día: por la mañana y sobre todo por la noche, antes de dormir." },
    },
  },
  {
    id: "hygiene-two-minutes",
    category: "hygiene",
    level: 1,
    kind: "choice",
    source: "Raccomandazioni di igiene orale: spazzolata di 2 minuti.",
    text: {
      it: { question: "Quanto deve durare una spazzolata?", answers: ["2 minuti", "10 secondi", "Mezz’ora"], fact: "2 minuti: 30 secondi per ognuna delle quattro zone della bocca." },
      en: { question: "How long should brushing last?", answers: ["2 minutes", "10 seconds", "Half an hour"], fact: "2 minutes: 30 seconds for each of the four areas of the mouth." },
      de: { question: "Wie lange sollte das Zähneputzen dauern?", answers: ["2 Minuten", "10 Sekunden", "Eine halbe Stunde"], fact: "2 Minuten: 30 Sekunden für jeden der vier Bereiche im Mund." },
      fr: { question: "Combien de temps doit durer un brossage ?", answers: ["2 minutes", "10 secondes", "Une demi-heure"], fact: "2 minutes : 30 secondes pour chacune des quatre zones de la bouche." },
      es: { question: "¿Cuánto debe durar un cepillado?", answers: ["2 minutos", "10 segundos", "Media hora"], fact: "2 minutos: 30 segundos para cada una de las cuatro zonas de la boca." },
    },
  },
  {
    id: "hygiene-replace-brush",
    category: "hygiene",
    level: 2,
    kind: "choice",
    source: "Indicazioni dei produttori e delle associazioni dentali: sostituzione ogni 3 mesi circa o prima se usurato.",
    text: {
      it: { question: "Ogni quanto si cambia lo spazzolino o la testina?", answers: ["Ogni 3 mesi", "Ogni giorno", "Ogni 5 anni"], fact: "Circa ogni 3 mesi, o prima se le setole sono rovinate: setole stanche puliscono peggio." },
      en: { question: "How often should you change your toothbrush or brush head?", answers: ["Every 3 months", "Every day", "Every 5 years"], fact: "About every 3 months, or sooner if the bristles are worn: tired bristles clean less well." },
      de: { question: "Wie oft wechselt man die Zahnbürste oder den Bürstenkopf?", answers: ["Alle 3 Monate", "Jeden Tag", "Alle 5 Jahre"], fact: "Etwa alle 3 Monate oder früher, wenn die Borsten abgenutzt sind: Müde Borsten putzen schlechter." },
      fr: { question: "Tous les combien change-t-on la brosse à dents ou la tête de brosse ?", answers: ["Tous les 3 mois", "Tous les jours", "Tous les 5 ans"], fact: "Environ tous les 3 mois, ou avant si les poils sont abîmés : des poils fatigués nettoient moins bien." },
      es: { question: "¿Cada cuánto se cambia el cepillo o el cabezal?", answers: ["Cada 3 meses", "Cada día", "Cada 5 años"], fact: "Más o menos cada 3 meses, o antes si las cerdas están estropeadas: las cerdas gastadas limpian peor." },
    },
  },
  {
    id: "hygiene-tongue",
    category: "hygiene",
    level: 1,
    kind: "truefalse",
    answer: true,
    source: "Igiene orale: pulizia delicata della lingua contro l’alitosi.",
    text: {
      it: { question: "Anche la lingua si può spazzolare, con delicatezza.", fact: "Vero! Sulla lingua vivono tanti batteri: spazzolarla piano aiuta ad avere l’alito fresco." },
      en: { question: "You can brush your tongue too, gently.", fact: "True! Lots of bacteria live on the tongue: brushing it gently helps keep your breath fresh." },
      de: { question: "Auch die Zunge kann man putzen, ganz sanft.", fact: "Richtig! Auf der Zunge leben viele Bakterien: Sanftes Putzen hilft gegen schlechten Atem." },
      fr: { question: "On peut aussi brosser la langue, doucement.", fact: "Vrai ! Beaucoup de bactéries vivent sur la langue : la brosser doucement aide à garder une haleine fraîche." },
      es: { question: "También se puede cepillar la lengua, con suavidad.", fact: "¡Verdadero! En la lengua viven muchas bacterias: cepillarla con suavidad ayuda a tener el aliento fresco." },
    },
  },
  {
    id: "hygiene-floss",
    category: "hygiene",
    level: 2,
    kind: "choice",
    source: "Igiene interprossimale: filo interdentale tra i denti, con aiuto dell’adulto per i bambini.",
    text: {
      it: { question: "Dove arriva il filo interdentale meglio dello spazzolino?", answers: ["Tra un dente e l’altro", "Sulla lingua", "Sul palato"], fact: "Tra un dente e l’altro, dove le setole fanno fatica a entrare. Ai più piccoli lo passa un adulto." },
      en: { question: "Where does dental floss reach better than a toothbrush?", answers: ["Between the teeth", "On the tongue", "On the roof of the mouth"], fact: "Between the teeth, where bristles struggle to get in. For little ones, a grown-up does the flossing." },
      de: { question: "Wo kommt Zahnseide besser hin als die Zahnbürste?", answers: ["Zwischen die Zähne", "Auf die Zunge", "An den Gaumen"], fact: "Zwischen die Zähne, wo die Borsten schwer hinkommen. Bei Kleinen benutzt ein Erwachsener die Zahnseide." },
      fr: { question: "Où le fil dentaire passe-t-il mieux que la brosse à dents ?", answers: ["Entre les dents", "Sur la langue", "Sur le palais"], fact: "Entre les dents, là où les poils ont du mal à entrer. Pour les plus petits, c’est un adulte qui passe le fil." },
      es: { question: "¿Dónde llega el hilo dental mejor que el cepillo?", answers: ["Entre un diente y otro", "A la lengua", "Al paladar"], fact: "Entre un diente y otro, donde las cerdas apenas entran. A los más pequeños se lo pasa un adulto." },
    },
  },
  // Food
  {
    id: "food-cheese",
    category: "food",
    level: 1,
    kind: "choice",
    pictures: ["🧀", "🍬", "🥤"],
    source: "Alimentazione e carie: spuntini senza zuccheri aggiunti.",
    text: {
      it: { question: "Quale spuntino è più amico dei denti?", answers: ["Un pezzetto di formaggio", "Le caramelle", "Una bibita gassata"], fact: "Il formaggio! Caramelle e bibite zuccherate restano sui denti e nutrono i batteri." },
      en: { question: "Which snack is kinder to your teeth?", answers: ["A piece of cheese", "Sweets", "A fizzy drink"], fact: "Cheese! Sweets and sugary drinks stick to teeth and feed bacteria." },
      de: { question: "Welcher Snack ist freundlicher zu den Zähnen?", answers: ["Ein Stück Käse", "Bonbons", "Eine Limonade"], fact: "Käse! Bonbons und süße Getränke bleiben an den Zähnen und füttern die Bakterien." },
      fr: { question: "Quel en-cas est le plus ami des dents ?", answers: ["Un morceau de fromage", "Des bonbons", "Une boisson gazeuse"], fact: "Le fromage ! Les bonbons et les boissons sucrées restent sur les dents et nourrissent les bactéries." },
      es: { question: "¿Qué tentempié es más amigo de los dientes?", answers: ["Un trocito de queso", "Caramelos", "Un refresco"], fact: "¡El queso! Los caramelos y las bebidas azucaradas se quedan en los dientes y alimentan a las bacterias." },
    },
  },
  {
    id: "food-plaque-acids",
    category: "food",
    level: 2,
    kind: "truefalse",
    answer: true,
    source: "Eziologia della carie: i batteri della placca fermentano gli zuccheri producendo acidi.",
    text: {
      it: { question: "I batteri della placca trasformano lo zucchero in acidi che rovinano lo smalto.", fact: "Vero! Per questo la placca va tolta ogni giorno con lo spazzolino." },
      en: { question: "Plaque bacteria turn sugar into acids that damage enamel.", fact: "True! That’s why plaque has to be brushed away every day." },
      de: { question: "Die Bakterien im Zahnbelag machen aus Zucker Säuren, die den Zahnschmelz angreifen.", fact: "Richtig! Deshalb muss der Belag jeden Tag weggeputzt werden." },
      fr: { question: "Les bactéries de la plaque transforment le sucre en acides qui abîment l’émail.", fact: "Vrai ! C’est pourquoi il faut enlever la plaque chaque jour avec la brosse à dents." },
      es: { question: "Las bacterias de la placa convierten el azúcar en ácidos que dañan el esmalte.", fact: "¡Verdadero! Por eso hay que quitar la placa cada día con el cepillo." },
    },
  },
  {
    id: "food-water",
    category: "food",
    level: 1,
    kind: "truefalse",
    answer: true,
    source: "Indicazioni alimentari: l’acqua come bevanda preferita per i denti.",
    text: {
      it: { question: "Bere un po’ d’acqua dopo uno spuntino aiuta a portare via lo zucchero.", fact: "Vero! L’acqua è la bevanda migliore per i denti." },
      en: { question: "Drinking some water after a snack helps wash sugar away.", fact: "True! Water is the best drink for your teeth." },
      de: { question: "Nach einem Snack etwas Wasser zu trinken hilft, den Zucker wegzuspülen.", fact: "Richtig! Wasser ist das beste Getränk für die Zähne." },
      fr: { question: "Boire un peu d’eau après un en-cas aide à emporter le sucre.", fact: "Vrai ! L’eau est la meilleure boisson pour les dents." },
      es: { question: "Beber un poco de agua después de un tentempié ayuda a llevarse el azúcar.", fact: "¡Verdadero! El agua es la mejor bebida para los dientes." },
    },
  },
  {
    id: "food-frequency",
    category: "food",
    level: 2,
    kind: "choice",
    source: "Eziologia della carie: la frequenza di assunzione degli zuccheri conta più della quantità.",
    text: {
      it: { question: "Cosa fa più male ai denti?", answers: ["Mangiare dolcetti tante volte durante il giorno", "Mangiare un dolce dopo pranzo", "Mangiare frutta a colazione"], fact: "Piluccare dolci tante volte al giorno: i denti non hanno mai il tempo di riposare dagli attacchi degli acidi." },
      en: { question: "What is worse for your teeth?", answers: ["Nibbling sweets many times a day", "Having a dessert after lunch", "Eating fruit at breakfast"], fact: "Nibbling sweets many times a day: your teeth never get a break from acid attacks." },
      de: { question: "Was schadet den Zähnen mehr?", answers: ["Den ganzen Tag immer wieder Süßes naschen", "Ein Dessert nach dem Mittagessen", "Obst zum Frühstück"], fact: "Den ganzen Tag immer wieder naschen: Die Zähne bekommen nie eine Pause von den Säureangriffen." },
      fr: { question: "Qu’est-ce qui abîme le plus les dents ?", answers: ["Grignoter des sucreries plusieurs fois par jour", "Un dessert après le déjeuner", "Des fruits au petit-déjeuner"], fact: "Grignoter des sucreries plusieurs fois par jour : les dents n’ont jamais le temps de se reposer des attaques acides." },
      es: { question: "¿Qué daña más los dientes?", answers: ["Picar dulces muchas veces al día", "Un postre después de comer", "Fruta en el desayuno"], fact: "Picar dulces muchas veces al día: los dientes nunca descansan de los ataques de los ácidos." },
    },
  },
  {
    id: "food-acidic-drinks",
    category: "food",
    level: 2,
    kind: "truefalse",
    answer: true,
    source: "Erosione dentale da bevande acide.",
    text: {
      it: { question: "Le bibite acide, anche senza zucchero, possono indebolire lo smalto.", fact: "Vero! Gli acidi di alcune bibite consumano piano piano lo smalto. Meglio l’acqua." },
      en: { question: "Acidic drinks, even sugar-free ones, can weaken enamel.", fact: "True! The acids in some drinks slowly wear away enamel. Water is better." },
      de: { question: "Saure Getränke können den Zahnschmelz schwächen, auch ohne Zucker.", fact: "Richtig! Die Säure mancher Getränke greift den Zahnschmelz langsam an. Wasser ist besser." },
      fr: { question: "Les boissons acides, même sans sucre, peuvent fragiliser l’émail.", fact: "Vrai ! Les acides de certaines boissons usent peu à peu l’émail. Mieux vaut l’eau." },
      es: { question: "Las bebidas ácidas, incluso sin azúcar, pueden debilitar el esmalte.", fact: "¡Verdadero! Los ácidos de algunas bebidas desgastan poco a poco el esmalte. Mejor el agua." },
    },
  },
  // Animals
  {
    id: "animals-sharks",
    category: "animals",
    level: 1,
    kind: "truefalse",
    answer: true,
    source: "Zoologia: polifiodontia degli squali, denti sostituiti di continuo.",
    text: {
      it: { question: "Gli squali perdono e sostituiscono tantissimi denti durante la vita.", fact: "Vero! Hanno file di denti di ricambio pronte a prendere il posto di quelli persi." },
      en: { question: "Sharks lose and replace lots and lots of teeth during their lives.", fact: "True! They have rows of spare teeth ready to replace the ones they lose." },
      de: { question: "Haie verlieren im Laufe ihres Lebens sehr viele Zähne und bekommen neue.", fact: "Richtig! Sie haben Reihen von Ersatzzähnen, die die verlorenen ersetzen." },
      fr: { question: "Les requins perdent et remplacent énormément de dents au cours de leur vie.", fact: "Vrai ! Ils ont des rangées de dents de rechange prêtes à remplacer celles qu’ils perdent." },
      es: { question: "Los tiburones pierden y reemplazan muchísimos dientes a lo largo de su vida.", fact: "¡Verdadero! Tienen filas de dientes de repuesto listas para sustituir a los que pierden." },
    },
  },
  {
    id: "animals-beaver",
    category: "animals",
    level: 2,
    kind: "choice",
    source: "Zoologia: lo smalto degli incisivi del castoro contiene ferro (colore arancione).",
    text: {
      it: { question: "Perché i denti del castoro sono arancioni?", answers: ["Contengono ferro", "Mangia carote", "Sono sporchi"], fact: "Lo smalto del castoro contiene ferro, che lo rende arancione e molto resistente per rosicchiare il legno." },
      en: { question: "Why are a beaver’s teeth orange?", answers: ["They contain iron", "It eats carrots", "They are dirty"], fact: "A beaver’s enamel contains iron, which makes it orange and very tough for gnawing wood." },
      de: { question: "Warum sind die Zähne des Bibers orange?", answers: ["Sie enthalten Eisen", "Er frisst Karotten", "Sie sind schmutzig"], fact: "Der Zahnschmelz des Bibers enthält Eisen: Das macht ihn orange und sehr widerstandsfähig beim Nagen an Holz." },
      fr: { question: "Pourquoi les dents du castor sont-elles orange ?", answers: ["Elles contiennent du fer", "Il mange des carottes", "Elles sont sales"], fact: "L’émail du castor contient du fer, qui le rend orange et très résistant pour ronger le bois." },
      es: { question: "¿Por qué los dientes del castor son naranjas?", answers: ["Tienen hierro", "Come zanahorias", "Están sucios"], fact: "El esmalte del castor contiene hierro, que lo vuelve naranja y muy resistente para roer madera." },
    },
  },
  {
    id: "animals-elephant",
    category: "animals",
    level: 1,
    kind: "truefalse",
    answer: true,
    source: "Zoologia: le zanne dell’elefante sono incisivi a crescita continua.",
    text: {
      it: { question: "Le zanne dell’elefante sono denti.", fact: "Vero! Sono incisivi lunghissimi che continuano a crescere per tutta la vita." },
      en: { question: "An elephant’s tusks are teeth.", fact: "True! They are very long incisors that keep growing throughout its life." },
      de: { question: "Die Stoßzähne des Elefanten sind Zähne.", fact: "Richtig! Es sind sehr lange Schneidezähne, die ein Leben lang wachsen." },
      fr: { question: "Les défenses de l’éléphant sont des dents.", fact: "Vrai ! Ce sont de très longues incisives qui poussent toute leur vie." },
      es: { question: "Los colmillos del elefante son dientes.", fact: "¡Verdadero! Son incisivos larguísimos que crecen durante toda su vida." },
    },
  },
  {
    id: "animals-chickens",
    category: "animals",
    level: 1,
    kind: "truefalse",
    answer: false,
    source: "Zoologia: gli uccelli moderni non hanno denti; ventriglio e gastroliti.",
    text: {
      it: { question: "Le galline hanno i denti.", fact: "Falso! Gli uccelli non hanno denti: le galline ingoiano piccoli sassolini che le aiutano a sminuzzare il cibo." },
      en: { question: "Chickens have teeth.", fact: "False! Birds have no teeth: chickens swallow tiny stones that help them grind their food." },
      de: { question: "Hühner haben Zähne.", fact: "Falsch! Vögel haben keine Zähne: Hühner schlucken kleine Steinchen, die ihnen helfen, das Futter zu zerkleinern." },
      fr: { question: "Les poules ont des dents.", fact: "Faux ! Les oiseaux n’ont pas de dents : les poules avalent de petits cailloux qui les aident à broyer leur nourriture." },
      es: { question: "Las gallinas tienen dientes.", fact: "¡Falso! Las aves no tienen dientes: las gallinas tragan piedrecitas que las ayudan a triturar la comida." },
    },
  },
  {
    id: "animals-rabbits",
    category: "animals",
    level: 2,
    kind: "truefalse",
    answer: true,
    source: "Zoologia: denti a crescita continua dei lagomorfi.",
    text: {
      it: { question: "I denti dei conigli non smettono mai di crescere.", fact: "Vero! Si consumano masticando fieno ed erba, per questo i conigli rosicchiano sempre." },
      en: { question: "Rabbits’ teeth never stop growing.", fact: "True! They wear down as rabbits chew hay and grass, which is why rabbits are always nibbling." },
      de: { question: "Die Zähne von Kaninchen hören nie auf zu wachsen.", fact: "Richtig! Sie nutzen sich beim Kauen von Heu und Gras ab, deshalb knabbern Kaninchen ständig." },
      fr: { question: "Les dents des lapins ne s’arrêtent jamais de pousser.", fact: "Vrai ! Elles s’usent quand ils mâchent du foin et de l’herbe : voilà pourquoi les lapins grignotent tout le temps." },
      es: { question: "Los dientes de los conejos nunca dejan de crecer.", fact: "¡Verdadero! Se desgastan al masticar heno y hierba; por eso los conejos siempre están royendo." },
    },
  },
  // History
  {
    id: "history-egyptians",
    category: "history",
    level: 1,
    kind: "truefalse",
    answer: true,
    source: "Storia dell’igiene orale: polveri dentifricie nell’antico Egitto (ricette con gusci d’uovo, cenere, mirra).",
    text: {
      it: { question: "Già gli antichi Egizi usavano polveri speciali per pulirsi i denti.", fact: "Vero! Mescolavano ingredienti come gusci d’uovo e cenere per strofinare i denti." },
      en: { question: "The ancient Egyptians already used special powders to clean their teeth.", fact: "True! They mixed ingredients such as eggshells and ash to rub their teeth clean." },
      de: { question: "Schon die alten Ägypter benutzten besondere Pulver, um sich die Zähne zu reinigen.", fact: "Richtig! Sie mischten Zutaten wie Eierschalen und Asche und rieben damit die Zähne sauber." },
      fr: { question: "Les anciens Égyptiens utilisaient déjà des poudres spéciales pour se nettoyer les dents.", fact: "Vrai ! Ils mélangeaient des ingrédients comme des coquilles d’œuf et de la cendre pour frotter leurs dents." },
      es: { question: "Los antiguos egipcios ya usaban polvos especiales para limpiarse los dientes.", fact: "¡Verdadero! Mezclaban ingredientes como cáscaras de huevo y ceniza para frotarse los dientes." },
    },
  },
  {
    id: "history-china-toothbrush",
    category: "history",
    level: 2,
    kind: "choice",
    source: "Storia dello spazzolino: spazzolino a setole di maiale in Cina, fine XV secolo (1498).",
    text: {
      it: { question: "Dove è nato lo spazzolino con le setole simile a quello di oggi?", answers: ["In Cina", "In Australia", "Sulla Luna"], fact: "In Cina, alla fine del Quattrocento: le setole erano di maiale e il manico di osso o di bambù." },
      en: { question: "Where was the bristle toothbrush, like today’s, born?", answers: ["In China", "In Australia", "On the Moon"], fact: "In China, at the end of the 1400s: the bristles were hog hair and the handle was bone or bamboo." },
      de: { question: "Wo wurde die Zahnbürste mit Borsten, ähnlich der heutigen, erfunden?", answers: ["In China", "In Australien", "Auf dem Mond"], fact: "In China, Ende des 15. Jahrhunderts: Die Borsten waren aus Schweinehaar, der Griff aus Knochen oder Bambus." },
      fr: { question: "Où est née la brosse à dents à poils, semblable à celle d’aujourd’hui ?", answers: ["En Chine", "En Australie", "Sur la Lune"], fact: "En Chine, à la fin du XVe siècle : les poils étaient en soies de porc et le manche en os ou en bambou." },
      es: { question: "¿Dónde nació el cepillo de dientes con cerdas, parecido al de hoy?", answers: ["En China", "En Australia", "En la Luna"], fact: "En China, a finales del siglo XV: las cerdas eran de cerdo y el mango de hueso o de bambú." },
    },
  },
  {
    id: "history-fauchard",
    category: "history",
    level: 2,
    kind: "choice",
    source: "Storia dell’odontoiatria: Pierre Fauchard, «Le Chirurgien Dentiste» (1728).",
    text: {
      it: { question: "Chi è considerato il padre del dentista moderno?", answers: ["Pierre Fauchard", "Leonardo da Vinci", "Cristoforo Colombo"], fact: "Il francese Pierre Fauchard: nel 1728 scrisse il primo grande libro su come curare i denti." },
      en: { question: "Who is considered the father of modern dentistry?", answers: ["Pierre Fauchard", "Leonardo da Vinci", "Christopher Columbus"], fact: "The Frenchman Pierre Fauchard: in 1728 he wrote the first great book on caring for teeth." },
      de: { question: "Wer gilt als Vater der modernen Zahnmedizin?", answers: ["Pierre Fauchard", "Leonardo da Vinci", "Christoph Kolumbus"], fact: "Der Franzose Pierre Fauchard: 1728 schrieb er das erste große Buch über die Behandlung der Zähne." },
      fr: { question: "Qui est considéré comme le père de la dentisterie moderne ?", answers: ["Pierre Fauchard", "Léonard de Vinci", "Christophe Colomb"], fact: "Le Français Pierre Fauchard : en 1728, il a écrit le premier grand livre sur les soins des dents." },
      es: { question: "¿Quién es considerado el padre de la odontología moderna?", answers: ["Pierre Fauchard", "Leonardo da Vinci", "Cristóbal Colón"], fact: "El francés Pierre Fauchard: en 1728 escribió el primer gran libro sobre cómo cuidar los dientes." },
    },
  },
  {
    id: "history-washington",
    category: "history",
    level: 2,
    kind: "truefalse",
    answer: false,
    source: "Storia: le protesi di George Washington (avorio, metallo, denti umani e animali), non legno.",
    text: {
      it: { question: "La dentiera di George Washington era di legno.", fact: "Falso! È una leggenda: era fatta di avorio, metallo e denti veri." },
      en: { question: "George Washington’s false teeth were made of wood.", fact: "False! That’s a legend: they were made of ivory, metal and real teeth." },
      de: { question: "Das Gebiss von George Washington war aus Holz.", fact: "Falsch! Das ist eine Legende: Es bestand aus Elfenbein, Metall und echten Zähnen." },
      fr: { question: "Le dentier de George Washington était en bois.", fact: "Faux ! C’est une légende : il était fait d’ivoire, de métal et de vraies dents." },
      es: { question: "La dentadura postiza de George Washington era de madera.", fact: "¡Falso! Es una leyenda: estaba hecha de marfil, metal y dientes de verdad." },
    },
  },
  {
    id: "history-addis",
    category: "history",
    level: 2,
    kind: "choice",
    source: "Storia dello spazzolino: William Addis, Inghilterra, circa 1780 (aneddoto della prigione).",
    text: {
      it: { question: "In Inghilterra, alla fine del Settecento, William Addis iniziò a produrre tanti spazzolini. Dove si racconta che gli venne l’idea?", answers: ["In prigione", "In spiaggia", "Al circo"], fact: "In prigione, così si racconta: con un osso e delle setole costruì uno spazzolino e, uscito, aprì una fabbrica." },
      en: { question: "In England, at the end of the 1700s, William Addis started making toothbrushes in large numbers. Where is he said to have had the idea?", answers: ["In prison", "At the beach", "At the circus"], fact: "In prison, so the story goes: he made a toothbrush from a bone and some bristles and, once free, opened a factory." },
      de: { question: "In England begann William Addis Ende des 18. Jahrhunderts, viele Zahnbürsten herzustellen. Wo soll er die Idee gehabt haben?", answers: ["Im Gefängnis", "Am Strand", "Im Zirkus"], fact: "Im Gefängnis, so erzählt man: Aus einem Knochen und Borsten baute er eine Zahnbürste und gründete später eine Fabrik." },
      fr: { question: "En Angleterre, à la fin du XVIIIe siècle, William Addis a commencé à fabriquer des brosses à dents en grand nombre. Où aurait-il eu l’idée ?", answers: ["En prison", "À la plage", "Au cirque"], fact: "En prison, raconte-t-on : avec un os et des poils, il fabriqua une brosse à dents puis, une fois libre, ouvrit une usine." },
      es: { question: "En Inglaterra, a finales del siglo XVIII, William Addis empezó a fabricar muchos cepillos de dientes. ¿Dónde se dice que tuvo la idea?", answers: ["En la cárcel", "En la playa", "En el circo"], fact: "En la cárcel, según se cuenta: con un hueso y unas cerdas hizo un cepillo y, al salir, abrió una fábrica." },
    },
  },
  // The world
  {
    id: "world-ratoncito-perez",
    category: "world",
    level: 1,
    kind: "choice",
    source: "Tradizioni: Ratoncito Pérez (Spagna e America Latina).",
    text: {
      it: { question: "In Spagna, chi porta un regalino in cambio del dente caduto?", answers: ["Il topolino Ratoncito Pérez", "Un drago", "Il gatto"], fact: "Il Ratoncito Pérez, un topolino! In Italia arrivano il topolino o la fatina dei denti." },
      en: { question: "In Spain, who brings a little gift for a lost tooth?", answers: ["Ratoncito Pérez, a little mouse", "A dragon", "The cat"], fact: "Ratoncito Pérez, a little mouse! In English-speaking countries it’s the Tooth Fairy." },
      de: { question: "Wer bringt in Spanien ein kleines Geschenk für einen ausgefallenen Zahn?", answers: ["Die Maus Ratoncito Pérez", "Ein Drache", "Die Katze"], fact: "Ratoncito Pérez, eine kleine Maus! Bei uns kommt manchmal die Zahnfee." },
      fr: { question: "En Espagne, qui apporte un petit cadeau pour une dent tombée ?", answers: ["La souris Ratoncito Pérez", "Un dragon", "Le chat"], fact: "Ratoncito Pérez, une petite souris ! En France, c’est la petite souris qui passe." },
      es: { question: "En España, ¿quién trae un regalito a cambio del diente caído?", answers: ["El Ratoncito Pérez", "Un dragón", "El gato"], fact: "¡El Ratoncito Pérez! En otros países llega el hada de los dientes." },
    },
  },
  {
    id: "world-petite-souris",
    category: "world",
    level: 1,
    kind: "choice",
    source: "Tradizioni: la petite souris (Francia, Belgio).",
    text: {
      it: { question: "In Francia, chi passa a prendere il dente sotto il cuscino?", answers: ["La petite souris, una topolina", "Un pirata", "Un orso"], fact: "La petite souris, la piccola topolina: lascia una monetina in cambio del dente." },
      en: { question: "In France, who comes to collect the tooth under the pillow?", answers: ["La petite souris, a little mouse", "A pirate", "A bear"], fact: "La petite souris, the little mouse: she leaves a coin in exchange for the tooth." },
      de: { question: "Wer holt in Frankreich den Zahn unter dem Kopfkissen ab?", answers: ["La petite souris, eine kleine Maus", "Ein Pirat", "Ein Bär"], fact: "La petite souris, die kleine Maus: Sie lässt eine Münze für den Zahn da." },
      fr: { question: "En France, qui vient chercher la dent sous l’oreiller ?", answers: ["La petite souris", "Un pirate", "Un ours"], fact: "La petite souris : elle laisse une pièce en échange de la dent." },
      es: { question: "En Francia, ¿quién pasa a recoger el diente que está bajo la almohada?", answers: ["La petite souris, una ratita", "Un pirata", "Un oso"], fact: "La petite souris, la ratita: deja una moneda a cambio del diente." },
    },
  },
  {
    id: "world-tooth-fairy",
    category: "world",
    level: 1,
    kind: "choice",
    source: "Tradizioni: Tooth Fairy (paesi anglofoni).",
    text: {
      it: { question: "Nei paesi di lingua inglese, chi porta un dono per il dente caduto?", answers: ["La fatina dei denti", "Il lupo", "Un robot"], fact: "La Tooth Fairy, la fatina dei denti: prende il dente e lascia una sorpresa." },
      en: { question: "In English-speaking countries, who brings a gift for a lost tooth?", answers: ["The Tooth Fairy", "The wolf", "A robot"], fact: "The Tooth Fairy: she takes the tooth and leaves a surprise." },
      de: { question: "Wer bringt in englischsprachigen Ländern ein Geschenk für einen ausgefallenen Zahn?", answers: ["Die Zahnfee", "Der Wolf", "Ein Roboter"], fact: "Die Tooth Fairy, die Zahnfee: Sie nimmt den Zahn und lässt eine Überraschung da." },
      fr: { question: "Dans les pays anglophones, qui apporte un cadeau pour une dent tombée ?", answers: ["La fée des dents", "Le loup", "Un robot"], fact: "La Tooth Fairy, la fée des dents : elle prend la dent et laisse une surprise." },
      es: { question: "En los países de habla inglesa, ¿quién trae un regalo por el diente caído?", answers: ["El hada de los dientes", "El lobo", "Un robot"], fact: "La Tooth Fairy, el hada de los dientes: se lleva el diente y deja una sorpresa." },
    },
  },
  {
    id: "world-roof",
    category: "world",
    level: 2,
    kind: "truefalse",
    answer: true,
    source: "Tradizioni: lancio dei denti da latte sul tetto o verso terra (Giappone, Corea, Cina, Vietnam).",
    text: {
      it: { question: "In alcuni paesi dell’Asia i bambini lanciano il dente da latte sul tetto, sperando che il nuovo cresca forte.", fact: "Vero! È una tradizione di vari paesi asiatici: i denti di sotto vanno sul tetto, quelli di sopra verso terra." },
      en: { question: "In some Asian countries, children throw a baby tooth onto the roof, hoping the new one grows strong.", fact: "True! It’s a tradition in several Asian countries: lower teeth go on the roof, upper teeth go towards the ground." },
      de: { question: "In manchen Ländern Asiens werfen Kinder den Milchzahn aufs Dach, damit der neue kräftig wächst.", fact: "Richtig! Das ist in mehreren asiatischen Ländern Tradition: Untere Zähne kommen aufs Dach, obere in Richtung Boden." },
      fr: { question: "Dans certains pays d’Asie, les enfants lancent leur dent de lait sur le toit pour que la nouvelle pousse forte.", fact: "Vrai ! C’est une tradition dans plusieurs pays d’Asie : les dents du bas vont sur le toit, celles du haut vers le sol." },
      es: { question: "En algunos países de Asia los niños lanzan el diente de leche al tejado para que el nuevo crezca fuerte.", fact: "¡Verdadero! Es una tradición en varios países asiáticos: los dientes de abajo van al tejado y los de arriba hacia el suelo." },
    },
  },
  {
    id: "world-oral-health-day",
    category: "world",
    level: 2,
    kind: "choice",
    source: "FDI World Dental Federation: World Oral Health Day, 20 marzo.",
    text: {
      it: { question: "In che giorno si celebra la Giornata mondiale della salute orale?", answers: ["20 marzo", "25 dicembre", "1 gennaio"], fact: "Il 20 marzo: in tutto il mondo si ricorda quanto sono importanti denti e bocca sani." },
      en: { question: "On what day is World Oral Health Day celebrated?", answers: ["20 March", "25 December", "1 January"], fact: "On 20 March: all over the world, people celebrate healthy teeth and mouths." },
      de: { question: "An welchem Tag ist der Weltmundgesundheitstag?", answers: ["20. März", "25. Dezember", "1. Januar"], fact: "Am 20. März: Auf der ganzen Welt erinnert man an gesunde Zähne und einen gesunden Mund." },
      fr: { question: "Quel jour célèbre-t-on la Journée mondiale de la santé bucco-dentaire ?", answers: ["Le 20 mars", "Le 25 décembre", "Le 1er janvier"], fact: "Le 20 mars : dans le monde entier, on rappelle l’importance de dents et d’une bouche en bonne santé." },
      es: { question: "¿Qué día se celebra el Día Mundial de la Salud Bucodental?", answers: ["20 de marzo", "25 de diciembre", "1 de enero"], fact: "El 20 de marzo: en todo el mundo se recuerda lo importante que es tener dientes y boca sanos." },
    },
  },
  // «Di chi è questo dente?»: the tooth is described in words, the animals answer in pictures.
  {
    id: "whose-shark",
    category: "animals",
    level: 1,
    kind: "choice",
    pictures: ["🦈", "🐄", "🐇"],
    source: "Zoologia: i denti degli squali sono disposti in file di ricambio che avanzano (polifiodontia).",
    text: {
      it: { question: "Di chi è questo dente? È a punta come un triangolo, e dietro ce ne sono file intere di ricambio.", answers: ["Dello squalo", "Della mucca", "Del coniglio"], fact: "Dello squalo! Quando perde un dente, quello della fila dietro si sposta in avanti e prende il suo posto." },
      en: { question: "Whose tooth is this? It is pointed like a triangle, with whole rows of spare ones behind it.", answers: ["A shark’s", "A cow’s", "A rabbit’s"], fact: "A shark’s! When it loses a tooth, one from the row behind moves forward to take its place." },
      de: { question: "Wem gehört dieser Zahn? Er ist spitz wie ein Dreieck, und dahinter warten ganze Reihen Ersatzzähne.", answers: ["Dem Hai", "Der Kuh", "Dem Kaninchen"], fact: "Dem Hai! Verliert er einen Zahn, rückt einer aus der Reihe dahinter nach vorne und nimmt seinen Platz ein." },
      fr: { question: "À qui est cette dent ? Elle est pointue comme un triangle, avec derrière elle des rangées entières de dents de rechange.", answers: ["Au requin", "À la vache", "Au lapin"], fact: "Au requin ! Quand il perd une dent, une dent de la rangée de derrière avance pour prendre sa place." },
      es: { question: "¿De quién es este diente? Es puntiagudo como un triángulo y detrás tiene filas enteras de recambio.", answers: ["Del tiburón", "De la vaca", "Del conejo"], fact: "¡Del tiburón! Cuando pierde un diente, uno de la fila de atrás avanza y ocupa su lugar." },
    },
  },
  {
    id: "whose-child",
    category: "animals",
    level: 1,
    kind: "choice",
    pictures: ["🧒", "🦈", "🐄"],
    source: "Dentatura decidua: 20 elementi; la permuta inizia verso i 6 anni.",
    text: {
      it: { question: "Di chi sono questi denti? Sono 20, piccoli e bianchi, e verso i 6 anni cominciano a cadere uno alla volta.", answers: ["Di un bambino", "Dello squalo", "Della mucca"], fact: "Di un bambino! Sono i denti da latte: sotto, i denti definitivi aspettano il loro turno." },
      en: { question: "Whose teeth are these? There are 20, small and white, and at around 6 years old they start falling out one by one.", answers: ["A child’s", "A shark’s", "A cow’s"], fact: "A child’s! These are baby teeth: underneath, the adult teeth are waiting their turn." },
      de: { question: "Wem gehören diese Zähne? Es sind 20, klein und weiß, und mit etwa 6 Jahren fallen sie nach und nach aus.", answers: ["Einem Kind", "Dem Hai", "Der Kuh"], fact: "Einem Kind! Das sind Milchzähne: Darunter warten schon die bleibenden Zähne, bis sie dran sind." },
      fr: { question: "À qui sont ces dents ? Il y en a 20, petites et blanches, et vers 6 ans elles commencent à tomber une à une.", answers: ["À un enfant", "Au requin", "À la vache"], fact: "À un enfant ! Ce sont les dents de lait : en dessous, les dents définitives attendent leur tour." },
      es: { question: "¿De quién son estos dientes? Son 20, pequeños y blancos, y hacia los 6 años empiezan a caerse uno a uno.", answers: ["De un niño", "Del tiburón", "De la vaca"], fact: "¡De un niño! Son los dientes de leche: debajo, los definitivos esperan su turno." },
    },
  },
  {
    id: "whose-cow",
    category: "animals",
    level: 2,
    kind: "choice",
    pictures: ["🐄", "🦈", "🐍"],
    source: "Zoologia: i bovini non hanno incisivi superiori (cuscinetto dentale) e hanno molari piatti per ruminare.",
    text: {
      it: { question: "Di chi sono questi denti? In fondo alla bocca sono larghi e piatti per macinare l’erba, e davanti, in alto, non ci sono incisivi.", answers: ["Della mucca", "Dello squalo", "Del serpente"], fact: "Della mucca! Al posto degli incisivi di sopra ha un cuscinetto duro di gengiva: strappa l’erba e poi la mastica a lungo." },
      en: { question: "Whose teeth are these? At the back they are wide and flat for grinding grass, and at the top front there are no incisors.", answers: ["A cow’s", "A shark’s", "A snake’s"], fact: "A cow’s! Instead of upper front teeth it has a hard pad of gum: it tears the grass, then chews it for a long time." },
      de: { question: "Wem gehören diese Zähne? Hinten sind sie breit und flach, um Gras zu zermahlen, und oben vorne gibt es keine Schneidezähne.", answers: ["Der Kuh", "Dem Hai", "Der Schlange"], fact: "Der Kuh! Statt oberer Schneidezähne hat sie eine harte Platte aus Zahnfleisch: Sie rupft das Gras ab und kaut es dann lange." },
      fr: { question: "À qui sont ces dents ? Au fond, elles sont larges et plates pour broyer l’herbe, et devant, en haut, il n’y a pas d’incisives.", answers: ["À la vache", "Au requin", "Au serpent"], fact: "À la vache ! À la place des incisives du haut, elle a un bourrelet de gencive dur : elle arrache l’herbe puis la mâche longtemps." },
      es: { question: "¿De quién son estos dientes? Al fondo son anchos y planos para triturar la hierba, y arriba, delante, no hay incisivos.", answers: ["De la vaca", "Del tiburón", "De la serpiente"], fact: "¡De la vaca! En lugar de incisivos de arriba tiene una almohadilla dura de encía: arranca la hierba y luego la mastica mucho rato." },
    },
  },
  {
    id: "whose-snake",
    category: "animals",
    level: 2,
    kind: "choice",
    pictures: ["🐍", "🐇", "🐄"],
    source: "Zoologia: le zanne dei serpenti velenosi sono scanalate o cave (per esempio nelle vipere).",
    text: {
      it: { question: "Di chi sono questi denti? Sono due, lunghi e sottili, e alcuni hanno dentro un canale, come una cannuccia.", answers: ["Del serpente velenoso", "Del coniglio", "Della mucca"], fact: "Del serpente velenoso! Da quei denti, chiamati zanne, esce il veleno. Gli animali selvatici si guardano da lontano." },
      en: { question: "Whose teeth are these? There are two, long and thin, and some have a channel inside, like a straw.", answers: ["A venomous snake’s", "A rabbit’s", "A cow’s"], fact: "A venomous snake’s! The venom comes out of those teeth, called fangs. Wild animals are best watched from far away." },
      de: { question: "Wem gehören diese Zähne? Es sind zwei, lang und dünn, und manche haben innen einen Kanal wie ein Strohhalm.", answers: ["Der Giftschlange", "Dem Kaninchen", "Der Kuh"], fact: "Der Giftschlange! Aus diesen Zähnen, den Giftzähnen, kommt das Gift. Wilde Tiere beobachtet man am besten aus der Ferne." },
      fr: { question: "À qui sont ces dents ? Il y en a deux, longues et fines, et certaines ont un canal à l’intérieur, comme une paille.", answers: ["Au serpent venimeux", "Au lapin", "À la vache"], fact: "Au serpent venimeux ! Le venin sort de ces dents, appelées crochets. Les animaux sauvages s’observent de loin." },
      es: { question: "¿De quién son estos dientes? Son dos, largos y finos, y algunos tienen un canal por dentro, como una pajita.", answers: ["De la serpiente venenosa", "Del conejo", "De la vaca"], fact: "¡De la serpiente venenosa! Por esos dientes, llamados colmillos, sale el veneno. A los animales salvajes es mejor mirarlos de lejos." },
    },
  },
  {
    id: "whose-crocodile",
    category: "animals",
    level: 2,
    kind: "choice",
    pictures: ["🐊", "🐘", "🐴"],
    source: "Zoologia: negli alligatori ogni dente può essere sostituito fino a circa 50 volte (Wu et al., PNAS 2013).",
    text: {
      it: { question: "Di chi sono questi denti? Sono tanti, a forma di cono, quasi tutti uguali, e quando uno cade ne cresce uno nuovo, moltissime volte.", answers: ["Del coccodrillo", "Dell’elefante", "Del cavallo"], fact: "Del coccodrillo! Ogni dente può essere sostituito decine di volte nella vita. Noi invece abbiamo solo due serie: da latte e definitivi." },
      en: { question: "Whose teeth are these? There are lots of them, cone-shaped and nearly all alike, and when one falls out a new one grows, many, many times.", answers: ["A crocodile’s", "An elephant’s", "A horse’s"], fact: "A crocodile’s! Each tooth can be replaced dozens of times in its life. We only get two sets: baby teeth and adult teeth." },
      de: { question: "Wem gehören diese Zähne? Es sind viele, kegelförmig und fast alle gleich, und fällt einer aus, wächst ein neuer nach, sehr oft.", answers: ["Dem Krokodil", "Dem Elefanten", "Dem Pferd"], fact: "Dem Krokodil! Jeder Zahn kann im Leben Dutzende Male ersetzt werden. Wir bekommen nur zwei Sätze: Milchzähne und bleibende Zähne." },
      fr: { question: "À qui sont ces dents ? Elles sont nombreuses, en forme de cône, presque toutes pareilles, et quand l’une tombe, une nouvelle pousse, de très nombreuses fois.", answers: ["Au crocodile", "À l’éléphant", "Au cheval"], fact: "Au crocodile ! Chaque dent peut être remplacée des dizaines de fois dans sa vie. Nous, nous n’avons que deux séries : les dents de lait et les dents définitives." },
      es: { question: "¿De quién son estos dientes? Son muchos, con forma de cono, casi todos iguales, y cuando se cae uno crece otro nuevo, muchísimas veces.", answers: ["Del cocodrilo", "Del elefante", "Del caballo"], fact: "¡Del cocodrilo! Cada diente puede cambiarse decenas de veces en su vida. Nosotros solo tenemos dos juegos: los de leche y los definitivos." },
    },
  },
  // «Metti in ordine nel tempo»: the items are listed in the right order, the screen shuffles them.
  {
    id: "order-evening",
    category: "hygiene",
    level: 1,
    kind: "order",
    source: "Igiene orale pediatrica: spazzolare prima di dormire e poi bere solo acqua.",
    text: {
      it: { question: "Metti in ordine: che cosa fai la sera?", items: ["Mangio la cena", "Mi lavo i denti", "Vado a dormire"], fact: "Prima la cena, poi lo spazzolino e poi a nanna: dopo aver lavato i denti, solo un po’ d’acqua." },
      en: { question: "Put them in order: what do you do in the evening?", items: ["I eat dinner", "I brush my teeth", "I go to sleep"], fact: "Dinner first, then brushing, then bed: after brushing, only a little water." },
      de: { question: "Bring es in die richtige Reihenfolge: Was machst du am Abend?", items: ["Ich esse zu Abend", "Ich putze die Zähne", "Ich gehe schlafen"], fact: "Erst Abendessen, dann Zähneputzen, dann ins Bett: Nach dem Putzen gibt es nur noch etwas Wasser." },
      fr: { question: "Remets dans l’ordre : que fais-tu le soir ?", items: ["Je dîne", "Je me brosse les dents", "Je vais dormir"], fact: "D’abord le dîner, puis le brossage, puis au lit : après le brossage, juste un peu d’eau." },
      es: { question: "Ordénalo: ¿qué haces por la noche?", items: ["Ceno", "Me lavo los dientes", "Me voy a dormir"], fact: "Primero la cena, luego el cepillado y después a la cama: después de lavarte los dientes, solo un poco de agua." },
    },
  },
  {
    id: "order-growing-up",
    category: "body",
    level: 1,
    kind: "order",
    source: "Cronologia dell’eruzione: primo dente deciduo verso i 6 mesi, prima permuta verso i 6 anni, terzi molari tra 17 e 25 anni.",
    text: {
      it: { question: "Metti in ordine, dal primo all’ultimo: che cosa succede ai denti crescendo?", items: ["Spunta il primo dente da latte", "Cade il primo dente da latte", "Spunta un dente del giudizio"], fact: "Il primo dente spunta verso i 6 mesi, il primo cade verso i 6 anni e i denti del giudizio arrivano da grandi, a volte mai." },
      en: { question: "Put them in order, first to last: what happens to teeth as you grow?", items: ["The first baby tooth comes through", "The first baby tooth falls out", "A wisdom tooth comes through"], fact: "The first tooth appears at around 6 months, the first one falls out at around 6 years, and wisdom teeth come when you are grown up, sometimes never." },
      de: { question: "Bring es in die Reihenfolge, vom ersten zum letzten: Was passiert mit den Zähnen beim Großwerden?", items: ["Der erste Milchzahn kommt", "Der erste Milchzahn fällt aus", "Ein Weisheitszahn kommt"], fact: "Der erste Zahn kommt mit etwa 6 Monaten, der erste fällt mit etwa 6 Jahren aus, und die Weisheitszähne kommen erst bei Erwachsenen, manchmal nie." },
      fr: { question: "Remets dans l’ordre, du premier au dernier : que se passe-t-il pour les dents quand on grandit ?", items: ["La première dent de lait pousse", "La première dent de lait tombe", "Une dent de sagesse pousse"], fact: "La première dent pousse vers 6 mois, la première tombe vers 6 ans, et les dents de sagesse arrivent à l’âge adulte, parfois jamais." },
      es: { question: "Ordénalo del primero al último: ¿qué les pasa a los dientes al crecer?", items: ["Sale el primer diente de leche", "Se cae el primer diente de leche", "Sale una muela del juicio"], fact: "El primer diente sale hacia los 6 meses, el primero se cae hacia los 6 años y las muelas del juicio llegan de mayores, a veces nunca." },
    },
  },
  {
    id: "order-toothbrush",
    category: "history",
    level: 2,
    kind: "order",
    source: "Storia dell’igiene orale: polveri dentifricie egizie; spazzolino a setole in Cina (1498); primi spazzolini elettrici in commercio negli anni Cinquanta (Svizzera, 1954).",
    text: {
      it: { question: "Metti in ordine, dal più antico al più recente.", items: ["Gli antichi Egizi puliscono i denti con una polvere", "In Cina nasce lo spazzolino con le setole", "Arriva lo spazzolino elettrico"], fact: "Le polveri egizie hanno migliaia di anni, lo spazzolino con le setole nasce in Cina nel 1498 e quello elettrico negli anni Cinquanta del Novecento." },
      en: { question: "Put them in order, oldest to newest.", items: ["The ancient Egyptians clean their teeth with a powder", "The bristle toothbrush is invented in China", "The electric toothbrush arrives"], fact: "Egyptian tooth powders are thousands of years old, the bristle toothbrush appeared in China in 1498 and the electric one in the 1950s." },
      de: { question: "Bring es in die Reihenfolge, vom ältesten zum neuesten.", items: ["Die alten Ägypter putzen die Zähne mit einem Pulver", "In China entsteht die Zahnbürste mit Borsten", "Die elektrische Zahnbürste kommt"], fact: "Ägyptische Zahnpulver sind Tausende Jahre alt, die Borstenzahnbürste entstand 1498 in China und die elektrische in den 1950er-Jahren." },
      fr: { question: "Remets dans l’ordre, du plus ancien au plus récent.", items: ["Les anciens Égyptiens se nettoient les dents avec une poudre", "En Chine naît la brosse à dents à poils", "La brosse à dents électrique arrive"], fact: "Les poudres égyptiennes ont des milliers d’années, la brosse à poils est née en Chine en 1498 et la brosse électrique dans les années 1950." },
      es: { question: "Ordénalo del más antiguo al más reciente.", items: ["Los antiguos egipcios se limpian los dientes con un polvo", "En China nace el cepillo con cerdas", "Llega el cepillo eléctrico"], fact: "Los polvos egipcios tienen miles de años, el cepillo con cerdas nació en China en 1498 y el eléctrico en los años cincuenta del siglo XX." },
    },
  },
  {
    id: "order-dentistry",
    category: "history",
    level: 2,
    kind: "order",
    source: "Pierre Fauchard, «Le Chirurgien Dentiste» (1728); William Addis, circa 1780; FDI World Oral Health Day dal 2007 (il 20 marzo dal 2013).",
    text: {
      it: { question: "Metti in ordine, dal più antico al più recente.", items: ["Pierre Fauchard scrive il primo grande libro sui denti", "William Addis produce tanti spazzolini in Inghilterra", "Nasce la Giornata mondiale della salute orale"], fact: "Fauchard scrisse il suo libro nel 1728, Addis iniziò verso il 1780 e la Giornata mondiale della salute orale esiste dal 2007." },
      en: { question: "Put them in order, oldest to newest.", items: ["Pierre Fauchard writes the first big book about teeth", "William Addis makes lots of toothbrushes in England", "World Oral Health Day begins"], fact: "Fauchard wrote his book in 1728, Addis started around 1780, and World Oral Health Day has existed since 2007." },
      de: { question: "Bring es in die Reihenfolge, vom ältesten zum neuesten.", items: ["Pierre Fauchard schreibt das erste große Buch über Zähne", "William Addis stellt in England viele Zahnbürsten her", "Der Weltmundgesundheitstag entsteht"], fact: "Fauchard schrieb sein Buch 1728, Addis begann um 1780, und den Weltmundgesundheitstag gibt es seit 2007." },
      fr: { question: "Remets dans l’ordre, du plus ancien au plus récent.", items: ["Pierre Fauchard écrit le premier grand livre sur les dents", "William Addis fabrique beaucoup de brosses à dents en Angleterre", "La Journée mondiale de la santé bucco-dentaire est créée"], fact: "Fauchard a écrit son livre en 1728, Addis a commencé vers 1780 et la Journée mondiale de la santé bucco-dentaire existe depuis 2007." },
      es: { question: "Ordénalo del más antiguo al más reciente.", items: ["Pierre Fauchard escribe el primer gran libro sobre los dientes", "William Addis fabrica muchos cepillos en Inglaterra", "Nace el Día Mundial de la Salud Bucodental"], fact: "Fauchard escribió su libro en 1728, Addis empezó hacia 1780 y el Día Mundial de la Salud Bucodental existe desde 2007." },
    },
  },
];
