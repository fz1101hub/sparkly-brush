# Stato del candidato post-audit

Aggiornato il 23 settembre 2026. Il ramo corrente è `fix/post-audit-device-reset-import-hardening`, basato su `main` al commit `d80c194`. Il parental gate resta deliberatamente fuori scope su richiesta del proprietario.

| # | Area | Stato | Evidenza o passo successivo |
|---:|---|---|---|
| 1 | Reset del manico per dispositivo | Completato | Nuova epoch BLE del solo device; progressi e storico preservati; race con riconnessione coperta. |
| 2 | Preflight e restore SQLite | Completato | Header bounded, copia privata verificata, validazione streaming, rollback e journal. |
| 3 | Backfill BLE offline | Completato nel codice | Recupero contiguo, rollover, batch atomico, `sessionCount` Base64 rigoroso e fail-closed. |
| 4 | Timestamp del manico | Completato nel codice | Clock relativo `uint32`, ricostruzione rollover-aware e date approssimate escluse dal calendario. |
| 5 | Timer manuale | Completato | Clock assoluto, sessione pendente su errore, messaggio accessibile e retry single-flight. |
| 6 | Progressione ed economia | Completato | Anti-farming per nuove sessioni, reward ledger e ledger acquisti con prezzo pagato. |
| 7 | Privacy backup | Completato | Alias BLE SHA-256, disclosure UI e nessun limite applicativo alla dimensione del file. |
| 8 | Archivio legacy parziale | Completato | Baseline lifetime preservata; replay completo vietato quando le righe fisiche sono incomplete; test diretto dello storage nativo. |
| 9 | CI e lockfile | Completato nel candidato | pnpm 12.5.1, workspace/override versionati, installazione frozen riprodotta da directory pulita. |
| 10 | Build native | Android locale completato | `assembleDebug` superato con SDK 36, NDK 27.1 e JDK 17. Il job iOS richiede il runner macOS della PR. |
| 11 | Collaudo hardware | Aperto | Checklist persistente di 13 casi e report sanitizzato pronti; esecuzione fisica nell’issue #3. |
| 12 | Parental gate | Escluso | Non sviluppato; da riaprire prima di una candidatura Kids/Families. |
| 13 | PR e merge | In attesa | Creare commit e PR dopo build locale; richiedere CI verde prima del merge. |

## Gate software superati

- `pnpm install --frozen-lockfile` con pnpm 12.5.1;
- fresh install da `package.json`, `pnpm-lock.yaml` e `pnpm-workspace.yaml`;
- `pnpm peers check` senza problemi;
- `pnpm check`;
- `pnpm test`: **26 file e 127 test superati**;
- `pnpm lint`: zero warning;
- `pnpm audit --prod --audit-level critical`: superato;
- `pnpm exec expo-doctor`: **18/18**;
- `pnpm exec expo install --check`: dipendenze compatibili;
- export Expo web, iOS e Android;
- build Android nativa `assembleDebug`: **superata**, 458 task Gradle;
- preview mobile web renderizzata a 390×844;
- re-review conclusive su BLE, archivio SQLite parziale e salvataggio manuale: **fixed, nessun blocker**.

## Rischi noti non bloccanti per la PR

Due advisory `high` riguardano `image-size`, dipendenza transitiva di Metro usata durante la build. Le pagine GitHub Reviewed non indicano ancora una versione corretta; la libreria non è esposta dal runtime mobile. La CI blocca gli advisory critici e il rischio è documentato in `docs/audit-source-notes-2026-09-23.md`.

## Condizioni prima della release pubblica

La compatibilità fisica definitiva richiede HX6322/04, iPhone e Android reali. Prima degli store servono inoltre privacy policy pubblica, dichiarazioni target audience/Data Safety, revisione trademark e una decisione esplicita su Kids/Families, Companion Device Manager e parental gate.
