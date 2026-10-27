# Audit indipendente del 14 ottobre 2026 — codice, dati e pubblicazione

**Ramo:** `ccr-2641c3c7-7vb0o0` al commit `478ca36` più le correzioni descritte in §3.
**Oggetto:** seconda revisione indipendente dell'intero progetto dopo la chiusura dei rilievi del [30 settembre](audit-indipendente-2026-09-30.md) ([sviluppo del 13 ottobre](sviluppo-autonomo-2026-10-13.md)), con una checklist di pubblicazione per Google Play e App Store.
**Metodo:** lettura del codice di `lib/`, `contexts/`, `app/`, `components/`, `hooks/`, `plugins/`, dei workflow CI e della configurazione nativa; riesecuzione di tutti i gate automatici; per ogni rilievo una sonda o un test di regressione che fallisce sul codice precedente.
**Limiti:** nessun hardware (manico HX6322/04, iPhone, Android), nessun Android SDK o Xcode, rete senza `exp.host` né registro React Native Directory. La configurazione nativa è verificata su manifest e Info.plist generati da `expo config --type introspect`, non su una build.

## Sintesi

- **Nessun rilievo critico o maggiore.** La revisione ha trovato cinque difetti minori e quattro note; tutti i difetti sono corretti in questo intervento, con test (§3).
- **Il più rilevante per le famiglie:** "Elimina storico" azzerava anche i cursori del manico, quindi alla sincronizzazione successiva il manico riconsegnava i record già letti (fino a 128) e le sessioni appena cancellate riapparivano (N1).
- **Per gli store** manca solo ciò che spetta al proprietario: identificativo del bundle definitivo, account sviluppatore e certificati, privacy policy pubblica, dichiarazioni Data Safety / App Privacy, materiale del listing, decisione su Kids/Families e parental gate, collaudo sull'hardware reale (§5).
- I rilievi del 30 settembre non ancora chiusi sono solo quelli che richiedono il manico reale o decisioni di prodotto (§6).

## 1. Gate automatici del 14 ottobre

| Gate | Esito |
|---|---|
| `pnpm check` (TypeScript 6) | verde |
| `pnpm lint` su `app`, `components`, `contexts`, `lib`, `hooks`, `constants` | verde, zero warning |
| `pnpm test` | **70 file, 409 test** verdi (24 su SQLite reale `node:sqlite`) |
| `pnpm test:i18n` | 93 test verdi; 912 chiavi per catalogo in cinque lingue |
| `pnpm test:stress` | verde (14.610 sessioni/20 anni, 20.000 righe streaming, tre fusi orari) |
| Playwright funzionale web | 8/8 percorsi verdi |
| Playwright + axe WCAG 2.x A/AA | 44 stati chiari/scuri senza violazioni (il primo passaggio ha trovato il contrasto N3, corretto e riverificato) |
| `expo export` web, iOS, Android | verdi; l'export web non contiene `_sitemap.html` |
| `expo config --type introspect` | Info.plist e AndroidManifest coerenti con §5 |
| `expo-doctor` | 19/21: i due controlli falliti (schema su `exp.host`, React Native Directory) richiedono la rete |
| `pnpm audit --prod --audit-level high` | **rosso**: `node-forge` ≤ 1.4.0 (GHSA-86w9-cpqp-85rv) e `braces` ≤ 3.0.3 (GHSA-vfj7-8cjw-p6xm) senza versione corretta pubblicata al 14 ottobre (ultime: 1.4.0 e 3.0.3); entrambi solo nella toolchain Expo CLI, non nel bundle dell'app |

## 2. Aree riviste

| Area | File principali | Esito |
|---|---|---|
| Client BLE | `lib/sonicare-client.native.ts`, `sonicare-codec.ts`, `device-reset-guard.ts`, `sonicare-uuids.ts` | Scansione, abbinamento, attesa adattatore, monitor GATT, selezione dei record con retry, cursore e guardia anti-replay coerenti con il dump HX6340 di riferimento. Nessun rilievo nuovo; B4 resta latente (§6). |
| Provider e code di sync | `contexts/brush-context.tsx` | Coda FIFO dei fallback live, correlazione con i record, timer manuale con journal e retry, demo isolata. Nessun rilievo. |
| Storage nativo | `lib/brush-storage.native.ts`, `complete-backup.native.ts`, `restore-journal.ts`, `history-operation.ts` | Schema con CHECK, migrazioni idempotenti, restore con copia di rollback e journal, pulizia della cache all'avvio, file temporanei eliminati sui percorsi di errore. **N1** (cursori persi su "Elimina storico"). |
| Storage web | `lib/brush-storage.ts` | Stesso difetto N1; corretto. |
| Lifetime, economia, missioni | `lib/lifetime-progress.ts`, `brushlings.ts`, `missions.ts`, `game-inventory.ts`, `customization.ts` | Regole XP/monete/collezionabili coerenti tra lifetime, replay e validazione dei codici di backup. Nessun rilievo. |
| Backup | `lib/backup.ts`, `backup-integrity.ts`, `sqlite-backup-*.ts`, `app/(tabs)/backup.tsx` | Codici v1/v2 validati semanticamente, manifest v3, confronto prima del ripristino, conferma annullabile. **N6** (iCloud) sul picker. |
| Contesti di gioco e famiglia | `contexts/brushling-context.tsx`, `parent-rewards-context.tsx`, `preferences-context.tsx` | **N4** (starter), **N5** (premi caricati senza normalizzazione), N10 (nota). |
| Schermate e accessibilità | `app/(tabs)/*.tsx`, `components/*.tsx` | **N2** (indicatore di connessione forzato), **N3** (pagina non trovata). Ruoli, etichette, annunci, riduci movimento e aree di tocco verificati dopo il 13 ottobre. |
| i18n | `lib/i18n.ts`, `locale*.ts`, cataloghi | Parità di 912 chiavi, plurali, placeholder, redazione multilingua. N11 (nota). |
| Test | `tests/**` | 70 file; i test di riproduzione dell'audit del 30/9 restano nella suite. |
| Dipendenze | `package.json`, `pnpm-workspace.yaml`, `patches/` | 33 override di sicurezza, patch `query-string`; nessuna dipendenza inutilizzata residua. Advisory aperti solo in toolchain. |
| CI | `.github/workflows/verify.yml` | Pipeline completa (tsc, test, i18n, stress, lint, doctor, axe, E2E, export, audit, build Android con verifica del manifest; iOS e Maestro su tag/dispatch). Runner bloccati lato account (#9). |
| Configurazione nativa | `app.config.ts`, `plugins/`, `locales/native/*.json`, `eas.json` | Vedi §5. **N6**, **N7**. |

## 3. Rilievi nuovi e correzioni

| ID | Severità | Rilievo | Correzione | Verifica |
|---|---|---|---|---|
| N1 | Minore (dati) | `clearHistory` scriveva un progresso vuoto, cancellando anche `deviceCursors`: alla sync successiva il manico riconsegnava i record già letti (fino a 128, o solo l'ultimo senza `40d2`), e le sessioni appena eliminate riapparivano con date ricostruite. | I cursori sopravvivono a "Elimina storico" (nativo e web); i fallback pendenti vengono azzerati; il dialogo spiega che le sessioni già lette non torneranno. | `tests/native-sqlite/clear-history.test.ts` (anche dopo riavvio: la rilettura del record 41 importa 0 sessioni), `tests/lifetime-history.test.ts` |
| N2 | Minore (UI) | Otto schermate passavano `connected={false}` all'intestazione: l'indicatore restava "non collegato" anche con il manico connesso. | Prop rimossa; l'intestazione legge lo stato dal contesto. | lint, lettura |
| N3 | Minore (a11y) | Pagina non trovata: in tema scuro il testo bianco sul primario `#87A8FF` dava 2,3:1; il pulsante "Torna a Oggi" con `replace` impilava una seconda copia della tab (due `today-screen` nel DOM). | Blu fisso `#2457D6` come gli altri primari; `dismissAll` riemerge la tab sottostante, `replace` solo senza cronologia. | axe `not-found` chiaro/scuro, E2E funzionale |
| N4 | Minore (UI) | `StarterChooser.confirm` lasciava `saving=true` se `chooseStarter` falliva: pulsante disabilitato per sempre. | `try/finally`. | lettura; `useAsyncAction` mostra l'errore |
| N5 | Minore (dati) | `loadParentRewards` accettava titoli oltre 60 caratteri, `target` non interi, `createdAt`/`deliveredAt` di tipo arbitrario e più di 40 premi. | `normalizeParentRewards` condivisa con il caricamento. | `tests/parent-rewards-storage.test.ts` |
| N6 | Minore (store) | `expo-document-picker` senza `ios.usesIcloudStorage`: su iPhone il picker non poteva aprire i file di iCloud Drive, dove le famiglie salvano tipicamente il backup. | `usesIcloudStorage: true` e `iCloudContainerEnvironment: "Production"`; richiede la capability iCloud sull'App ID (EAS la sincronizza). | `tests/audit-native-config.test.ts`; da provare su iPhone |
| N7 | Nota (store) | Nessun `eas.json`, nessun numero di build; bundle id `com.app.sparklybrush` segnaposto. | Profili `development`/`preview`/`production` con versioning remoto e autoincrement. L'identificativo va deciso dal proprietario prima della prima build: non è modificabile dopo la pubblicazione. | `tests/audit-native-config.test.ts` |
| N8 | Nota | `expo-doctor` 19/21 nel sandbox. | Nessuna: i due controlli richiedono la rete; in CI con rete erano 21/21. | — |
| N9 | Nota | Il server di sviluppo serve ancora `/_sitemap` nonostante `sitemap: false`. | Nessuna: solo sviluppo; l'export verificato non contiene la pagina. | export web |
| N10 | Nota | In modalità demo la scelta dello starter non viene salvata: tornando alla modalità reale ricompare il selettore. | Comportamento voluto (la demo non tocca i dati reali); documentato qui. | — |
| N11 | Nota | La lingua di sistema è letta all'avvio: un cambio con app in background si applica al riavvio (iOS riavvia comunque l'app; su Android serve chiuderla). | Nessuna. | — |

## 4. Verifiche di privacy e dati

- L'app non apre connessioni di rete: nessun `fetch`, WebSocket o SDK di terze parti; nessun account, pubblicità o analytics. Data Safety e App Privacy possono dichiarare "nessun dato raccolto".
- Dati sul dispositivo: storico SQLite, preferenze e profilo in AsyncStorage, cache per backup e report. I backup escono solo tramite il foglio di condivisione scelto dalla famiglia.
- Gli identificativi Bluetooth non lasciano mai il dispositivo in chiaro: alias pseudonimi nei backup, redazione nel report di collaudo (`redactDiagnosticMessage` copre UUID, MAC e etichette in cinque lingue).
- Permessi: Bluetooth (iOS `NSBluetoothAlwaysUsageDescription` tradotto; Android `BLUETOOTH_SCAN` con `neverForLocation`, `BLUETOOTH_CONNECT`, localizzazione solo fino ad Android 11 con `maxSdkVersion` 30); nessun microfono, fotocamera, posizione in background, notifiche.

## 5. Checklist di pubblicazione

### Google Play

| Requisito | Stato | Note |
|---|---|---|
| `applicationId` definitivo | **Proprietario** | Oggi `com.app.sparklybrush` (segnaposto). |
| Target API 36 (Android 16) e minSdk 24 | Pronto | Expo 57; `expo-build-properties` fissa `minSdkVersion: 24`. |
| Permessi dichiarati e motivati | Pronto | Solo Bluetooth e localizzazione legacy limitata; verificati dal gate CI sul manifest dell'APK. |
| Orientamento su schermi grandi | Pronto | Plugin `with-android-orientation-compat` (proprietà di compatibilità Android 16). |
| Icona adattiva, splash, tema scuro | Pronto | Foreground 1024, `backgroundColor`, splash chiaro/scuro, `userInterfaceStyle: automatic`. |
| App Bundle firmato | **Proprietario** | `eas build -p android --profile production` con credenziali EAS o keystore proprio. |
| Data Safety | **Proprietario** | Dichiarare "nessun dato raccolto o condiviso"; vedi §4. |
| Target audience e Families | **Proprietario** | Se il pubblico include bambini: policy Families (niente pubblicità, niente dati), eventuale parental gate (oggi escluso). |
| Privacy policy pubblica | **Proprietario** | Obbligatoria nel listing anche senza raccolta dati. |
| Screenshot, descrizione, titolo in cinque lingue | **Proprietario** | Testi dell'app già tradotti; il listing va preparato. |
| Marchi | **Proprietario** | "Philips", "Sonicare" citati come marchi di terzi; verificare le policy del listing. |

### App Store

| Requisito | Stato | Note |
|---|---|---|
| Bundle identifier definitivo e App ID | **Proprietario** | Come sopra; capability iCloud per il picker dei backup (N6). |
| Info.plist: descrizione Bluetooth, `ITSAppUsesNonExemptEncryption`, localizzazioni | Pronto | `InfoPlist.strings` in it/en/de/fr/es; crittografia non esente dichiarata assente. |
| Orientamento verticale su iPhone e iPad | Pronto | `requireFullScreen: true`; con `supportsTablet` servono anche screenshot iPad. |
| Icona 1024 senza alfa, splash | Pronto | Expo rimuove la trasparenza nelle icone iOS generate. |
| Privacy manifest (`PrivacyInfo.xcprivacy`) | Pronto | Generato dai moduli Expo 57 per le API con motivazione richiesta. |
| App Privacy ("Data Not Collected") | **Proprietario** | Vedi §4. |
| Kids Category | **Proprietario** | Se scelta: parental gate per link esterni (oggi nessuno), nessuna pubblicità/analytics (già così). |
| Build e TestFlight | **Proprietario** | `eas build -p ios --profile production`; account sviluppatore Apple. |
| Prova su iPhone reale con HX6322/04 | **Aperto ([#3](https://github.com/fz1101hub/sparkly-brush/issues/3))** | Abbinamento, cambio manico, permesso al primo collegamento, sync dei record, picker iCloud. |

### Decisioni del proprietario ancora necessarie

1. Identificativi definitivi (`bundleIdentifier`/`package`) e account sviluppatore.
2. Privacy policy pubblica e dichiarazioni dei due store.
3. Pubblico di destinazione (bambini/famiglie) e, di conseguenza, parental gate e Companion Device Manager.
4. Materiale del listing nelle cinque lingue.
5. Collaudo sull'hardware reale (#3) e sblocco dei runner CI (#9).

## 6. Rilievi del 30 settembre ancora aperti

| Rilievo | Stato | Perché |
|---|---|---|
| B4 — intervallo > 128 sessioni senza uscita | **Chiuso** (§7) | "Riprendi dalle ultime sessioni" importa l'ultimo batch ancora leggibile e registra le sessioni perse; non serve più il reset di fabbrica. |
| M4 — timer manuale con manico non collegato | **Chiuso** (§7) | Un record del manico che coincide nel tempo con una sessione del timer guidato sposta solo il cursore e non viene contato di nuovo. |
| G2 — premi dei genitori contati dalla creazione | Decisione di prodotto | Semantica lifetime mantenuta e spiegata nella UI. |
| Collaudo hardware (#3), CI (#9), advisory (#8, `braces`) | Esterni | Vedi §1 e §5. |
| Parental gate, Kids/Families | Blocco genitori disponibile come opzione (§7); categoria da decidere | Attivabile dalle Impostazioni; se la candidatura sarà in categoria bambini va considerato di attivarlo per impostazione predefinita. |

## 7. Migliorie successive all'audit (14 ottobre, stesso intervento)

Richieste dal proprietario dopo la consegna dell'audit; tutte con test e gate verdi.

| Tema | Cosa cambia | Verifica |
|---|---|---|
| Schermata di errore | `ErrorBoundary` nel layout radice: un errore di rendering mostra titolo, spiegazione, "Riprova" e dettaglio tecnico nella lingua del dispositivo, non la pagina inglese di expo-router. | `tests/app-error-screen.test.tsx` |
| Permessi e stato del sistema | Nella scheda Spazzolino, con permesso Bluetooth negato, Bluetooth spento o (Android ≤ 11) Localizzazione disattivata, un suggerimento apre le impostazioni giuste (app, Bluetooth, Localizzazione). | `sonicareMessageKey` testato; UI letta |
| B4 — intervallo non recuperabile | `syncStoredSessionsSince(cursor, { allowGap: true })`: importa l'ultimo batch che il manico conserva (solo il record più recente senza `sessionCount`), sposta il cursore e registra nel diario le sessioni perse; la scheda propone "Riprendi dalle ultime sessioni" con conferma. | 4 test del client, 1 del provider, messaggi |
| M4 — timer guidato e manico | Un record del manico (con orario reale) che si sovrappone a una sessione del timer guidato già salvata, con tolleranza di due minuti, non viene inserito: sposta solo il cursore e il diario lo segnala. | `tests/native-sqlite/manual-overlap.test.ts`, storage web, `session-overlap` |
| Blocco genitori (opt-in) | Interruttore in Impostazioni: Area genitori, Backup e Impostazioni (anche via deep link) e le azioni "Elimina storico", "Dimentica manico" e "Cambia manico" chiedono una moltiplicazione a una cifra; uno sblocco vale cinque minuti. Spento per impostazione predefinita. | `tests/parent-gate*.test.ts*`, E2E web, 2 stati axe |
| Starter in demo | La scelta dello starter viene salvata anche con la demo attiva. | `brushling-hydration-race` |
