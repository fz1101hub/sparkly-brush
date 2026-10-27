import type { BrushlingId } from "@/lib/brushlings";
import type { SupportedLocale } from "@/lib/locale-types";

/**
 * «Biblioteca delle storie»: short stories of the Brushlings, four pages each, read aloud with
 * the phone's voice. Each one carries a small piece of advice, listed with the other educational
 * texts in docs/contenuti-da-validare-2026-10-27.md.
 */
export type Story = {
  id: string;
  hero: BrushlingId;
  text: Record<SupportedLocale, { title: string; pages: readonly [string, string, string, string] }>;
};

export const STORIES: readonly Story[] = [
  {
    id: "plaque",
    hero: "bloopi",
    text: {
      it: {
        title: "Bloopi e la placca dispettosa",
        pages: [
          "Una mattina Bloopi si svegliò con una sensazione strana: i denti sembravano coperti da un maglioncino appiccicoso.",
          "«È la placca!» disse Moonbit. «Si forma ogni giorno, ma lo spazzolino la porta via.»",
          "Bloopi spazzolò in alto, in basso, a destra e a sinistra, piano piano, per due minuti interi.",
          "Alla fine sorrise allo specchio: i denti erano lisci e brillanti. «Ci vediamo stasera, placca: ti mando via di nuovo!»",
        ],
      },
      en: {
        title: "Bloopi and the cheeky plaque",
        pages: [
          "One morning Bloopi woke up feeling strange: its teeth seemed to be wearing a sticky little jumper.",
          "“That’s plaque!” said Moonbit. “It builds up every day, but a toothbrush sweeps it away.”",
          "Bloopi brushed up, down, right and left, gently, for two whole minutes.",
          "At the end it smiled at the mirror: its teeth were smooth and shiny. “See you tonight, plaque: I’ll send you away again!”",
        ],
      },
      de: {
        title: "Bloopi und der freche Zahnbelag",
        pages: [
          "Eines Morgens wachte Bloopi mit einem komischen Gefühl auf: Die Zähne fühlten sich an, als trügen sie einen klebrigen kleinen Pulli.",
          "„Das ist Zahnbelag!“, sagte Moonbit. „Er entsteht jeden Tag, aber die Zahnbürste fegt ihn weg.“",
          "Bloopi putzte oben, unten, rechts und links, ganz sanft, zwei volle Minuten lang.",
          "Am Ende lächelte Bloopi in den Spiegel: Die Zähne waren glatt und glänzend. „Bis heute Abend, Zahnbelag: Dann schicke ich dich wieder weg!“",
        ],
      },
      fr: {
        title: "Bloopi et la plaque coquine",
        pages: [
          "Un matin, Bloopi se réveilla avec une drôle d’impression : ses dents semblaient porter un petit pull collant.",
          "« C’est la plaque ! » dit Moonbit. « Elle se forme chaque jour, mais la brosse à dents l’emporte. »",
          "Bloopi brossa en haut, en bas, à droite et à gauche, tout doucement, pendant deux minutes entières.",
          "À la fin, Bloopi sourit au miroir : ses dents étaient lisses et brillantes. « À ce soir, la plaque : je te chasserai encore ! »",
        ],
      },
      es: {
        title: "Bloopi y la placa traviesa",
        pages: [
          "Una mañana Bloopi se despertó con una sensación rara: sus dientes parecían llevar un jersey pegajoso.",
          "«¡Es la placa!», dijo Moonbit. «Se forma cada día, pero el cepillo se la lleva.»",
          "Bloopi cepilló arriba, abajo, a la derecha y a la izquierda, despacito, durante dos minutos enteros.",
          "Al final sonrió al espejo: sus dientes estaban lisos y brillantes. «¡Hasta la noche, placa: te volveré a echar!»",
        ],
      },
    },
  },
  {
    id: "lost-tooth",
    hero: "spriggo",
    text: {
      it: {
        title: "Il dente di Spriggo",
        pages: [
          "A Spriggo dondolava un dente da giorni. Una sera, mordendo una mela, il dente cadde.",
          "Spriggo lo mise in una scatolina sotto il cuscino. «Chissà se stanotte passerà il topolino…»",
          "Nella notte il topolino arrivò in punta di piedi e prese il dente con cura: «Che dente pulito! Lo porterò nella mia casetta.»",
          "Al mattino Spriggo trovò un biglietto: «Grazie! Lava bene il dente nuovo che spunterà.»",
        ],
      },
      en: {
        title: "Spriggo’s tooth",
        pages: [
          "One of Spriggo’s teeth had been wobbling for days. One evening, biting into an apple, the tooth came out.",
          "Spriggo put it in a little box under the pillow. “I wonder if the Tooth Fairy will come tonight…”",
          "In the night the Tooth Fairy came on tiptoe and took the tooth with great care: “What a clean tooth! I’ll take it to my little house.”",
          "In the morning Spriggo found a note: “Thank you! Brush the new tooth well when it comes through.”",
        ],
      },
      de: {
        title: "Spriggos Zahn",
        pages: [
          "Bei Spriggo wackelte seit Tagen ein Zahn. Eines Abends biss Spriggo in einen Apfel, und der Zahn fiel heraus.",
          "Spriggo legte ihn in ein kleines Kästchen unter das Kopfkissen. „Ob heute Nacht wohl die Zahnfee kommt …?“",
          "In der Nacht kam die Zahnfee auf Zehenspitzen und nahm den Zahn ganz vorsichtig: „Was für ein sauberer Zahn! Ich bringe ihn in mein kleines Haus.“",
          "Am Morgen fand Spriggo einen Zettel: „Danke! Putz den neuen Zahn gut, wenn er kommt.“",
        ],
      },
      fr: {
        title: "La dent de Spriggo",
        pages: [
          "Une dent de Spriggo bougeait depuis des jours. Un soir, en croquant une pomme, la dent tomba.",
          "Spriggo la mit dans une petite boîte sous l’oreiller. « Je me demande si la petite souris passera cette nuit… »",
          "Dans la nuit, la petite souris arriva sur la pointe des pattes et prit la dent avec soin : « Quelle dent propre ! Je l’emporte dans ma maisonnette. »",
          "Le matin, Spriggo trouva un petit mot : « Merci ! Brosse bien la nouvelle dent quand elle poussera. »",
        ],
      },
      es: {
        title: "El diente de Spriggo",
        pages: [
          "A Spriggo se le movía un diente desde hacía días. Una noche, mordiendo una manzana, el diente se cayó.",
          "Spriggo lo guardó en una cajita debajo de la almohada. «¿Pasará esta noche el Ratoncito Pérez…?»",
          "Por la noche el Ratoncito Pérez llegó de puntillas y cogió el diente con cuidado: «¡Qué diente tan limpio! Lo llevaré a mi casita.»",
          "Por la mañana Spriggo encontró una nota: «¡Gracias! Cepilla bien el diente nuevo cuando salga.»",
        ],
      },
    },
  },
  {
    id: "braces",
    hero: "flarello",
    text: {
      it: {
        title: "Flarello e l’apparecchio",
        pages: [
          "Un giorno l’ortodontista disse a Flarello: «Con un apparecchio i tuoi denti si metteranno in fila, come in una parata.»",
          "All’inizio Flarello si sentiva un po’ strano. Poi scelse elastici arancioni, come le sue fiamme.",
          "Ogni sera, dopo lo spazzolino, Flarello passava lo scovolino tra gli attacchi, con calma.",
          "Il giorno in cui l’apparecchio fu tolto, Flarello fece il sorriso più grande di tutto il villaggio.",
        ],
      },
      en: {
        title: "Flarello and the braces",
        pages: [
          "One day the orthodontist said to Flarello: “With braces your teeth will line up, like in a parade.”",
          "At first Flarello felt a bit strange. Then it chose orange bands, just like its flames.",
          "Every evening, after brushing, Flarello cleaned between the brackets with a little brush, taking its time.",
          "On the day the braces came off, Flarello gave the biggest smile in the whole village.",
        ],
      },
      de: {
        title: "Flarello und die Zahnspange",
        pages: [
          "Eines Tages sagte die Kieferorthopädin zu Flarello: „Mit einer Zahnspange stellen sich deine Zähne in eine Reihe, wie bei einer Parade.“",
          "Am Anfang fühlte sich Flarello ein bisschen komisch. Dann suchte Flarello orange Gummis aus, wie die eigenen Flammen.",
          "Jeden Abend nach dem Zähneputzen reinigte Flarello mit der Zwischenraumbürste ganz in Ruhe zwischen den Brackets.",
          "Am Tag, an dem die Zahnspange herauskam, lächelte Flarello so breit wie niemand sonst im Dorf.",
        ],
      },
      fr: {
        title: "Flarello et l’appareil",
        pages: [
          "Un jour, l’orthodontiste dit à Flarello : « Avec un appareil, tes dents vont se ranger en ligne, comme dans un défilé. »",
          "Au début, Flarello se sentait un peu bizarre. Puis Flarello choisit des élastiques orange, comme ses flammes.",
          "Chaque soir, après le brossage, Flarello passait la brossette entre les attaches, sans se presser.",
          "Le jour où l’appareil fut enlevé, Flarello fit le plus grand sourire de tout le village.",
        ],
      },
      es: {
        title: "Flarello y el aparato",
        pages: [
          "Un día la ortodoncista le dijo a Flarello: «Con un aparato tus dientes se pondrán en fila, como en un desfile.»",
          "Al principio Flarello se sentía un poco raro. Luego eligió gomas naranjas, como sus llamas.",
          "Cada noche, después del cepillado, Flarello pasaba el cepillo interdental entre los brackets, con calma.",
          "El día que le quitaron el aparato, Flarello sonrió más que nadie en todo el pueblo.",
        ],
      },
    },
  },
  {
    id: "water",
    hero: "voltuff",
    text: {
      it: {
        title: "Voltuff ha sete",
        pages: [
          "Dopo una lunga corsa, Voltuff aveva tanta sete e vide una bibita frizzante e zuccherata.",
          "«Aspetta!» disse Bloopi. «I batteri della bocca adorano lo zucchero e lo trasformano in acidi che rovinano i denti.»",
          "Voltuff bevve un bel bicchiere d’acqua fresca. «È buonissima, e i miei denti sono contenti!»",
          "Da quel giorno, quando ha sete, Voltuff sceglie l’acqua. Le bibite dolci? Solo ogni tanto.",
        ],
      },
      en: {
        title: "Voltuff is thirsty",
        pages: [
          "After a long run, Voltuff was very thirsty and spotted a sweet fizzy drink.",
          "“Wait!” said Bloopi. “The germs in your mouth love sugar and turn it into acids that harm your teeth.”",
          "Voltuff drank a big glass of cool water. “It’s delicious, and my teeth are happy!”",
          "Since that day, when Voltuff is thirsty, it chooses water. Sweet drinks? Only now and then.",
        ],
      },
      de: {
        title: "Voltuff hat Durst",
        pages: [
          "Nach einem langen Lauf hatte Voltuff großen Durst und sah eine süße Limonade.",
          "„Warte!“, sagte Bloopi. „Die Bakterien im Mund lieben Zucker und machen daraus Säuren, die den Zähnen schaden.“",
          "Voltuff trank ein großes Glas kühles Wasser. „Das schmeckt super, und meine Zähne freuen sich!“",
          "Seit diesem Tag trinkt Voltuff bei Durst Wasser. Süße Getränke? Nur ab und zu.",
        ],
      },
      fr: {
        title: "Voltuff a soif",
        pages: [
          "Après une longue course, Voltuff avait très soif et vit un soda sucré.",
          "« Attends ! » dit Bloopi. « Les bactéries de la bouche adorent le sucre et le transforment en acides qui abîment les dents. »",
          "Voltuff but un grand verre d’eau fraîche. « C’est délicieux, et mes dents sont contentes ! »",
          "Depuis ce jour, quand Voltuff a soif, il choisit l’eau. Les boissons sucrées ? Seulement de temps en temps.",
        ],
      },
      es: {
        title: "Voltuff tiene sed",
        pages: [
          "Después de una larga carrera, Voltuff tenía mucha sed y vio un refresco con gas y azúcar.",
          "«¡Espera!», dijo Bloopi. «A las bacterias de la boca les encanta el azúcar y lo convierten en ácidos que dañan los dientes.»",
          "Voltuff se bebió un buen vaso de agua fresca. «¡Está buenísima, y mis dientes están contentos!»",
          "Desde ese día, cuando tiene sed, Voltuff elige agua. ¿Las bebidas dulces? Solo de vez en cuando.",
        ],
      },
    },
  },
];
