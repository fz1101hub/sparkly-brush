# Funzioni proposte e non ancora sviluppate — 26 ottobre 2026

Raccolta di tutte le funzioni proposte nelle conversazioni dal 30 settembre al 26 ottobre 2026 e non ancora presenti nell'app. La numerazione è quella usata nelle discussioni, così ogni voce si può citare con il suo numero.

Stato di partenza: ramo `ccr-2641c3c7-7vb0o0` con Expo 57, le correzioni degli audit e le funzioni della PR #10 (sei temi, profili dei bambini, promemoria locali, sessioni recuperabili) in cinque lingue. Vedi [unificazione-pr10-2026-10-25.md](unificazione-pr10-2026-10-25.md).

## Legenda

| Simbolo | Significato |
|---|---|
| **S** | lavoro piccolo, indicativamente un commit con test |
| **M** | lavoro medio, alcuni giorni tra codice, testi e test |
| **L** | lavoro grande, con dipendenze esterne (grafica, hardware, codice nativo) |
| 🎨 | serve grafica nuova |
| ⚠️ | tocca permessi delicati o il principio «nessun dato raccolto» |
| 🦷 | contenuto medico da far validare a un dentista pediatrico |
| 🔌 | dipende dal comportamento del manico HX6322 reale |

Le stime sono indicative e vanno riviste quando una voce diventa specifica.

## Principi da rispettare

- **Durante i due minuti il bambino ha le mani occupate**: quello che succede durante la sessione si guarda o si ascolta, non si tocca.
- **Nessun server, nessun dato raccolto**: è il punto di forza per le famiglie e per la categoria bambini degli store. Le voci ⚠️ lo metterebbero in discussione.
- **Contenuti corretti**: ogni affermazione medica, storica o linguistica ha una fonte e viene rivista da un esperto (dentista pediatrico, traduttore madrelingua).
- **Tempo davanti allo schermo sotto controllo**: le attività fuori dalla spazzolata si guadagnano spazzolando e hanno un limite giornaliero.
- **L'app non dà indicazioni mediche**: per apparecchio, fluoro e simili mostra solo valori inseriti dal genitore e consigli validati.

## Richieste dalla famiglia (21 ottobre)

| # | Funzione | Descrizione | Impegno | Note |
|---:|---|---|---|---|
| 1 | Quiz del sorriso | Domande su denti, igiene, cibo, denti degli animali, storia e usanze nel mondo; vero/falso, scelta multipla con immagini, «metti in ordine nel tempo», «di chi è questo dente?». Si gioca dopo la spazzolata (3 domande per sessione completa), due livelli per età, nessuna penalità per le risposte sbagliate, carte da collezione con tetto giornaliero di monete. | M | 🦷 Fonte per ogni domanda; spunti storici da verificare (Fauchard, William Addis, dentiera di Washington, topolino dei denti nei vari paesi). |
| 2 | Nomi dei denti in altre lingue | Mappa interattiva della bocca da latte (20 denti) e permanente (32), con il nome nella lingua dell'app e in una «lingua da imparare»; pronuncia con la voce del telefono; giochi «trova il dente», memory tra lingue, «ascolta e ripeti». Numerazione FDI per il genitore; i primi molari permanenti segnalati come «denti nuovi da proteggere». | M | Vocabolario da scegliere bene tra nome tecnico e nome usato dai bambini. |
| 3 | Modalità apparecchio | Configurata dal genitore dietro il blocco genitori: fisso con attacchi, mobile, allineatori, espansore. Fasi e timer dedicati (scovolino, pulizia dell'apparecchio), consigli brevi, missioni («settimana con l'apparecchio pulito»), festa con evoluzione speciale il giorno in cui si toglie. | M–L | 🦷 Durate, ore e calendario li inserisce il genitore come prescritto dall'ortodontista. |
| 4 | Apparecchio sulla creatura | Attacchi e filo o mascherina trasparente sul Brushling, con elastici colorati scelti dal bambino; la creatura dice «anche io ho l'apparecchio». | M | 🎨 Dopo l'unificazione le creature sono illustrazioni approvate, non più disegni vettoriali: servono livelli calibrati su ogni illustrazione o varianti disegnate. |
| 5 | Villaggio del Brushling | Evoluzione della scheda Mondo: scuola (quiz e nomi dei denti), studio della dentista (consigli e visita simulata per togliere la paura), laboratorio delle bolle (collezionabili come materiali), orto dei cibi sani, biblioteca delle storie, casa del topolino, museo delle carte, piazza (boss ed eventi), mercato (negozio della tana). Energia guadagnata spazzolando (per esempio 2 attività per sessione, 4 al giorno); la sera il villaggio dorme. | L | 🎨 Da decidere se si disegna una volta sola o per ognuno dei sei temi. Si costruisce in tre fasi (vedi «Ordine consigliato»). |

### Stato al 27 ottobre: realizzate

Le voci 1–5 sono state sviluppate e completate il 27 ottobre (commit da `f90543c` a `3d63c0d`), e 24 (cibi amici dei denti) è diventata l'orto del villaggio. I testi educativi sono raccolti in [contenuti-da-validare-2026-10-27.md](contenuti-da-validare-2026-10-27.md) e **vanno rivisti da un dentista pediatrico e da madrelingua prima della pubblicazione**. Tutti i dati delle nuove funzioni, insieme a tema e promemoria, sono nel backup su file del bambino.

| # | Fatto | Limiti rimasti |
|---:|---|---|
| 1 | 39 domande in 6 categorie e 5 lingue, ognuna con fonte e curiosità: vero/falso, scelta multipla, risposte con figure, «di chi è questo dente?» (5) e «metti in ordine nel tempo» (4); giri da 3 domande; livello 4–6 e 7–9 anni; nessuna penalità; carte nel museo; lettura ad alta voce. | Le figure sono emoji: per «di chi è questo dente?» il dente è descritto a parole, non disegnato. Il quiz non dà monete, solo carte. |
| 2 | Mappa della bocca da latte (20) e permanente (32); nome nella lingua dell'app e in quella da imparare con pronuncia; «Ascolta e ripeti» (senza microfono), «Trova il dente», Memory; numerazione FDI per il genitore; molari dei 6 anni con la stella e la spiegazione. | «Ascolta e ripeti» non verifica la pronuncia: il telefono non registra, per scelta di privacy. |
| 3 | Fisso, mobile, allineatori ed espansore scelti dal genitore; routine con timer da 30 a 120 secondi; consigli per tipo; ore delle mascherine; serie e «settimana con l'apparecchio pulito»; festa e «sorriso nuovo» con le scintille per due settimane quando si toglie; missioni dell'apparecchio in Missioni (senza monete). | Le missioni dell'apparecchio non danno monete, per non toccare l'economia del gioco. |
| 4 | Attacchi, filo ed elastici del colore scelto dal bambino, filo dell'apparecchio mobile o mascherina trasparente, calibrati sulla bocca di ognuna delle 11 illustrazioni; la creatura dice «anche io ho l'apparecchio». | L'espansore non si vede (sta sul palato). |
| 5 | Scheda Mondo: scuola, studio della dottoressa Dentina, orto dei cibi, laboratorio delle bolle (con i tesori trovati spazzolando, senza consumarli), piazza (mostro della placca della settimana e feste), biblioteca (4 storie lette ad alta voce), casa del topolino (denti da latte caduti), museo, mercato. Energia: 2 per sessione completata, massimo 4 al giorno; la sera il villaggio dorme (orario scelto dal genitore). | Il villaggio è un elenco di edifici: una mappa illustrata richiede un illustratore (e la scelta se disegnarla una volta o per ognuno dei sei temi). |

## Avanzamento: sviluppo di tutte le voci (dal 27 ottobre)

Richiesta del 27 ottobre: sviluppare tutte le voci dell'elenco, con riprese automatiche ogni 5 ore e 5 minuti. Questa tabella dice da dove ripartire: ☐ da fare · ◐ in corso · ☑ fatto · ⛔ non realizzabile qui (motivo accanto). L'ordine segue l'«Ordine consigliato»: prima le voci senza grafica né hardware, poi quelle più grandi, infine quelle native o sconsigliate.

| Lotto | Voci | Stato |
|---|---|---|
| 1. Promemoria, serie e premi | 59, 60, 62, 16, 17, 49, 57, 66 | ☑ `82ed4cd` |
| 2. Dopo la spazzolata e famiglia | 22, 23, 58, 56, 55, 27, 32, 34, 70 | ☑ |
| 3. Manico e sicurezza | 35 (batteria e testina per data), 36, 37, 50, 65 | ☑ Schermata Manico: batteria sotto il 20%, testina ogni 90 giorni dal cambio segnato dal genitore, intensità consigliata per età (da far validare), manico di un fratello riconosciuto con «Passa al suo profilo» (su conferma, non da solo: cambiare bambino senza toccare nulla confonderebbe chi sta usando l'app), passaggio del manico dietro il blocco genitori con il contatore che segue il manico. PIN di 4–6 cifre (solo l'hash, solo su questo telefono, non nel backup) con impronta o Face ID (`expo-local-authentication`; non accetta il codice del telefono, che i bambini spesso conoscono); PIN dimenticato: moltiplicazione più difficile. |
| 4. Motivazione nel tempo | 12, 13, 51, 14, 15, 18, 19, 41 | ☑ Album di figurine (Mondo → Album): una per spazzolata completa su 6 pagine da 6, una d’oro la domenica, 3 per stagione (Halloween 20/10–2/11, Natale 1/12–6/1, estate 1/7–31/8), 3 amici dalle uova d’oro (trovate a 20, 40, 60 sessioni, schiuse 5 dopo), una per il boss di famiglia; il nome si ascolta toccandola. Missioni: sfida della settimana a rotazione (7 tipi), boss dei batteri di famiglia (1.680 punti, ogni secondo di ogni fratello; se resiste torna più debole fino a metà), «Il mio obiettivo» proposto dal bambino e approvato dal genitore (diventa un premio del genitore), traguardi a 30/100/365 sessioni, mese perfetto, stelle oltre il livello 6; dai 7 anni «Le mie statistiche», per i più piccoli figurine più grandi e il pulsante «Ascolta». Home: scoperta del giorno nella prima settimana (solo per i bambini nuovi) e la stagione in corso. Nessuno di questi dà monete: l’economia resta com’è. Senza illustratore: niente nuove creature né habitat stagionali disegnati (le stagioni usano emoji); l’uovo raro del boss è la sua figurina. |
| 5. Stampe e rapporti | 20, 67, 29, 30, 31, 33, 63, 64 | ☑ Famiglia → «Stampe e rapporti» (dietro il blocco genitori): riepilogo della settimana («N spazzolate su 14», anche sulla Home la domenica dalle 18:30, notifica locale facoltativa), regolarità mese per mese (mattine e sere, conservata negli extra perché la cronologia recente copre solo 120 sessioni), rapporto per il dentista di 30 o 90 giorni da stampare, inviare in PDF (`expo-print`) o come CSV (celle con formule neutralizzate), intestazione dello studio con «codice dello studio» (testo con controllo, senza server), tabellone della settimana e attestati (30/100/365 giorni, apparecchio tolto), cartolina per i nonni come immagine (`react-native-view-shot`; sul web solo l’anteprima). Famiglia → «Libretto dentale»: visite, sigillature, fluoro, note dell’ortodontista, con i denti dati al topolino e la prossima visita; entra nel rapporto. I file condivisi restano nella cache solo fino al prossimo avvio. |
| 6. Rito della giornata e sessione | 6, 7, 8, 9, 21, 28, 25 | ☑ Durante la sessione la bocca della creatura ha quattro zone con tre macchie ciascuna che si sciolgono mentre si spazzola (se si interrompe, nella ricompensa: «restano un paio di macchie, le sciogliamo la prossima volta»). In Impostazioni → «Compagnia durante la spazzolata»: voce della creatura con il suo nome (inizio, seconda zona, metà, ultimi secondi), storia a puntate «La mappa del Sorriso d’Oro» (14 episodi in 5 lingue, una parte per zona, l’episodio conta solo a sessione completa, quindi quelli saltati tornano), canzone della spazzolata (una melodia per tema generata dall’app, senza musica con licenza, che si ferma con la sessione). Tana: al mattino la creatura ha sonno finché non si spazzola, la sera dopo la spazzolata dorme con toni scuri e caldi; decorazione della stagione. Routine della buonanotte (filo, collutorio solo dai 7 anni, pigiama) attivata dal genitore e spuntata in Missioni. Modalità vacanza fino a una data: la Home lo ricorda, il manico non si collega. Senza illustratore le macchie sono emoji sopra le quattro zone, non disegnate sulla bocca dell’illustrazione. |
| 7. Inclusione | 39, 40, 74, 68 | ☑ Impostazioni → «Modalità su misura», per ogni bambino: modalità tranquilla (niente musica, canzone né suoni della ricompensa, animazioni ridotte come con «riduci movimento» del telefono, niente coriandoli, agenda per immagini fissa sulla Home), per chi non sa ancora leggere (durante la sessione icone al posto delle parole e la zona detta ad alta voce), carattere ad alta leggibilità Atkinson Hyperlegible (SIL OFL, incluso nell’app) e alto contrasto (nero su bianco o bianco su nero, bordi marcati) nelle schermate che usano i colori del tema. Tana: «Io e la mia creatura», il personaggio del bambino fatto di emoji (faccia, carnagione, cappello). Limiti: la Home e la sessione approvate hanno colori propri e non cambiano con l’alto contrasto; l’avatar disegnato richiede un illustratore. |
| 8. Dati della famiglia | 69, 44 | ☑ Backup → «Tutta la famiglia in un file»: un file `.brushlings-family` con il backup completo di ogni bambino (lo stesso file SQLite del backup singolo) e l’elenco dei profili; il ripristino riporta ogni bambino con il diario di ripristino già usato per il singolo (se il telefono si spegne a metà, ogni bambino torna com’era o com’è nel file), aggiunge i profili mancanti e riavvia l’app. Backup automatico settimanale senza server: il file di famiglia nei documenti dell’app (gli ultimi 4; su iPhone visibili nell’app File) e, su Android, anche in una cartella scelta una volta (per esempio una sincronizzata con Google Drive). Verificato su SQLite reale. Limite: niente scrittura diretta su iCloud Drive o Google Drive senza un account dell’app; sul web il backup di famiglia non c’è, come il backup completo. |
| 9. Piattaforma | 72, 71, 43, 42, 45, 75 | ☑ per quanto realizzabile qui. ☑ 72: sui tablet i contenuti sono una colonna centrata larga al massimo 720 punti, illustrazioni comprese (resta il verticale, per le scene disegnate). ☑ 71: portoghese (brasiliano), olandese e polacco per tutta l’interfaccia (1.826 testi ciascuna, con i plurali a tre forme del polacco); quiz, storie, nomi dei denti e orto restano in inglese in queste lingue finché non vengono tradotti e validati (lo dice una nota in Impostazioni). ☑ 43: collegamento `sparklybrush://start` che avvia il timer guidato; su Android scorciatoia «Inizia a lavarti i denti» tenendo premuta l’icona (e da «Hey Google, apri…»); su iPhone si crea una scorciatoia Siri «Apri URL». ◐ 42: widget per Android con serie e prossima spazzolata (`react-native-android-widget`), un tocco avvia il timer (il permesso `FOREGROUND_SERVICE` che WorkManager porta con la libreria è bloccato: il widget non usa servizi in primo piano, e il controllo dell’APK lo verifica); su iPhone serve un’estensione WidgetKit costruita con Xcode su un Mac, non disponibile qui. ⛔ 45 Apple Salute: richiede HealthKit con permessi e una build iOS firmata con l’account sviluppatore Apple, che qui non si può costruire né provare; resta da fare con un Mac. ⛔ 75 orologio: servono due app native separate (watchOS e Wear OS); intanto le notifiche dei promemoria arrivano già sull’orologio collegato. |
| 10. Microfono e fotocamera | 61, 76 | ☑ Impostazioni → «Un messaggio per …» (per ogni bambino): il genitore registra un incoraggiamento di massimo 20 secondi (`expo-audio`, AAC mono a 32 kbit/s, circa 80 kB); a fine spazzolata completa la ricompensa mostra «C’è un messaggio per te!» e il bambino lo ascolta toccandolo; il genitore vede se è stato ascoltato, può riascoltarlo, cancellarlo o farlo sentire a ogni spazzolata. L’audio sta negli extra del bambino, quindi nel backup completo e in quello di famiglia; sul web si può solo ascoltare. «Specchio durante la spazzolata», attivato dal genitore: il bambino tocca «🪞 Specchio» e vede la fotocamera frontale a specchio (`expo-camera`, senza scanner di codici); nulla viene scattato, registrato o salvato e la fotocamera si spegne a fine sessione. I permessi di microfono e fotocamera si chiedono solo al primo uso, con i testi tradotti in 8 lingue; Android chiede `RECORD_AUDIO` e `CAMERA`, nessun servizio in background (verificato nel manifest dell’APK di prova del 27 ottobre, run 40466394806). |
| 11. Hardware da collaudare | 10, 11, 38, 52, 46, 73, 35 (tempo motore) | ☑ per quanto realizzabile senza il manico in mano. Spazzolino → «Funzioni sperimentali del manico», spente finché il collaudo non le conferma: ☑ 10 zone dal manico (il cambio di zona segue `quadPacer`, 40a0, con i valori 0–3; altri valori vengono ignorati e il collaudo annota quelli grezzi); ☑ 11 «zona dimenticata» (con i secondi per zona della spazzolata col manico, il giorno dopo la Home ricorda la zona sotto il 60% della media delle altre); ☑ 38 collegamento automatico all’apertura (un solo tentativo a ogni apertura dell’app, mai in background); ☑ 35 tempo del motore (`motorRuntime`, 4040) letto alla connessione e mostrato in ore. ☑ 46: Famiglia → «Fratelli insieme», un solo timer per due o più bambini che salva la spazzolata nel profilo di ognuno; ⛔ due manici collegati insieme no, perché il client Bluetooth gestisce un manico alla volta e servirebbe il collaudo con due HX6322. ⛔ 52 Companion Device Manager: è un’API Android senza modulo Expo né supporto in `react-native-ble-plx`; serve un modulo nativo Kotlin dedicato, da scrivere e provare su telefono. ⛔ 73 altri spazzolini: ogni modello (altri Sonicare, Oral-B) ha un protocollo diverso da ricavare e provare con l’hardware vero. |
| 12. Lavori di supporto | A, B, 53, C, 54 | ☑ A: `docs/hardware-test-plan.md` con 17 casi nuovi (abbinamento e cambio manico, «Riprendi dalle ultime sessioni», timer e record del manico, permesso iOS, blocco genitori e PIN, profili e passaggio del manico, promemoria, pausa, batteria e testina, funzioni sperimentali, collegamento automatico, widget, scorciatoie, backup di famiglia). ☑ B: `docs/store-e-privacy-2026-10-27.md`, testi per gli store in cinque lingue e privacy policy coerente con «nessun dato raccolto», da validare. ☑ 53: `e2e/a11y/store-screenshots.spec.ts` produce in CI quattro schermate per lingua (Oggi, Album, Missioni, Mondo) in `artifacts/playwright/store/`. ☑ C: flussi Maestro per blocco genitori con PIN e per pagina non trovata e `sparklybrush://start`; il contratto dei selettori li controlla. ☑ 54: una sola PR da questo ramo verso `main`, aperta il 27 ottobre a lavoro finito: contiene già tutta la PR #7 (audit ed Expo 57) e tutta la PR #10 (sei temi e profili), che restano aperte finché chi gestisce il repository non le chiude; la PR #11 (`feature/proposed-functions`, verso questo ramo) è un lavoro parallelo sulle stesse voci e non è inclusa. |
| Sconsigliate | 47 (serve un server), 48 (riconoscimento dei movimenti con la fotocamera) | ☑ decise. ◐ 47: senza server la via sicura è il file di famiglia del lotto 8 (si esporta su un telefono e si ripristina sull’altro, o si usa la cartella condivisa del backup automatico); una sincronizzazione continua tra due telefoni richiederebbe un server o uno scambio cifrato con risoluzione dei conflitti, e romperebbe la promessa «nessun dato raccolto». ⛔ 48: non realizzata, come consigliato: analizzare il video della bocca di un bambino richiede un modello di visione sul telefono, permessi delicati e una validazione che qui non si può fare; lo specchio del lotto 10 copre la parte utile senza registrare nulla. |

## Durante i due minuti

| # | Funzione | Descrizione | Impegno | Note |
|---:|---|---|---|---|
| 6 | La creatura si lava i denti con te | La bocca della creatura ha le stesse quattro zone; le macchie si sciolgono in bolle mentre il bambino spazzola. Interruzione a metà: restano due macchie, nessun rimprovero. | M | 🎨 Le macchie possono essere disegnate sopra l'illustrazione della bocca già presente nei temi. |
| 7 | Storie a puntate | Un episodio per spazzolata, in quattro parti da 30 secondi (una per zona), con una piccola sospensione finale; stagioni da 14 episodi; gli episodi saltati si recuperano. Lettura con la voce del telefono, offline in cinque lingue. | M | Soprattutto lavoro di scrittura. |
| 8 | Voce della creatura | Incoraggiamenti con il nome del bambino («ancora 30 secondi, Sofia!»). | S–M | |
| 9 | Canzone che finisce a 2:00 | Una canzone per tema: quando finisce la musica, la spazzolata è finita. | S | Serve musica con licenza. |
| 10 | Zone guidate dal manico | Il cambio di zona segue la caratteristica `quadPacer` (40a0) del manico invece del timer dell'app. | M | 🔌 Da verificare sull'HX6322. |
| 11 | «Zona dimenticata» | Con il tempo reale per zona, il giorno dopo la creatura ricorda la zona trascurata. | M | 🔌 Dipende dalla 10. |
| 55 | Tre superfici per zona | I 30 secondi di ogni zona diventano 10 sull'esterno, 10 sull'interno e 10 sulla superficie che mastica, con un'icona che cambia. | S–M | 🦷 Insegna la tecnica senza parole. |
| 56 | Passo extra del giorno | Piccola missione a sorpresa: «oggi anche la lingua», «oggi i denti in fondo». | S | 🦷 |
| 57 | Durata impostata dal genitore | Per esempio 1 minuto per i più piccoli che iniziano, poi gradualmente fino a 2. | S | Il valore lo decide il genitore. |

## Motivazione nel tempo

Oggi i premi si esauriscono in circa una settimana: l'ultima evoluzione arriva a 10 sessioni, le uova si schiudono entro 10, i traguardi finiscono a 10 sessioni o 7 giorni di serie, l'isola a 12.

| # | Funzione | Descrizione | Impegno | Note |
|---:|---|---|---|---|
| 12 | Contenuti a lungo termine | Evoluzioni oltre il livello 6, uova e creature a 20, 40 e 60 sessioni, traguardi a 30, 100 e 365 sessioni, «mese perfetto». | S–M | 🎨 Il motore c'è già. |
| 13 | Boss dei batteri settimanale | Un boss con 1.680 punti vita (14 sessioni × 120 secondi) che si indebolisce con ogni secondo di spazzolata di qualsiasi profilo; sconfitto: uovo raro e oggetto per ogni fratello; non sconfitto: la settimana dopo arriva un boss più facile. | M | 🎨 Collaborazione tra fratelli, non gara. |
| 14 | Album di figurine | Una figurina per spazzolata completa, pagine da completare, figurine rare la domenica. | M | 🎨 |
| 15 | Stagioni ed eventi | Halloween, Natale, estate, con habitat e accessori a tempo limitato. | M | 🎨 |
| 16 | Giorno jolly | Uno a settimana, oppure «ero malato» o «ero in vacanza» segnato dal genitore: la serie non si rompe. | S | |
| 17 | Serie di ritorno | Dopo un'interruzione, i primi tre giorni valgono doppio. | S | |
| 18 | Prima settimana guidata | Una piccola scoperta al giorno (creatura, isola, tana, primo uovo) invece di mostrare tutto subito. | S–M | |
| 19 | Obiettivo scelto dal bambino | «5 giorni perfetti e scelgo io la storia della buonanotte»: il bambino decide, il genitore approva. | S | |
| 20 | Tabellone da stampare | PDF settimanale con caselle da colorare, da attaccare in bagno. | S | |
| 51 | Sfide settimanali a rotazione | Obiettivi diversi ogni settimana, utili anche per un figlio unico. | M | |
| 66 | Nome al proprio Brushling | Il bambino sceglie il nome della sua creatura. | S | |
| 67 | Attestati da stampare | Diploma per 30, 100 o 365 giorni o per l'apparecchio tolto, con il nome del bambino. | S | |
| 68 | Avatar del bambino | Un personaggio che rappresenta il bambino, accanto alla creatura. | M | 🎨 |

## Il rito della giornata

| # | Funzione | Descrizione | Impegno | Note |
|---:|---|---|---|---|
| 21 | Creatura che si sveglia e va a dormire | Al mattino è assonnata finché il bambino non spazzola; la sera si addormenta nella tana e lo schermo passa a toni scuri e caldi. | M | 🎨 |
| 22 | Buonanotte di 30 secondi | Dopo la spazzolata della sera, una frase della creatura, poi lo schermo si spegne. | S | |

## Imparare

| # | Funzione | Descrizione | Impegno | Note |
|---:|---|---|---|---|
| 23 | «Lo sapevi?» in 10 secondi | Una curiosità dopo la sessione: perché lo zucchero fa male, cosa sono i denti da latte. | S | 🦷 |
| 24 | Cibi amici dei denti | Mini gioco di smistamento, fuori dalla spazzolata; nel villaggio diventa l'orto. | S–M | 🦷 |
| 58 | Dopo la spazzolata | «Sputa, non sciacquare» e la dose di dentifricio per l'età: un chicco di riso sotto i 3 anni, un pisello dai 3 ai 6. | S | 🦷 Vedi la nota sul fluoro più sotto. |

## Situazioni particolari

| # | Funzione | Descrizione | Impegno | Note |
|---:|---|---|---|---|
| 25 | Modalità vacanza | Per lo spazzolino manuale in viaggio, senza perdere progressi e senza mescolare i dati del manico. | S–M | |
| 62 | Spazzolata fatta senza telefono | Il genitore la registra a mano, dietro il blocco genitori, così la serie non si rompe per un telefono scarico. | S | |

## Per la famiglia

| # | Funzione | Descrizione | Impegno | Note |
|---:|---|---|---|---|
| 26 | Topolino dei denti | Il genitore registra il dente da latte caduto, il bambino riceve un uovo speciale; diario dei denti persi, senza foto. | S–M | 🎨 |
| 27 | Spazzoliamo insieme | Un timer per il genitore accanto a quello del bambino. | S | |
| 28 | Routine della buonanotte | Missioni opzionali: filo interdentale, collutorio, pigiama; attivabili dal genitore con età consigliata. | M | 🦷 |
| 29 | Rapporto per il dentista | PDF o CSV degli ultimi 30 o 90 giorni: frequenza, durata media, regolarità mattina e sera, serie. Condiviso come i backup, senza server. | M | |
| 30 | Codice dello studio dentistico | L'intestazione dello studio sul rapporto stampabile: canale di diffusione senza pubblicità. | M | |
| 31 | Riepilogo settimanale | Una scheda la domenica sera («12 sessioni su 14») con notifica locale opzionale. | M | |
| 32 | Promemoria della visita dal dentista | Data della prossima visita e notifica qualche giorno prima. | S | |
| 33 | Cartolina per i nonni | Un'immagine creata sul telefono («Sofia: 30 giorni di sorrisi!») da inviare con il foglio di condivisione, dietro il blocco genitori. | S | |
| 34 | Modalità babysitter | Una schermata con le istruzioni per chi mette a letto il bambino. | S | |
| 49 | Premi di famiglia dalla creazione | Un premio conta solo le spazzolate fatte dopo la sua creazione; oggi un premio «10 sessioni» creato dopo 20 sessioni risulta già sbloccato. Era la decisione G2 del 6 ottobre. | S | Il dato `createdAt` è già salvato. |
| 59 | Il promemoria salta se hai già spazzolato | Oggi le notifiche partono comunque; se la sessione è già fatta, quella notifica non arriva. | S–M | |
| 60 | Ultimo richiamo gentile | Se alle 21 manca ancora la spazzolata della sera, un secondo avviso, solo se il genitore lo attiva. | S | |
| 61 | Messaggio vocale del genitore | Un incoraggiamento registrato dal genitore, che il bambino sente a fine sessione; resta sul telefono. | M | ⚠️ Permesso del microfono. |
| 63 | Grafici sul lungo periodo | Andamento per mesi della regolarità mattina e sera. | M | |
| 64 | Libretto dentale | Visite, sigillature, fluoro, note dell'ortodontista; estende il topolino dei denti (26) e il promemoria del dentista (32). | S–M | |
| 65 | PIN o impronta per l'area genitori | Alternativa alla moltiplicazione, che i bambini più grandi imparano presto. | S–M | |

## Dal manico Sonicare

| # | Funzione | Descrizione | Impegno | Note |
|---:|---|---|---|---|
| 35 | Testina e batteria | «Testina da cambiare tra 2 settimane» (Philips consiglia ogni 3 mesi) e «manico da ricaricare»: la batteria viene già letta ma non segnalata; il tempo motore (`motorRuntime`, 4040) non viene ancora letto. | S | 🔌 Per il tempo motore. |
| 36 | Intensità consigliata per età | Il client legge già l'intensità; l'app suggerisce quella adatta. | S | 🦷 |
| 37 | Il manico sceglie il profilo | Il manico riconosciuto apre da solo il profilo del bambino a cui appartiene; l'associazione manico-bambino esiste già. | S | |
| 38 | Apertura automatica | Quando il manico si accende, l'app propone la sessione. | M | 🔌 Su iOS la scansione in background è molto limitata. |
| 50 | Trasferire un manico a un altro bambino | Azione dietro il blocco genitori che sposta il manico e importa solo le spazzolate fatte da quel momento; oggi un manico resta per sempre del primo bambino. | S–M | |
| 52 | Companion Device Manager su Android | Android abbina il manico con una finestra di sistema, senza chiedere il permesso di scansione in generale. | M | 🔌 |
| 73 | Altri spazzolini Bluetooth | Altri Sonicare e poi Oral-B, con protocolli diversi. | L | 🔌 Ogni modello va provato con l'hardware vero. |

## Inclusione e accessibilità

| # | Funzione | Descrizione | Impegno | Note |
|---:|---|---|---|---|
| 39 | Modalità tranquilla | Niente suoni improvvisi, animazioni ridotte, colori calmi, agenda visiva fissa; utile per bambini con autismo o ipersensibilità sensoriale. | M | |
| 40 | Modalità per chi non sa ancora leggere | Solo icone e audio, nessun testo da leggere durante la sessione. | S–M | |
| 41 | Creatura che cresce con il bambino | Più immagini e voce a 4 anni, più statistiche e sfide a 8. | L | |
| 74 | Supporto per la dislessia | Carattere ad alta leggibilità e tema ad alto contrasto, attivabili dalle impostazioni. | S | |

## Dati della famiglia

| # | Funzione | Descrizione | Impegno | Note |
|---:|---|---|---|---|
| 44 | Backup automatico periodico | Su un file nell'iCloud o nel Google Drive della famiglia, senza un server dell'app. | M | |
| 69 | Backup dell'intera famiglia | Un solo file per tutti i bambini; oggi serve un file per bambino. | M | |
| 70 | Cancellare tutti i dati della famiglia | Un solo comando protetto; utile anche per le regole sulla privacy degli store. | S | |

## Piattaforma

| # | Funzione | Descrizione | Impegno | Note |
|---:|---|---|---|---|
| 42 | Widget sulla schermata Home | Serie e prossima spazzolata. | L | Codice nativo. |
| 43 | Scorciatoie Siri e Google | «Inizia a lavarti i denti». | M | |
| 45 | Apple Salute | HealthKit ha un tipo dedicato alla spazzolatura, adatto al timer del genitore (27). | M | Per i dati del bambino serve più cautela. |
| 46 | Due fratelli in contemporanea | Due manici e due creature sullo stesso schermo. | L | 🔌 |
| 71 | Altre lingue | Portoghese, olandese, polacco: l'app è già predisposta. | S per lingua | Arabo ed ebraico, che si scrivono da destra, costano di più (M). |
| 72 | Layout per tablet | Oggi l'app è bloccata in verticale da telefono. | M | |
| 75 | App per orologio del genitore | Apple Watch o Wear OS: avvia e segue la sessione dal polso. | L | |
| 47 | Sincronizzazione tra i telefoni dei genitori | Gli stessi dati su due telefoni. | L | ⚠️ Richiede un server o uno scambio di file cifrati. |
| 48 | Controllo con la fotocamera | Riconoscere i movimenti in bocca. | L | ⚠️ Sconsigliata: permessi delicati in un'app per bambini. |
| 76 | Specchio con la fotocamera frontale | Solo specchio, senza registrare. | M | ⚠️ Da tenere in fondo per lo stesso motivo. |

## Lavori di supporto

Non sono funzioni dell'app, ma erano stati proposti e non sono ancora fatti.

| # | Lavoro | Descrizione | Impegno |
|---:|---|---|---|
| A | Piano di collaudo hardware | Aggiornare `docs/hardware-test-plan.md` con abbinamento e cambio manico, «Riprendi dalle ultime sessioni», timer guidato e record del manico, permesso iOS, blocco genitori, profili, promemoria, pausa del timer. | S |
| B | Testi per gli store e privacy policy | Bozze in cinque lingue (titolo, sottotitolo, descrizione, note di rilascio) e privacy policy coerente con «nessun dato raccolto», da far validare. | S–M |
| 53 | Screenshot per gli store | Nelle cinque lingue, generati dalle stesse schermate che la CI produce per i sei temi. | S |
| C | Flussi Maestro | Blocco genitori e pagina non trovata su Android; i flussi esistenti vanno rieseguiti con la nuova navigazione. | S |
| 54 | Una sola PR verso `main` | Sostituisce la PR #7 e la PR #10 con il lavoro unificato di questo ramo. | S |

## Nota sul fluoro (voce 58)

«Sputa, non sciacquare» significa sputare il dentifricio in eccesso senza sciacquarsi con l'acqua né usare subito il collutorio, così il fluoro resta più a lungo sui denti. Il rischio del fluoro è l'eccesso ingerito, non il fluoro in sé: con la dose giusta per l'età (un chicco di riso sotto i 3 anni, un pisello dai 3 ai 6) e un adulto che controlla, il dentifricio al fluoro è considerato sicuro ed efficace. Il dibattito pubblico riguarda soprattutto il fluoro aggiunto all'acqua potabile ad alte concentrazioni, un'esposizione molto diversa. Le indicazioni precise (concentrazione del dentifricio, eventuali integratori) variano: nell'app questi consigli compaiono solo dopo la revisione di un dentista pediatrico, con frasi brevi e prudenti.

## Ordine consigliato

1. **Subito, senza grafica nuova**: 59 e 60 (promemoria utili), 62 (spazzolata senza telefono), 16 e 17 (serie che perdona), 49 (premi dalla creazione), 35 (testina e batteria), 37 (manico che sceglie il profilo), 66 (nome alla creatura), 57 (durata per i più piccoli).
2. **Imparare**: 1 (quiz) e 2 (nomi dei denti), dopo la revisione dei contenuti; poi 23 e 55.
3. **Apparecchio**: 3 (modalità) e 4 (sulla creatura), partendo da apparecchio fisso e allineatori.
4. **Contenuti a lungo termine**: 12, 13 e 51, che risolvono la progressione che si esaurisce in una settimana.
5. **Villaggio** (5) in tre fasi:
   - quiz, nomi dei denti e apparecchio, quasi senza grafica nuova;
   - villaggio base con scuola, studio, laboratorio e mercato;
   - orto, biblioteca, piazza con il boss, visita simulata, museo.
6. **Per il manico reale**, dopo il collaudo sull'HX6322: 10, 11, 38, 52.

## Decisioni e domande aperte

- **Età**: 3–5 anni, 6–9 o tutti? Cambia quanto testo e quanta autonomia mettere.
- **Grafica**: chi produce le illustrazioni nuove (voci 🎨)?
- **Modello di business**: gratis, a pagamento una volta, o con acquisti in app? Nella categoria bambini gli acquisti richiedono il blocco genitori.
- **Chi non ha il Sonicare**: se l'app deve funzionare bene anche solo con il timer, le voci senza 🔌 salgono di priorità.
- **Apparecchio**: quali tipi per primi?
- **Villaggio**: sostituisce la scheda Mondo o si aggiunge accanto?
- **Revisore dei contenuti**: c'è un dentista pediatrico o un ortodontista disponibile?
- **Store**: pubblicare nella categoria bambini/famiglie? Attivare il blocco genitori per impostazione predefinita? Identificativo definitivo dell'app al posto di `com.app.sparklybrush`?

## Già realizzato (per riferimento)

Tutte le correzioni degli audit (sincronizzazione sul GATT Kids reale, sessioni perse o doppie, ripristino Android, demo), abbinamento del manico, «Riprendi dalle ultime sessioni» (B4), nessun doppio accredito tra timer e manico (M4), blocco genitori opzionale, schermata di errore tradotta, scorciatoie alle impostazioni di sistema, starter salvato in demo, cinque lingue con plurali, sei temi con la grafica approvata, profili dei bambini, promemoria locali, sessioni recuperabili, guida rapida, workflow dell'APK di prova.
