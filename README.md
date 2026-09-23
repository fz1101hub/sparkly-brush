# Sparkly Brush

**Sparkly Brush** è un prototipo mobile iOS/Android per il **Philips Sonicare for Kids HX6322/04**. L’app funziona subito anche senza account: offre un timer guidato di due minuti, quattro zone da trenta secondi, storico locale e una modalità diagnostica per verificare il protocollo Bluetooth Low Energy sullo spazzolino reale.

## Funzioni implementate

L’app cerca dispositivi annunciati come `Sonicare4Kids` o con i servizi proprietari Sonicare. Dopo la connessione legge modello, firmware, batteria, stato del manico, tempo di spazzolamento, durata prevista e intensità. Le notifiche GATT aggiornano in tempo reale il timer e, quando una sessione termina, l’app tenta di sincronizzare l’ultimo record memorizzato sul manico.

Il timer manuale rimane disponibile quando lo spazzolino non è collegato. Le sessioni sono conservate esclusivamente sul telefono tramite AsyncStorage; non è richiesto un account e non viene utilizzato un server per lo storico.

## Brushlings: prototipo di gamification

Il branch `feature/brushlings-game` aggiunge un primo layer di gioco con creature originali chiamate **Brushlings**. Il bambino può scegliere un compagno iniziale, ottenere XP e “monete sorriso” dalle sessioni di spazzolamento, aumentare di livello e sbloccare nuove creature dopo un certo numero di sessioni complete.

La progressione usa un **database SQLite locale unico**. Ogni sessione reale resta archiviata come riga compatta senza limiti applicativi; l’interfaccia carica soltanto le 120 più recenti per restare veloce, mentre aggregati aggiornati nella stessa transazione mantengono XP, livelli, monete, missioni, streak, premi e collezionabili. Le scritture usano WAL con durabilità `FULL`. Una sessione retrodatata forza la ricostruzione degli aggregati dall’archivio completo, quindi l’ordine di arrivo non altera i risultati. Al primo avvio dopo l’aggiornamento, gli storici precedenti vengono migrati automaticamente, dando priorità all’eventuale blob lifetime completo; gli aggregati dei backup v2 restano preservati anche quando quel vecchio formato possiede solo 120 righe consultabili. Il sistema non modifica il protocollo BLE e non richiede un backend. La schermata **Creature** permette di cambiare il compagno attivo, mentre la home mostra livello, XP, serie di giorni e progressi durante la sessione guidata. I tre starter hanno ora famiglie evolutive originali: **Bloopi → Bubblio → Ondalux**, **Spriggo → Germillo → Floraviva** e **Flarello → Braciolo → Solfiamma**. La seconda forma si sblocca al livello 3 e la forma finale al livello 6.

Il loop di gioco include anche una **scelta iniziale dello starter**, una schermata ricompensa dopo le nuove sessioni (XP, monete, level-up ed eventuale evoluzione) e la prima mappa **Isola Sorridente**. Le zone Baia delle Bolle, Foresta Fresca, Monte Splendente, Lago Cristallino e Valle del Sorriso si sbloccano con il numero di sessioni complete. Una GitHub Action esegue TypeScript, test e lint sulle modifiche del branch.

L'esplorazione ora include anche **oggetti collezionabili e uova**. Ogni sessione completa assegna un oggetto coerente con la zona corrente. L'**Uovo Scintilla** viene trovato alla 3ª sessione e si schiude alla 5ª, sbloccando Voltuff; l'**Uovo Lunare** viene trovato all'8ª sessione e si schiude alla 10ª, sbloccando Moonbit. La schermata **Premi e uova** mostra inventario, quantità, incubazione e Brushlings nati, mentre il popup di fine sessione segnala subito oggetti, uova trovate e schiuse.

Le **monete sorriso** sono ora una vera valuta locale. La schermata **La tana** permette di acquistare ed equipaggiare habitat, accessori e decorazioni; il saldo mostra le monete guadagnate meno quelle già spese. Gli acquisti restano salvati in AsyncStorage e ogni Brushling può essere mostrato nel proprio habitat personalizzato.

La scheda **Spazzolino** include una **Modalità demo** separata dallo storico reale. Permette di aggiungere rapidamente una sessione mattutina o serale, generare una settimana completa di dati simulati e provare evoluzioni, missioni, uova, negozio e dashboard senza avere lo spazzolino a portata di mano. Uscendo dalla demo vengono ricaricati profilo e personalizzazioni reali; le modifiche fatte nel laboratorio non vengono persistite nel mondo reale.

È disponibile anche **Backup & trasferimento**: il formato v3 è una copia completa e verificabile del database SQLite, accompagnata da starter, Brushling attivo, personalizzazioni, preferenze e premi familiari. Non tronca la cronologia e viene condiviso come file `.brushlings`, adatto anche dopo anni di utilizzo; i file temporanei vengono eliminati dopo la condivisione. Il restore conserva prima uno snapshot locale e usa un journal persistente con token di commit per coordinare database, profilo, preferenze e premi anche dopo un crash. Le sessioni BLE o manuali che arrivano durante il restore vengono accodate e salvate subito dopo. I vecchi codici v1 e v2 restano importabili per retrocompatibilità. I dati demo sono esclusi dal backup e il ripristino è bloccato mentre la demo è attiva.

Come primo polish visivo, il Brushling attivo ora ha una leggera animazione di rimbalzo durante la sessione guidata.

I Brushlings sono personaggi originali e temporanei: il concept può richiamare i giochi di creature collezionabili, ma non usa personaggi, nomi, loghi o asset di Pokémon o di altre proprietà intellettuali.

## Compatibilità studiata

Il profilo implementato è quello **Classic/open GATT** usato dalla famiglia Sonicare for Kids HX63xx. Gli UUID e il formato del record sono stati confrontati con una cattura pubblica reale di un HX6340, inclusa nel progetto open source `mtheli/philips_sonicare_ble`. Il modello HX6322 è indicato come compatibile dalla stessa integrazione comunitaria. La conferma definitiva richiede comunque una prova sul tuo esemplare HX6322/04, perché revisioni firmware diverse possono omettere caratteristiche opzionali.

## Avvio dell’anteprima

```bash
pnpm install
pnpm dev
```

L’anteprima web consente di provare navigazione, timer manuale, storico e progressione Brushlings. Il Bluetooth è deliberatamente disabilitato sul web.

## Prova Bluetooth su iPhone o Android

`react-native-ble-plx` contiene codice nativo e non funziona dentro Expo Go. Occorre generare una **development build** oppure una build distribuita:

```bash
npx expo prebuild
npx expo run:android
# oppure, su macOS con Xcode
npx expo run:ios
```

Accendi lo spazzolino, apri la scheda **Spazzolino** e premi **Cerca e collega**. La sezione **Diagnostica BLE** mostra l’esito delle letture e aiuta a identificare eventuali differenze del firmware.

## Verifica del codice

```bash
pnpm check
pnpm test
pnpm lint
```

Il test del codec usa il record reale `6cda92017a0113003c00020000000000`, che rappresenta una sessione Kids di 19 secondi con obiettivo 60 secondi e ID 378. Il branch Brushlings aggiunge anche test unitari per XP, livelli, sblocchi e persistenza lifetime oltre 120 sessioni.

## Privacy e pubblicazione

La versione attuale non raccoglie dati personali, non crea profili e non invia dati a servizi esterni. Prima della pubblicazione su App Store o Google Play saranno necessari un test hardware completo, icone definitive nelle varianti richieste dagli store, una privacy policy pubblica e una revisione della denominazione per evitare di suggerire un’affiliazione ufficiale con Philips.
