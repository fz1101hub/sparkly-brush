# Verifica indipendente delle correzioni e sviluppo del 6 ottobre 2026

**Ramo:** `ccr-2641c3c7-7vb0o0`, che contiene la PR #7 al commit `6b9632c` (merge), i documenti dell'audit del 30 settembre e i commit descritti qui.
**Oggetto della verifica:** le correzioni pubblicate nella PR #7 il 1–2 ottobre in risposta all'[audit indipendente del 30/9](audit-indipendente-2026-09-30.md) ([risposta tecnica](audit-opus-2026-10-01.md)).
**Limiti:** nessun hardware (manico, iPhone, Android), nessun Android SDK o Xcode, rete senza accesso ad `api.expo.dev`. Tutto ciò che riguarda il BLE è verificato su una simulazione del dump GATT reale HX6340, non sull'HX6322/04.

## Sintesi

- **Le correzioni dichiarate reggono.** Sul nuovo head passano tutti i test di riproduzione dell'audit tranne S3, che il proprietario ha classificato come decisione di prodotto. S1 (restore interrotto su Android), M3 e G1 sono verificati anche su un motore SQLite reale.
- **Una correzione all'audit stesso.** Nel finto manico dell'Appendice A la lettura di una caratteristica assente lanciava un `Error` senza codice, mentre `react-native-ble-plx` rifiuta con `errorCode: 404`. La correzione di C1 riconosce proprio quel codice, quindi con il vecchio finto manico F1 risultava fallito anche sul codice corretto. L'appendice è aggiornata; su `a7769e3` e `7d0e305` gli esiti restano quelli del 30/9 (verificato).
- **Sviluppo:** lo storage nativo gira ora su SQLite reale dentro `pnpm test`; corretti sei difetti residui dell'audit (B6, U6, U4, S4, L2 e due problemi di contrasto emersi dalle nuove scansioni) e un advisory.
- **Restano aperti:** collaudo hardware (#3), CI senza runner (#9), due advisory `high` senza versione corretta (#8 e `braces`), alcune decisioni di prodotto (§5).

## 1. Verifica delle correzioni dell'audit

| Rilievo | Correzione nella PR #7 | Verifica | Esito |
|---|---|---|---|
| C1 — sync senza `40d2` | Se `40d2` manca (`BleError` 404) la prima sync importa solo `latest` e crea il cursore | F1a/F1b con finto manico HX6340; lettura del client | Corretto in simulazione; resta da provare sull'HX6322/04 |
| M1 — timer azzerato prima dello stop | Picco di `elapsedSeconds` conservato per tutta la sessione | F3 | Corretto |
| M2 — sync con soli record precedenti | Fallback live salvato prima della sync | F2 | Corretto |
| M3 — doppio accredito (regressione PR #7) | Corrispondenza fallback↔record calcolata sullo stato pre-batch | F5a/F5b (web), F5c (DB finto), nuovi test su SQLite reale anche dopo un riavvio | Corretto |
| M4 — timer manuale + BLE | Timer manuale annullato quando inizia una sessione BLE; avvio manuale bloccato durante la spazzolata | F7 | Corretto per il manico collegato (vedi §5 per il caso non collegato) |
| S1 — restore interrotto su Android | Percorso di rollback come URI `file://`; apertura fallita non più in cache | Harness SQLite reale in modalità Android | Corretto |
| G1 — demo su iOS/Android | Lo store demo accetta `source: "demo"`, SQLite no | Test G1 e test su SQLite reale | Corretto |
| I1 — errori BLE generici | Messaggi noti tradotti e mostrati, eccezioni arbitrarie mascherate | Lettura del provider | Corretto |
| B1, B2 — sync e scansione | Sync dopo ogni connessione riuscita; scansione di 45 s | Lettura del codice, test del client | Corretto |
| U2 — lint limitato alle schermate | Lint esteso a `lib`, `contexts`, `hooks`, `constants` | `pnpm lint` | Corretto |
| K1, K2 — permessi e audio in background | `blockedPermissions`, `neverForLocation`, `enableBackgroundPlayback: false` | Non riverificato: serve una build Android (il gate APK della CI lo controlla) | Non verificato qui |
| S3 — codici testuali v1/v2 falsificabili | Nessuna (decisione di prodotto) | Test S3 ancora fallito | Aperto |
| G2 — premi dei genitori già sbloccati | Semantica lifetime mantenuta e spiegata nella UI | — | Decisione di prodotto |

## 2. Sviluppo di questo intervento

| Commit | Rilievo | Cosa cambia |
|---|---|---|
| `build: aggiorna source-map-js a 1.2.2` | advisory | Override mirato per GHSA-68fv-2mgg-jv7q; il lockfile cambia solo per questo pacchetto. |
| `test: esegui lo storage nativo su un motore SQLite reale` | S2 | Progetto Vitest `native-sqlite` in `pnpm test`: il vero `brush-storage.native.ts` su `node:sqlite` con il livello JS reale di expo-sqlite, percorsi iOS/Android, riavvii e crash simulati. 22 test, tra cui regressioni per S1, M3 e G1 che falliscono sul codice di `7d0e305` e passano su quello attuale. Richiede Node ≥ 22.16. |
| `fix(ble): rileggi il record selezionato…` | B6 | Fino a tre letture del record selezionato (180, 360, 720 ms) prima di fallire in modo chiuso: un manico lento non blocca più l'intero batch. |
| `fix(i18n): titolo del foglio di condivisione…` | L2 | Titolo del foglio di condivisione del backup nelle cinque lingue. |
| `fix: aggiorna i valori di "oggi" dopo la mezzanotte` | U6 | Hook `useCurrentDayTimestamp`: missioni, sessioni di oggi, serie e dashboard settimanale si aggiornano al cambio di giorno e al ritorno in primo piano. |
| `fix(ui): segnala i dati demo…` | U4 | Banner demo in Oggi, Storico e Area genitori, etichetta "Sessione demo". Il banner era quasi invisibile nel tema scuro (1,03:1) e il suo pulsante "Esci" era a 3,63:1: ora tutti i testi sono ≥ 4,5:1. Sei nuovi stati axe. |
| `fix(a11y): contrasto AA per il pulsante Elimina…` | nuovo | Il pulsante "Elimina" dello Storico era a 4,34:1; compare solo con storico non vuoto, quindi le scansioni precedenti non lo vedevano. |
| `fix: pulsante Riprova…` | S4 | `DataRecoveryGate` offre "Riprova" invece di chiedere solo di riavviare l'app. |

## 3. Gate eseguiti il 6 ottobre (sandbox, pnpm 12.5.1, Node 22.22.2)

| Gate | Esito |
|---|---|
| `pnpm install --frozen-lockfile`, `pnpm peers check` | Superati |
| `pnpm check` (TypeScript 6) | Superato |
| `pnpm test` | **58 file, 352 test** (22 su SQLite reale) |
| `pnpm test:i18n`, `pnpm test:stress`, `pnpm test:a11y:semantic` | 74 test; stress pluriennale e tre fusi; superati |
| `pnpm lint` | Zero errori e warning |
| Playwright funzionale web | 5/5 |
| Playwright + axe | 7/7 test, **42 stati UI** chiari e scuri |
| `expo export` web, iOS, Android | Superati |
| `expo-doctor` | 19/21: i due controlli mancanti richiedono rete (schema Expo e React Native Directory) |
| `pnpm audit --prod --audit-level high` | **Rosso**: `node-forge` ≤ 1.4.0 (GHSA-86w9-cpqp-85rv) e `braces` ≤ 3.0.3 (GHSA-vfj7-8cjw-p6xm), entrambi senza versione corretta; più un `moderate` in `postcss-selector-parser` 6.x |

I due gate Playwright sono stati eseguiti con il Chromium preinstallato nel sandbox (configurazione temporanea, non inclusa nel repository), perché la versione richiesta da `@playwright/test` non era disponibile offline. Non eseguiti: build Gradle e Xcode, flow Maestro, qualunque prova su hardware.

## 4. CI

L'ultimo run di GitHub Actions è del 2 ottobre (`6b9632c`), terminato a zero step come i precedenti (issue #9). I push sul ramo `ccr-2641c3c7-7vb0o0` non avviano la CI: il workflow parte per le PR verso `main`, per i push su `main` e sui tag, oppure a mano (`workflow_dispatch`). Per verificare questi commit su runner indipendenti servono quindi un avvio manuale, una PR o l'avanzamento di `fix/claude-ultracode-audit` (la PR #7): il merge di questo ramo lì sarebbe un fast-forward finché `fix/claude-ultracode-audit` resta a `6b9632c`.

## 5. Aperto

1. **Collaudo hardware (#3).** Tutta la logica BLE è verificata solo in simulazione. Le sei domande del §12 dell'audit restano il modo più rapido per confermare C1, M1, M2 e B6.
2. **Advisory senza patch.** `node-forge` e `braces` bloccano il gate `high`; aggiornare appena escono versioni corrette, senza silenziare il gate.
3. **Decisioni di prodotto**, non toccate:
   - **S3** — validare semanticamente i codici testuali v1/v2 o dismetterli: oggi un codice modificato può importare aggregati arbitrari e sbloccare i premi dei genitori.
   - **G2** — far contare i premi dei genitori dal momento della creazione.
   - **B3** — abbinare l'app a un manico specifico: in una famiglia con più spazzolini l'app si collega al primo che trova e ne importa i record.
   - **B4** — quando il divario dal cursore supera la memoria del manico la sync fallisce a ogni tentativo; accettare la perdita richiede una scelta esplicita e dati reali sulla memoria del manico.
   - **B5** — su iOS la richiesta di permesso Bluetooth compare all'avvio, prima dell'onboarding; spostarla al primo "Cerca e collega" richiede di attendere lo stato `PoweredOn` dentro la scansione e una prova su iPhone.
   - **M4 senza manico collegato** — se si usa il timer manuale mentre si spazzola con il manico non collegato, il record importato in seguito conta come seconda sessione (la riconciliazione considera solo i fallback del manico). È coerente con un timer valido anche per spazzolini non collegati, ma va deciso.
   - **G4, G9, L1** — debito nascosto dopo "Cancella storico", limite di 40 premi applicato solo dal backup, plurali.
