# Sparkly Brush

**Sparkly Brush** è un’app mobile iOS/Android indipendente per il **Philips Sonicare for Kids HX6322/04**. Offre collegamento Bluetooth Low Energy, timer guidato di due minuti, quattro zone da trenta secondi, storico locale, diagnostica BLE, collaudo hardware guidato e un sistema di gioco chiamato **Brushlings**. L’interfaccia è disponibile in **italiano, inglese, tedesco, francese e spagnolo**. Non richiede account e non usa un backend.

Lo stack attivo usa **Expo SDK 57.0.24**, **React Native 0.86.3**, **React 19.2.3**, **Expo Router 57** e **TypeScript 6.0.3**. La New Architecture è obbligatoria da Expo 55; Sparkly Brush usa development build native perché il BLE non è disponibile in Expo Go.

> Philips e Sonicare sono marchi dei rispettivi proprietari. Sparkly Brush è un progetto indipendente, non affiliato né approvato da Philips.

## Funzioni principali

L’app cerca dispositivi annunciati come `Sonicare4Kids` o che espongono i servizi proprietari Sonicare Classic/open GATT. Dopo la connessione legge modello, firmware, batteria, stato del manico, tempo di spazzolamento, durata prevista e intensità. Le notifiche GATT aggiornano il timer in tempo reale e, quando lo spazzolamento termina o il manico viene riconnesso, l’app importa in ordine tutti i record mancanti ancora disponibili, con gestione del rollover `uint16`. Il clock relativo del manico ricostruisce gli orari; quando non è affidabile, la sessione resta archiviata ma viene marcata come approssimata ed esclusa da calendario, streak e missioni giornaliere. Il timer manuale rimane disponibile senza spazzolino e deriva la durata dal clock assoluto anche dopo una sospensione dei timer JavaScript; se il salvataggio fallisce, conserva la sessione in AsyncStorage, la recupera al riavvio e offre un retry esplicito senza consentire sovrascritture.

La gamification include scelta dello starter, XP, livelli, monete sorriso, evoluzioni, missioni, achievement, collezionabili, uova, aree esplorabili, habitat personalizzabili e premi definiti dalla famiglia. La **serie attuale** e il **record storico** sono metriche distinte; giorni locali e fasce mattina/sera usano un’unica utility condivisa per evitare risultati incoerenti.

## Lingue e localizzazione

Al primo avvio l’app segue la lingua del dispositivo quando è tra quelle supportate; per qualunque altra lingua usa l’italiano come fallback. In **Impostazioni** si può scegliere esplicitamente italiano, English, Deutsch, Français o Español, oppure tornare a **Sistema**. La scelta viene applicata immediatamente, persiste dopo il riavvio ed è inclusa nei backup; i backup precedenti all’introduzione della localizzazione vengono migrati automaticamente alla modalità Sistema.

La localizzazione comprende schermate, onboarding, accessibilità, errori, diagnostica BLE, report di collaudo, date e numeri. I metadati nativi iOS e Android dichiarano tutte e cinque le lingue; su iOS anche la descrizione del permesso Bluetooth è localizzata. Il catalogo è diviso in domini core, dispositivo, famiglia e gioco, così potrà ospitare in seguito contenuti didattici o minigiochi linguistici senza includerli prematuramente nella versione attuale.

## Persistenza lifetime e reward ledger

La progressione reale usa un unico database **SQLite** locale. Ogni sessione resta archiviata come riga compatta senza limite applicativo; l’interfaccia carica soltanto le 120 sessioni più recenti per mantenere la UI veloce. XP, monete, missioni, serie, premi e collezionabili sono aggregati lifetime aggiornati transazionalmente.

Ogni accredito produce inoltre righe idempotenti nel **reward ledger** SQLite: premio base della sessione, bonus missioni giornaliere e bonus achievement sono separati, auditabili e protetti da chiavi stabili contro doppi accrediti. Le installazioni esistenti ricevono automaticamente un backfill del ledger dalle sessioni disponibili. Le nuove sessioni incomplete non generano XP o monete; gli oggetti acquistati registrano il prezzo effettivamente pagato, quindi future modifiche del catalogo non alterano retroattivamente il saldo.

SQLite usa WAL e `synchronous=FULL`. Le sessioni duplicate o i pacchetti BLE obsoleti non vengono riaccreditati; i cursori sono separati per dispositivo. Dopo un reset di fabbrica, **Dimentica manico resettato** apre una nuova generazione del contatore per quel solo dispositivo senza cancellare storico, XP, monete, Brushling o backup. L’azione richiede una baseline BLE precedente e la sincronizzazione successiva viene rifiutata se il contatore non dimostra un reset reale. Se la connessione cade prima della lettura del record GATT, l’app conserva una coda bounded di fallback live, li correla ai successori GATT e li sostituisce contabilmente nella stessa transazione senza perdere progressi intervenienti. Lo storico legacy viene migrato automaticamente. I dati demo restano isolati dalla progressione reale.

## Backup e trasferimento

Il backup v3 è una copia completa e verificabile del database SQLite con profilo Brushling, personalizzazioni, preferenze e premi familiari. Viene condiviso come file `.brushlings`, non tronca la cronologia e include reward ledger e ledger acquisti. Date e durate restano nel file per poter ricostruire integralmente la progressione; MAC, UUID e `device.id` BLE vengono sostituiti nella sola copia portatile da alias SHA-256 troncati e l’export applica una guardia finale contro identificatori grezzi. Prima di invocare SQLite, l’import legge soltanto l’header di 100 byte e verifica firma, page size, versioni e formato schema. Dopo l’apertura della copia privata, accetta soltanto tabelle e indici previsti e rifiuta trigger, view o altri oggetti persistenti. Per gli archivi completi, la verifica scorre SQLite senza materializzare l’intera cronologia in memoria e ricalcola aggregati e reward; il manifest esportato viene reso coerente con il ledger rigiocato nel fuso corrente. Il restore usa snapshot di rollback, journal persistente e un token di commit coordinato; le sessioni che arrivano durante il ripristino vengono accodate. I vecchi codici v1/v2 restano importabili, con indicazione esplicita quando il vecchio formato non contiene tutte le righe storiche.

## Compatibilità BLE

Il profilo implementato è quello Sonicare Classic/open GATT della famiglia HX63xx. UUID e record sono stati confrontati con una cattura pubblica di un HX6340 nel progetto comunitario `mtheli/philips_sonicare_ble`; il codec include un test su un record Kids reale. Revisioni firmware differenti possono omettere caratteristiche opzionali, quindi la convalida definitiva richiede il manico HX6322/04 reale.

Il client mantiene separati listener adapter e subscription di connessione. Disconnect, reconnect e destroy annullano scan/connect/discovery e le transazioni di sync, rimuovono monitor e callback e chiudono la GATT candidata; una generazione monotona scarta eventi tardivi della connessione precedente. Le sync sono FIFO, vincolate al device/generazione catturati e consegnano allo storage un batch contiguo che viene committato in un’unica transazione. Una lacuna non leggibile interrompe il batch senza avanzare il cursore. Alla prima sincronizzazione, `sessionCount` deve essere Base64 canonico e contenere esattamente un `uint16`; payload vuoti, troncati, sovradimensionati o malformati falliscono prima di selezionare un record. Una caduta durante lo spazzolamento emette uno stop coerente prima di perdere l’identità del manico; due stop ravvicinati non si sovrascrivono. Gli aggiornamenti batteria conservano modello e firmware già letti.

## Collaudo hardware guidato

Dalla scheda **Spazzolino** si apre una matrice persistente di tredici prove per HX6322/04, incluso il reset di fabbrica del manico. Ogni caso include istruzione, criterio di successo, esito e note. La schermata mostra anche lo snapshot corrente di BLE, connessione e firmware. Al termine genera un report Markdown condivisibile su iOS/Android e scaricabile sul web con versione app/OS, riepilogo lifetime e diagnostica BLE. Il report non include `device.id` e oscura automaticamente UUID, indirizzi MAC e identificativi presenti nei log.

## Avvio

```bash
corepack prepare pnpm@12.5.1 --activate
pnpm install --frozen-lockfile
pnpm dev
```

La preview web consente di provare navigazione, timer manuale, demo, storico, Brushlings e l’intero assistente di collaudo, incluso il download del report. Il BLE nativo e il backup file completo sono disabilitati sul web.

## Build e prova su iPhone/Android

`react-native-ble-plx` richiede una **development build**; Expo Go non è sufficiente.

```bash
pnpm exec expo prebuild
pnpm exec expo run:android
# oppure, su macOS con Xcode
pnpm exec expo run:ios
```

La build iOS con Expo 57 richiede Xcode 26.4 o successivo e supporta iOS 16.4 o successivo. La procedura completa è in [docs/hardware-test-plan.md](docs/hardware-test-plan.md). In sintesi: accendere il manico, aprire **Spazzolino**, premere **Prova guidata e report**, collegare il dispositivo e compilare i tredici esiti sulla piattaforma in uso.

## Verifica automatica

```bash
pnpm check
pnpm test
pnpm test:stress
pnpm test:a11y:semantic
pnpm test:a11y:web
pnpm test:e2e:web
pnpm test:i18n
pnpm lint
pnpm exec expo-doctor
pnpm exec expo export --platform web --output-dir /tmp/sparkly-web
pnpm exec expo export --platform ios --output-dir /tmp/sparkly-ios
pnpm exec expo export --platform android --output-dir /tmp/sparkly-android
# Android nativo (richiede Android SDK/JDK 17)
CI=1 pnpm exec expo prebuild --platform android --clean --no-install
(cd android && ./gradlew assembleDebug --no-daemon)
```

La suite copre codec BLE, backfill multi-sessione e rollover, cancellazione e lifecycle del client con periferica finta, integrazione provider→BLE→storage, sync stale tra due manici, disconnessioni durante il brushing, code fallback e riconciliazione GATT, timer manuale persistente, race di idratazione del profilo, progressione oltre 120 sessioni, ledger premi e acquisti, alias BLE, migrazioni, backup manipolati e cross-timezone, allowlist dello schema SQLite, concorrenza, missioni, serie, calendario locale, dashboard e personalizzazioni. Il gate i18n verifica parità delle **856 chiavi** tra i cinque cataloghi, placeholder, titoli evolutivi, migrazione e persistenza della lingua, hydration senza flash, formati locali, ritraduzione dei log e stabilità del client BLE durante il cambio lingua. Gli stress test simulano 14.610 sessioni in vent’anni, 20.000 righe di backup streaming, quaranta dispositivi e i fusi `America/New_York`, `Europe/Rome` e `Pacific/Kiritimati`; lo stato serializzato del validatore resta sotto 4 KiB e non cresce con l’archivio. I test component-level usano Test Renderer 1.2, compatibile con React 19.2, al posto di `react-test-renderer` deprecato.

L’accessibilità è verificata su tre livelli: contratti semantici React Native, test matematici sui rapporti di contrasto delle palette e scansione Playwright + axe WCAG 2 A/AA e 2.1 A/AA. La matrice copre **28 stati UI** in tema chiaro e scuro: onboarding, scelta starter, home, dispositivo, backup, squadra, esplorazione, storico, missioni, premi, tana, area genitori, impostazioni e collaudo hardware. Playwright verifica inoltre nel DOM dialog, nomi dei controlli e valori numerici delle progressbar. Un secondo gate Playwright esegue tre percorsi funzionali web: sessione con ricompensa e storico dopo reload; checklist hardware persistente e fallback backup web; cambio immediato tra le cinque lingue, modalità Sistema e persistenza dopo reload. I flussi Maestro in `.maestro/flows` coprono gli stessi percorsi critici su Android, con timer accelerato **solo nella build E2E dedicata**. Per eseguirli serve l’APK release E2E installato su emulatore Android e Maestro 2.10.0 nel `PATH`; il comando è `pnpm test:e2e:android`.

GitHub Actions usa il lockfile frozen, annulla run obsolete ed evita modifiche solo documentali. I pull request eseguono controlli, gate cataloghi i18n, audit bloccante da severità `high`, axe chiaro/scuro, percorso funzionale web, bundle e build Gradle Android; la build Xcode 26.4 e i flow Maestro su emulatore sono riservati a tag di release o avvio manuale.

Gli override transitivi fissano le vulnerabilità compatibili con la toolchain. L’upgrade a Expo 57 ha rimosso `image-size` dal grafo delle dipendenze: `pnpm audit --prod --audit-level high` non segnala vulnerabilità note. Il lockfile mantiene inoltre una versione di `@react-native/metro-config` coerente con React Native 0.86.3, così `pnpm peers check` non segnala incompatibilità.

## Privacy, licenza e pubblicazione

La versione attuale non crea account e non invia storico o progressi a servizi esterni. Il vecchio scaffold backend/OAuth è stato rimosso dal ramo attivo ed è conservato separatamente nel ramo Git di archivio creato durante l’audit. Il codice è proprietario; vedere [LICENSE](LICENSE).

Prima della pubblicazione negli store restano necessari: prova hardware completa sul manico reale, privacy policy pubblica, verifica delle dichiarazioni store e revisione del naming commerciale. Android dichiara `neverForLocation`; il plugin limita i permessi location legacy a SDK 30. Se l’app verrà destinata esclusivamente ai bambini, l’adozione di Companion Device Manager, il minimo Android e le dichiarazioni Families dovranno essere decisi e validati separatamente. Il **parental gate è deliberatamente escluso da questo intervento**, come richiesto, e deve essere affrontato prima di candidare l’app alla categoria Kids.
