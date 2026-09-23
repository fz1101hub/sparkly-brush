# Audit finale di Sparkly Brush

**Data:** 23 settembre 2026

**Ramo candidato:** `fix/final-hardening-no-parental-gate`

**Base:** `feature/brushlings-game`

**Verdetto:** **APPROVED senza blocker software**

## Ambito

L’audit ha verificato i punti 1, 2, 3 e 5–10 del piano concordato. Il punto 4, parental gate, è stato escluso espressamente dal proprietario del progetto e non è incluso nel verdetto. Il codice del backend non utilizzato è stato rimosso dal ramo attivo dopo essere stato preservato nel ramo e nel tag di archivio già pubblicati su GitHub.

## Stato dei punti

| # | Area | Esito |
|---:|---|---|
| 1 | Lockfile e CI | Completato. Installazione frozen e workflow esteso a tipi, test, lint, audit critico, Expo Doctor ed export multipiattaforma. |
| 2 | Race di idratazione | Completato. Test reali del provider impediscono downgrade di Voltuff e Moonbit. |
| 3 | Profilo lifetime e reward ledger | Completato. Progressione senza limite applicativo, SQLite transazionale, ledger idempotente, backup completo e restore con rollback. |
| 4 | Parental gate | Escluso su richiesta. Necessario prima di un’eventuale candidatura alla categoria Kids. |
| 5 | Utility streak | Completato. Giorni locali, fasce orarie, serie corrente e record hanno una sola implementazione. |
| 6 | BLE | Completato nel codice. Scan, connect, discovery, sync e disconnect sono cancellabili; callback stale e sessioni ravvicinate sono gestite. |
| 7 | Test d’integrazione e hardware | Automazione completata. La matrice fisica HX6322/04 resta tracciata nell’issue GitHub #3. |
| 8 | Pulizia repository | Completata. Backend, OAuth, template e dipendenze inutilizzate rimossi dal ramo attivo. |
| 9 | Audit finale | Completato con re-review indipendenti APPROVED. |
| 10 | Merge | Completato: PR #4 integrata nella PR #1 e PR #1 unita in `main`. |

## Correzioni di integrità verificate

Le review indipendenti hanno riprodotto e fatto correggere i casi più rischiosi. Il teardown GATT non può più accodare due volte lo stesso fallback. Una sessione distinta ma identica dopo dieci minuti non viene fusa col fallback precedente. La riconciliazione sostituisce i dati live con durata e stato di completamento autorevoli del record GATT e corregge atomicamente progressione e reward ledger. La revisione del fallback è un booleano bounded, quindi qualsiasi progresso successivo impedisce un replay da una timeline troncata. Le mappe importate di cursori e fallback sono limitate deterministicamente a 32 elementi, anche a parità di timestamp e con ordine d’ingresso invertito. La protezione rollover conserva solo identità realmente osservate nel ciclo precedente: respinge pacchetti vecchi senza bloccare salti alti legittimi nel nuovo ciclo.

## Evidenze automatiche

| Gate | Risultato |
|---|---|
| `pnpm install --frozen-lockfile` | Superato |
| `pnpm check` | Superato |
| `pnpm test` | **19 file, 83 test superati** |
| `pnpm lint` | Superato, zero warning |
| `pnpm audit --prod --audit-level critical` | Superato |
| `pnpm exec expo-doctor` | **18/18 controlli superati** |
| Expo export web | Superato |
| Expo export iOS | Superato |
| Expo export Android | Superato |
| Review finale dei blocker BLE | APPROVED |
| Review finale storage e backup | APPROVED |

## Rischi residui dichiarati

La validazione fisica richiede ancora un Philips Sonicare for Kids HX6322/04, un iPhone e un dispositivo Android. Il piano è documentato in `docs/hardware-test-plan.md` e il lavoro è tracciato nell’issue GitHub #3; ciò non blocca l’integrazione del codice, ma blocca una dichiarazione di compatibilità hardware definitiva.

L’audit delle dipendenze produttive segnala due advisory di severità alta in `image-size`, dipendenza transitiva di Metro usata durante la build per formati immagine non accettati dall’app. Non esiste una release corretta upstream al momento dell’audit. La CI blocca nuove vulnerabilità critiche e il rischio deve essere rivalutato quando Expo/Metro pubblicheranno un aggiornamento compatibile.

Il parental gate non è stato sviluppato. Se l’app verrà proposta nella categoria Kids o distribuirà funzioni riservate ai genitori, questo requisito dovrà essere riaperto prima della pubblicazione negli store.

## Decisione

Il candidato è stato **approvato e unito in `main`**. Non restano blocker software noti nei punti inclusi nello scope. La prova fisica e il parental gate restano attività esplicitamente separate e tracciate.
