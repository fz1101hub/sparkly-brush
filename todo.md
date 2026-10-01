# Stato del candidato Sparkly Brush — audit Claude Opus ed Expo 57

Aggiornato il 1° ottobre 2026. Il ramo attivo è `fix/claude-ultracode-audit`, creato da `main` al commit `a7769e3`. Il parental gate resta deliberatamente fuori scope su richiesta del proprietario. Dettagli e limiti della nuova [risposta all'audit Opus](docs/audit-opus-2026-10-01.md).

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
| 18 | Accessibilità automatica | Ampliata nel candidato | Contratti React Native, colori AA per home/starter/reward, Playwright + axe su **34 stati UI** (anche due starter alternativi e reward reale chiaro/scuro); non sostituisce l'audit con screen reader. |
| 19 | Maestro Android | Implementato, esecuzione device pendente | Due flow per percorso principale e checklist persistente; selettori coperti da Vitest e re-review verde. APK release E2E x86_64 da 53 MiB compilato; il sandbox non espone KVM, quindi l'esecuzione completa resta al runner Android o a una workstation. |
| 20 | E2E web funzionale | Completato e re-reviewato | Due percorsi Playwright verificano timer, ricompensa, storico dopo reload, checklist persistente e fallback backup. Il gate ha rilevato e chiuso una race reale del wake lock web; la review finale non ha trovato blocker sorgente o CI. |
| 21 | Localizzazione internazionale | Completata e re-reviewata | Interfaccia, errori, diagnostica e report in italiano, inglese, tedesco, francese e spagnolo; selezione Sistema/manuale persistente, backup legacy compatibile, 856 chiavi per catalogo, metadati nativi e percorso E2E dedicato. |
| 22 | Audit Claude Opus 5.5 | Correzioni software verificate localmente, PR da pubblicare | Fallback Kids senza `40d2` e sync alla riconnessione, picco timer BLE, fallback durevole e riconciliazione pre-batch, esclusione timer manuale, rollback Android URI/promise, demo nativa, permessi/audio, messaggi BLE, contrasto e lint esteso. Cinque scenari end-to-end con GATT finto **non sono test fisici**. |
| 23 | Build/permessi APK sul candidato | Build CI superata; gate APK aggiunto | `assembleDebug` del commit `f1639fd` riuscito su GitHub Actions. Il nuovo step decodifica con `apkanalyzer` il manifest dell'APK e valida location scoped, Bluetooth e assenza del servizio audio; sei test del validatore sono verdi localmente. L'esito del gate va ancora verificato sul prossimo run; manca Android SDK nel sandbox. |

## Gate software già superati sul candidato

- `pnpm install --frozen-lockfile` con pnpm 12.5.1;
- `pnpm peers check`;
- `pnpm check`;
- suite Vitest completa: **47 file e 305 test**;
- gate i18n dedicato: **73 test** su cataloghi, placeholder, formati, hydration, persistenza, migrazione, report e lifecycle BLE;
- regressioni dedicate per first-use BLE, schema SQLite e reward ledger non finito incluse nella suite;
- stress pluriennale e multi-timezone superato;
- Playwright + axe superato su **34 stati UI** chiari/scuri con starter alternativi e modal ricompensa reale, report separati per stato;
- tre percorsi Playwright funzionali superati in **46,8 s**, incluso cambio tra cinque lingue, modalità Sistema e persistenza dopo reload;
- contratto statico Maestro e re-review del percorso E2E superati;
- `pnpm lint` a zero warning esteso a `app`, `components`, `contexts`, `lib`, `hooks`, `constants`;
- `pnpm audit --prod --audit-level high`: superato, nessuna vulnerabilità nota;
- `pnpm exec expo-doctor`: **21/21** con Expo 57.0.26;
- `pnpm exec expo install --check`;
- export Expo web, iOS e Android;
- prebuild iOS/Android multilingua superato con cinque `InfoPlist.strings`, cinque directory Android `values-b+*` e rimozioni location `tools:node="remove"` nel manifest dell'app (non è l'APK merged);
- build Android nativa debug **Expo 57.0.26 superata per `f1639fd` in GitHub Actions** con JDK 17; il sandbox corrente non contiene Android SDK né JDK 17, quindi non viene dichiarata una compilazione locale. Il nuovo gate APK dovrà essere verificato nel prossimo run;
- sei test Python locali sul validatore fail-closed del manifest APK compilato: permessi location legacy con `maxSdkVersion ≤ 30`, flag BLE, servizio audio e input mancanti/malformati.

## GitHub Actions

Il blocco storico zero-step è cessato: [Verify 36814653403](https://github.com/fz1101hub/sparkly-brush/actions/runs/36814653403) ha completato `verify` e `native-android` realmente e con esito verde sul commit `f1639fd`. `native-ios` e `e2e-android` sono stati **saltati per condizione**, non dichiarati testati. La PR resta aperta: prima del merge occorre anche il run verde del nuovo gate APK e la decisione sul collaudo fisico dell'issue #3.

## Supply chain

Expo 57 ha rimosso `image-size` dal grafo delle dipendenze. `pnpm audit --prod --audit-level high` non rileva vulnerabilità note e `pnpm peers check` passa dopo l’allineamento di `@react-native/metro-config` a React Native 0.86.3.

## Condizioni prima della release pubblica

Restano obbligatori il collaudo fisico HX6322/04 su iPhone e Android, una CI GitHub interamente verde, l’esecuzione dei flow Maestro sul runner Android, la build iOS nativa configurata su `macos-26` con Xcode 26.4.1, privacy policy pubblica, dichiarazioni target audience/Data Safety, revisione trademark e una decisione esplicita su Kids/Families, Companion Device Manager e parental gate.
