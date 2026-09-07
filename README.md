# Sparkly Brush

**Sparkly Brush** è un prototipo mobile iOS/Android per il **Philips Sonicare for Kids HX6322/04**. L’app funziona subito anche senza account: offre un timer guidato di due minuti, quattro zone da trenta secondi, storico locale e una modalità diagnostica per verificare il protocollo Bluetooth Low Energy sullo spazzolino reale.

## Funzioni implementate

L’app cerca dispositivi annunciati come `Sonicare4Kids` o con i servizi proprietari Sonicare. Dopo la connessione legge modello, firmware, batteria, stato del manico, tempo di spazzolamento, durata prevista e intensità. Le notifiche GATT aggiornano in tempo reale il timer e, quando una sessione termina, l’app tenta di sincronizzare l’ultimo record memorizzato sul manico.

Il timer manuale rimane disponibile quando lo spazzolino non è collegato. Le sessioni sono conservate esclusivamente sul telefono tramite AsyncStorage; non è richiesto un account e non viene utilizzato un server per lo storico.

## Brushlings: prototipo di gamification

Il branch `feature/brushlings-game` aggiunge un primo layer di gioco con creature originali chiamate **Brushlings**. Il bambino può scegliere un compagno iniziale, ottenere XP e “monete sorriso” dalle sessioni di spazzolamento, aumentare di livello e sbloccare nuove creature dopo un certo numero di sessioni complete.

La progressione deriva direttamente dallo storico locale già usato dall’app: non modifica il protocollo BLE e non richiede un backend. La schermata **Creature** permette di cambiare il compagno attivo, mentre la home mostra livello, XP, serie di giorni e progressi durante la sessione guidata. I tre starter hanno ora famiglie evolutive originali: **Bloopi → Bubblio → Ondalux**, **Spriggo → Germillo → Floraviva** e **Flarello → Braciolo → Solfiamma**. La seconda forma si sblocca al livello 3 e la forma finale al livello 6.\n\nIl loop di gioco include anche una **scelta iniziale dello starter**, una schermata ricompensa dopo le nuove sessioni (XP, monete, level-up ed eventuale evoluzione) e la prima mappa **Isola Sorridente**. Le zone Baia delle Bolle, Foresta Fresca, Monte Splendente, Lago Cristallino e Valle del Sorriso si sbloccano con il numero di sessioni complete. Una GitHub Action esegue TypeScript, test e lint sulle modifiche del branch.

L'esplorazione ora include anche **oggetti collezionabili e uova**. Ogni sessione completa assegna un oggetto coerente con la zona corrente. L'**Uovo Scintilla** viene trovato alla 3ª sessione e si schiude alla 5ª, sbloccando Voltuff; l'**Uovo Lunare** viene trovato all'8ª sessione e si schiude alla 10ª, sbloccando Moonbit. La schermata **Premi e uova** mostra inventario, quantità, incubazione e Brushlings nati, mentre il popup di fine sessione segnala subito oggetti, uova trovate e schiuse.

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

Il test del codec usa il record reale `6cda92017a0113003c00020000000000`, che rappresenta una sessione Kids di 19 secondi con obiettivo 60 secondi e ID 378. Il branch Brushlings aggiunge anche test unitari per XP, livelli e sblocchi.

## Privacy e pubblicazione

La versione attuale non raccoglie dati personali, non crea profili e non invia dati a servizi esterni. Prima della pubblicazione su App Store o Google Play saranno necessari un test hardware completo, icone definitive nelle varianti richieste dagli store, una privacy policy pubblica e una revisione della denominazione per evitare di suggerire un’affiliazione ufficiale con Philips.
