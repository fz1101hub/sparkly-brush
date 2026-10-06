# Stato del candidato Sparkly Brush — audit Claude Opus ed Expo 57

Aggiornato il 6 ottobre 2026. Il ramo attivo è `fix/claude-ultracode-audit`, creato da `main` al commit `a7769e3`; il ramo `ccr-2641c3c7-7vb0o0` lo include (merge di `6b9632c`) e aggiunge la verifica indipendente e le correzioni del 6 ottobre ([dettagli](docs/verifica-correzioni-2026-10-06.md)). Il parental gate resta deliberatamente fuori scope su richiesta del proprietario. Dettagli e limiti della nuova [risposta all'audit Opus](docs/audit-opus-2026-10-01.md).

| # | Area | Stato | Evidenza o passo successivo |
|---:|---|---|---|
| 1 | Doppi accrediti fallback BLE | Corretto nel candidato | Coda bounded multi-fallback, correlazione col successore GATT, compensazione contabile e teardown serializzato. |
| 2 | Anti-replay dopo reset del manico | Corretto nel candidato | Baseline precedente obbligatoria; contatore post-reset basso e coerente; blocco nel client e negli storage; copy UI restrittivo. |
| 3 | Backup cross-timezone | Corretto nel candidato | Progressione e manifest portatili derivano dal replay del ledger esportato; test con cambio di fuso. |
| 4 | Schema SQLite importato | Corretto nel candidato | Allowlist di tabelle e indici; trigger, view e oggetti sconosciuti falliscono prima della copia nel DB principale. |
| 5 | Numeri SQLite non finiti | Corretto nel candidato | Validazione fail-closed di timestamp, durate, target, flag e device session id. |
| 6 | Report hardware | Corretto nel candidato | Redazione limitata a label identificative e pattern MAC/UUID; stati Bluetooth ordinari preservati. |
| 7 | CI e costi runner | Corretto nel workflow | I branch `feat/**` e `fix/**` sono verificati quando aprono una PR verso `main`; niente doppio trigger push+PR, concurrency, docs ignorati e macOS solo su tag o dispatch. |
| 8 | Sessione manuale pendente | Corretto nel candidato | Journal AsyncStorage, recupero al riavvio, retry single-flight e blocco di nuove sessioni fino al salvataggio. |
| 9 | Migrazione ledger acquisti | Corretto nel candidato | Lo stato normalizzato viene persistito al primo load anche senza nuovi acquisti. |
| 10 | File condivisi Android | Corretto nel candidato | Backup e report restano in cache dopo l’handoff allo share sheet; gli errori prima dell’handoff eseguono cleanup. |
| 11 | Privacy backup | Rafforzata | Alias BLE deterministici qualificati come pseudonimi; guardia runtime sugli ID portatili; nessun MAC/UUID grezzo ammesso. |
| 12 | Collaudo hardware reale | Aperto | Checklist persistente di 13 casi; esecuzione fisica nell’issue #3 con HX6322/04, iPhone e Android. |
| 13 | Parental gate | Escluso | Non sviluppato; da riaprire prima di una candidatura Kids/Families. |
| 14 | Re-review audit Claude | Completata localmente | Re-review BLE e SQLite senza blocker, 166 test e build Android nativa pre-upgrade superati. Checkpoint `69c1c27` e PR #7 pubblicati; il merge richiede CI verde. |
| 15 | Expo e Metro | Aggiornato a SDK 57 | Upgrade incrementale 54→55→56→57; React Native 0.86.3, React 19.2.3, TypeScript 6.0.3, Expo Router 57. `image-size` non è più nel grafo. |
| 16 | Renderer dei test React | Modernizzato | `react-test-renderer` e i relativi tipi diretti rimossi; i test provider usano Test Renderer 1.2 compatibile con React 19.2. |
| 17 | Stress lifetime e backup | Completato | 14.610 sessioni/20 anni, 20.000 righe streaming, 40 manici, rollover e tre fusi orari; stato del validatore sotto 4 KiB. |
| 18 | Accessibilità automatica | Ampliata nel candidato | Contratti React Native, colori AA per home/starter/reward/backup, Playwright + axe su **42 stati UI**, inclusa la conferma restore chiara/scura; non sostituisce l'audit con screen reader. |
| 19 | Maestro Android | **Due flow riusciti** su emulatore | [Dispatch 36829538328](https://github.com/fz1101hub/sparkly-brush/actions/runs/36829538328): APK release installato, percorso principale e checklist persistente passati su emulatore API 36 con KVM. Non è test BLE del manico reale. |
| 20 | E2E web funzionale | Completato e ampliato | Cinque percorsi Playwright verificano timer, ricompensa, storico dopo reload, checklist persistente, conferma/annullamento del restore legacy, lingue e CTA del modal su viewport 320×640. Il nuovo test ha rilevato e chiuso la riapertura di un premio già gestito dopo restore. |
| 21 | Localizzazione internazionale | Completata e re-reviewata | Interfaccia, errori, diagnostica e report in italiano, inglese, tedesco, francese e spagnolo; selezione Sistema/manuale persistente, backup legacy compatibile, 874 chiavi per catalogo, metadati nativi e percorso E2E dedicato. |
| 22 | Audit Claude Opus 5.5 | Correzioni software pubblicate nella PR #7 | Fallback Kids senza `40d2` e sync alla riconnessione, picco timer BLE, fallback durevole e riconciliazione pre-batch, esclusione timer manuale, rollback Android URI/promise, demo nativa, permessi/audio, messaggi BLE, contrasto e lint esteso. Cinque scenari end-to-end con GATT finto **non sono test fisici**. |
| 23 | Build/permessi APK sul candidato | Completata in CI | `assembleDebug`, otto test parser e verifica del manifest dell'APK con `apkanalyzer` riusciti nel [run 36819513631](https://github.com/fz1101hub/sparkly-brush/actions/runs/36819513631). Il parser riconosce `neverForLocation` sia simbolico sia come bitmask AOSP `0x00010000`. |
| 24 | Build iOS per simulatore | Completata in CI manuale | Prebuild, CocoaPods e `xcodebuild` riusciti nel [run 36821117795](https://github.com/fz1101hub/sparkly-brush/actions/runs/36821117795) su macOS/Xcode; non è un test BLE su iPhone fisico. |
| 25 | Conferma ripristino locale | Pubblicata, CI reale verde | File completo nativo e codice legacy richiedono una seconda azione annullabile; selezione del codice/file invalida la conferma precedente. E2E web prova cancel, persistenza, invalidazione, conferma e assenza di ricompensa duplicata. Il picker del file completo resta da provare su iOS/Android reali. |
| 26 | Confronto prima del ripristino | Pubblicato, CI reale verde | Metadati bounded mostrano Brushling, sessioni lifetime/totali e completate, oggetti e premi locali vs backup; righe verificate o consultabili separate; avviso se il backup ha progressi inferiori e sempre nota che i dati **non sono uniti**. Test file/legacy pluriennali, E2E web e due nuovi scan axe; fix AA del pulsante oro. Non legge tutte le righe per l'anteprima. |
| 27 | Cleanup backup SQLite temporanei | Pubblicato, CI reale verde | In caso di ENOSPC durante la copia, SQLite open o close falliti, elimina il file temporaneo incompleto in cache. Una review indipendente ha fatto ripristinare la semantica precedente per il file passato al restore: su close fallita non viene eliminato. Sei test con fault injection; il comportamento va verificato sul file system iOS/Android reale. |
| 28 | Import file SQLite su emulatore Android | Picker raggiunto in precedenza; flow corretto, **runner bloccato** | Fixture sintetica di 125 sessioni: integrità SQLite, 125 righe in archivio contro 120 visibili, manifest/ledger verificati localmente. Nel [dispatch 36946358134](https://github.com/fz1101hub/sparkly-brush/actions/runs/36946358134), build Android/iOS e i due flow precedenti sono verdi; il nuovo flow ha selezionato il file, poi la pagina è tornata in cima e l'attesa della preview è scaduta. Aggiunto scroll con soglia 20% e test statico; il [dispatch aggiornato 36949602454](https://github.com/fz1101hub/sparkly-brush/actions/runs/36949602454) è fallito con **zero step**, quindi il fix non è ancora verificato in emulatore. Nessun dato dell'utente. |
| 29 | Advisory di sicurezza `node-forge` | **Blocco CI aperto**, [issue #8](https://github.com/fz1101hub/sparkly-brush/issues/8) | GHSA-86w9-cpqp-85rv (high) affligge `node-forge <=1.4.0` via `expo > @expo/cli`; versione corretta ufficiale **non disponibile** al 2 ottobre. Audit ancora bloccante, spostato dopo browser/export per non nascondere quei risultati. Non fare merge né silenziare il gate. |
| 30 | Runner GitHub Actions | **Blocco esterno aperto**, [issue #9](https://github.com/fz1101hub/sparkly-brush/issues/9) | Sul commit `bd15839`, run PR `36949550949` e dispatch `36949602454` hanno chiuso tutti i job senza step e senza runner assegnato (`runner_id=0`), prima di checkout. Non dimostrano un errore applicativo. Fermati ulteriori retry fino al ripristino dei runner. |
| 31 | Verifica indipendente delle correzioni all'audit | Completata il 6 ottobre | Test di riproduzione dell'audit rieseguiti su `6b9632c`: C1, M1–M4, G1 verdi (con il finto manico allineato al `BleError` reale, codice 404); S1, M3 e G1 verificati anche su SQLite reale. Resta S3 (codici testuali v1/v2), decisione di prodotto. |
| 32 | Storage nativo su SQLite reale | Aggiunto alla suite | Progetto Vitest `native-sqlite` in `pnpm test` (22 test): storage nativo reale su `node:sqlite`, riavvii e crash simulati; i test di regressione falliscono sul codice precedente alle correzioni. Richiede Node ≥ 22.16. |
| 33 | Record BLE caricato lentamente | Corretto | Fino a tre letture (180/360/720 ms) prima di fallire in modo chiuso (audit B6). |
| 34 | Valori di "oggi" dopo mezzanotte | Corretto | Hook `useCurrentDayTimestamp`: missioni, sessioni di oggi, serie e dashboard settimanale si aggiornano al cambio di giorno e al ritorno in primo piano (audit U6). |
| 35 | Dati demo riconoscibili | Corretto | Banner demo in Oggi, Storico e Area genitori, etichetta "Sessione demo"; banner leggibile nel tema scuro e pulsanti ≥ 4,5:1; 6 nuovi stati axe (audit U4). |
| 36 | Contrasto pulsante Elimina dello Storico | Corretto | `error` chiaro da `#D33D5D` (4,34:1) a `#BE2D4C` (5,44:1), trovato dalla nuova scansione demo. |
| 37 | Errore di inizializzazione dei dati | Corretto | Pulsante "Riprova" in `DataRecoveryGate` (audit S4). |
| 38 | Titolo condivisione backup | Corretto | Tradotto nelle cinque lingue (audit L2). |
| 39 | Advisory 6 ottobre | Parziale | `source-map-js` 1.2.2 (GHSA-68fv-2mgg-jv7q) via override; `node-forge` e il nuovo `braces` (GHSA-vfj7-8cjw-p6xm) senza versione corretta: gate `high` ancora rosso. |

## Gate software già superati sul candidato

- `pnpm install --frozen-lockfile` con pnpm 12.5.1;
- `pnpm peers check`;
- `pnpm check`;
- suite Vitest completa: **58 file e 352 test** al 6 ottobre, di cui 22 del progetto `native-sqlite` su SQLite reale (sul candidato del 2 ottobre: 50 file e 323 test);
- gate i18n dedicato: **74 test** su cataloghi (almeno 874 chiavi), placeholder, formati, hydration, persistenza, migrazione, report e lifecycle BLE;
- regressioni dedicate per first-use BLE, schema SQLite e reward ledger non finito incluse nella suite;
- stress pluriennale e multi-timezone superato;
- Playwright + axe superato su **42 stati UI** chiari/scuri con starter alternativi, reward reale, confronto backup prima della conferma e settimana demo su Oggi, Storico e Area genitori, report separati per stato;
- cinque percorsi Playwright funzionali superati, incluso confronto di un backup più vecchio, annullamento/restore legacy con persistenza, viewport 320×640, cinque lingue e modalità Sistema;
- contratto statico Maestro superato e **due flow Android reali su emulatore** riusciti;
- `pnpm lint` a zero warning esteso a `app`, `components`, `contexts`, `lib`, `hooks`, `constants`;
- `pnpm audit --prod --audit-level high`: **non superato dal 2 ottobre 2026** per [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) in node-forge e, dal 6 ottobre, [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) in braces, entrambi senza versione corretta; l'esito verde degli audit precedenti appartiene a run anteriori all'aggiornamento advisory;
- `pnpm exec expo-doctor`: **21/21** con Expo 57.0.26;
- `pnpm exec expo install --check`;
- export Expo web, iOS e Android;
- prebuild iOS/Android multilingua superato con cinque `InfoPlist.strings`, cinque directory Android `values-b+*` e rimozioni location `tools:node="remove"` nel manifest dell'app (non è l'APK merged);
- build Android nativa debug e controllo del manifest APK **Expo 57.0.26 superati per `748f2ff` in GitHub Actions** con JDK 17; il sandbox corrente non contiene Android SDK né JDK 17, quindi non viene dichiarata una compilazione locale;
- build iOS per simulatore con Xcode riuscita nel dispatch `36829538328`; nello stesso run entrambi i flow Android sono passati;
- otto test Python locali sul validatore fail-closed del manifest APK compilato: permessi location legacy con `maxSdkVersion ≤ 30`, bitmask numerica/simbolica del flag BLE, servizio audio e input mancanti/malformati.

## GitHub Actions

Il blocco storico zero-step è **ricomparso**: [Verify 36940477890](https://github.com/fz1101hub/sparkly-brush/actions/runs/36940477890) è l'ultimo run PR interamente verde sul commit `a00ae4e`, prima dell'advisory. Nel [dispatch 36946358134](https://github.com/fz1101hub/sparkly-brush/actions/runs/36946358134), `native-android`, `native-ios` e i due vecchi flow Maestro sono riusciti; `verify` è rosso per l'audit node-forge e il terzo flow si è fermato dopo il picker. [Run PR 36949550949](https://github.com/fz1101hub/sparkly-brush/actions/runs/36949550949) e [dispatch 36949602454](https://github.com/fz1101hub/sparkly-brush/actions/runs/36949602454) del commit `bd15839` hanno terminato **tutti i job a zero step e runner_id=0**, prima di checkout. Fermati ulteriori dispatch. La PR resta aperta finché le issue #8/#9 non sono risolte e il collaudo fisico #3 non è valutato.

## Supply chain

Expo 57 ha rimosso `image-size` dal grafo delle dipendenze, e `pnpm peers check` resta verde dopo l’allineamento di `@react-native/metro-config` a React Native 0.86.3. **Dal 2 ottobre** l'audit high rileva GHSA-86w9-cpqp-85rv in `node-forge@1.4.0`: nessuna patch è indicata dall'[advisory ufficiale](https://github.com/advisories/GHSA-86w9-cpqp-85rv). Non è una regressione di Expo testabile con override a una release inesistente; seguire l'[issue #8](https://github.com/fz1101hub/sparkly-brush/issues/8), mantenendo l'audit bloccante.

## Condizioni prima della release pubblica

Restano obbligatori il collaudo fisico HX6322/04 su iPhone e Android, una CI GitHub verde sul candidato finale, privacy policy pubblica, dichiarazioni target audience/Data Safety, revisione trademark e una decisione esplicita su Kids/Families, Companion Device Manager e parental gate. I flow Maestro e la build iOS per simulatore sono riusciti, ma non sostituiscono i test su hardware reale.
