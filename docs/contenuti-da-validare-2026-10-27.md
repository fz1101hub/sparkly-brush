# Contenuti da validare — funzioni richieste (27 ottobre 2026)

Questo documento raccoglie **tutti i testi educativi** introdotti con le quattro funzioni richieste
(Quiz del sorriso, nomi dei denti in altre lingue, modalità apparecchio, attività del villaggio) e con il loro
completamento del 27 ottobre (nuovi tipi di domanda, «ascolta e ripeti», orto, storie, piazza, casa del topolino)
perché siano rivisti **prima della pubblicazione**:

- da un **dentista pediatrico** o un ortodontista per i contenuti di salute (quiz, consigli per l’apparecchio, visita);
- da **madrelingua** per i nomi dei denti e le traduzioni in inglese, tedesco, francese e spagnolo.

Il documento è generato dai file sorgente (`lib/learning/quiz-content.ts`, `lib/learning/tooth-names.ts`,
`locales/it/unified.ts`): se si corregge un testo, va corretto lì. Le traduzioni dei testi delle schermate sono in
`locales/{en,de,fr,es}.ts` con le stesse chiavi indicate qui.

Legenda della revisione: ☐ da rivedere · ☑ approvato · ✎ da correggere (annotare accanto).

## 1. Quiz del sorriso

39 domande in 6 categorie. Livello 1 = bambini di 4–6 anni, livello 2 = 7–9 anni.
Nei dati la risposta corretta delle domande a scelta è sempre la prima; l’app le mescola. Testo in italiano;
le versioni nelle altre lingue sono nello stesso file, accanto a ogni domanda.

### Corpo

**☐ `body-enamel`** — livello 1

- Domanda: Lo smalto dei denti è la parte più dura del corpo umano.
- Vero o falso: **Vero**
- Curiosità mostrata dopo la risposta: Vero! Lo smalto è più duro delle ossa. Però non si ripara da solo: per questo va protetto ogni giorno.
- Fonte: Anatomia dentale: lo smalto è il tessuto più mineralizzato del corpo.

**☐ `body-baby-teeth`** — livello 1

- Domanda: Quanti denti da latte ha un bambino?
- Risposta corretta: **20**
- Risposte sbagliate: 32 · 10
- Curiosità mostrata dopo la risposta: I denti da latte sono 20. Poi, uno alla volta, lasciano il posto ai denti definitivi.
- Fonte: Dentatura decidua: 20 elementi.

**☐ `body-adult-teeth`** — livello 2

- Domanda: Quanti denti ha un adulto, contando quelli del giudizio?
- Risposta corretta: **32**
- Risposte sbagliate: 20 · 40
- Curiosità mostrata dopo la risposta: Un adulto ha 32 denti, compresi i 4 denti del giudizio, che a volte non spuntano mai.
- Fonte: Dentatura permanente: 32 elementi compresi i terzi molari.

**☐ `body-incisors`** — livello 1

- Domanda: Quali denti servono per tagliare il cibo, come quando mordi una mela?
- Risposta corretta: **Gli incisivi**
- Risposte sbagliate: I molari · I denti del giudizio
- Curiosità mostrata dopo la risposta: Gli incisivi, davanti, tagliano. I canini strappano e i molari, in fondo, macinano il cibo.
- Fonte: Funzione dei gruppi dentari: incisivi, canini, molari.

**☐ `body-six-year-molars`** — livello 2

- Domanda: Verso i 6 anni spuntano i primi molari definitivi, dietro i denti da latte, senza che ne cada nessuno.
- Vero o falso: **Vero**
- Curiosità mostrata dopo la risposta: Vero! Sono i «molari dei sei anni»: arrivano in fondo alla bocca e vanno spazzolati bene, perché sono difficili da raggiungere.
- Fonte: Eruzione dei primi molari permanenti verso i 6 anni, distalmente ai secondi molari decidui.

**☐ `order-growing-up`** — livello 1

- Domanda: Metti in ordine, dal primo all’ultimo: che cosa succede ai denti crescendo?
- Ordine giusto: 1. Spunta il primo dente da latte → 2. Cade il primo dente da latte → 3. Spunta un dente del giudizio
- Curiosità mostrata dopo la risposta: Il primo dente spunta verso i 6 mesi, il primo cade verso i 6 anni e i denti del giudizio arrivano da grandi, a volte mai.
- Fonte: Cronologia dell’eruzione: primo dente deciduo verso i 6 mesi, prima permuta verso i 6 anni, terzi molari tra 17 e 25 anni.

### Igiene

**☐ `hygiene-twice`** — livello 1

- Domanda: Quante volte al giorno bisogna lavarsi i denti?
- Risposta corretta: **Almeno 2**
- Risposte sbagliate: Una alla settimana · Solo quando fanno male
- Curiosità mostrata dopo la risposta: Almeno 2 volte al giorno: al mattino e soprattutto la sera, prima di dormire.
- Fonte: Raccomandazioni di igiene orale: spazzolare almeno due volte al giorno.

**☐ `hygiene-two-minutes`** — livello 1

- Domanda: Quanto deve durare una spazzolata?
- Risposta corretta: **2 minuti**
- Risposte sbagliate: 10 secondi · Mezz’ora
- Curiosità mostrata dopo la risposta: 2 minuti: 30 secondi per ognuna delle quattro zone della bocca.
- Fonte: Raccomandazioni di igiene orale: spazzolata di 2 minuti.

**☐ `hygiene-replace-brush`** — livello 2

- Domanda: Ogni quanto si cambia lo spazzolino o la testina?
- Risposta corretta: **Ogni 3 mesi**
- Risposte sbagliate: Ogni giorno · Ogni 5 anni
- Curiosità mostrata dopo la risposta: Circa ogni 3 mesi, o prima se le setole sono rovinate: setole stanche puliscono peggio.
- Fonte: Indicazioni dei produttori e delle associazioni dentali: sostituzione ogni 3 mesi circa o prima se usurato.

**☐ `hygiene-tongue`** — livello 1

- Domanda: Anche la lingua si può spazzolare, con delicatezza.
- Vero o falso: **Vero**
- Curiosità mostrata dopo la risposta: Vero! Sulla lingua vivono tanti batteri: spazzolarla piano aiuta ad avere l’alito fresco.
- Fonte: Igiene orale: pulizia delicata della lingua contro l’alitosi.

**☐ `hygiene-floss`** — livello 2

- Domanda: Dove arriva il filo interdentale meglio dello spazzolino?
- Risposta corretta: **Tra un dente e l’altro**
- Risposte sbagliate: Sulla lingua · Sul palato
- Curiosità mostrata dopo la risposta: Tra un dente e l’altro, dove le setole fanno fatica a entrare. Ai più piccoli lo passa un adulto.
- Fonte: Igiene interprossimale: filo interdentale tra i denti, con aiuto dell’adulto per i bambini.

**☐ `order-evening`** — livello 1

- Domanda: Metti in ordine: che cosa fai la sera?
- Ordine giusto: 1. Mangio la cena → 2. Mi lavo i denti → 3. Vado a dormire
- Curiosità mostrata dopo la risposta: Prima la cena, poi lo spazzolino e poi a nanna: dopo aver lavato i denti, solo un po’ d’acqua.
- Fonte: Igiene orale pediatrica: spazzolare prima di dormire e poi bere solo acqua.

### Cibo

**☐ `food-cheese`** — livello 1

- Domanda: Quale spuntino è più amico dei denti?
- Risposta corretta: **🧀 Un pezzetto di formaggio**
- Risposte sbagliate: 🍬 Le caramelle · 🥤 Una bibita gassata
- Curiosità mostrata dopo la risposta: Il formaggio! Caramelle e bibite zuccherate restano sui denti e nutrono i batteri.
- Fonte: Alimentazione e carie: spuntini senza zuccheri aggiunti.

**☐ `food-plaque-acids`** — livello 2

- Domanda: I batteri della placca trasformano lo zucchero in acidi che rovinano lo smalto.
- Vero o falso: **Vero**
- Curiosità mostrata dopo la risposta: Vero! Per questo la placca va tolta ogni giorno con lo spazzolino.
- Fonte: Eziologia della carie: i batteri della placca fermentano gli zuccheri producendo acidi.

**☐ `food-water`** — livello 1

- Domanda: Bere un po’ d’acqua dopo uno spuntino aiuta a portare via lo zucchero.
- Vero o falso: **Vero**
- Curiosità mostrata dopo la risposta: Vero! L’acqua è la bevanda migliore per i denti.
- Fonte: Indicazioni alimentari: l’acqua come bevanda preferita per i denti.

**☐ `food-frequency`** — livello 2

- Domanda: Cosa fa più male ai denti?
- Risposta corretta: **Mangiare dolcetti tante volte durante il giorno**
- Risposte sbagliate: Mangiare un dolce dopo pranzo · Mangiare frutta a colazione
- Curiosità mostrata dopo la risposta: Piluccare dolci tante volte al giorno: i denti non hanno mai il tempo di riposare dagli attacchi degli acidi.
- Fonte: Eziologia della carie: la frequenza di assunzione degli zuccheri conta più della quantità.

**☐ `food-acidic-drinks`** — livello 2

- Domanda: Le bibite acide, anche senza zucchero, possono indebolire lo smalto.
- Vero o falso: **Vero**
- Curiosità mostrata dopo la risposta: Vero! Gli acidi di alcune bibite consumano piano piano lo smalto. Meglio l’acqua.
- Fonte: Erosione dentale da bevande acide.

### Animali

**☐ `animals-sharks`** — livello 1

- Domanda: Gli squali perdono e sostituiscono tantissimi denti durante la vita.
- Vero o falso: **Vero**
- Curiosità mostrata dopo la risposta: Vero! Hanno file di denti di ricambio pronte a prendere il posto di quelli persi.
- Fonte: Zoologia: polifiodontia degli squali, denti sostituiti di continuo.

**☐ `animals-beaver`** — livello 2

- Domanda: Perché i denti del castoro sono arancioni?
- Risposta corretta: **Contengono ferro**
- Risposte sbagliate: Mangia carote · Sono sporchi
- Curiosità mostrata dopo la risposta: Lo smalto del castoro contiene ferro, che lo rende arancione e molto resistente per rosicchiare il legno.
- Fonte: Zoologia: lo smalto degli incisivi del castoro contiene ferro (colore arancione).

**☐ `animals-elephant`** — livello 1

- Domanda: Le zanne dell’elefante sono denti.
- Vero o falso: **Vero**
- Curiosità mostrata dopo la risposta: Vero! Sono incisivi lunghissimi che continuano a crescere per tutta la vita.
- Fonte: Zoologia: le zanne dell’elefante sono incisivi a crescita continua.

**☐ `animals-chickens`** — livello 1

- Domanda: Le galline hanno i denti.
- Vero o falso: **Falso**
- Curiosità mostrata dopo la risposta: Falso! Gli uccelli non hanno denti: le galline ingoiano piccoli sassolini che le aiutano a sminuzzare il cibo.
- Fonte: Zoologia: gli uccelli moderni non hanno denti; ventriglio e gastroliti.

**☐ `animals-rabbits`** — livello 2

- Domanda: I denti dei conigli non smettono mai di crescere.
- Vero o falso: **Vero**
- Curiosità mostrata dopo la risposta: Vero! Si consumano masticando fieno ed erba, per questo i conigli rosicchiano sempre.
- Fonte: Zoologia: denti a crescita continua dei lagomorfi.

**☐ `whose-shark`** — livello 1

- Domanda: Di chi è questo dente? È a punta come un triangolo, e dietro ce ne sono file intere di ricambio.
- Risposta corretta: **🦈 Dello squalo**
- Risposte sbagliate: 🐄 Della mucca · 🐇 Del coniglio
- Curiosità mostrata dopo la risposta: Dello squalo! Quando perde un dente, quello della fila dietro si sposta in avanti e prende il suo posto.
- Fonte: Zoologia: i denti degli squali sono disposti in file di ricambio che avanzano (polifiodontia).

**☐ `whose-child`** — livello 1

- Domanda: Di chi sono questi denti? Sono 20, piccoli e bianchi, e verso i 6 anni cominciano a cadere uno alla volta.
- Risposta corretta: **🧒 Di un bambino**
- Risposte sbagliate: 🦈 Dello squalo · 🐄 Della mucca
- Curiosità mostrata dopo la risposta: Di un bambino! Sono i denti da latte: sotto, i denti definitivi aspettano il loro turno.
- Fonte: Dentatura decidua: 20 elementi; la permuta inizia verso i 6 anni.

**☐ `whose-cow`** — livello 2

- Domanda: Di chi sono questi denti? In fondo alla bocca sono larghi e piatti per macinare l’erba, e davanti, in alto, non ci sono incisivi.
- Risposta corretta: **🐄 Della mucca**
- Risposte sbagliate: 🦈 Dello squalo · 🐍 Del serpente
- Curiosità mostrata dopo la risposta: Della mucca! Al posto degli incisivi di sopra ha un cuscinetto duro di gengiva: strappa l’erba e poi la mastica a lungo.
- Fonte: Zoologia: i bovini non hanno incisivi superiori (cuscinetto dentale) e hanno molari piatti per ruminare.

**☐ `whose-snake`** — livello 2

- Domanda: Di chi sono questi denti? Sono due, lunghi e sottili, e alcuni hanno dentro un canale, come una cannuccia.
- Risposta corretta: **🐍 Del serpente velenoso**
- Risposte sbagliate: 🐇 Del coniglio · 🐄 Della mucca
- Curiosità mostrata dopo la risposta: Del serpente velenoso! Da quei denti, chiamati zanne, esce il veleno. Gli animali selvatici si guardano da lontano.
- Fonte: Zoologia: le zanne dei serpenti velenosi sono scanalate o cave (per esempio nelle vipere).

**☐ `whose-crocodile`** — livello 2

- Domanda: Di chi sono questi denti? Sono tanti, a forma di cono, quasi tutti uguali, e quando uno cade ne cresce uno nuovo, moltissime volte.
- Risposta corretta: **🐊 Del coccodrillo**
- Risposte sbagliate: 🐘 Dell’elefante · 🐴 Del cavallo
- Curiosità mostrata dopo la risposta: Del coccodrillo! Ogni dente può essere sostituito decine di volte nella vita. Noi invece abbiamo solo due serie: da latte e definitivi.
- Fonte: Zoologia: negli alligatori ogni dente può essere sostituito fino a circa 50 volte (Wu et al., PNAS 2013).

### Storia

**☐ `history-egyptians`** — livello 1

- Domanda: Già gli antichi Egizi usavano polveri speciali per pulirsi i denti.
- Vero o falso: **Vero**
- Curiosità mostrata dopo la risposta: Vero! Mescolavano ingredienti come gusci d’uovo e cenere per strofinare i denti.
- Fonte: Storia dell’igiene orale: polveri dentifricie nell’antico Egitto (ricette con gusci d’uovo, cenere, mirra).

**☐ `history-china-toothbrush`** — livello 2

- Domanda: Dove è nato lo spazzolino con le setole simile a quello di oggi?
- Risposta corretta: **In Cina**
- Risposte sbagliate: In Australia · Sulla Luna
- Curiosità mostrata dopo la risposta: In Cina, alla fine del Quattrocento: le setole erano di maiale e il manico di osso o di bambù.
- Fonte: Storia dello spazzolino: spazzolino a setole di maiale in Cina, fine XV secolo (1498).

**☐ `history-fauchard`** — livello 2

- Domanda: Chi è considerato il padre del dentista moderno?
- Risposta corretta: **Pierre Fauchard**
- Risposte sbagliate: Leonardo da Vinci · Cristoforo Colombo
- Curiosità mostrata dopo la risposta: Il francese Pierre Fauchard: nel 1728 scrisse il primo grande libro su come curare i denti.
- Fonte: Storia dell’odontoiatria: Pierre Fauchard, «Le Chirurgien Dentiste» (1728).

**☐ `history-washington`** — livello 2

- Domanda: La dentiera di George Washington era di legno.
- Vero o falso: **Falso**
- Curiosità mostrata dopo la risposta: Falso! È una leggenda: era fatta di avorio, metallo e denti veri.
- Fonte: Storia: le protesi di George Washington (avorio, metallo, denti umani e animali), non legno.

**☐ `history-addis`** — livello 2

- Domanda: In Inghilterra, alla fine del Settecento, William Addis iniziò a produrre tanti spazzolini. Dove si racconta che gli venne l’idea?
- Risposta corretta: **In prigione**
- Risposte sbagliate: In spiaggia · Al circo
- Curiosità mostrata dopo la risposta: In prigione, così si racconta: con un osso e delle setole costruì uno spazzolino e, uscito, aprì una fabbrica.
- Fonte: Storia dello spazzolino: William Addis, Inghilterra, circa 1780 (aneddoto della prigione).

**☐ `order-toothbrush`** — livello 2

- Domanda: Metti in ordine, dal più antico al più recente.
- Ordine giusto: 1. Gli antichi Egizi puliscono i denti con una polvere → 2. In Cina nasce lo spazzolino con le setole → 3. Arriva lo spazzolino elettrico
- Curiosità mostrata dopo la risposta: Le polveri egizie hanno migliaia di anni, lo spazzolino con le setole nasce in Cina nel 1498 e quello elettrico negli anni Cinquanta del Novecento.
- Fonte: Storia dell’igiene orale: polveri dentifricie egizie; spazzolino a setole in Cina (1498); primi spazzolini elettrici in commercio negli anni Cinquanta (Svizzera, 1954).

**☐ `order-dentistry`** — livello 2

- Domanda: Metti in ordine, dal più antico al più recente.
- Ordine giusto: 1. Pierre Fauchard scrive il primo grande libro sui denti → 2. William Addis produce tanti spazzolini in Inghilterra → 3. Nasce la Giornata mondiale della salute orale
- Curiosità mostrata dopo la risposta: Fauchard scrisse il suo libro nel 1728, Addis iniziò verso il 1780 e la Giornata mondiale della salute orale esiste dal 2007.
- Fonte: Pierre Fauchard, «Le Chirurgien Dentiste» (1728); William Addis, circa 1780; FDI World Oral Health Day dal 2007 (il 20 marzo dal 2013).

### Tradizioni nel mondo

**☐ `world-ratoncito-perez`** — livello 1

- Domanda: In Spagna, chi porta un regalino in cambio del dente caduto?
- Risposta corretta: **Il topolino Ratoncito Pérez**
- Risposte sbagliate: Un drago · Il gatto
- Curiosità mostrata dopo la risposta: Il Ratoncito Pérez, un topolino! In Italia arrivano il topolino o la fatina dei denti.
- Fonte: Tradizioni: Ratoncito Pérez (Spagna e America Latina).

**☐ `world-petite-souris`** — livello 1

- Domanda: In Francia, chi passa a prendere il dente sotto il cuscino?
- Risposta corretta: **La petite souris, una topolina**
- Risposte sbagliate: Un pirata · Un orso
- Curiosità mostrata dopo la risposta: La petite souris, la piccola topolina: lascia una monetina in cambio del dente.
- Fonte: Tradizioni: la petite souris (Francia, Belgio).

**☐ `world-tooth-fairy`** — livello 1

- Domanda: Nei paesi di lingua inglese, chi porta un dono per il dente caduto?
- Risposta corretta: **La fatina dei denti**
- Risposte sbagliate: Il lupo · Un robot
- Curiosità mostrata dopo la risposta: La Tooth Fairy, la fatina dei denti: prende il dente e lascia una sorpresa.
- Fonte: Tradizioni: Tooth Fairy (paesi anglofoni).

**☐ `world-roof`** — livello 2

- Domanda: In alcuni paesi dell’Asia i bambini lanciano il dente da latte sul tetto, sperando che il nuovo cresca forte.
- Vero o falso: **Vero**
- Curiosità mostrata dopo la risposta: Vero! È una tradizione di vari paesi asiatici: i denti di sotto vanno sul tetto, quelli di sopra verso terra.
- Fonte: Tradizioni: lancio dei denti da latte sul tetto o verso terra (Giappone, Corea, Cina, Vietnam).

**☐ `world-oral-health-day`** — livello 2

- Domanda: In che giorno si celebra la Giornata mondiale della salute orale?
- Risposta corretta: **20 marzo**
- Risposte sbagliate: 25 dicembre · 1 gennaio
- Curiosità mostrata dopo la risposta: Il 20 marzo: in tutto il mondo si ricorda quanto sono importanti denti e bocca sani.
- Fonte: FDI World Dental Federation: World Oral Health Day, 20 marzo.

## 2. Nomi dei denti in cinque lingue

Usati nella mappa della bocca (Esplora, Trova il dente, Memory) e letti ad alta voce con la sintesi vocale
del telefono. I denti da latte sono 20 (senza premolari né denti del giudizio), i permanenti 32.

| Tipo | Italiano | English | Deutsch | Français | Español |
| --- | --- | --- | --- | --- | --- |
| ☐ centralIncisor | incisivo centrale | central incisor | mittlerer Schneidezahn | incisive centrale | incisivo central |
| ☐ lateralIncisor | incisivo laterale | lateral incisor | seitlicher Schneidezahn | incisive latérale | incisivo lateral |
| ☐ canine | canino | canine | Eckzahn | canine | colmillo |
| ☐ premolar | premolare | premolar | kleiner Backenzahn | prémolaire | premolar |
| ☐ molar | molare | molar | großer Backenzahn | molaire | muela |
| ☐ wisdom | dente del giudizio | wisdom tooth | Weisheitszahn | dent de sagesse | muela del juicio |

Domande per i madrelingua: il termine è quello che un bambino sente dal dentista? (per esempio «muela» o
«molar» in spagnolo, «Backenzahn» o «Molar» in tedesco). La mappa mostra la bocca vista di fronte: il lato destro
del bambino è a sinistra dello schermo.

### Molari dei 6 anni e numerazione FDI

- ☐ `toothNames.sixYearLegend`: ★ Denti dei 6 anni: nuovi da proteggere
- ☐ `toothNames.sixYear`: Dente dei 6 anni! Spunta verso i 6 anni dietro l’ultimo dente da latte, senza che ne cada uno. È un dente definitivo: spazzolalo bene, fino in fondo.

La numerazione FDI segue lo schema a due cifre: quadrante 1–4 per i denti permanenti e 5–8 per quelli da latte,
a partire dall’arcata superiore destra del bambino; seconda cifra dal centro verso il fondo. I primi molari
permanenti (16, 26, 36, 46) hanno la stella.

## 3. Modalità apparecchio

### Passaggi della routine di cura

Ogni tipo di apparecchio ha la sua routine dopo lo spazzolino; il passaggio principale ha un timer regolabile dal genitore (30, 60, 90 o 120 secondi).

- ☐ `braces.step.interdental`: Passa lo scovolino tra gli attacchi, come ti ha mostrato l’ortodontista.
- ☐ `braces.step.mirror`: Controlla allo specchio che attacchi e filo siano puliti.
- ☐ `braces.step.takeOut`: Togli l’apparecchio prima di lavarti i denti.
- ☐ `braces.step.cleanAppliance`: Pulisci l’apparecchio con lo spazzolino e acqua tiepida.
- ☐ `braces.step.putBack`: Rimetti l’apparecchio o tienilo nella sua custodia.
- ☐ `braces.step.cleanAligners`: Pulisci le mascherine con lo spazzolino e acqua fresca.
- ☐ `braces.step.refitAligners`: Rimetti le mascherine, a denti puliti.
- ☐ `braces.step.gentleBrush`: Spazzola con delicatezza i denti vicino all’espansore.
- ☐ `braces.step.checkFood`: Controlla allo specchio che non sia rimasto cibo sotto l’espansore.

### Consigli per tipo di apparecchio

- ☐ `braces.tip.fixed.1`: Spazzola sopra e sotto gli attacchi, con lo spazzolino un po’ inclinato.
- ☐ `braces.tip.fixed.2`: Usa lo scovolino tra gli attacchi, come ti ha mostrato l’ortodontista.
- ☐ `braces.tip.fixed.3`: Evita cibi molto duri o appiccicosi, come caramelle gommose e torroni.
- ☐ `braces.tip.fixed.4`: Se un attacco si stacca o un filo punge, avvisa un adulto: chiamerà l’ortodontista.
- ☐ `braces.tip.fixed.5`: Se qualcosa irrita la guancia, l’ortodontista può consigliarti la cera apposita.
- ☐ `braces.tip.removable.1`: Togli l’apparecchio prima di lavarti i denti e lavalo a parte.
- ☐ `braces.tip.removable.2`: Lavalo con lo spazzolino e acqua tiepida, mai bollente.
- ☐ `braces.tip.removable.3`: Quando non lo indossi, tienilo sempre nella sua custodia.
- ☐ `braces.tip.removable.4`: Indossalo per il tempo che ti ha indicato l’ortodontista.
- ☐ `braces.tip.aligners.1`: Togli le mascherine per mangiare e per bere qualcosa che non sia acqua.
- ☐ `braces.tip.aligners.2`: Lavati i denti prima di rimetterle.
- ☐ `braces.tip.aligners.3`: Puliscile con lo spazzolino e acqua fresca: l’acqua calda le può deformare.
- ☐ `braces.tip.aligners.4`: Indossale per le ore al giorno indicate dall’ortodontista.
- ☐ `braces.tip.aligners.5`: Quando non le indossi, tienile nella custodia.
- ☐ `braces.tip.expander.1`: Spazzola con delicatezza i denti vicino all’espansore.
- ☐ `braces.tip.expander.2`: Dopo i pasti controlla che non sia rimasto cibo sotto l’espansore.
- ☐ `braces.tip.expander.3`: Le attivazioni con la chiavetta le fa un adulto, seguendo il calendario dell’ortodontista.
- ☐ `braces.tip.expander.4`: Se senti un dolore forte o qualcosa si muove, avvisa subito un adulto.

### Avvertenza mostrata nella schermata

- ☐ `braces.disclaimer`: Questi consigli non sostituiscono le indicazioni del tuo ortodontista: segui sempre quello che ti ha detto.

### Parole della creatura

- ☐ `braces.creatureSays`: Anche io ho l’apparecchio! Puliamolo insieme.

### Sorriso nuovo (dopo aver tolto l’apparecchio)

- ☐ `braces.newSmileSuffix`: , con il sorriso nuovo
- ☐ `braces.newSmileTitle`: Sorriso nuovo!
- ☐ `braces.newSmileText`: Per due settimane la tua creatura brilla insieme al tuo sorriso nuovo.

### Missioni dell’apparecchio

- ☐ `braces.missions.title`: Missioni dell’apparecchio
- ☐ `braces.missions.today`: Cura dell’apparecchio di oggi
- ☐ `braces.missions.week`: Settimana con l’apparecchio pulito
- ☐ `braces.missions.note`: Si completano con la cura dell’apparecchio, dopo lo spazzolino. Non danno monete: il premio è un sorriso pulito.
- ☐ `braces.missions.open`: Vai alla cura dell’apparecchio

## 4. Visita dal dentista (Studio della dottoressa Dentina)

### Passaggi della visita guidata

- ☐ `visit.title`: Prepara la visita dal dentista
- ☐ `visit.progress`: Passo {current} di {total}
- ☐ `visit.step1.title`: In sala d’attesa
- ☐ `visit.step1.text`: Si aspetta un po’, magari leggendo un libro. Va bene sentirsi curiosi o un po’ agitati.
- ☐ `visit.step2.title`: La poltrona che si muove
- ☐ `visit.step2.text`: Ti siedi su una poltrona che si alza e si abbassa piano piano. Se vuoi una pausa, alza la mano.
- ☐ `visit.step3.title`: La luce
- ☐ `visit.step3.text`: Una lampada illumina la bocca, così la dentista vede bene. Se ti dà fastidio, puoi chiudere gli occhi.
- ☐ `visit.step4.title`: Lo specchietto
- ☐ `visit.step4.text`: La dentista guarda i denti con uno specchietto e li conta, uno per uno. Non fa male.
- ☐ `visit.step5.title`: Denti brillanti
- ☐ `visit.step5.text`: A volte i denti vengono lucidati con uno spazzolino speciale che fa un po’ il solletico.
- ☐ `visit.step6.title`: Bravissimo!
- ☐ `visit.step6.text`: Finito! Puoi fare tutte le domande che vuoi: la dentista è lì per aiutarti.
- ☐ `visit.done`: Sono pronto!
- ☐ `visit.previous`: Indietro

## 5. Orto dei cibi

Il bambino mette ogni cibo in uno dei due cesti. Dopo ogni risposta compare la spiegazione del gruppo.

| Gruppo | Cibi |
| --- | --- |
| ☐ Amici dei denti | 🧀 Formaggio, 🥕 Carota, 🍎 Mela, 💧 Acqua, 🥛 Latte, 🥦 Broccoli, 🥚 Uovo, 🥒 Cetriolo |
| ☐ Ogni tanto | 🍬 Caramelle, 🍭 Lecca-lecca, 🥤 Bibita gassata, 🍫 Cioccolato, 🍪 Biscotti, 🍩 Ciambella, 🍰 Torta, 🍯 Miele |

### Spiegazioni e consigli

- ☐ `garden.intro`: Per ogni cibo scegli il cesto: «amico dei denti» oppure «ogni tanto». Una partita costa 1 energia.
- ☐ `garden.best`: Il tuo record: {score} su 6
- ☐ `garden.question`: In quale cesto lo metti?
- ☐ `garden.friend`: Amico dei denti
- ☐ `garden.sometimes`: Ogni tanto
- ☐ `garden.wrong`: Quasi!
- ☐ `garden.whyFriend`: È un amico dei denti: non lascia zuccheri appiccicosi.
- ☐ `garden.whySometimes`: Ha tanti zuccheri: meglio ogni tanto, durante un pasto, e poi un sorso d’acqua.
- ☐ `garden.result`: Hai messo {score} cibi su {total} nel cesto giusto!
- ☐ `garden.tip`: Ricorda: per la sete, l’acqua è la migliore amica dei denti.

## 6. Storie della biblioteca

### ☐ Bloopi e la placca dispettosa

1. Una mattina Bloopi si svegliò con una sensazione strana: i denti sembravano coperti da un maglioncino appiccicoso.
2. «È la placca!» disse Moonbit. «Si forma ogni giorno, ma lo spazzolino la porta via.»
3. Bloopi spazzolò in alto, in basso, a destra e a sinistra, piano piano, per due minuti interi.
4. Alla fine sorrise allo specchio: i denti erano lisci e brillanti. «Ci vediamo stasera, placca: ti mando via di nuovo!»

### ☐ Il dente di Spriggo

1. A Spriggo dondolava un dente da giorni. Una sera, mordendo una mela, il dente cadde.
2. Spriggo lo mise in una scatolina sotto il cuscino. «Chissà se stanotte passerà il topolino…»
3. Nella notte il topolino arrivò in punta di piedi e prese il dente con cura: «Che dente pulito! Lo porterò nella mia casetta.»
4. Al mattino Spriggo trovò un biglietto: «Grazie! Lava bene il dente nuovo che spunterà.»

### ☐ Flarello e l’apparecchio

1. Un giorno l’ortodontista disse a Flarello: «Con un apparecchio i tuoi denti si metteranno in fila, come in una parata.»
2. All’inizio Flarello si sentiva un po’ strano. Poi scelse elastici arancioni, come le sue fiamme.
3. Ogni sera, dopo lo spazzolino, Flarello passava lo scovolino tra gli attacchi, con calma.
4. Il giorno in cui l’apparecchio fu tolto, Flarello fece il sorriso più grande di tutto il villaggio.

### ☐ Voltuff ha sete

1. Dopo una lunga corsa, Voltuff aveva tanta sete e vide una bibita frizzante e zuccherata.
2. «Aspetta!» disse Bloopi. «I batteri della bocca adorano lo zucchero e lo trasformano in acidi che rovinano i denti.»
3. Voltuff bevve un bel bicchiere d’acqua fresca. «È buonissima, e i miei denti sono contenti!»
4. Da quel giorno, quando ha sete, Voltuff sceglie l’acqua. Le bibite dolci? Solo ogni tanto.

## 7. Piazza, casa del topolino e sera

### Feste in piazza

- ☐ `square.event.oralHealthDay.title`: Giornata mondiale della salute orale
- ☐ `square.event.oralHealthDay.tip`: Oggi tutto il mondo festeggia i sorrisi sani: fai vedere a qualcuno come spazzoli per due minuti!
- ☐ `square.event.halloween.title`: Halloween
- ☐ `square.event.halloween.tip`: Tanti dolcetti? Meglio mangiarne qualcuno insieme, dopo un pasto, che piluccarli tutto il giorno. E la sera, spazzolino!
- ☐ `square.event.holidays.title`: Feste di fine anno
- ☐ `square.event.holidays.tip`: Tra un dolce e l’altro, acqua da bere e spazzolino mattina e sera: anche in vacanza!

### Mostro della placca

- ☐ `square.bossTitle`: Il mostro della placca
- ☐ `square.bossText`: Ogni settimana torna con {hp} punti di forza: ogni spazzolata completa, da lunedì a domenica, gliene toglie uno.
- ☐ `square.bossHp`: Forza del mostro della placca
- ☐ `square.bossLeft`: Ancora {count} {count|colpo|colpi} di spazzolino per sconfiggerlo!
- ☐ `square.bossDefeated`: Sconfitto! Questa settimana la placca non ha scampo.

### Casa del topolino

- ☐ `mouse.intro`: Ti è caduto un dente da latte? Toccalo sulla mappa e segnalo: il topolino lo porterà nella sua casetta.
- ☐ `mouse.count`: {count} {count|dente caduto|denti caduti}
- ☐ `mouse.hint`: Tocca un dente sulla mappa.
- ☐ `mouse.record`: È caduto oggi!
- ☐ `mouse.lostOn`: Caduto il {date}.
- ☐ `mouse.undo`: Non è ancora caduto
- ☐ `mouse.thanks`: Il topolino ringrazia: «Che dente pulito! Lava bene anche quello nuovo quando spunta».
- ☐ `mouse.listTitle`: I denti nella casetta
- ☐ `mouse.listItem`: {date}: {name}, {arch}, {side}

### Il villaggio dorme

- ☐ `village.asleep.short`: Il villaggio dorme fino alle {time}
- ☐ `village.asleep.text`: Shh, il villaggio dorme! I giochi riaprono domattina alle {time}. Intanto puoi leggere una storia in biblioteca.
- ☐ `village.asleep.banner`: Buonanotte: il villaggio dorme fino alle {time}. Biblioteca, museo e cura dell’apparecchio restano aperti.

## 8. Regole del villaggio da confermare con la famiglia

- ☐ Energia: 2 punti per ogni sessione di spazzolino completata oggi, al massimo 4 al giorno; si azzera a mezzanotte.
- ☐ Un giro di quiz, una partita a «Trova il dente» o a Memory costano 1 punto; esplorare, il museo, la visita e la cura dell’apparecchio sono gratuiti.
- ☐ Il genitore può togliere il limite di energia in Impostazioni.
- ☐ Le sessioni importate dallo spazzolino con orario approssimativo non danno energia (non si sa se sono di oggi).
- ☐ La sera il villaggio dorme dalle 20:30 (orario scelto dal genitore tra 19:30 e 21:00) alle 6:30: quiz, giochi dei denti, orto e laboratorio chiudono; biblioteca, museo, casa del topolino e cura dell’apparecchio restano aperti.
- ☐ Orto e laboratorio costano 1 energia; «ascolta e ripeti», biblioteca, piazza e casa del topolino sono gratuiti.
- ☐ Il mostro della placca ha 10 punti: una spazzolata completa toglie un punto, da lunedì a domenica.
- ☐ Le missioni dell’apparecchio e il laboratorio non danno né consumano monete o tesori.

## 9. Testi aggiunti sviluppando l’elenco delle idee (dal 27 ottobre)

Consigli di salute mostrati dopo la spazzolata, nella guida per la babysitter e nella schermata del manico.
Le curiosità «Lo sapevi?» dopo ogni sessione sono quelle del quiz (sezione 1), una diversa a ogni spazzolata.

### Quantità di dentifricio per età

Mostrata dopo la spazzolata e nella guida per la babysitter, secondo l’età scelta dal genitore (sotto i 3 anni, 3–6, dai 7).

- ☐ `dental.dose.rice`: una striscia piccola come un chicco di riso
- ☐ `dental.dose.pea`: una quantità grande come un pisello
- ☐ `dental.dose.unknown`: un chicco di riso sotto i 3 anni, un pisello dai 3 anni

### Dopo la spazzolata

- ☐ `afterBrush.title`: Dopo la spazzolata
- ☐ `afterBrush.spit`: Sputa il dentifricio, ma non sciacquare con l’acqua: il fluoro resta sui denti più a lungo.
- ☐ `afterBrush.dose`: Quanto dentifricio: {dose}.

### Passo extra a sorpresa (uno al giorno)

- ☐ `extraStep.step.tongue`: Spazzola piano anche la lingua.
- ☐ `extraStep.step.backTeeth`: Arriva bene ai denti in fondo, anche dietro.
- ☐ `extraStep.step.gumLine`: Spazzola con delicatezza dove il dente incontra la gengiva.
- ☐ `extraStep.step.innerFront`: Non dimenticare il retro dei denti davanti.
- ☐ `extraStep.step.slowCircles`: Fai piccoli cerchi lenti, senza premere forte.
- ☐ `extraStep.step.spit`: Alla fine sputa e non sciacquare.

### Superfici durante la sessione

Ogni zona della bocca è divisa in tre parti uguali: fuori, dentro, sopra (la superficie che mastica).

- ☐ `surface.outer`: Fuori
- ☐ `surface.inner`: Dentro
- ☐ `surface.chewing`: Sopra
- ☐ `surface.now`: Ora: {surface}

### Buonanotte della creatura

- ☐ `goodnight.line1`: Denti puliti, sogni d’oro. Domattina ci rivediamo!
- ☐ `goodnight.line2`: Ora niente più cibo: solo un po’ d’acqua e poi a nanna.
- ☐ `goodnight.line3`: Mentre dormi, i tuoi denti puliti riposano tranquilli.
- ☐ `goodnight.line4`: Che bella giornata! Chiudi gli occhi e sogna il villaggio.

### Guida per la babysitter

- ☐ `babysitter.step.open`: Apri l’app su Oggi: {name} sceglie la sua creatura e preme il pulsante grande per iniziare.
- ☐ `babysitter.step.timer`: Il timer dura {minutes} minuti e guida le quattro zone della bocca: basta seguirlo.
- ☐ `babysitter.step.paste`: Dentifricio: {dose}.
- ☐ `babysitter.step.spit`: Alla fine si sputa il dentifricio senza sciacquare con l’acqua.
- ☐ `babysitter.step.braces`: Ha l’apparecchio: dopo lo spazzolino segui la cura nello studio della dottoressa Dentina, nella scheda Mondo.
- ☐ `babysitter.step.after`: Dopo lo spazzolino solo acqua, poi a nanna. Se l’app propone la buonanotte, lasciala finire.

### Visita dal dentista

Promemoria il giorno scelto (1, 3 o 7 giorni prima) alle 18:00 e conto alla rovescia sulla Home nelle due settimane prima.

- ☐ `dentist.title`: Prossima visita dal dentista
- ☐ `dentist.text`: Scrivi la data della visita: sul telefono arriva un promemoria qualche giorno prima e in Oggi compare il conto alla rovescia.
- ☐ `dentist.dateLabel`: Data della visita (anno-mese-giorno, per esempio 2026-11-15)
- ☐ `dentist.noticeLabel`: Promemoria
- ☐ `dentist.noticeDays`: {count} {count|giorno|giorni} prima
- ☐ `dentist.save`: Salva la visita
- ☐ `dentist.clear`: Togli la visita
- ☐ `dentist.invalid`: Scrivi una data di oggi o futura, per esempio 2026-11-15.
- ☐ `dentist.saved`: Visita salvata
- ☐ `dentist.homeCard`: Visita dal dentista tra {count} {count|giorno|giorni}
- ☐ `dentist.homeToday`: Oggi visita dal dentista!
- ☐ `dentist.prepare`: Prepariamoci
- ☐ `dentist.notification.title`: Visita dal dentista per {name}
- ☐ `dentist.notification.body`: Tra {count} {count|giorno|giorni}: preparate insieme la visita nello studio della dottoressa Dentina.

### Cura del manico: testina e batteria

La testina va cambiata ogni 3 mesi (90 giorni dal cambio segnato dal genitore); l’avviso compare 14 giorni prima. Batteria: avviso sotto il 20%.

- ☐ `device.head.unknown`: Quando hai cambiato la testina? Philips consiglia di cambiarla ogni 3 mesi.
- ☐ `device.head.overdue`: È ora di cambiare la testina: sono passati 3 mesi.
- ☐ `device.head.soon`: Testina da cambiare tra {count} {count|giorno|giorni}.
- ☐ `device.head.next`: Testina cambiata il {date}: la prossima tra {count} {count|giorno|giorni}.
- ☐ `device.head.confirmTitle`: Testina nuova?
- ☐ `device.head.confirmMessage`: Segno oggi come giorno del cambio: ti ricorderò il prossimo tra 3 mesi.
- ☐ `device.head.changedToday`: Testina cambiata oggi
- ☐ `device.head.hint`: Per il genitore: segna il cambio della testina.

### Intensità consigliata per età

Regola usata: sotto i 7 anni intensità bassa, dai 7 anni alta. Da confermare con il dentista e con le istruzioni del Sonicare for Kids.

- ☐ `device.intensityTip.unknownAge`: Scegli l’età del bambino nelle impostazioni per un consiglio sull’intensità.
- ☐ `device.intensityTip.low`: Intensità consigliata per la sua età: bassa, più delicata.
- ☐ `device.intensityTip.high`: Intensità consigliata per la sua età: alta.
- ☐ `device.intensityTip.mismatch`: Il manico ora usa un’altra intensità.

### Routine della buonanotte: consigli per età

Missioni facoltative della sera attivate dal genitore; il collutorio si può attivare solo con l’età «dai 7 anni».

- ☐ `bedtime.age.floss`: Quando i denti si toccano, di solito dai 2–3 anni, con l’aiuto di un adulto.
- ☐ `bedtime.age.mouthwash`: Solo dai 6 anni e se lo consiglia il dentista: va sputato, non ingoiato.
- ☐ `bedtime.age.mouthwashTooYoung`: Il collutorio è sconsigliato sotto i 6 anni: si attiva quando l’età scelta è «dai 7 anni».
- ☐ `bedtime.age.pajamas`: Per tutti: il pigiama dice al corpo che è ora di dormire.

### Voce della creatura durante la sessione

- ☐ `voice.start`: Ciao! Laviamoci i denti insieme. Io sono {name}, pronti?
- ☐ `voice.zone1`: Bravissimo! Ora passiamo alla zona successiva.
- ☐ `voice.half`: Siamo a metà! I denti brillano già.
- ☐ `voice.last`: Ancora {seconds} secondi, ce la fai!

### Rapporto per il dentista: nota a piè di pagina

- ☐ `report.footer`: Creato con Sparkly Brush sul telefono della famiglia. Le durate del timer sono quelle dichiarate; quelle del manico Sonicare sono registrate dal manico.

## 10. Storia a puntate: «La mappa del Sorriso d’Oro»

Un episodio per spazzolata, una parte per zona della bocca, letta con la voce del telefono. Testo in italiano;
le versioni nelle altre lingue sono in `lib/learning/serial-story.ts`. Da rivedere anche per il tono (età 3–9 anni).

**☐ Episodio 1 — La mappa nella bottiglia**

1. Sulla spiaggia del villaggio, Bloopi trovò una bottiglia che luccicava.
2. Dentro c’era una mappa: «Chi segue la strada troverà il Sorriso d’Oro».
3. Spriggo, Flarello, Voltuff e Moonbit corsero a vedere.
4. In fondo alla mappa c’era una piccola impronta di zampa. Di chi sarà?

**☐ Episodio 2 — Il ponte delle bolle**

1. La prima tappa era un fiume largo, senza ponte.
2. Bloopi soffiò, e dalle sue pinne uscirono bolle grandi come palloni.
3. Saltando di bolla in bolla, gli amici arrivarono dall’altra parte.
4. Sulla riva li aspettava un biglietto: «Bravi. Ma la prossima prova è al buio».

**☐ Episodio 3 — La grotta senza luce**

1. La grotta era così buia che nessuno vedeva la propria coda.
2. Moonbit chiuse gli occhi, si concentrò e cominciò a brillare come la luna.
3. Alla sua luce apparvero, sulle pareti, disegni di denti felici.
4. In fondo alla grotta qualcosa si mosse, e fece: «Squit!».

**☐ Episodio 4 — Il topolino Pip**

1. Era un topolino con un sacchetto pieno di dentini da latte.
2. «Mi chiamo Pip», disse. «Custodisco i denti che i bambini perdono.»
3. «Anch’io cerco il Sorriso d’Oro: viene con voi chi ha un sacchetto?»
4. Pip guardò la mappa e diventò pallido: «Oh no. Il passo del Vento Zuccherino!».

**☐ Episodio 5 — Il Vento Zuccherino**

1. Sul passo soffiava un vento dolce dolce, che sapeva di caramelle.
2. Dove passava, sui denti di tutti restava un velo appiccicoso.
3. «Niente paura», disse Spriggo. «Due minuti di spazzolino e il velo sparisce.»
4. Il vento si fermò di colpo. Dietro le nuvole, qualcuno rideva.

**☐ Episodio 6 — Il gigante Caramello**

1. Dalle nuvole scese un gigante gentile fatto di zucchero filato.
2. «Sono Caramello. Soffio il vento perché mi sento solo.»
3. Flarello gli offrì una mela croccante: «Prova questa, è dolce e fa bene».
4. Il gigante sorrise, e un suo dente d’oro brillò. Era quello il Sorriso d’Oro?

**☐ Episodio 7 — Non è ancora finita**

1. «Il mio dente d’oro è solo una corona», rise Caramello.
2. «Il vero Sorriso d’Oro è oltre la Foresta dei Fili.»
3. Il gigante li salutò e promise di soffiare solo aria fresca.
4. Ma quando entrarono nella foresta, la mappa cominciò a sparire!

**☐ Episodio 8 — La Foresta dei Fili**

1. Tra gli alberi pendevano fili sottili e lucenti, come filo interdentale.
2. «Passano dove lo spazzolino non arriva», spiegò Pip.
3. Voltuff fece una scintilla, e sulla mappa riapparve la strada.
4. La strada portava dritta a un lago. E nel lago c’era un’ombra enorme.

**☐ Episodio 9 — Nonna Balena**

1. L’ombra era una balena anziana, con i fanoni bianchi come la neve.
2. «Sono Nonna Balena. Mangio piccoli pesci e bevo solo acqua.»
3. «Per questo ho ancora il sorriso di quando ero giovane», disse fiera.
4. Poi sussurrò: «Il Sorriso d’Oro ha un guardiano. E non ama i dolci».

**☐ Episodio 10 — Il guardiano Smalto**

1. Sulla cima della collina stava un drago tutto bianco e lucido.
2. «Sono Smalto. Proteggo i denti come una corazza.»
3. «Passerà solo chi sa dirmi quanto dura una buona spazzolata.»
4. Tutti guardarono Pip. Pip guardò te. Tu lo sai?

**☐ Episodio 11 — Due minuti**

1. «Due minuti!» gridarono tutti insieme, e Pip più forte di tutti.
2. Smalto annuì: «E mattina e sera, senza dimenticare quelli in fondo».
3. Il drago si fece da parte e mostrò un sentiero di stelle.
4. Il sentiero finiva davanti a una porta chiusa con un lucchetto a forma di dente.

**☐ Episodio 12 — La chiave**

1. «Ci vuole una chiave», disse Spriggo, «ma noi non ce l’abbiamo.»
2. Pip aprì il suo sacchetto: dentro, tra i dentini, brillava un dente d’oro.
3. «Me l’ha dato un bambino che si lavava sempre i denti», disse commosso.
4. Il dente entrò nel lucchetto. Clic. La porta cominciò ad aprirsi…

**☐ Episodio 13 — Lo specchio**

1. Dietro la porta non c’era un tesoro, ma un grande specchio.
2. Nello specchio, ognuno vide il proprio sorriso, pulito e luminoso.
3. «Il Sorriso d’Oro è quello che vi portate dietro», disse una voce.
4. La voce veniva dall’alto. Era qualcuno che conoscevano bene…

**☐ Episodio 14 — La festa del sorriso**

1. Era la dottoressa Dentina, arrivata in volo su una mongolfiera.
2. «La mappa l’ho scritta io, per vedere quanto siete coraggiosi.»
3. Al villaggio fecero una festa: Caramello portò la frutta, Nonna Balena cantò.
4. E la sera, prima di dormire, tutti si lavarono i denti. La prossima avventura? Presto!
