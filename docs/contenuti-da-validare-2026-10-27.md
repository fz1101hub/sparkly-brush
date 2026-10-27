# Contenuti da validare — funzioni richieste (27 ottobre 2026)

Questo documento raccoglie **tutti i testi educativi** introdotti con le quattro funzioni richieste
(Quiz del sorriso, nomi dei denti in altre lingue, modalità apparecchio, attività del villaggio)
perché siano rivisti **prima della pubblicazione**:

- da un **dentista pediatrico** o un ortodontista per i contenuti di salute (quiz, consigli per l’apparecchio, visita);
- da **madrelingua** per i nomi dei denti e le traduzioni in inglese, tedesco, francese e spagnolo.

Il documento è generato dai file sorgente (`lib/learning/quiz-content.ts`, `lib/learning/tooth-names.ts`,
`locales/it/unified.ts`): se si corregge un testo, va corretto lì. Le traduzioni dei testi delle schermate sono in
`locales/{en,de,fr,es}.ts` con le stesse chiavi indicate qui.

Legenda della revisione: ☐ da rivedere · ☑ approvato · ✎ da correggere (annotare accanto).

## 1. Quiz del sorriso

30 domande in 6 categorie. Livello 1 = bambini di 4–6 anni, livello 2 = 7–9 anni.
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

### Cibo

**☐ `food-cheese`** — livello 1

- Domanda: Quale spuntino è più amico dei denti?
- Risposta corretta: **Un pezzetto di formaggio**
- Risposte sbagliate: Le caramelle · Una bibita gassata
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

## 5. Regole del villaggio da confermare con la famiglia

- ☐ Energia: 2 punti per ogni sessione di spazzolino completata oggi, al massimo 4 al giorno; si azzera a mezzanotte.
- ☐ Un giro di quiz, una partita a «Trova il dente» o a Memory costano 1 punto; esplorare, il museo, la visita e la cura dell’apparecchio sono gratuiti.
- ☐ Il genitore può togliere il limite di energia in Impostazioni.
- ☐ Le sessioni importate dallo spazzolino con orario approssimativo non danno energia (non si sa se sono di oggi).
