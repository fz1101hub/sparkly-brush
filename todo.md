# Stato del candidato Sparkly Brush — audit Claude Opus ed Expo 57

Aggiornato il 2 ottobre 2026. Il ramo attivo è `fix/claude-ultracode-audit`, creato da `main` al commit `a7769e3`. Il parental gate resta deliberatamente fuori scope su richiesta del proprietario. Dettagli e limiti della nuova [risposta all'audit Opus](docs/audit-opus-2026-10-01.md).

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
| 18 | Accessibilità automatica | Ampliata nel candidato | Contratti React Native, colori AA per home/starter/reward/backup, Playwright + axe su **36 stati UI**, inclusa la conferma restore chiara/scura; non sostituisce l'audit con screen reader. |
| 19 | Maestro Android | **Due flow riusciti** su emulatore | [Dispatch 36829538328](https://github.com/fz1101hub/sparkly-brush/actions/runs/36829538328): APK release installato, percorso principale e checklist persistente passati su emulatore API 36 con KVM. Non è test BLE del manico reale. |
| 20 | E2E web funzionale | Completato e ampliato | Cinque percorsi Playwright verificano timer, ricompensa, storico dopo reload, checklist persistente, conferma/annullamento del restore legacy, lingue e CTA del modal su viewport 320×640. Il nuovo test ha rilevato e chiuso la riapertura di un premio già gestito dopo restore. |
| 21 | Localizzazione internazionale | Completata e re-reviewata | Interfaccia, errori, diagnostica e report in italiano, inglese, tedesco, francese e spagnolo; selezione Sistema/manuale persistente, backup legacy compatibile, 874 chiavi per catalogo, metadati nativi e percorso E2E dedicato. |
| 22 | Audit Claude Opus 5.5 | Correzioni software pubblicate nella PR #7 | Fallback Kids senza `40d2` e sync alla riconnessione, picco timer BLE, fallback durevole e riconciliazione pre-batch, esclusione timer manuale, rollback Android URI/promise, demo nativa, permessi/audio, messaggi BLE, contrasto e lint esteso. Cinque scenari end-to-end con GATT finto **non sono test fisici**. |
| 23 | Build/permessi APK sul candidato | Completata in CI | `assembleDebug`, otto test parser e verifica del manifest dell'APK con `apkanalyzer` riusciti nel [run 36819513631](https://github.com/fz1101hub/sparkly-brush/actions/runs/36819513631). Il parser riconosce `neverForLocation` sia simbolico sia come bitmask AOSP `0x00010000`. |
| 24 | Build iOS per simulatore | Completata in CI manuale | Prebuild, CocoaPods e `xcodebuild` riusciti nel [run 36821117795](https://github.com/fz1101hub/sparkly-brush/actions/runs/36821117795) su macOS/Xcode; non è un test BLE su iPhone fisico. |
| 25 | Conferma ripristino locale | Pubblicata, CI reale verde | File completo nativo e codice legacy richiedono una seconda azione annullabile; selezione del codice/file invalida la conferma precedente. E2E web prova cancel, persistenza, invalidazione, conferma e assenza di ricompensa duplicata. Il picker del file completo resta da provare su iOS/Android reali. |
| 26 | Confronto prima del ripristino | Pubblicato, CI reale verde | Metadati bounded mostrano Brushling, sessioni lifetime/totali e completate, oggetti e premi locali vs backup; righe verificate o consultabili separate; avviso se il backup ha progressi inferiori e sempre nota che i dati **non sono uniti**. Test file/legacy pluriennali, E2E web e due nuovi scan axe; fix AA del pulsante oro. Non legge tutte le righe per l'anteprima. |
| 27 | Cleanup backup SQLite temporanei | Pubblicato, CI reale verde | In caso di ENOSPC durante la copia, SQLite open o close falliti, elimina il file temporaneo incompleto in cache. Una review indipendente ha fatto ripristinare la semantica precedente per il file passato al restore: su close fallita non viene eliminato. Sei test con fault injection; il comportamento va verificato sul file system iOS/Android reale. |
| 28 | Import file SQLite su emulatore Android | Nuovo flow pronto, dispatch da eseguire | Fixture sintetica di 125 sessioni generata dalla logica lifetime/reward reale: integrità SQLite, 125 righe in archivio contro 120 visibili, manifest/ledger verificati localmente. Il terzo flow Maestro prova picker di sistema, anteprima, annullamento, conferma e persistenza dopo riavvio; non è ancora un test eseguito finché il workflow manuale non passa. Non contiene dati dell'utente. |

## Gate software già superati sul candidato

- `pnpm install --frozen-lockfile` con pnpm 12.5.1;
- `pnpm peers check`;
- `pnpm check`;
- suite Vitest completa: **50 file e 321 test** (sei fault injection native e due regressioni fixture sintetica);
- gate i18n dedicato: **74 test** su cataloghi (almeno 874 chiavi), placeholder, formati, hydration, persistenza, migrazione, report e lifecycle BLE;
- regressioni dedicate per first-use BLE, schema SQLite e reward ledger non finito incluse nella suite;
- stress pluriennale e multi-timezone superato;
- Playwright + axe superato su **36 stati UI** chiari/scuri con starter alternativi, reward reale e confronto backup prima della conferma, report separati per stato;
- cinque percorsi Playwright funzionali superati, incluso confronto di un backup più vecchio, annullamento/restore legacy con persistenza, viewport 320×640, cinque lingue e modalità Sistema;
- contratto statico Maestro superato e **due flow Android reali su emulatore** riusciti;
- `pnpm lint` a zero warning esteso a `app`, `components`, `contexts`, `lib`, `hooks`, `constants`;
- `pnpm audit --prod --audit-level high`: superato, nessuna vulnerabilità nota;
- `pnpm exec expo-doctor`: **21/21** con Expo 57.0.26;
- `pnpm exec expo install --check`;
- export Expo web, iOS e Android;
- prebuild iOS/Android multilingua superato con cinque `InfoPlist.strings`, cinque directory Android `values-b+*` e rimozioni location `tools:node="remove"` nel manifest dell'app (non è l'APK merged);
- build Android nativa debug e controllo del manifest APK **Expo 57.0.26 superati per `748f2ff` in GitHub Actions** con JDK 17; il sandbox corrente non contiene Android SDK né JDK 17, quindi non viene dichiarata una compilazione locale;
- build iOS per simulatore con Xcode riuscita nel dispatch `36829538328`; nello stesso run entrambi i flow Android sono passati;
- otto test Python locali sul validatore fail-closed del manifest APK compilato: permessi location legacy con `maxSdkVersion ≤ 30`, bitmask numerica/simbolica del flag BLE, servizio audio e input mancanti/malformati.

## GitHub Actions

Il blocco storico zero-step è cessato: [Verify 36917122348](https://github.com/fz1101hub/sparkly-brush/actions/runs/36917122348) ha completato `verify` e `native-android` realmente verdi sul commit `9c2d783` (cleanup SQLite). Nel [dispatch 36829538328](https://github.com/fz1101hub/sparkly-brush/actions/runs/36829538328) le build iOS/Android e **entrambi** i flow Maestro precedenti sono passati; il job `verify` di quel dispatch è fallito per un mock `ScrollView` poi corretto nel run PR verde. Il terzo flow di import SQLite richiede CI e dispatch manuale sul proprio commit; la PR resta aperta e non sarà unita senza valutare l'issue hardware #3.

## Supply chain

Expo 57 ha rimosso `image-size` dal grafo delle dipendenze. `pnpm audit --prod --audit-level high` non rileva vulnerabilità note e `pnpm peers check` passa dopo l’allineamento di `@react-native/metro-config` a React Native 0.86.3.

## Condizioni prima della release pubblica

Restano obbligatori il collaudo fisico HX6322/04 su iPhone e Android, una CI GitHub verde sul candidato finale, privacy policy pubblica, dichiarazioni target audience/Data Safety, revisione trademark e una decisione esplicita su Kids/Families, Companion Device Manager e parental gate. I flow Maestro e la build iOS per simulatore sono riusciti, ma non sostituiscono i test su hardware reale.
