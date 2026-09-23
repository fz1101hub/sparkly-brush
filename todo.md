# Stato hardening finale

Aggiornato il 23 settembre 2026. Il parental gate resta deliberatamente fuori scope su richiesta del proprietario del progetto.

| # | Punto | Stato | Evidenza o passo successivo |
|---:|---|---|---|
| 1 | Lockfile e CI | Completato | Installazione frozen; CI con TypeScript, 73 test, lint zero-warning, audit critico, Expo Doctor ed export web/iOS/Android. |
| 2 | Race di idratazione e test | Completato | Test provider per profili Voltuff e Moonbit caricati prima dello storico. |
| 3 | Profilo lifetime e reward ledger | Completato | SQLite transazionale, progressione senza limite applicativo, ledger idempotente e backup v3. |
| 4 | Parental gate | Escluso | Non sviluppato per richiesta esplicita; resta necessario prima di candidare l’app alla categoria Kids. |
| 5 | Utility streak | Completato | Utility unica per giorni locali, fasce mattina/sera, serie corrente e record. |
| 6 | Fix BLE | Completato nel codice | Cancellazione scan/connect/sync, binding device/generazione, coda FIFO, fallback e deduplica coperti da test. |
| 7 | Test d’integrazione e prova hardware | Automazione completata; hardware aperto | Client e provider testati end-to-end con periferica finta. Matrice fisica tracciata nell’issue GitHub #3 e in `docs/hardware-test-plan.md`. |
| 8 | Pulizie repository | Completato | Backend/OAuth rimossi dal ramo attivo e conservati nell’archivio Git; dipendenze e file template eliminati. |
| 9 | Audit finale | Completato | Audit parallelo, riproduzioni e re-review conclusive: **APPROVED senza blocker**. |
| 10 | Merge | Completato | PR #4 integrata nella PR #1; PR #1 unita in `main` con CI GitHub verde. |

## Gate già superati

- `pnpm install --frozen-lockfile`
- `pnpm check`
- `pnpm test`: 19 file e 83 test superati
- `pnpm lint`: zero warning
- `pnpm audit --prod --audit-level critical`: superato
- `pnpm exec expo-doctor`: 18 controlli su 18
- export Expo web, iOS e Android
- preview web caricata e verificata visivamente

## Rischio noto non bloccante

L’audit produttivo segnala due advisory di severità alta in `image-size`, dipendenza transitiva di Metro usata in fase di build. Gli advisory riguardano denial of service su file ICNS, JXL o HEIF malevoli e non dispongono di una versione corretta upstream. La libreria non è esposta dall’app a runtime. La CI blocca comunque eventuali vulnerabilità critiche nuove.
