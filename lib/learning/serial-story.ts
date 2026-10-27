import type { ContentLocale } from "@/lib/locale-types";

/**
 * «Storie a puntate» (voce 7): one episode per brushing, in four parts, one for each zone of the
 * mouth, read with the phone's voice and ending with a small suspense. A season has 14 episodes;
 * an episode is marked heard only when the session is completed, so a missed one comes back.
 */
export type Episode = Record<ContentLocale, { title: string; parts: readonly [string, string, string, string] }>;

export const SEASON_TITLE: Record<ContentLocale, string> = {
  it: "La mappa del Sorriso d’Oro",
  en: "The map of the Golden Smile",
  de: "Die Karte des Goldenen Lächelns",
  fr: "La carte du Sourire d’Or",
  es: "El mapa de la Sonrisa de Oro",
};

export const EPISODES: readonly Episode[] = [
  {
    it: { title: "La mappa nella bottiglia", parts: [
      "Sulla spiaggia del villaggio, Bloopi trovò una bottiglia che luccicava.",
      "Dentro c’era una mappa: «Chi segue la strada troverà il Sorriso d’Oro».",
      "Spriggo, Flarello, Voltuff e Moonbit corsero a vedere.",
      "In fondo alla mappa c’era una piccola impronta di zampa. Di chi sarà?",
    ] },
    en: { title: "The map in the bottle", parts: [
      "On the village beach, Bloopi found a bottle that sparkled.",
      "Inside was a map: “Whoever follows the path will find the Golden Smile.”",
      "Spriggo, Flarello, Voltuff and Moonbit ran to have a look.",
      "At the bottom of the map there was a tiny paw print. Whose could it be?",
    ] },
    de: { title: "Die Karte in der Flasche", parts: [
      "Am Strand des Dorfes fand Bloopi eine Flasche, die funkelte.",
      "Darin lag eine Karte: „Wer dem Weg folgt, findet das Goldene Lächeln.“",
      "Spriggo, Flarello, Voltuff und Moonbit kamen schnell angelaufen.",
      "Unten auf der Karte war ein kleiner Pfotenabdruck. Wem gehört er wohl?",
    ] },
    fr: { title: "La carte dans la bouteille", parts: [
      "Sur la plage du village, Bloopi trouva une bouteille qui scintillait.",
      "Dedans, il y avait une carte : « Qui suit le chemin trouvera le Sourire d’Or. »",
      "Spriggo, Flarello, Voltuff et Moonbit accoururent pour voir.",
      "En bas de la carte, il y avait une petite empreinte de patte. À qui est-elle ?",
    ] },
    es: { title: "El mapa en la botella", parts: [
      "En la playa del pueblo, Bloopi encontró una botella que brillaba.",
      "Dentro había un mapa: «Quien siga el camino encontrará la Sonrisa de Oro».",
      "Spriggo, Flarello, Voltuff y Moonbit corrieron a mirar.",
      "Al final del mapa había una pequeña huella de pata. ¿De quién será?",
    ] },
  },
  {
    it: { title: "Il ponte delle bolle", parts: [
      "La prima tappa era un fiume largo, senza ponte.",
      "Bloopi soffiò, e dalle sue pinne uscirono bolle grandi come palloni.",
      "Saltando di bolla in bolla, gli amici arrivarono dall’altra parte.",
      "Sulla riva li aspettava un biglietto: «Bravi. Ma la prossima prova è al buio».",
    ] },
    en: { title: "The bubble bridge", parts: [
      "The first stop was a wide river with no bridge.",
      "Bloopi blew, and bubbles as big as balloons floated from its fins.",
      "Hopping from bubble to bubble, the friends reached the other side.",
      "On the bank a note was waiting: “Well done. But the next test is in the dark.”",
    ] },
    de: { title: "Die Seifenblasenbrücke", parts: [
      "Die erste Station war ein breiter Fluss ohne Brücke.",
      "Bloopi pustete, und aus seinen Flossen stiegen Blasen, so groß wie Bälle.",
      "Von Blase zu Blase hüpften die Freunde ans andere Ufer.",
      "Dort wartete ein Zettel: „Gut gemacht. Aber die nächste Prüfung ist im Dunkeln.“",
    ] },
    fr: { title: "Le pont de bulles", parts: [
      "La première étape était une large rivière sans pont.",
      "Bloopi souffla, et de ses nageoires sortirent des bulles grandes comme des ballons.",
      "En sautant de bulle en bulle, les amis arrivèrent de l’autre côté.",
      "Sur la rive, un petit mot les attendait : « Bravo. Mais la prochaine épreuve est dans le noir. »",
    ] },
    es: { title: "El puente de burbujas", parts: [
      "La primera parada era un río ancho, sin puente.",
      "Bloopi sopló, y de sus aletas salieron burbujas grandes como balones.",
      "Saltando de burbuja en burbuja, los amigos llegaron al otro lado.",
      "En la orilla les esperaba una nota: «Muy bien. Pero la próxima prueba es a oscuras».",
    ] },
  },
  {
    it: { title: "La grotta senza luce", parts: [
      "La grotta era così buia che nessuno vedeva la propria coda.",
      "Moonbit chiuse gli occhi, si concentrò e cominciò a brillare come la luna.",
      "Alla sua luce apparvero, sulle pareti, disegni di denti felici.",
      "In fondo alla grotta qualcosa si mosse, e fece: «Squit!».",
    ] },
    en: { title: "The cave without light", parts: [
      "The cave was so dark that nobody could see their own tail.",
      "Moonbit closed its eyes, concentrated and began to glow like the moon.",
      "In its light, drawings of happy teeth appeared on the walls.",
      "At the back of the cave something moved and said: “Squeak!”",
    ] },
    de: { title: "Die Höhle ohne Licht", parts: [
      "Die Höhle war so dunkel, dass niemand seinen eigenen Schwanz sah.",
      "Moonbit schloss die Augen, konzentrierte sich und begann zu leuchten wie der Mond.",
      "In seinem Licht erschienen an den Wänden Bilder von fröhlichen Zähnen.",
      "Hinten in der Höhle bewegte sich etwas und machte: „Piep!“",
    ] },
    fr: { title: "La grotte sans lumière", parts: [
      "La grotte était si sombre que personne ne voyait sa propre queue.",
      "Moonbit ferma les yeux, se concentra et se mit à briller comme la lune.",
      "À sa lumière, des dessins de dents joyeuses apparurent sur les murs.",
      "Au fond de la grotte, quelque chose bougea et fit : « Couic ! »",
    ] },
    es: { title: "La cueva sin luz", parts: [
      "La cueva estaba tan oscura que nadie veía su propia cola.",
      "Moonbit cerró los ojos, se concentró y empezó a brillar como la luna.",
      "Con su luz aparecieron en las paredes dibujos de dientes felices.",
      "Al fondo de la cueva algo se movió e hizo: «¡Iiic!».",
    ] },
  },
  {
    it: { title: "Il topolino Pip", parts: [
      "Era un topolino con un sacchetto pieno di dentini da latte.",
      "«Mi chiamo Pip», disse. «Custodisco i denti che i bambini perdono.»",
      "«Anch’io cerco il Sorriso d’Oro: viene con voi chi ha un sacchetto?»",
      "Pip guardò la mappa e diventò pallido: «Oh no. Il passo del Vento Zuccherino!».",
    ] },
    en: { title: "Pip the little mouse", parts: [
      "It was a little mouse with a pouch full of baby teeth.",
      "“My name is Pip,” it said. “I look after the teeth that children lose.”",
      "“I’m looking for the Golden Smile too: may someone with a pouch come along?”",
      "Pip looked at the map and turned pale: “Oh no. The Sugary Wind Pass!”",
    ] },
    de: { title: "Pip, die kleine Maus", parts: [
      "Es war eine kleine Maus mit einem Beutel voller Milchzähne.",
      "„Ich heiße Pip“, sagte sie. „Ich hüte die Zähne, die Kinder verlieren.“",
      "„Ich suche auch das Goldene Lächeln: Darf jemand mit einem Beutel mitkommen?“",
      "Pip sah auf die Karte und wurde blass: „Oh nein. Der Pass des Zuckerwinds!“",
    ] },
    fr: { title: "Pip, la petite souris", parts: [
      "C’était une petite souris avec un sachet plein de dents de lait.",
      "« Je m’appelle Pip, dit-elle. Je garde les dents que les enfants perdent. »",
      "« Moi aussi, je cherche le Sourire d’Or : quelqu’un avec un sachet peut venir ? »",
      "Pip regarda la carte et devint toute pâle : « Oh non. Le col du Vent Sucré ! »",
    ] },
    es: { title: "Pip, el ratoncito", parts: [
      "Era un ratoncito con una bolsita llena de dientes de leche.",
      "«Me llamo Pip», dijo. «Guardo los dientes que pierden los niños.»",
      "«Yo también busco la Sonrisa de Oro: ¿puede venir alguien con bolsita?»",
      "Pip miró el mapa y se puso pálido: «Oh, no. ¡El paso del Viento Azucarado!».",
    ] },
  },
  {
    it: { title: "Il Vento Zuccherino", parts: [
      "Sul passo soffiava un vento dolce dolce, che sapeva di caramelle.",
      "Dove passava, sui denti di tutti restava un velo appiccicoso.",
      "«Niente paura», disse Spriggo. «Due minuti di spazzolino e il velo sparisce.»",
      "Il vento si fermò di colpo. Dietro le nuvole, qualcuno rideva.",
    ] },
    en: { title: "The Sugary Wind", parts: [
      "A very sweet wind blew over the pass, smelling of sweets.",
      "Wherever it went, it left a sticky film on everyone’s teeth.",
      "“Don’t worry,” said Spriggo. “Two minutes of brushing and the film is gone.”",
      "The wind stopped all at once. Behind the clouds, someone was laughing.",
    ] },
    de: { title: "Der Zuckerwind", parts: [
      "Über den Pass wehte ein ganz süßer Wind, der nach Bonbons duftete.",
      "Wo er vorbeikam, blieb auf allen Zähnen ein klebriger Film.",
      "„Keine Angst“, sagte Spriggo. „Zwei Minuten Zähneputzen, und der Film ist weg.“",
      "Plötzlich hörte der Wind auf. Hinter den Wolken lachte jemand.",
    ] },
    fr: { title: "Le Vent Sucré", parts: [
      "Sur le col soufflait un vent tout doux, qui sentait les bonbons.",
      "Partout où il passait, il laissait un voile collant sur les dents.",
      "« Pas de panique, dit Spriggo. Deux minutes de brossage et le voile disparaît. »",
      "Le vent s’arrêta d’un coup. Derrière les nuages, quelqu’un riait.",
    ] },
    es: { title: "El Viento Azucarado", parts: [
      "En el paso soplaba un viento muy dulce, que olía a caramelos.",
      "Por donde pasaba, dejaba una capa pegajosa en los dientes de todos.",
      "«No tengáis miedo», dijo Spriggo. «Dos minutos de cepillo y la capa desaparece.»",
      "El viento se paró de golpe. Detrás de las nubes, alguien se reía.",
    ] },
  },
  {
    it: { title: "Il gigante Caramello", parts: [
      "Dalle nuvole scese un gigante gentile fatto di zucchero filato.",
      "«Sono Caramello. Soffio il vento perché mi sento solo.»",
      "Flarello gli offrì una mela croccante: «Prova questa, è dolce e fa bene».",
      "Il gigante sorrise, e un suo dente d’oro brillò. Era quello il Sorriso d’Oro?",
    ] },
    en: { title: "Caramello the giant", parts: [
      "A kind giant made of candyfloss came down from the clouds.",
      "“I’m Caramello. I blow the wind because I feel lonely.”",
      "Flarello offered him a crunchy apple: “Try this, it’s sweet and good for you.”",
      "The giant smiled, and one of his teeth shone like gold. Was that the Golden Smile?",
    ] },
    de: { title: "Der Riese Caramello", parts: [
      "Aus den Wolken kam ein freundlicher Riese aus Zuckerwatte herab.",
      "„Ich bin Caramello. Ich blase den Wind, weil ich mich einsam fühle.“",
      "Flarello reichte ihm einen knackigen Apfel: „Probier mal, der ist süß und gesund.“",
      "Der Riese lächelte, und einer seiner Zähne glänzte golden. War das das Goldene Lächeln?",
    ] },
    fr: { title: "Le géant Caramello", parts: [
      "Des nuages descendit un gentil géant en barbe à papa.",
      "« Je suis Caramello. Je souffle le vent parce que je me sens seul. »",
      "Flarello lui offrit une pomme croquante : « Goûte, c’est doux et c’est bon pour toi. »",
      "Le géant sourit, et une de ses dents brilla comme de l’or. Était-ce le Sourire d’Or ?",
    ] },
    es: { title: "El gigante Caramelo", parts: [
      "De las nubes bajó un gigante amable hecho de algodón de azúcar.",
      "«Soy Caramelo. Soplo el viento porque me siento solo.»",
      "Flarello le ofreció una manzana crujiente: «Prueba esta, es dulce y sana».",
      "El gigante sonrió, y uno de sus dientes brilló como el oro. ¿Era esa la Sonrisa de Oro?",
    ] },
  },
  {
    it: { title: "Non è ancora finita", parts: [
      "«Il mio dente d’oro è solo una corona», rise Caramello.",
      "«Il vero Sorriso d’Oro è oltre la Foresta dei Fili.»",
      "Il gigante li salutò e promise di soffiare solo aria fresca.",
      "Ma quando entrarono nella foresta, la mappa cominciò a sparire!",
    ] },
    en: { title: "It isn’t over yet", parts: [
      "“My golden tooth is only a crown,” laughed Caramello.",
      "“The real Golden Smile is beyond the Forest of Threads.”",
      "The giant waved goodbye and promised to blow only fresh air.",
      "But as they entered the forest, the map began to fade away!",
    ] },
    de: { title: "Es ist noch nicht vorbei", parts: [
      "„Mein goldener Zahn ist nur eine Krone“, lachte Caramello.",
      "„Das echte Goldene Lächeln liegt hinter dem Wald der Fäden.“",
      "Der Riese winkte zum Abschied und versprach, nur noch frische Luft zu pusten.",
      "Doch als sie den Wald betraten, begann die Karte zu verblassen!",
    ] },
    fr: { title: "Ce n’est pas fini", parts: [
      "« Ma dent d’or n’est qu’une couronne », rit Caramello.",
      "« Le vrai Sourire d’Or est au-delà de la Forêt des Fils. »",
      "Le géant leur dit au revoir et promit de ne souffler que de l’air frais.",
      "Mais quand ils entrèrent dans la forêt, la carte commença à s’effacer !",
    ] },
    es: { title: "Todavía no ha terminado", parts: [
      "«Mi diente de oro es solo una corona», se rio Caramelo.",
      "«La verdadera Sonrisa de Oro está más allá del Bosque de los Hilos.»",
      "El gigante se despidió y prometió soplar solo aire fresco.",
      "Pero al entrar en el bosque, ¡el mapa empezó a borrarse!",
    ] },
  },
  {
    it: { title: "La Foresta dei Fili", parts: [
      "Tra gli alberi pendevano fili sottili e lucenti, come filo interdentale.",
      "«Passano dove lo spazzolino non arriva», spiegò Pip.",
      "Voltuff fece una scintilla, e sulla mappa riapparve la strada.",
      "La strada portava dritta a un lago. E nel lago c’era un’ombra enorme.",
    ] },
    en: { title: "The Forest of Threads", parts: [
      "Thin, shiny threads hung between the trees, like dental floss.",
      "“They go where the toothbrush can’t reach,” Pip explained.",
      "Voltuff made a spark, and the path reappeared on the map.",
      "The path led straight to a lake. And in the lake there was a huge shadow.",
    ] },
    de: { title: "Der Wald der Fäden", parts: [
      "Zwischen den Bäumen hingen dünne, glänzende Fäden, wie Zahnseide.",
      "„Sie kommen dorthin, wo die Zahnbürste nicht hinkommt“, erklärte Pip.",
      "Voltuff machte einen Funken, und auf der Karte erschien der Weg wieder.",
      "Der Weg führte direkt zu einem See. Und im See war ein riesiger Schatten.",
    ] },
    fr: { title: "La Forêt des Fils", parts: [
      "Entre les arbres pendaient des fils fins et brillants, comme du fil dentaire.",
      "« Ils passent là où la brosse à dents n’arrive pas », expliqua Pip.",
      "Voltuff fit une étincelle, et le chemin réapparut sur la carte.",
      "Le chemin menait tout droit à un lac. Et dans le lac, il y avait une ombre énorme.",
    ] },
    es: { title: "El Bosque de los Hilos", parts: [
      "Entre los árboles colgaban hilos finos y brillantes, como hilo dental.",
      "«Llegan adonde no llega el cepillo», explicó Pip.",
      "Voltuff hizo una chispa, y el camino volvió a aparecer en el mapa.",
      "El camino llevaba directo a un lago. Y en el lago había una sombra enorme.",
    ] },
  },
  {
    it: { title: "Nonna Balena", parts: [
      "L’ombra era una balena anziana, con i fanoni bianchi come la neve.",
      "«Sono Nonna Balena. Mangio piccoli pesci e bevo solo acqua.»",
      "«Per questo ho ancora il sorriso di quando ero giovane», disse fiera.",
      "Poi sussurrò: «Il Sorriso d’Oro ha un guardiano. E non ama i dolci».",
    ] },
    en: { title: "Granny Whale", parts: [
      "The shadow was an old whale, with baleen as white as snow.",
      "“I’m Granny Whale. I eat little fish and only drink water.”",
      "“That’s why I still have the smile I had when I was young,” she said proudly.",
      "Then she whispered: “The Golden Smile has a guardian. And it doesn’t like sweets.”",
    ] },
    de: { title: "Oma Wal", parts: [
      "Der Schatten war ein alter Wal mit Barten so weiß wie Schnee.",
      "„Ich bin Oma Wal. Ich esse kleine Fische und trinke nur Wasser.“",
      "„Darum habe ich noch das Lächeln aus meiner Jugend“, sagte sie stolz.",
      "Dann flüsterte sie: „Das Goldene Lächeln hat einen Wächter. Und er mag keine Süßigkeiten.“",
    ] },
    fr: { title: "Mamie Baleine", parts: [
      "L’ombre était une vieille baleine, aux fanons blancs comme la neige.",
      "« Je suis Mamie Baleine. Je mange de petits poissons et je ne bois que de l’eau. »",
      "« C’est pour ça que j’ai encore le sourire de ma jeunesse », dit-elle, fière.",
      "Puis elle chuchota : « Le Sourire d’Or a un gardien. Et il n’aime pas les sucreries. »",
    ] },
    es: { title: "Abuela Ballena", parts: [
      "La sombra era una ballena anciana, con las barbas blancas como la nieve.",
      "«Soy la Abuela Ballena. Como pececillos y solo bebo agua.»",
      "«Por eso todavía tengo la sonrisa de cuando era joven», dijo orgullosa.",
      "Luego susurró: «La Sonrisa de Oro tiene un guardián. Y no le gustan los dulces».",
    ] },
  },
  {
    it: { title: "Il guardiano Smalto", parts: [
      "Sulla cima della collina stava un drago tutto bianco e lucido.",
      "«Sono Smalto. Proteggo i denti come una corazza.»",
      "«Passerà solo chi sa dirmi quanto dura una buona spazzolata.»",
      "Tutti guardarono Pip. Pip guardò te. Tu lo sai?",
    ] },
    en: { title: "Enamel the guardian", parts: [
      "On top of the hill stood a dragon, all white and shiny.",
      "“I am Enamel. I protect teeth like a suit of armour.”",
      "“Only those who can tell me how long a good brushing lasts may pass.”",
      "Everyone looked at Pip. Pip looked at you. Do you know?",
    ] },
    de: { title: "Der Wächter Schmelz", parts: [
      "Oben auf dem Hügel stand ein Drache, ganz weiß und glänzend.",
      "„Ich bin Schmelz. Ich schütze die Zähne wie eine Rüstung.“",
      "„Nur wer mir sagt, wie lange gutes Zähneputzen dauert, darf vorbei.“",
      "Alle sahen Pip an. Pip sah dich an. Weißt du es?",
    ] },
    fr: { title: "Émail, le gardien", parts: [
      "Au sommet de la colline se tenait un dragon tout blanc et brillant.",
      "« Je suis Émail. Je protège les dents comme une armure. »",
      "« Seul passera celui qui me dira combien de temps dure un bon brossage. »",
      "Tout le monde regarda Pip. Pip te regarda. Tu le sais ?",
    ] },
    es: { title: "Esmalte, el guardián", parts: [
      "En lo alto de la colina había un dragón todo blanco y brillante.",
      "«Soy Esmalte. Protejo los dientes como una armadura.»",
      "«Solo pasará quien me diga cuánto dura un buen cepillado.»",
      "Todos miraron a Pip. Pip te miró a ti. ¿Lo sabes?",
    ] },
  },
  {
    it: { title: "Due minuti", parts: [
      "«Due minuti!» gridarono tutti insieme, e Pip più forte di tutti.",
      "Smalto annuì: «E mattina e sera, senza dimenticare quelli in fondo».",
      "Il drago si fece da parte e mostrò un sentiero di stelle.",
      "Il sentiero finiva davanti a una porta chiusa con un lucchetto a forma di dente.",
    ] },
    en: { title: "Two minutes", parts: [
      "“Two minutes!” everyone shouted together, and Pip loudest of all.",
      "Enamel nodded: “And morning and evening, without forgetting the ones at the back.”",
      "The dragon stepped aside and showed them a path of stars.",
      "The path ended at a door locked with a tooth-shaped padlock.",
    ] },
    de: { title: "Zwei Minuten", parts: [
      "„Zwei Minuten!“, riefen alle zusammen, und Pip am lautesten.",
      "Schmelz nickte: „Und morgens und abends, ohne die ganz hinten zu vergessen.“",
      "Der Drache trat zur Seite und zeigte einen Pfad aus Sternen.",
      "Der Pfad endete vor einer Tür mit einem Schloss in Zahnform.",
    ] },
    fr: { title: "Deux minutes", parts: [
      "« Deux minutes ! » crièrent-ils tous ensemble, et Pip plus fort que tout le monde.",
      "Émail hocha la tête : « Et matin et soir, sans oublier celles du fond. »",
      "Le dragon s’écarta et leur montra un sentier d’étoiles.",
      "Le sentier finissait devant une porte fermée par un cadenas en forme de dent.",
    ] },
    es: { title: "Dos minutos", parts: [
      "«¡Dos minutos!», gritaron todos juntos, y Pip más fuerte que nadie.",
      "Esmalte asintió: «Y mañana y noche, sin olvidar las del fondo».",
      "El dragón se apartó y les mostró un sendero de estrellas.",
      "El sendero terminaba ante una puerta cerrada con un candado en forma de diente.",
    ] },
  },
  {
    it: { title: "La chiave", parts: [
      "«Ci vuole una chiave», disse Spriggo, «ma noi non ce l’abbiamo.»",
      "Pip aprì il suo sacchetto: dentro, tra i dentini, brillava un dente d’oro.",
      "«Me l’ha dato un bambino che si lavava sempre i denti», disse commosso.",
      "Il dente entrò nel lucchetto. Clic. La porta cominciò ad aprirsi…",
    ] },
    en: { title: "The key", parts: [
      "“We need a key,” said Spriggo, “but we don’t have one.”",
      "Pip opened his pouch: inside, among the baby teeth, a golden tooth was shining.",
      "“A child who always brushed gave it to me,” he said, moved.",
      "The tooth slid into the padlock. Click. The door began to open…",
    ] },
    de: { title: "Der Schlüssel", parts: [
      "„Wir brauchen einen Schlüssel“, sagte Spriggo, „aber wir haben keinen.“",
      "Pip öffnete seinen Beutel: Zwischen den Milchzähnen glänzte ein goldener Zahn.",
      "„Den hat mir ein Kind geschenkt, das immer Zähne geputzt hat“, sagte er gerührt.",
      "Der Zahn passte ins Schloss. Klick. Die Tür ging langsam auf …",
    ] },
    fr: { title: "La clé", parts: [
      "« Il faut une clé, dit Spriggo, mais nous n’en avons pas. »",
      "Pip ouvrit son sachet : parmi les dents de lait brillait une dent d’or.",
      "« C’est un enfant qui se brossait toujours les dents qui me l’a donnée », dit-il, ému.",
      "La dent entra dans le cadenas. Clic. La porte commença à s’ouvrir…",
    ] },
    es: { title: "La llave", parts: [
      "«Hace falta una llave», dijo Spriggo, «pero no la tenemos.»",
      "Pip abrió su bolsita: dentro, entre los dientecitos, brillaba un diente de oro.",
      "«Me lo dio un niño que siempre se lavaba los dientes», dijo emocionado.",
      "El diente entró en el candado. Clic. La puerta empezó a abrirse…",
    ] },
  },
  {
    it: { title: "Lo specchio", parts: [
      "Dietro la porta non c’era un tesoro, ma un grande specchio.",
      "Nello specchio, ognuno vide il proprio sorriso, pulito e luminoso.",
      "«Il Sorriso d’Oro è quello che vi portate dietro», disse una voce.",
      "La voce veniva dall’alto. Era qualcuno che conoscevano bene…",
    ] },
    en: { title: "The mirror", parts: [
      "Behind the door there was no treasure, but a big mirror.",
      "In the mirror, everyone saw their own smile, clean and bright.",
      "“The Golden Smile is the one you carry with you,” said a voice.",
      "The voice came from above. It was someone they knew well…",
    ] },
    de: { title: "Der Spiegel", parts: [
      "Hinter der Tür war kein Schatz, sondern ein großer Spiegel.",
      "Im Spiegel sah jeder sein eigenes Lächeln, sauber und strahlend.",
      "„Das Goldene Lächeln ist das, das ihr immer bei euch tragt“, sagte eine Stimme.",
      "Die Stimme kam von oben. Es war jemand, den sie gut kannten …",
    ] },
    fr: { title: "Le miroir", parts: [
      "Derrière la porte, il n’y avait pas de trésor, mais un grand miroir.",
      "Dans le miroir, chacun vit son propre sourire, propre et lumineux.",
      "« Le Sourire d’Or, c’est celui que vous emportez avec vous », dit une voix.",
      "La voix venait d’en haut. C’était quelqu’un qu’ils connaissaient bien…",
    ] },
    es: { title: "El espejo", parts: [
      "Detrás de la puerta no había un tesoro, sino un gran espejo.",
      "En el espejo, cada uno vio su propia sonrisa, limpia y luminosa.",
      "«La Sonrisa de Oro es la que lleváis siempre con vosotros», dijo una voz.",
      "La voz venía de arriba. Era alguien a quien conocían bien…",
    ] },
  },
  {
    it: { title: "La festa del sorriso", parts: [
      "Era la dottoressa Dentina, arrivata in volo su una mongolfiera.",
      "«La mappa l’ho scritta io, per vedere quanto siete coraggiosi.»",
      "Al villaggio fecero una festa: Caramello portò la frutta, Nonna Balena cantò.",
      "E la sera, prima di dormire, tutti si lavarono i denti. La prossima avventura? Presto!",
    ] },
    en: { title: "The smile party", parts: [
      "It was Doctor Dentina, who had flown in on a hot-air balloon.",
      "“I wrote the map myself, to see how brave you are.”",
      "Back in the village they threw a party: Caramello brought fruit, Granny Whale sang.",
      "And in the evening, before sleeping, everyone brushed their teeth. The next adventure? Soon!",
    ] },
    de: { title: "Das Lächelfest", parts: [
      "Es war Doktor Dentina, die in einem Heißluftballon geflogen kam.",
      "„Die Karte habe ich geschrieben, um zu sehen, wie mutig ihr seid.“",
      "Im Dorf feierten sie ein Fest: Caramello brachte Obst, Oma Wal sang.",
      "Und abends vor dem Schlafen putzten alle ihre Zähne. Das nächste Abenteuer? Bald!",
    ] },
    fr: { title: "La fête du sourire", parts: [
      "C’était la docteure Dentina, arrivée en montgolfière.",
      "« C’est moi qui ai écrit la carte, pour voir à quel point vous êtes courageux. »",
      "Au village, ils firent la fête : Caramello apporta des fruits, Mamie Baleine chanta.",
      "Et le soir, avant de dormir, tout le monde se brossa les dents. La prochaine aventure ? Bientôt !",
    ] },
    es: { title: "La fiesta de la sonrisa", parts: [
      "Era la doctora Dentina, que había llegado volando en un globo.",
      "«El mapa lo escribí yo, para ver lo valientes que sois.»",
      "En el pueblo hicieron una fiesta: Caramelo trajo fruta, la Abuela Ballena cantó.",
      "Y por la noche, antes de dormir, todos se lavaron los dientes. ¿La próxima aventura? ¡Pronto!",
    ] },
  },
];

/** The next episode to hear: the first not heard yet, so a missed one comes back; then the season restarts. */
export function nextEpisode(heard: readonly number[]): number {
  const index = EPISODES.findIndex((_, episode) => !heard.includes(episode));
  return index === -1 ? 0 : index;
}
