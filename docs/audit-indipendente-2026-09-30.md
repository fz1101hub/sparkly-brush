# Audit indipendente completo — Sparkly Brush

**Data:** 30 settembre 2026
**Eseguito da:** Claude (sessione Claude Code, branch `ccr-2641c3c7-7vb0o0`)
**Oggetto:**

| Stato | Riferimento | Contenuto |
|---|---|---|
| Unito (`main`) | `a7769e3` | Expo SDK 54 / RN 0.81.5; ultimo merge PR #6 del 23/9 |
| Candidato aperto (PR #7) | `7d0e305` su `fix/claude-ultracode-audit` | Expo SDK 57 / RN 0.86.3 / React 19.2.3 / TS 6; rimedi all'audit Claude del 23/9, i18n in 5 lingue, E2E Playwright/Maestro, a11y; +17.103 / −4.405 righe su 135 file |

"Tutto il progetto" è stato interpretato come **entrambi gli stati**: `main` è ciò che è stato unito, la PR #7 è ciò che si intende unire. Per ogni rilievo è indicato su quale ramo è presente.

## 1. Verdetto

**Né `main` né la PR #7 sono pronti per un rilascio.** I gate software dichiarati sono autentici e li ho riprodotti (con poche eccezioni, sotto), e la qualità ingegneristica di storage, restore e client BLE è in molti punti alta. Ma questo audit ha trovato un problema che nessuno dei cicli precedenti ha intercettato, perché non riguarda il codice in sé: **la sincronizzazione dei record del manico si basa su una caratteristica GATT (`40d2`, Session Count) che il dump GATT reale di un Sonicare for Kids — pubblicato dallo stesso progetto di riferimento citato nel README — non contiene.** Se l'HX6322/04 si comporta come l'HX6340 catturato, la prima sincronizzazione fallisce sempre: nessuna sessione fatta senza app verrà mai importata e tutta la logica di backfill, riconciliazione e reset — la parte più complessa e più rimaneggiata del progetto — non verrà mai eseguita sul prodotto reale. Nessun collaudo hardware è stato ancora fatto (issue #3 senza risultati), per cui la cosa più utile da fare adesso non è altro codice ma un dump GATT e poche prove sul manico reale.

Oltre a questo:

- ho **riprodotto con test end-to-end** (client BLE reale + provider React + storage) altri quattro difetti che fanno perdere o duplicare spazzolate, presenti su entrambi i rami salvo uno;
- la PR #7 corregge davvero buona parte dei rilievi dell'audit del 23/9 (schema SQLite fidato, valori non finiti, backup tra fusi, journal della sessione manuale, costi CI) — l'ho verificato anche eseguendo lo storage nativo su un motore SQLite reale — ma la sua nuova riconciliazione **introduce una regressione di doppio accredito** nello schema d'uso più comune (spazzolata senza app al mattino, con app la sera), che su `main` non si verifica, e **nasconde all'utente i messaggi d'errore BLE specifici**;
- su **Android**, se l'app si chiude durante un ripristino di backup, al riavvio **lo storico resta inaccessibile per sempre** (bug nel percorso di recupero, entrambi i rami);
- la **modalità demo non funziona su iOS/Android** e i **premi dei genitori risultano già sbloccati appena creati** (entrambi i rami); il primo non poteva emergere dai test attuali, che girano sull'implementazione web dello storage;
- per gli store, il **manifest Android finale dichiara la localizzazione anche su Android 12+** (la limitazione a SDK 30 citata nella documentazione non sopravvive al merge del manifest della libreria BLE) e la PR #7 **dichiara audio in background e un foreground service mai usati**;
- `main` oggi ha **5 advisory `high` nelle dipendenze di produzione** (non solo `image-size`, come dichiara il README); la PR #7 ne ha zero;
- la **CI GitHub non esegue uno step dal 23 settembre** (blocco a livello account: `runner_id: 0`, 0 ms fatturati, log 404): l'upgrade a Expo 57 e le build native non sono mai stati verificati da un runner indipendente.

In totale: **1 critico e 12 maggiori**, più oltre 40 minori (riepilogo in §11, priorità in §12).

## 2. Perimetro e metodo

1. **Gate riprodotti da zero** su entrambi i rami con pnpm 12.5.1 e Node 22 (tabella §3).
2. **Lettura integrale del codice critico** (client BLE, codec, provider `brush-context`, `lifetime-progress`, storage SQLite nativo e web, backup/restore, journal) su `main`, poi del diff completo della PR #7 nelle stesse aree.
3. **Verifica del protocollo contro il riferimento** `mtheli/philips_sonicare_ble`: `docs/BLE_PROTOCOL.md`, `const.py`, `coordinator.py`, i test `test_stored_session.py` e `test_gatt_layout.py` e il **dump GATT reale** `tests/fixtures/classic_hx6340_kids.json` (HX6340, firmware 4.2.2).
4. **Test di riproduzione** scritti per questo audit ed eseguiti su entrambi i rami senza modificarli (Appendice A, nel file separato [`audit-indipendente-2026-09-30-riproduzioni.md`](audit-indipendente-2026-09-30-riproduzioni.md)): un manico finto costruito sulla tabella GATT reale, il vero `NativeSonicareClient`, il vero `BrushProvider`, la logica di storage reale.
5. **Revisori paralleli** su aree periferiche (UI/accessibilità/E2E, i18n, logica di gioco ed economia, CI/configurazione/dipendenze) e un **harness SQLite reale** (`node:sqlite`) per eseguire lo storage nativo fuori dal telefono. I loro rilievi sono stati **ricontrollati da me** prima di entrare nel rapporto; quelli non verificati sono indicati come tali.
6. Stato di GitHub (run Actions, job, issue, PR) letto via API.

Limiti: nessun hardware (manico, iPhone, Android), nessun Android SDK/Xcode nel container, rete senza accesso a `api.expo.dev` e `reactnative.directory` (due controlli di Expo Doctor non eseguibili qui).

## 3. Gate automatici riprodotti

Ambiente: Node 22.22.2, pnpm 12.5.1 installato ad hoc (il pnpm di sistema 10.x viene rifiutato dal campo `engines`; `expo lint` richiama il `pnpm` del `PATH`, quindi anche lint fallisce se non si mette pnpm 12 per primo nel `PATH`: attrito reale per chi contribuisce, perché manca un campo `packageManager`).

| Gate | `main` @ `a7769e3` | PR #7 @ `7d0e305` |
|---|---|---|
| `pnpm install --frozen-lockfile` | ✅ | ✅ |
| `pnpm check` (tsc) | ✅ | ✅ |
| `pnpm test` | ✅ 26 file / 127 test | ✅ 42 file / 275 test |
| `pnpm test:stress` | — | ✅ (4 esecuzioni, 3 fusi) |
| `pnpm test:i18n` | — | ✅ 8 file / 68 test |
| `pnpm lint --max-warnings 0` | ✅ | ✅ |
| `pnpm audit --prod` | ❌ **5 high**, 1 moderate, 1 low | ✅ 0 |
| Gate audit usato dalla CI | ✅ `--audit-level critical` | ✅ `--audit-level high` |
| `pnpm audit` completo (dev incluse) | 5 high, 4 moderate, 1 low | 3 moderate (dev: `uuid` via `@expo/ngrok`, `vitest` < 4.1.11) |
| Expo Doctor | 16/18 qui; i 2 falliti richiedono rete bloccata nel sandbox | 19/21 qui; stessi 2 controlli di rete |
| `expo export` web / iOS / Android | ✅ / ✅ / ✅ | ✅ / ✅ / ✅ |
| Build nativa Android/iOS | non riproducibile qui (niente SDK/Xcode) | idem |
| GitHub Actions | ❌ nessuno step eseguito dal 23/9 | ❌ ultimo run `35964888095`: 4 job, `runner_id: 0`, 0 ms fatturati, log 404 |

Dettaglio advisory di produzione su `main`: `undici` 6.28.0 (GHSA-rfgv-xxqx-mfg5 high, GHSA-3wwx-pv8p-q78v moderate, GHSA-r53p-7pc4-xj5r low; corretto in 6.28.1), `fast-uri` 3.1.6 (GHSA-qw65-cvwx-89v3 e GHSA-58mr-gqgx-xq4g, high; corretto in 3.1.7), `image-size` 1.2.1 (due high già noti). Le prime due versioni vulnerabili sono **fissate esattamente dagli override** di `pnpm-workspace.yaml` (`"undici@6.22.0": "6.28.0"`, `"fast-uri@3.1.0": "3.1.6"`), quindi non si aggiornano da sole. Tutte sono dipendenze di tooling (`@expo/cli`, `ajv`), non del runtime mobile: il rischio concreto è basso, ma il README di `main` ("l'audit produttivo residuo riguarda esclusivamente `image-size`") oggi è falso e il gate `critical` non lo segnala.

Le dichiarazioni dei rapporti precedenti su test, lint, TypeScript ed export sono **autentiche**: le ho riprodotte tutte (con un limite: il lint copre solo `app/` e `components/`, non `lib/` né `contexts/`, vedi U2). Non sono riproducibili qui, e non sono mai state confermate da un runner indipendente, le build native (Android `assembleDebug`, iOS) e il gate Expo Doctor completo.

## 4. BLE, sincronizzazione e contabilità delle sessioni

Legenda rami: **M** = `main` @ `a7769e3` (stato unito); **P** = PR #7 @ `7d0e305` (candidato aperto).

### C1 — Critico · M+P — La sincronizzazione dei record del manico non può partire su un Sonicare for Kids reale

**Cosa succede.** Alla prima sincronizzazione (nessun cursore per il manico) il client esige la caratteristica *Session Count* `…40d2` e, se non la ottiene, interrompe la sync senza creare il cursore (`lib/sonicare-client.native.ts:425-429` su M, `:426-429` su P; lettura a `:485-501` M / `:506-522` P). Il progetto di riferimento citato dal README (`mtheli/philips_sonicare_ble`) pubblica il **dump GATT reale di un HX6340 Sonicare for Kids, firmware 4.2.2** (`tests/fixtures/classic_hx6340_kids.json`): il servizio Kids `…0003` espone solo `4100` Session Data (read), `40e0` Active Session ID (write), `40d0` Latest Session ID (read) e `40f0`; **`40d2` non esiste in nessun servizio**. Coerentemente, il riferimento indirizza al servizio Kids soltanto latest/active/data (`KIDS_CHAR_SERVICE_OVERRIDE` in `const.py`) e sincronizza solo il record `latest`, senza conteggio.

**Conseguenze sul prodotto.** Sul manico Kids la prima sync fallisce sempre ("Conteggio storico BLE non disponibile"), quindi: nessun cursore viene mai creato; ogni spazzolata fatta con l'app aperta viene salvata solo come *fallback live* e mai riconciliata; **le spazzolate fatte senza app non vengono mai importate** (il caso d'uso "sessioni offline" dichiarato nel README); "Dimentica manico resettato" nella PR #7 non è mai utilizzabile (richiede un cursore esistente); tutta la logica di backfill, rollover, riconciliazione e anti-replay — la parte più complessa e più auditata del progetto — non viene mai esercitata sull'hardware target. Nessun collaudo fisico è stato ancora eseguito (issue #3: zero risultati), per cui il problema non poteva emergere dai gate automatici. Nella matrice di collaudo emergerebbe ai casi "Sessioni offline / salto ID" e "Reset di fabbrica", mentre i casi "Sync sessione" e "Deduplica" passerebbero lo stesso grazie al fallback live — e con la PR #7 il report non riporterebbe il motivo del fallimento (I1, §6).

**Riproduzione.** `ble-flow.audit.test.tsx` (Appendice A), blocco *AUDIT F1*: client BLE reale (`NativeSonicareClient`) + provider + storage, con un manico finto costruito sulla tabella GATT reale HX6340. Su entrambi i rami: la prima sync rifiuta, `deviceCursors` resta vuoto e la sessione offline `288` non entra mai nello storico, anche premendo "Sincronizza".

**Confidenza.** Alta per l'HX6340 fw 4.2.2; medio-alta per l'HX6322/04, che il progetto stesso tratta come compatibile con quella cattura ("UUID e record sono stati confrontati con una cattura pubblica di un HX6340"). Va confermato con un dump GATT del manico reale (vedi raccomandazioni).

**Raccomandazione.** Non richiedere `40d2`: al primo contatto ancorare il cursore a `latestSessionId` (importando al più il record `latest`), poi avanzare per ID; aggiungere al report di collaudo un dump della tabella GATT (servizi, caratteristiche, proprietà).

### M1 — Maggiore · M+P — Una sessione può andare persa del tutto se l'azzeramento del timer arriva prima dello stop

Il provider crea la sessione solo sulla transizione `isBrushing: true → false` e usa l'`elapsedSeconds` dell'ultimo snapshot (`contexts/brush-context.tsx:340` M / `:443` P; stesso vincolo nel flush a `:235` M / `:338` P). Il client aggiorna `elapsedSeconds` e `isBrushing` con due notifiche GATT indipendenti (`4090` e `4010`, `lib/sonicare-client.native.ts:252-274`). Se il manico notifica `brushingTime = 0` prima di `handleState = standby` — il riferimento documenta che "the handle wipes the timer in the same instant it reports the stop" e per questo tiene un picco di sessione (`_session_peak`) — lo snapshot precedente allo stop ha `elapsedSeconds = 0 < 5` e **la spazzolata di 2 minuti non viene né sincronizzata né salvata come fallback, senza alcun log**.

Riproduzione: *AUDIT F3* (client reale + provider): 120 s di spazzolata, storico vuoto, nessuna lettura GATT dopo lo stop. Confidenza: media (dipende dall'ordine delle notifiche sul firmware reale), impatto alto. Rimedio: tracciare il picco di `elapsedSeconds` per sessione e usare quello allo stop.

### M2 — Maggiore · M+P — La sessione appena conclusa viene scartata se la sync restituisce solo record precedenti

Allo stop, se la sync restituisce **qualsiasi** record il provider presume che includa la sessione appena terminata e non salva il fallback live: `if (stored?.length) persistDeviceSessions(...) else saveLiveFallback(...)` (`contexts/brush-context.tsx:294` M / `:397` P). Il riferimento documenta che un Sonicare for Kids archivia il record "not until something connects to it again": al termine della sessione B il manico espone al massimo il record della sessione A. Risultato: A viene riconciliata, **B non viene salvata** (comparirà, se va bene, alla sync successiva), nessun premio viene mostrato per B e, se l'app non viene più aperta, B è persa.

Riproduzione: *AUDIT F2* (provider + storage reale, client scriptato): storico finale `[42, 41]`, la sessione B da 118 s assente, `progressEvent` ancora quello di A. Il difetto è latente finché C1 impedisce la sync, ma diventa il percorso normale non appena C1 viene corretto. Rimedio: salvare sempre la sessione live allo stop e sostituirla solo quando arriva un record che la corrisponde.

### M3 — Maggiore · solo P (regressione) — Doppio accredito se prima del record della sessione live il manico ne contiene un altro

La PR #7 ha riscritto la riconciliazione (M1–M3 dell'audit precedente) valutando la corrispondenza fallback↔record **dentro** il ciclo di import (`lib/brush-storage.native.ts:718-721`, `lib/brush-storage.ts:270-273`). Ogni record importato prima marca tutti i fallback come `hasInterveningProgress = true` (`lib/lifetime-progress.ts:200`), e per un record che non è il "successore atteso" la corrispondenza richiede proprio `!hasInterveningProgress` (`:522`). Quindi se il batch contiene prima un record non previsto — una spazzolata fatta **senza app** al mattino, oppure una pressione accidentale di 2 s che il manico registra ma l'app ignora (< 5 s) — il record della sessione live non viene riconosciuto e viene importato come **nuova** sessione accanto al fallback.

Riproduzione (`reconcile.audit.test.ts` e `native-reconcile.audit.test.ts` in Appendice A, anche sullo storage SQLite nativo): 3 spazzolate fisiche → P registra **4 tentativi, 4 completamenti, 4 righe** (+60 XP, +14 monete base, +1 collezionabile, e la stessa spazzolata compare due volte nello storico); con la pressione accidentale 4 tentativi invece di 3. Su M gli stessi scenari danno il risultato corretto (3/3/3), perché la corrispondenza è calcolata prima di applicare il batch. È lo schema d'uso più comune per un bambino (mattina senza app, sera con app). Rimedio: calcolare l'assegnazione fallback↔record sullo stato pre-batch e non far "intervenire" i record dello stesso batch.

### M4 — Maggiore · M+P — Timer manuale e spazzolata BLE non sono mutuamente esclusivi

Il pulsante del timer manuale è disabilitato durante una spazzolata BLE (`liveIsActive`, `app/(tabs)/index.tsx:412` M / `:591` P), ma non vale il contrario: se il timer manuale è già avviato e il manico collegato inizia a spazzolare, allo stop vengono salvate **due sessioni** (manuale e dispositivo) per la stessa spazzolata. Riproduzione *AUDIT F7*: 2 completamenti. Rimedio: annullare o assorbire il timer manuale quando inizia una sessione BLE (o viceversa).

### Minori BLE (M+P salvo indicazione)

- **B1 — Nessuna sync alla riconnessione.** Il README afferma che l'app importa i record "quando il manico viene riconnesso"; in realtà la sync parte solo allo stop di una spazzolata o col pulsante manuale (`syncLatest` è l'unico altro chiamante, `app/(tabs)/device.tsx`).
- **B2 — La scansione si ferma dopo 14 s, ma il manico pubblicizza ogni ~10–30 s.** `SCAN_TIMEOUT_MS = 14_000` (`lib/sonicare-client.native.ts:25` M / `:26` P); il documento di protocollo del riferimento misura un intervallo di advertising di "~10-30 seconds (very slow compared to typical BLE devices)". Una parte dei tentativi terminerà con "Spazzolino non trovato" anche col manico acceso: meglio 30–45 s o scansione fino ad annullamento, invitando a premere il pulsante del manico.
- **B3 — Nessun abbinamento del manico.** `isSonicare` accetta qualunque periferica con "sonicare" nel nome o UUID `477ea600…` (`lib/sonicare-client.native.ts:56-62`) e si collega alla prima trovata; in una famiglia con più spazzolini (fratelli, adulti) l'app può collegarsi e importare lo spazzolino sbagliato. L'etichetta modello è sempre `HX6322/04 · <modello letto>` (`:212`), anche per altri modelli.
- **B4 — Stati bloccati senza uscita.** Un intervallo > 128 sessioni o oltre la retention del manico blocca per sempre la sync (`lib/sonicare-client.native.ts:448-452` M / `:469-473` P); su P l'unica uscita ("Dimentica manico") richiede un reset di fabbrica reale e `40d2`. Latente finché vale C1.
- **B5 — iOS chiede il permesso Bluetooth all'avvio, non nel contesto.** `new BleManager()` viene creato al mount del provider (`createSonicareClient`), e su iOS la creazione del central manager fa comparire subito la richiesta di permesso, prima dell'onboarding. Meglio istanziarlo al primo "Cerca e collega".
- **B6 — Selezione del record con attesa fissa di 180 ms.** Se il manico impiega di più a caricare la sessione selezionata, il record letto non corrisponde e l'intero batch fallisce a ogni tentativo; il riferimento controlla l'ID del record come fa l'app, ma conviene un breve retry prima di dichiarare la lacuna.
- La perdita del motivo degli errori di sync nella PR #7 è trattata in §6 (I1).

Nota: in `react-native-ble-plx` 3.5 `BleManager` è un singleton e `destroy()` azzera l'istanza condivisa solo dopo una promessa; un rimontaggio immediato del provider (Fast Refresh, StrictMode in sviluppo) può ottenere un manager in distruzione. Non riguarda la build di produzione.

## 5. Storage, backup e integrità dei dati

### Cosa regge (verificato)

- **Verifica su SQLite reale.** Per questo audit è stato costruito un harness che esegue il vero `lib/brush-storage.native.ts` (e `lib/complete-backup.native.ts`) su un motore SQLite reale (`node:sqlite`, con il codice JS di expo-sqlite e un file system che riproduce il comportamento iOS e Android). Sulla PR #7 passano le 7 prove funzionali sullo storage reale (più 9 di autoverifica dell'harness contro la semantica di expo-sqlite e del file system nativo): salvataggio e rilettura dopo riavvio, import BLE con ID sanitizzati e reimport idempotente, export → ispezione → restore su installazione pulita con aggregati e somme del ledger identici, lo stesso flusso passando da condivisione e document picker, schema/WAL/tipi controllati con SQL grezzo, round trip esportato a Roma e ripristinato a New York, file `.brushlings` con trigger o vista rifiutati sia all'ispezione sia al restore diretto con database dell'app intatto.
- **Restore della PR #7 su schema fidato.** Il file importato non viene più copiato a pagine nel database dell'app: `validateBackupDatabase` controlla `sqlite_schema` contro un'allowlist (niente trigger, viste, tabelle/indici/colonne estranei, PK inattese: `lib/sqlite-backup-schema.ts`) e `restoreCompleteBackupDatabase` reinserisce solo righe validate dentro una transazione esclusiva, verificando ogni `INSERT` e il conteggio (`lib/brush-storage.native.ts`, blocco `withExclusiveTransactionAsync` del restore). Il rilievo M6 del 23/9 è chiuso.
- **Valori non finiti.** `rowToSession`, `normalizedLedgerRow` e il validatore semantico rifiutano NaN/Infinity, interi non sicuri e domini non ammessi (M7 chiuso).
- **Backup tra fusi orari.** L'export rigioca ledger e aggregati nel fuso corrente e scrive nel manifest gli stessi valori (`progressForPortableBackup`), quindi file e validatore sono coerenti in qualunque fuso (M5 chiuso; test `tests/backup-integrity.test.ts`).
- **Coordinamento del restore.** Journal SQLite (rollback) + journal applicativo + token `last-restore-id` scritto nella stessa transazione dei dati: ho seguito i crash possibili tra i passi e in ogni punto l'avvio successivo converge su "tutto vecchio" o "tutto nuovo".
- **Sessione manuale pendente** scritta su AsyncStorage prima del salvataggio e recuperata al riavvio, con retry idempotente (id stabile `manual-<start>` + `INSERT OR IGNORE`).
- **Privacy dell'export**: gli ID sessione con MAC/UUID grezzi vengono sostituiti e l'export fallisce se ne resta uno (`containsLikelyRawDeviceId`). Gli alias restano SHA-256 troncati non salati: su Android, con OUI noto, sono invertibili per forza bruta (~2^24 tentativi); la PR #7 li descrive ora correttamente come pseudonimi.

### Rilievi

- **S1 — Maggiore · M+P — Su Android, dopo un ripristino interrotto, lo storico diventa inaccessibile per sempre.** Al riavvio `recoverInterruptedRestore` controlla la copia di rollback con `new File(SQLite.defaultDatabaseDirectory, RESTORE_ROLLBACK_DATABASE_NAME).exists` (`lib/brush-storage.native.ts:271-272` M / `:304-305` P). Su Android `defaultDatabaseDirectory` è un percorso semplice (`context.filesDir.canonicalPath + "/SQLite"` in `SQLiteModule.kt` di expo-sqlite), che expo-file-system converte con `Uri.parse` in un URI senza schema e poi apre come `java.io.File(URI.create(...))` (`unifiedfile/JavaFile.kt`, identico in SDK 54 e 57): la lettura di `exists` lancia `IllegalArgumentException: URI is not absolute`. `openDatabase()` fallisce, la promessa rifiutata resta in cache (`databasePromise`), il flag di journal resta `"true"` e ogni avvio successivo fallisce allo stesso modo: `DataRecoveryGate` mostra solo "riavvia" (S4) e l'unica via d'uscita è cancellare i dati dell'app, perdendo tutto — proprio mentre la copia di rollback è integra sul disco. Basta che l'app venga chiusa o vada in crash durante un restore (la finestra comprende la copia riga per riga dell'intero archivio). iOS non è colpito (percorsi senza schema convertiti con `URL(fileURLWithPath:)`). Riproduzione: prova `findings.test.ts` dell'harness in modalità Android (fallisce con lo stesso messaggio) con il controllo iOS che passa; verificato da me sul sorgente nativo di expo-file-system 19 e 57 e di expo-modules-core. Rimedio: costruire il percorso da `Paths.document` + `SQLite` o anteporre `file://`, e rendere recuperabile l'errore (non mettere in cache la promessa rifiutata).
- **S2 — Minore · M+P — La suite del progetto verifica soprattutto lo storage *web*, non quello che gira sul telefono.** I test di persistenza principali (`tests/lifetime-history.test.ts`: 27 su `main`, 34 sulla PR #7) importano `@/lib/brush-storage`, che in Vitest risolve all'implementazione AsyncStorage per il web; lo storage SQLite nativo ha 1 test su `main` e 2 sulla PR #7, con un finto database che riconosce le query per sottostringa e non ha semantica transazionale. Per questo S1, G1 (demo) e le differenze tra le due implementazioni non potevano emergere. L'harness descritto sopra dimostra che eseguire lo storage nativo in Node su SQLite reale è fattibile.
- **S3 — Minore · M+P — Il ripristino da codice testuale v1/v2 accetta aggregati arbitrari.** `parseBackup` normalizza `lifetimeProgress` ma non lo confronta con lo storico (`lib/backup.ts`); lo storage nativo controlla solo `attemptedSessions >= history.length` (`replaceHistoryWithLifetime`). Chi modifica il JSON del codice può importare XP, completamenti, giorni perfetti e serie a piacere, sbloccando anche i **premi reali definiti dai genitori**. Il percorso v3 su file è invece validato semanticamente: il vecchio formato è un bypass di quella validazione. Riproduzione: `legacy-code.audit.test.ts` (un codice con 500 sessioni completate e una sola sessione archiviata viene accettato; il controllo con un codice genuino passa).
- **S4 — Minore · M+P — Nessuna via d'uscita se l'inizializzazione dei dati fallisce.** `DataRecoveryGate` mostra solo "riavvia" (`app/_layout.tsx`); errori deterministici — S1, journal applicativo corrotto (`JSON.parse` in `recoverApplicationRestore`), e sulla PR #7 una riga locale che non supera i nuovi controlli di `rowToSession` durante un backfill del ledger — si ripresentano a ogni avvio e l'unica uscita è reinstallare perdendo tutto. Serve almeno un'azione "esporta diagnostica / ripristina da backup / riprova".
- **S5 — Nota · P — Dopo un restore in un altro fuso gli aggregati possono cambiare.** Poiché l'export ricalcola bonus giornalieri e serie nel fuso di esportazione, il saldo monete del dispositivo che ripristina può differire da quello di origine (anche in negativo se le monete erano già state spese). Scelta difendibile, da dichiarare nella UI.

## 6. Interfaccia, accessibilità e localizzazione

### I1 — Maggiore · solo P (regressione) — Gli errori BLE specifici non arrivano più all'utente

Nella PR #7 i `catch` di sync registrano solo chiavi generiche scartando `error.message` (`contexts/brush-context.tsx:392`, `:401`, `:651`), e un nuovo effetto sovrascrive il messaggio di stato impostato dal client con una chiave fissa per stato (`:270-281`): "Spazzolino non trovato. Accendilo e riprova." diventa "Connessione Bluetooth non riuscita", "Spazzolino disconnesso" diventa "Pronto per cercare lo spazzolino". Anche l'alert di errore di "Dimentica manico" mostra solo "riprova più tardi" (`app/(tabs)/device.tsx:50`). Le indicazioni operative costruite apposta — "usa Dimentica manico resettato", "esegui prima il reset di fabbrica", limiti di intervallo — non vengono mai mostrate, e il report di collaudo perde proprio il motivo dei fallimenti di sync (inclusa la causa di C1). Su `main` il messaggio originale era conservato. Verificato leggendo il codice e con l'harness del revisore i18n (prima/dopo).

### Localizzazione (PR #7)

Verificato come vero: 856 chiavi in tutte e 5 le lingue, nessuna mancante o vuota, segnaposto identici, nessun residuo italiano nei cataloghi, metadati nativi generati dal prebuild, nessun flash di lingua al primo render. Minori:

- **L1 — Nessuna gestione dei plurali** in nessuna lingua ("1 oggetti posseduti", "1 sessions synchronized", "1 days in a row").
- **L2 — Titolo del foglio di condivisione del backup fisso in italiano** (`lib/complete-backup.native.ts:42`) e **modal dei premi sempre in italiano** per nomi di oggetti, uova ed evoluzioni (`components/session-reward-modal.tsx` usa i nomi di default invece degli helper localizzati).
- **L3 — Tedesco con errori di grammatica e di senso** ("3/13-Prüfungen", "Zifferblätter" per i quadranti della bocca — errore ripetuto in francese "cadrans" —, "FÜR ERWACHSENE" nell'onboarding di un'app per bambini, due caratteri invisibili U+200B, registro misto Sie/du) e **istruzioni che citano etichette di pulsanti diverse da quelle reali** (4 casi tra de/es/fr).
- **L4 — Lingue non supportate ricadono sull'italiano** (pt-BR, ja-JP → it) mentre le stringhe native iOS ricadono sull'inglese; formati di data/numero ignorano la regione (en-GB vede formato USA).
- **L5 — Il restore di un backup precedente alla PR riporta la lingua a "Sistema"**; il messaggio di conferma resta nella lingua precedente.
- **L6 — La redazione delle note del report riconosce solo parole chiave inglesi/italiane** ("Geräte-ID: …", "ID del dispositivo: …" non vengono oscurati), mentre la schermata promette l'oscuramento.
- **L7 — Qualità dei test i18n:** 24 dei 68 test del gate i18n sono test preesistenti non i18n; due confrontano l'italiano con sé stesso; nessun test verifica che gli errori arrivino all'utente (per questo I1 passa tutta la suite).

### Interfaccia e accessibilità (PR #7; salvo diversa indicazione valgono anche per `main`)

- **U1 — Minore · P — La dichiarazione "zero violazioni axe su 28 stati" non regge.** I colori accento di 3 creature su 5 danno testo sotto 4,5:1 su bianco (Spriggo `#2E9B67` 3,50; Flarello `#E76A2C` 3,23; Voltuff `#B98A00` 3,14 — ricalcolati qui) e vengono usati direttamente per testo e pulsanti nei flussi principali (`components/starter-chooser.tsx`, `app/(tabs)/index.tsx`, `components/session-reward-modal.tsx`: "Fantastico!" bianco su `#2C97F4` = 3,07); `readableAccent()` esiste ma lì non è usato. Il gate axe (`e2e/a11y/accessibility.spec.ts`) scansiona una volta per rotta, senza scorrere, solo nello stato iniziale (starter Bloopi, niente modal premi, niente demo) e ignora gli `incomplete`; il revisore, scorrendo e cambiando stato, ha ottenuto violazioni in chiaro e in scuro. Il gate è anche instabile (un `aria-label` su `<div>` senza ruolo in `components/app-header.tsx` e le icone prima del caricamento del font).
- **U2 — Minore · M+P — Il gate `pnpm lint` non copre la logica dell'app.** `expo lint` controlla per default solo `src`, `app`, `components` (`@expo/cli`, `lintAsync.js`, `DEFAULT_INPUTS`). Eseguendo la configurazione ESLint del progetto su `lib/ contexts/ hooks/ constants/`: `main` pulito, **PR #7 10 errori e 20 warning**, tra cui accesso a ref durante il render e `Date.now()` nel render in `contexts/brush-context.tsx:179/185/211/220`, modifica di valori restituiti da hook in `contexts/audio-feedback-context.tsx:19/35`, `setState` sincrono negli effetti. Con `reactCompiler: true` questi componenti vengono esclusi dal compilatore in silenzio; il "lint a zero warning" dichiarato riguarda solo le schermate.
- **U3 — Minore · M+P — La preferenza "Vibrazione" è ignorata** al collegamento, all'avvio del timer e al salvataggio della sessione (`contexts/brush-context.tsx:521`, `:581`, `:670` P): solo tab e modal premi la rispettano.
- **U4 — Minore · M+P — I dati demo compaiono come reali** nell'Area genitori (dashboard calcolata su `history`, nessuna indicazione "demo") e nello Storico (le sessioni demo sono etichettate "Timer guidato"). Oggi visibile sul web; su telefono diventerà visibile quando G1 sarà corretto.
- **U5 — Minore · P — I flow Maestro toccano controlli fuori schermo senza scorrere** (`.maestro/flows/*.yaml`: `manual-start-stop`, `device-backup`, `device-hardware-test` misurati sotto la tab bar a 411×731, 390×844 e 412×915) e girano solo su tag o dispatch: probabilmente falliscono al primo uso reale. Confidenza media (Maestro non eseguito).
- **U6 — Minore · P — I valori "oggi" restano quelli di ieri dopo la mezzanotte** finché lo storico non cambia: `new Date()` letto nel render di calcoli che il React Compiler memoizza sui soli dati (`app/(tabs)/index.tsx`, `contexts/brushling-context.tsx`); la mattina dopo si vedono ancora le missioni 3/3 della sera. Vitest non esegue il compilatore, quindi i test non possono accorgersene (verificato dal revisore sull'output compilato).
- **U7 — Minore · M+P — Backup:** su iOS il messaggio "Backup completo" compare anche se il foglio di condivisione viene annullato; `createdAt` è fissato al primo montaggio della schermata (nome file e impronta vecchi); il ripristino "sostituisci tutto" non ha una conferma, a differenza di "Dimentica manico".
- **Altri minori (M+P):** la freccia indietro delle rotte nascoste torna sempre a "Oggi" (`router.back()` con `backBehavior` di default); l'indicatore di connessione nell'intestazione è fisso su "non collegato" in 9 schermate; eliminazione e consegna dei premi senza conferma e con bersagli di 36 px affiancati; lettori di schermo: ruoli ed etichette su `View` non `accessible` (ignorati da VoiceOver), nessun annuncio di cambio zona o fine sessione, overlay di ripristino non isolato; bersagli sotto 44 pt e nessun `hitSlop`; nessuna gestione di "riduci movimento" per animazioni in loop e coriandoli; "Svuota lo storico" non fa nulla sul web (`Alert.alert` è vuoto in react-native-web); link profondi sconosciuti mostrano la pagina "Unmatched Route" e `/_sitemap` di expo-router; i riepiloghi dello Storico contano solo le ultime 120 sessioni presentandole come totali; diversi pulsanti asincroni falliscono senza feedback (`void asyncFn()` senza `catch`).

Verificato come corretto dal revisore: import/restore del backup con `busy` sincrono e pulsanti disabilitati, overlay che blocca tocchi e "indietro" Android, conferma e guardia su "Dimentica manico", salvataggio manuale idempotente con avviso accessibile, liste con `FlatList` e chiavi stabili, radio/switch/campi etichettati, nessuna compilazione errata del React Compiler oltre a U6.

## 7. Logica di gioco, economia e premi genitori

### G1 — Maggiore · M+P — La modalità demo non funziona su iOS e Android

Le sessioni demo hanno `source: "demo"` (`contexts/brush-context.tsx`, `makeDemoSession` e timer manuale in demo), ma lo storage **nativo** accetta solo `"manual" | "device"` (`isBrushSession`, `lib/brush-storage.native.ts:176` M / `:189` P) e lo usa anche per `saveDemoSession`, `replaceDemoHistory` e `loadDemoHistory`: ogni sessione demo viene scartata in silenzio. Lo storage web invece accetta `"demo"` (`lib/brush-storage.ts:80` M / `:83` P), ed è quello su cui girano test ed E2E. Sul telefono "Aggiungi sessione demo" e "Genera settimana demo" non producono nulla (pur loggando successo) e una sessione col timer manuale avviata in demo va persa. La demo è anche un caso della matrice hardware ("Demo durante scansione"). Riproduzione: `native-demo.audit.test.ts` (test G1) → 0 sessioni dopo il salvataggio, su entrambi i rami (rilievo del revisore di gioco, verificato).

### G2 — Maggiore · M+P — I premi dei genitori nascono già sbloccati

Il progresso dei premi familiari usa gli **aggregati lifetime** (`contexts/parent-rewards-context.tsx:37-46` P, `:36-45` M → `parentRewardProgressFromMetrics`), mentre `createdAt` non viene mai usato e l'obiettivo è limitato a 30 (`app/(tabs)/parent.tsx:85-88` P / `:37` M). Dopo circa 15 giorni d'uso (30 sessioni) qualunque premio "N sessioni" creato da un genitore risulta subito raggiunto; lo stesso per giorni perfetti e serie. Premi ricorrenti ("ogni 10 spazzolate") sono impossibili. Va deciso se il premio conta dal momento della creazione (il caso d'uso naturale) e reso esplicito nella UI.

### G3 — Minore · M+P — Con un archivio "parziale" le sessioni del manico non danno mai missioni, bonus o serie

Se `history-complete=false` (migrazione legacy con più di 120 sessioni, restore da codice v1/v2, restore di un file parziale) ogni sessione del manico importata passa dal ramo parziale anche quando è in ordine (`lib/brush-storage.native.ts:713` M / `:763` P → `applySessionToPartialLifetime`), che non aggiorna bonus giornalieri, giorni perfetti, serie e giornata attiva; le sessioni manuali in ordine invece li aggiornano (`saveNewSession`). Sonda del revisore: 3 giorni di sole sessioni col manico → bonus 0, serie 0, missioni 0. Oggi latente per via di C1 (sul Kids arrivano solo fallback, che passano da `saveNewSession`).

### Minori (verificati sul codice e con le sonde del revisore)

- **G4 · M+P — Debito nascosto dopo "Cancella storico".** Lo storico e gli aggregati vengono azzerati ma gli acquisti restano (`clearAllHistory`), quindi speso > guadagnato: il portafoglio mostra 0 e i nuovi guadagni ripagano un debito invisibile, mentre il modal annuncia "+14 monete". Il dialogo non avvisa che livello, XP, obiettivi e creature sbloccate verranno persi.
- **G5 · M+P — Cambio di fuso + qualunque replay riscrive il passato.** Sono memorizzati solo timestamp UTC; giorno e fascia mattina/sera vengono ricalcolati nel fuso corrente a ogni replay (inserimento fuori ordine, batch riconciliato, export). Sonda: 7 giorni perfetti registrati a New York diventano 0 rigiocati a Roma (−192 monete bonus) e un premio genitori "raggiunto" torna "in corso".
- **G6 · M+P — Un batch di sync festeggia solo l'ultima sessione**, e le riconciliazioni/replay non mostrano alcun modal: una schiusa a metà batch non viene mai mostrata.
- **G7 · M+P — Dopo un restore riappare il modal di una sessione già vista** (reset di `lastHandledProgressEventIdRef` mentre il contesto conserva il vecchio `progressEvent`).
- **G8 · M+P — La dashboard genitori esclude dai totali settimanali le sessioni a orario approssimato** e ne conta il numero sull'intero storico (120 righe), non sulla settimana; il testo di spiegazione dice che l'esclusione vale solo per calendario, serie e missioni.
- **G9 · M+P — Limiti dei premi incoerenti:** nessun limite di numero/lunghezza titolo nel contesto, ma il backup tronca silenziosamente a 40.

Note: fascia "mattina" 05:00–11:59 e "sera" dalle 18:00 calcolate sull'inizio (una sessione alle 17:59 o alle 00:30 non conta per nessuna fascia); il portafoglio demo sottrae gli acquisti reali; due acquisti nello stesso render segnalano entrambi successo ma ne resta uno (nessun doppio addebito); spostare in avanti l'orologio del telefono completa il timer manuale. Invarianti verificati dal revisore: coerenza storico↔aggregati su storia completa, passaggi DST, somma del ledger = portafoglio, soglie di uova/evoluzioni, nessun saldo negativo mostrato, prezzo pagato conservato.

## 8. CI, dipendenze, configurazione e documentazione

### CI1 — Maggiore · M+P — La CI non esegue nulla dal 23 settembre

Tutti i run successivi al n. 180 (23/9, 05:54, l'ultimo verde) falliscono in pochi secondi. Sul run più recente della PR #7 (`35964888095`, 24/9) i job `verify` e `native-android` hanno `runner_id: 0` e nessun nome di runner, i log non esistono (HTTP 404) e l'API di utilizzo riporta **0 ms fatturati**: nessun runner è mai stato assegnato. È un blocco dell'account (quota o policy di GitHub Actions), come già diagnosticato dall'audit del 23/9, non un errore del repository. Conseguenza pratica: il merge della PR #6 in `main` è avvenuto con CI rossa, e per la PR #7 nessuna delle dichiarazioni "Expo 57 compila", "build Android nativa superata", "build iOS configurata" è stata verificata da un runner indipendente. Anche con la CI ripristinata, il job iOS e i flow Maestro della PR #7 girano solo su tag o dispatch manuale, quindi non fanno da gate alle PR.

### D1 — Maggiore · solo M — Dipendenze di produzione con advisory `high` e README inesatto

Dettagli in §3: `undici` 6.28.0 e `fast-uri` 3.1.6 sono fissati esattamente dagli override di `pnpm-workspace.yaml` a versioni oggi vulnerabili (correzioni disponibili: 6.28.1 e 3.1.7), più i due advisory `image-size`. Sono dipendenze di tooling (CLI Expo, plugin di configurazione, Metro), non del runtime sul telefono, quindi il rischio concreto è basso; ma il README di `main` dichiara che il residuo riguarda "esclusivamente `image-size`" e il gate CI (`--audit-level critical`) non se ne accorgerebbe. La PR #7, con Expo 57, è pulita.

### K1 — Maggiore · M+P — Il manifest Android finale dichiara la localizzazione su tutte le versioni

Il plugin di `react-native-ble-plx` aggiunge al manifest dell'app `uses-permission-sdk-23` per `ACCESS_FINE_LOCATION`/`ACCESS_COARSE_LOCATION` con `maxSdkVersion="30"` (`plugin/build/withBLEAndroidManifest.js`), ma il manifest della libreria stessa (`node_modules/react-native-ble-plx/android/src/main/AndroidManifest.xml`, righe 5-6, identico sui due rami) dichiara le stesse permission come `uses-permission` **senza limite**. Sono elementi diversi, quindi il merge di Gradle li conserva entrambi: l'app dichiara la localizzazione anche su Android 12+, dove non la chiede mai. Il revisore CI l'ha ottenuto eseguendo il manifest merger AOSP sui manifest reali; io ho verificato manifest e plugin. Contraddice README e rapporti ("il plugin limita i permessi location legacy a SDK 30") e indebolisce proprio la mitigazione Families su cui la documentazione conta. Rimedio: `tools:node="remove"`/`tools:replace` per le due permission nel manifest dell'app (config plugin), poi controllare l'APK con `aapt dump permissions`. Da confermare con una build Gradle reale.

### K2 — Maggiore · solo P — La PR #7 dichiara audio in background e un foreground service mai usati

Con Expo 57 il plugin `expo-audio` ha `enableBackgroundPlayback = true` per default (`plugin/build/withAudio.js:8` nella versione 57.0.5; nella 1.1.1 di `main` l'opzione non esiste) e `app.config.ts` imposta solo le opzioni del microfono: il prebuild aggiunge `UIBackgroundModes = [audio]` su iOS e `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK` e il servizio `AudioControlsService` su Android. L'app non riproduce mai audio in background. È un motivo ricorrente di rifiuto in App Review (linea guida 2.5.4) e con target SDK 36 richiede una dichiarazione di foreground service in Play Console. Rimedio: `enableBackgroundPlayback: false`.

### Minori (verificati a campione; dettaglio del revisore CI)

- **K3 · P — Il job `e2e-android` non abilita KVM** prima di `reactivecircus/android-emulator-runner@v2` (API 36, x86_64): senza `/dev/kvm` l'azione ricade su accelerazione software e, per la stessa documentazione della PR (`docs/quality-automation-2026-09-24.md`), l'emulatore non si avvia in 6 minuti. Anche con la CI sbloccata i flow Maestro (vedi anche U5) probabilmente non girerebbero.
- **K4 · P — Filtri e concorrenza della CI:** `paths-ignore` non salta i commit solo-documentazione di una PR che contiene già codice (il run `35938175573` su un commit di soli documenti lo dimostra), contrariamente a README e `todo.md`; il gruppo `concurrency` accomuna PR e `workflow_dispatch` dello stesso ramo, che si annullano a vicenda; nessun `needs: verify`, nessuna cache Gradle/NDK/CocoaPods/Playwright; azioni fissate a tag mobili e runtime Node 20; nessun blocco `permissions`.
- **K5 · M — Su `main` ogni commit di PR esegue la CI due volte (push + PR), incluso il job macOS**, e anche i commit solo-documentazione: stima del revisore: 440–760 minuti fatturabili per commit su un repository privato (macOS conteggiato ×10). È il vecchio M10, corretto nella PR #7.
- **K6 · M+P — `node-linker=hoisted` in `.npmrc` è ignorato da pnpm 12** (`pnpm config get node-linker` → `undefined`, `node_modules/.modules.yaml` → `"nodeLinker": "isolated"`): tutte le verifiche sono state fatte con il layout isolato, non con quello dichiarato. Il pin `engines.pnpm` senza campo `packageManager` blocca chi ha pnpm 10 e Corepack non può aiutare; `engines.node >=22 <23` non è applicato e ammette 22.0–22.12, sotto il minimo di React Native 0.86.
- **K7 · M+P — Igiene degli override:** 10 override della PR #7 (2 su `main`) puntano a versioni non più presenti; `uuid@>=7.0.0 <11.1.1` non copre `uuid` 3.4.0 (via `@expo/ngrok`, dev); pin globali esatti congelano versioni future; `decode-uri-component: 0.5.0` rompe `query-string@7.1.3` (`parse` lancia `decodeComponent is not a function`, percorso oggi solo di fallback) senza alcun beneficio di sicurezza.
- **K8 · M+P — Dipendenze inutilizzate:** `expo-image` (mai importato, ma incluso come plugin nella PR #7), `@expo/ngrok`, `qrcode` e lo script `qr` per Expo Go, che non può eseguire questa app.
- **K9 · M+P — Configurazione nativa:** su iOS il blocco `dark` dello splash porta il prebuild a scrivere `UIUserInterfaceStyle=Automatic` nonostante `userInterfaceStyle: "light"` (l'app va in tema scuro solo su iOS); orientamento solo verticale non imposto su iPad né su schermi grandi Android 16; su Android 6–11 nessun controllo dell'interruttore Localizzazione, necessario per la scansione BLE (errore `ble-plx` mostrato in inglese); `NSBluetoothAlwaysUsageDescription` in `infoPlist` sovrascritto dal testo del plugin.
- **K10 · M+P — Residui del template:** il runtime Manus (`lib/_core/manus-runtime.ts`) è chiamato da `app/_layout.tsx` con il commento "cookie injection" ed è presente anche nei bundle nativi (`SpacePreviewerChannel` trovato in entrambi gli export iOS); sul web accetta `postMessage` da qualunque origine (solo insets di layout); alias `@shared/*` verso una cartella inesistente; voci Manus in `.gitignore`.
- **K11 · M+P — Governance:** `main` non è protetto (`protected: false`) e `a7769e3` è stato pushato direttamente; PR #5 e #6 sono state unite con CI rossa. "CI verde prima del merge" è oggi solo una regola scritta.

### Documentazione non allineata al codice

- **README (M+P):** "quando lo spazzolamento termina o il manico viene riconnesso, l'app importa…" — la riconnessione non avvia alcuna sync (B1); anche il passo 9 di `docs/hardware-test-plan.md` si aspetta l'import alla riconnessione, quindi il collaudo così scritto fallirà.
- **README e rapporti (M+P):** permessi di localizzazione "limitati a SDK 30" (K1); su `main` "residuo di audit esclusivamente `image-size`" e "nessuna versione corretta upstream", mentre `image-size` 2.0.3 è pubblicato dal 14/9 e `undici`/`fast-uri` corretti dai primi di settembre (D1).
- **PR #7:** "lint a zero warning" vale solo per `app/` e `components/` (U2); "zero violazioni axe" non regge (U1); conteggi dei test non aggiornati in `docs/expo-57-upgrade-2026-09-24.md` e nel rapporto di rimedio (177 contro 275 reali); "il workflow prepara automaticamente" i prerequisiti Maestro (K3); i flow Maestro non coprono "gli stessi percorsi" del web (2 contro 3, nessuno sulla lingua).

Verificato come vero dal revisore CI: conteggi dei test di entrambi i rami, 856 chiavi × 5 cataloghi, dati degli stress test, 13 casi di collaudo, WAL con `synchronous=FULL`, `pnpm peers check` pulito, metadati di localizzazione nativi della PR #7, target di deployment iOS/Android dichiarati, nessun segreto negli artifact della CI.

## 9. Stato dei rilievi major dell'audit Claude del 23/9 (su `main` @ `a7769e3`)

| ID 23/9 | Rilievo | Su `main` oggi | Nella PR #7 |
|---|---|---|---|
| M1 | Doppio accredito con record a orario approssimato | Presente (verificato sul codice: finestra 5/30 s, l'orario "approssimato" coincide con l'ora della sync) | Corretto per il successore atteso; **nuovo doppio accredito** in altri ordini del batch (§4, M3) |
| M2 | Progresso interveniente disattiva la riconciliazione | Presente (verificato) | Corretto con storno contabile; è però la stessa marcatura `hasInterveningProgress` a causare M3 |
| M3 | Doppio fallback su "Disconnetti" durante lo spazzolamento | Presente come race (chiusura GATT e flush in parallelo, `contexts/brush-context.tsx:474-477`; il dedupe regge solo se il primo salvataggio è ancora in coda) | Corretto: chiusura e flush serializzati |
| M4 | "Dimentica manico" senza reset = farming | Presente (verificato: la nuova epoch reimporta fino a 128 record) | Corretto con baseline e ID ≤ 16; ma con C1 l'azione non è mai disponibile sul Kids |
| M5 | Backup non ripristinabile dopo cambio di fuso | Non riverificato su `main` | Corretto (§5) |
| M6 | Trigger/viste dal file importato nel DB dell'app | Presente (verificato: copia a pagine senza controllo di `sqlite_schema`) | Corretto (allowlist + reinserimento righe) |
| M7 | NaN negli archivi parziali | Presente (verificato: `rowToSession` senza controlli numerici) | Corretto |
| M8 | Over-redaction del report di collaudo | Non riverificato su `main` | Corretto (regex ancorate a pattern di identificativo) |
| M9 | Blocco Actions a livello account | Invariato | Invariato: ultimo run `35964888095` (24/9) con `runner_id: 0`, 0 ms fatturati, log 404 |
| M10 | Workflow che consuma la quota | Invariato | Corretto nel workflow (concurrency, `paths-ignore`, macOS e Maestro solo su tag/dispatch) |

La PR #7 chiude quindi 7 dei 10 major del 23/9 nel codice, ma non tocca il problema di protocollo (C1), non ha mai girato in CI e ne introduce uno nuovo (M3).

## 10. Cosa regge (verificato, non dichiarato)

- **Architettura dei dati.** Un solo database SQLite con WAL e `synchronous=FULL`, scritture serializzate, aggregati lifetime O(1) aggiornati nella stessa transazione della riga di sessione, ledger premi idempotente (`INSERT OR IGNORE` su ID stabili), replay deterministico per gli inserimenti fuori ordine. È un disegno solido e raro in un'app di questa taglia.
- **Restore (PR #7).** Allowlist dello schema, reinserimento di righe validate, doppio journal e token di commit nel database: ho seguito i punti di crash e ognuno converge.
- **Client BLE.** Generazioni monotone per scartare callback tardive, transazioni di sync annullabili, sync FIFO vincolate al dispositivo catturato, chiusura della GATT candidata su errore, Base64 canonico: la parte di *lifecycle* è accurata (i problemi di §4 sono di protocollo e di contabilità, non di lifecycle).
- **Codec.** Il decoder del record Kids coincide con il riferimento (stessi offset, stessi limiti `MAX_ROUTINE_SECONDS`/`MAX_DURATION_FACTOR`, stesso record reale di test) e la ricostruzione dell'orario usa correttamente il clock del manico come contatore relativo, con l'orario d'inizio come nel riferimento.
- **Privacy.** App senza backend né account; export con alias al posto degli identificativi BLE e guardia runtime contro MAC/UUID grezzi; report di collaudo con redazione ancorata a pattern.
- **Dipendenze della PR #7.** Upgrade a Expo 57 senza advisory di produzione; lockfile frozen riproducibile.
- **Trasparenza.** README e rapporti dichiarano esplicitamente che hardware, parental gate e CI non sono verificati; le cifre dichiarate su test, lint ed export sono vere.

## 11. Riepilogo dei rilievi

Severità: **Critico** = blocca la funzione principale del prodotto; **Maggiore** = perdita o duplicazione di dati, funzione rotta per molti utenti, oppure rischio concreto di rifiuto o non conformità negli store; **Minore** = difetto circoscritto o latente; **Nota** = osservazione. Rami: **M** = `main`, **P** = PR #7. "Riprodotto" = test o sonda eseguiti in questo audit; "codice" = verificato leggendo il codice.

| ID | Severità | Rami | Rilievo | Evidenza |
|---|---|---|---|---|
| C1 | Critico | M+P | Sync dei record impossibile sul GATT Kids reale (manca `40d2`) | riprodotto (F1a, F1b) + dump GATT reale |
| M1 | Maggiore | M+P | Sessione persa se il timer si azzera prima dello stop | riprodotto (F3) |
| M2 | Maggiore | M+P | Sessione appena conclusa scartata se la sync restituisce solo record precedenti | riprodotto (F2) |
| M3 | Maggiore | P | Regressione: doppio accredito se prima del record live c'è un record offline o accidentale | riprodotto (F5a–c, anche SQLite nativo) |
| M4 | Maggiore | M+P | Timer manuale e BLE sovrapposti: doppio accredito | riprodotto (F7) |
| S1 | Maggiore | M+P | Android: dopo un ripristino interrotto lo storico resta inaccessibile per sempre | harness SQLite reale (modalità Android) + sorgente nativo |
| G1 | Maggiore | M+P | Modalità demo non funzionante su iOS/Android | riprodotto (test G1) |
| G2 | Maggiore | M+P | Premi dei genitori già sbloccati alla creazione | codice + sonda revisore |
| I1 | Maggiore | P | Regressione: errori BLE specifici non mostrati né registrati | codice + harness revisore |
| D1 | Maggiore | M | 5 advisory `high` in produzione, versioni vulnerabili fissate dagli override; README inesatto | `pnpm audit` |
| CI1 | Maggiore | M+P | CI senza alcuno step eseguito dal 23/9: build native ed Expo 57 mai verificate da terzi | API GitHub |
| K1 | Maggiore | M+P | Permessi di localizzazione dichiarati anche su Android 12+ (manifest della libreria BLE) | manifest + merger del revisore |
| K2 | Maggiore | P | Audio in background e foreground service dichiarati ma mai usati (rischio App Review/Play) | plugin `expo-audio` 57 |
| B1–B6 | Minore | M+P | Sync non alla riconnessione; scansione 14 s; nessun abbinamento; stati bloccati; permesso iOS all'avvio; attesa fissa 180 ms | codice |
| S2–S4 | Minore | M+P | Test sullo storage web invece che nativo; codice v2 falsificabile (riprodotto S3); nessun recupero in `DataRecoveryGate` | codice / riprodotto |
| G3–G9 | Minore | M+P | Archivi parziali senza missioni; debito nascosto; fusi orari; modal dei batch; modal ripetuto; dashboard; limiti premi | sonde revisore + codice |
| L1–L7 | Minore | P | Plurali, stringhe fisse in italiano, errori di traduzione, fallback lingua, formati regionali, redazione note, test i18n | script revisore + codice |
| U1–U7 | Minore | P (U2–U4, U7 anche M) | Contrasto e gate axe; lint che non copre `lib/`/`contexts/`; vibrazione ignorata; demo presentata come reale; flow Maestro fuori schermo; valori "oggi" dopo mezzanotte; backup | revisore + verifiche mie |
| K3–K11 | Minore | M e/o P | KVM, filtri/concorrenza CI, CI doppia su `main`, `node-linker` ignorato, override, dipendenze inutili, config nativa, residui Manus, `main` non protetto | revisore + verifiche mie |

**Totale:** 1 critico e 12 maggiori (8 su entrambi i rami, 3 solo sulla PR #7, 1 solo su `main`), più oltre 40 rilievi minori e diverse note.

## 12. Raccomandazioni, in ordine

1. **Fermare il codice e andare sull'hardware (1–2 ore).** Con una development build su un telefono e l'HX6322/04: (a) esportare la tabella GATT (servizi, caratteristiche, proprietà) — va aggiunta al report di collaudo; (b) verificare se `40d2` esiste; (c) misurare dopo quanto tempo dallo stop `40d0` (latest) avanza e se serve una nuova connessione; (d) registrare l'ordine delle notifiche `4090`/`4010` allo stop; (e) leggere `4070` durante la spazzolata (nel dump HX6340 vale già l'ID che avrà il record: 287 con latest 286); (f) osservare il contatore dopo un reset di fabbrica. Sono sei domande che decidono il disegno della sync; oggi sono tutte ipotesi.
2. **Ridisegnare la sync sul protocollo reale (C1, M1, M2).** Non esigere `40d2`: al primo contatto ancorare il cursore a `latestSessionId`; sincronizzare anche alla connessione (il Kids archivia il record precedente quando qualcuno si collega); **salvare sempre** la sessione live allo stop usando il picco di `elapsedSeconds`; etichettarla con l'ID letto da `4070` all'inizio della spazzolata e sostituirla quando arriva il record con quell'ID. Questo rende la riconciliazione deterministica e permette di eliminare gran parte delle euristiche su tempi, forme e "progresso interveniente" che hanno generato i cicli di bug (incluso M3).
3. **Non unire la PR #7 così com'è.** Prima: correggere la regressione M3 (o almeno calcolare l'assegnazione fallback↔record sullo stato pre-batch) e aggiungere i test di Appendice A alla suite. Il resto della PR (schema fidato, valori finiti, backup tra fusi, journal manuale, Expo 57 senza advisory) è un miglioramento netto rispetto a `main`.
4. **Sbloccare la CI prima di qualsiasi merge.** Il problema è di account (Settings → Billing / Actions), non del repository. Finché la CI non esegue step, nessuna delle dichiarazioni "Expo 57 compila" o "build iOS" è verificata da terzi.
5. **Correggere subito S1** (percorso della copia di rollback su Android): è una modifica di una riga in un percorso di recupero che oggi trasforma un crash durante il restore in una perdita totale dei dati.
6. **Se `main` deve restare in uso nel frattempo**, aggiornare gli override pnpm che fissano versioni ora vulnerabili (`undici` 6.28.0 → ≥ 6.28.1, `fast-uri` 3.1.6 → ≥ 3.1.7) e correggere il README sul residuo di audit.
7. **Altre correzioni, per impatto:** mutua esclusione timer manuale/BLE (M4); demo su storage nativo (G1); semantica dei premi genitori (G2); scansione più lunga (B2); abbinamento esplicito del manico (B3); validazione semantica anche per i codici v1/v2 o loro dismissione (S3); un'azione di recupero in `DataRecoveryGate` (S4); ripristinare i messaggi d'errore specifici (I1); test dello storage nativo contro un SQLite reale (S2).
8. **Restano invariati** i prerequisiti di pubblicazione già tracciati: matrice hardware (issue #3), parental gate (escluso dal proprietario), privacy policy, Data Safety/target audience, revisione marchi, decisione Kids/Families e Companion Device Manager.

## Appendice B — Fonti

**Protocollo (progetto di riferimento citato dal README), ramo `master` di `github.com/mtheli/philips_sonicare_ble`:**

- `tests/fixtures/classic_hx6340_kids.json` — dump GATT reale di un Sonicare for Kids HX6340, firmware 4.2.2, nome annunciato `Sonicare4Kids`. Servizio `…0003`: `4100` Session Data (read), `40e0` Active Session ID (write), `40d0` Latest Session ID (read), `40f0` (read, notify). Nessun `40d2`. Servizio `…0002`: `4070` Session ID (read) = `0x011f` (287) mentre `40d0` = `0x011e` (286), catturati con manico in stato `02` (Run).
- `custom_components/philips_sonicare_ble/const.py` — `SVC_KIDS_SESSION = …0003`; `KIDS_CHAR_SERVICE_OVERRIDE` limitato a latest/active/data; record letto a lunghezza fissa 16 byte; limiti `MAX_ROUTINE_SECONDS = 3600`, `MAX_DURATION_FACTOR = 2`.
- `custom_components/philips_sonicare_ble/coordinator.py` — `_update_stored_session` (sync del solo `latest`, anche alla connessione), `_session_started_at` (timestamp del record = inizio sessione; età = clock del manico − timestamp).
- `tests/test_stored_session.py` — "one files it only as it switches off, and a Sonicare for Kids not until something connects to it again"; "The handle wipes the timer in the same instant it reports the stop" (`_session_peak`); record reale `6cda92017a0113003c00020000000000`.
- `docs/BLE_PROTOCOL.md` — intervallo di advertising "~10-30 seconds"; nessun advertising sul caricatore; `0x4050` handle time.

**GitHub (letto via API il 30/9/2026):** run `35964888095` (PR #7, 24/9): job `verify` e `native-android` `failure` in ~3 s con `runner_id: 0`, `runner_name: ""`, log HTTP 404; `get_workflow_run_usage`: 0 ms fatturati su 4 job. 198 run totali del workflow. Issue #3 aperta, nessun risultato hardware nei 4 commenti. PR #7 aperta e non unita; tutti i suoi run (n. 190–198) conclusi `failure` in 4–5 secondi.

**Audit e rapporti precedenti:** `AUDIT-2026-09-23-post-remediation.md` sul branch `claude/repository-audit-pdq4ds`; `docs/claude-ultracode-audit-remediation-2026-09-24.md` e `todo.md` sulla PR #7; `docs/post-audit-remediation-2026-09-23.md` su `main`.

**Advisory:** GHSA-rfgv-xxqx-mfg5, GHSA-3wwx-pv8p-q78v, GHSA-r53p-7pc4-xj5r (`undici` < 6.28.1); GHSA-qw65-cvwx-89v3, GHSA-58mr-gqgx-xq4g (`fast-uri` 3.1.6); GHSA-w3rx-r6r6-pgpr, GHSA-5p2g-fcmc-qvqq (`image-size` ≤ 2.0.2); GHSA-82fw-gwwq-j7x9 (`vitest` < 4.1.11, dev); GHSA-w5hq-g745-h8pq (`uuid` < 11.1.1, dev).

