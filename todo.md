# Stato del candidato Claude Ultracode post-audit

Aggiornato il 24 settembre 2026. Il ramo attivo è `fix/claude-ultracode-audit`, creato da `main` al commit `a7769e3`. Il parental gate resta deliberatamente fuori scope su richiesta del proprietario.

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
| 14 | Re-review e build finale | Completato localmente | Re-review BLE e SQLite senza blocker, 166 test e build Android nativa superati. Restano checkpoint, commit e PR; il merge richiede CI verde. |

## Gate software già superati sul candidato

- `pnpm install --frozen-lockfile` con pnpm 12.5.1;
- `pnpm peers check`;
- `pnpm check`;
- suite Vitest completa: **30 file e 166 test**;
- regressioni dedicate per first-use BLE, schema SQLite e reward ledger non finito incluse nella suite;
- `pnpm lint --max-warnings 0`;
- `pnpm audit --prod --audit-level critical`: superato, due advisory `high` residui;
- `pnpm exec expo-doctor`: **18/18**;
- `pnpm exec expo install --check`;
- export Expo web, iOS e Android.
- build Android nativa debug con SDK 36, JDK 17 e NDK 27.1.

## GitHub Actions

L’audit Claude ha riclassificato correttamente il blocco precedente come account-level: i job non ricevono runner e non producono step o log. Il workflow repository è stato ridimensionato per evitare sprechi quando l’esecuzione tornerà disponibile, ma la quota o policy dell’account GitHub deve essere verificata dal proprietario nelle impostazioni GitHub. Non verranno fatte nuove eccezioni di merge basate su una CI rossa.

## Supply chain

`pnpm audit` segnala due advisory `high` su `image-size` 1.2.1, dipendenza di Metro usata in fase di build. Gli advisory indicano `2.0.3` come release corretta; un override diretto è stato provato e ha causato un errore riproducibile nell’export Metro 0.83. Il lockfile è stato quindi ripristinato alla versione compatibile. L’audit critico resta verde e l’aggiornamento deve attendere una release Expo/Metro compatibile.

## Condizioni prima della release pubblica

Restano obbligatori il collaudo fisico HX6322/04 su iPhone e Android, una CI GitHub interamente verde, la build iOS nativa su runner macOS o Mac reale, privacy policy pubblica, dichiarazioni target audience/Data Safety, revisione trademark e una decisione esplicita su Kids/Families, Companion Device Manager e parental gate.
