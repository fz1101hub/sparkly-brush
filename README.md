# Sparkly Brush

**Sparkly Brush** è un’app mobile iOS/Android indipendente per il **Philips Sonicare for Kids HX6322/04**. Offre collegamento Bluetooth Low Energy, timer guidato di due minuti, quattro zone da trenta secondi, storico locale, diagnostica BLE e un sistema di gioco chiamato **Brushlings**. Non richiede account e non usa un backend.

> Philips e Sonicare sono marchi dei rispettivi proprietari. Sparkly Brush è un progetto indipendente, non affiliato né approvato da Philips.

## Funzioni principali

L’app cerca dispositivi annunciati come `Sonicare4Kids` o che espongono i servizi proprietari Sonicare Classic/open GATT. Dopo la connessione legge modello, firmware, batteria, stato del manico, tempo di spazzolamento, durata prevista e intensità. Le notifiche GATT aggiornano il timer in tempo reale e, quando lo spazzolamento termina, l’app sincronizza l’ultimo record memorizzato dal manico. Il timer manuale rimane disponibile senza spazzolino.

La gamification include scelta dello starter, XP, livelli, monete sorriso, evoluzioni, missioni, achievement, collezionabili, uova, aree esplorabili, habitat personalizzabili e premi definiti dalla famiglia. La **serie attuale** e il **record storico** sono metriche distinte; giorni locali e fasce mattina/sera usano un’unica utility condivisa per evitare risultati incoerenti.

## Persistenza lifetime e reward ledger

La progressione reale usa un unico database **SQLite** locale. Ogni sessione resta archiviata come riga compatta senza limite applicativo; l’interfaccia carica soltanto le 120 sessioni più recenti per mantenere la UI veloce. XP, monete, missioni, serie, premi e collezionabili sono aggregati lifetime aggiornati transazionalmente.

Ogni accredito produce inoltre righe idempotenti nel **reward ledger** SQLite: premio base della sessione, bonus missioni giornaliere e bonus achievement sono separati, auditabili e protetti da chiavi stabili contro doppi accrediti. Le installazioni esistenti ricevono automaticamente un backfill del ledger dalle sessioni disponibili.

SQLite usa WAL e `synchronous=FULL`. Le sessioni duplicate o i pacchetti BLE obsoleti non vengono riaccreditati; i cursori sono separati per dispositivo. Lo storico legacy viene migrato automaticamente. I dati demo restano isolati dalla progressione reale.

## Backup e trasferimento

Il backup v3 è una copia completa e verificabile del database SQLite con profilo Brushling, personalizzazioni, preferenze e premi familiari. Viene condiviso come file `.brushlings`, non tronca la cronologia e include il reward ledger. Il restore usa snapshot di rollback, journal persistente e un token di commit coordinato; le sessioni che arrivano durante il ripristino vengono accodate. I vecchi codici v1/v2 restano importabili, con indicazione esplicita quando il vecchio formato non contiene tutte le righe storiche.

## Compatibilità BLE

Il profilo implementato è quello Sonicare Classic/open GATT della famiglia HX63xx. UUID e record sono stati confrontati con una cattura pubblica di un HX6340 nel progetto comunitario `mtheli/philips_sonicare_ble`; il codec include un test su un record Kids reale. Revisioni firmware differenti possono omettere caratteristiche opzionali, quindi la convalida definitiva richiede il manico HX6322/04 reale.

Il client mantiene separati listener adapter e subscription di connessione. Disconnect, reconnect e destroy rimuovono monitor e callback; una generazione monotona scarta eventi tardivi della connessione precedente. Gli aggiornamenti batteria conservano modello e firmware già letti.

## Avvio

```bash
pnpm install --frozen-lockfile
pnpm dev
```

La preview web consente di provare navigazione, timer manuale, demo, storico e Brushlings. Il BLE nativo e il backup file completo sono disabilitati sul web.

## Build e prova su iPhone/Android

`react-native-ble-plx` richiede una **development build**; Expo Go non è sufficiente.

```bash
npx expo prebuild
npx expo run:android
# oppure, su macOS con Xcode
npx expo run:ios
```

La procedura manuale completa è in [docs/hardware-test-plan.md](docs/hardware-test-plan.md). In sintesi: accendere il manico, aprire **Spazzolino**, premere **Cerca e collega**, completare una sessione e verificare timer, batteria, sincronizzazione, deduplica e riconnessione.

## Verifica automatica

```bash
pnpm check
pnpm test
pnpm lint
pnpm exec expo-doctor
pnpm exec expo export --platform web --output-dir /tmp/sparkly-web
pnpm exec expo export --platform ios --output-dir /tmp/sparkly-ios
pnpm exec expo export --platform android --output-dir /tmp/sparkly-android
```

La suite copre codec BLE, lifecycle del client con periferica finta, integrazione provider→BLE→storage, race di idratazione del profilo, progressione oltre 120 sessioni, ledger, migrazioni, backup/restore, concorrenza, missioni, serie, calendario locale, dashboard e personalizzazioni. GitHub Actions usa il lockfile frozen ed esegue gli stessi controlli essenziali e i tre bundle.

## Privacy, licenza e pubblicazione

La versione attuale non crea account e non invia storico o progressi a servizi esterni. Il vecchio scaffold backend/OAuth è stato rimosso dal ramo attivo ed è conservato separatamente nel ramo Git di archivio creato durante l’audit. Il codice è proprietario; vedere [LICENSE](LICENSE).

Prima della pubblicazione negli store restano necessari: prova hardware completa sul manico reale, privacy policy pubblica, verifica delle dichiarazioni store e revisione del naming commerciale. Il **parental gate è deliberatamente escluso da questo intervento**, come richiesto, e deve essere affrontato separatamente prima di candidare l’app alla categoria Kids.
