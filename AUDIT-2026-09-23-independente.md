# Audit indipendente del progetto — 23 settembre 2026

Oggetto: `main` @ `eed1179` (post-merge PR #1 Brushlings, PR #2 lifetime ledger, PR #4 hardening finale) · Base di confronto: gli audit precedenti su `c0fd3b2` (main) e `f77efe1` (feature branch).

Questo audit è indipendente: ogni gate dichiarato da Manus in `todo.md` e `docs/final-audit-2026-09-23.md` è stato rieseguito da zero in questo ambiente, e il codice nuovo (~3.500 righe tra storage SQLite, progressione lifetime, backup e client BLE) è stato riletto integralmente.

## Verdetto

**Concordo nella sostanza con l'esito "APPROVED senza blocker software", con le stesse due riserve dichiarate** (validazione hardware reale e parental gate escluso su decisione del proprietario) **più tre rilievi minori nuovi, nessuno bloccante**. Tutti i rilievi dei miei due audit precedenti risultano risolti nel codice, non solo dichiarati. La qualità ingegneristica di questo ciclo è nettamente superiore ai precedenti: contabilità O(1) con riconciliazione, transazioni SQLite con crash-recovery a doppio journal, client BLE cancellabile con guardie di generazione, e una suite di test che copre proprio i casi rischiosi.

## Gate rieseguiti in modo indipendente

| Gate | Dichiarato | Verificato da me | Esito |
|---|---|---|---|
| `pnpm install --frozen-lockfile` | Superato | exit 0 reale (non inferito da pipe) | ✅ |
| `pnpm check` (tsc) | Superato | exit 0 | ✅ |
| `pnpm test` | 19 file, 83 test | **19 file, 83 test, tutti passati** | ✅ |
| `pnpm lint --max-warnings 0` | Zero warning | exit 0 | ✅ |
| `pnpm audit --prod --audit-level critical` | Superato | exit 0; restano solo le 2 high dichiarate | ✅ |
| `expo-doctor` | 18/18 | 16/18 **nel mio sandbox**: le 2 failure sono "Host not in allowlist" del proxy locale (schema Expo e React Native Directory non raggiungibili), non problemi del progetto. La CI GitHub, con rete piena, è verde sullo stesso commit | ✅* |
| Export web | Superato | `expo export --platform web` exit 0, bundle generato | ✅ |
| Export iOS/Android | Superato | Non rieseguiti localmente; verificati tramite la run CI `Verify` #180 su `eed1179`, conclusa `success` (4m30s, include entrambi gli export) | ✅ (via CI) |
| CI su main | Verde | Run GitHub Actions #180 su `eed1179`: `success`; verdi anche le run delle PR #1/#2/#4 | ✅ |

Anche il rischio dichiarato sulle dipendenze è esatto: le uniche advisory prod residue sono le 2 high su `image-size` (DoS su parser ICNS/JXL/HEIF), transitiva di Metro usata solo a build-time, senza fix upstream; ~25 override pnpm pinnano il resto delle transitive vulnerabili.

## Rilievi dei miei audit precedenti: stato verificato

| Rilievo | Stato | Evidenza |
|---|---|---|
| S1-S6, S8-S9 — backend template (CORS, storage proxy, JWT, OAuth, dipendenze server) | **Risolti alla radice** | `server/`, `drizzle/`, OAuth, tRPC, template e ~15 dipendenze rimossi; archivio conservato nel branch `archive/manus-backend-scaffold` e nel tag `backend-scaffold-v1` |
| S7 — `.env` non ignorato | **Risolto** | `.gitignore` ora ha `.env`, `.env.*`, `!.env.example` |
| B1 — lockfile senza `expo-audio` + CI `--no-frozen-lockfile` | **Risolto** | lockfile coerente (install frozen passa); CI a `--frozen-lockfile`, step artifact rimosso, gate estesi (audit, doctor, 3 export), trigger anche su push a `main` |
| B2 — race di idratazione (downgrade creatura) | **Risolto** | guardia `profileReady && historyReady && !restoreInProgress` + test dedicati (`brushling-hydration-race.test.tsx`) |
| B3 — economia sul buffer di 120 sessioni | **Risolto strutturalmente** | progressione lifetime O(1) persistita in SQLite transazionale, timeline UI limitata a 120 solo per la visualizzazione; test "mantiene la timeline a 120 ma fa avanzare sempre gli aggregati" e "identiche formule di gioco rispetto allo storico completo" |
| K2 — backup senza integrità | **Risolto** | backup v3 = file SQLite con manifest, `PRAGMA integrity_check` + validazione semantica (replay deterministico, ledger per-riga, sottoinsieme timezone-stable per i trasferimenti tra fusi) |
| Q2 — helper data duplicati / semantica streak ambigua | **Risolto** | unica utility `day-progress.ts` (differenza giorni via UTC, DST-safe); "serie attuale" e "record" ora distinti anche nel README |
| Rilievi BLE minori (ternario morto, batteria che sovrascrive il modello, leak subscription) | **Risolti** | client riscritto; test `sonicare-client.test.ts` coprono esattamente questi casi |
| A2-A5 — nome pacchetto, scheme, asset orfani, licenza, CI | **Risolti** | `sparkly-brush`, scheme `sparklybrush`, asset e componenti orfani rimossi, LICENSE (proprietaria all-rights-reserved, scelta legittima), CI completa |

## Revisione del codice nuovo

**Progressione lifetime** (`lib/lifetime-progress.ts`): accumulatore O(1) con normalizzazione difensiva, cursori BLE per dispositivo con epoch e rilevamento rollover uint16, mappe bounded a 32 elementi, fallback pendenti con snapshot pre-sessione e riconciliazione. Il caso "sessione fuori ordine" che avevo individuato come rischio di doppio conteggio dei bonus giornalieri è gestito a livello storage: l'inserimento di una sessione più vecchia del massimo archiviato fa un replay completo deterministico dentro la stessa transazione.

**Storage nativo** (`lib/brush-storage.native.ts`): SQLite con WAL + `synchronous=FULL`, coda di scrittura, migrazione automatica dai tre formati legacy, backfill del ledger una-tantum, ledger idempotente (`INSERT OR IGNORE` su id stabili), restore con snapshot di rollback + journal AsyncStorage + token di commit nel database e recovery al bootstrap (`DataRecoveryGate` mostra un errore leggibile invece di crashare, e un overlay blocca l'interazione durante il restore). Le sessioni che arrivano durante un restore vengono accodate dopo (`history-operation.ts`).

**Client BLE** (`lib/sonicare-client.native.ts`): scan/connect/discovery/sync cancellabili, generazioni monotone per scartare callback stale, transazioni di sync annullabili, sync FIFO vincolata a device+generazione catturati, chiusura della GATT candidata su errore, manager iniettabile per i test. La suite integra un manico finto e copre stop ravvicinati, salti del contatore, riconnessioni triple, demo durante la scansione.

**Documentazione**: README onesto (disclaimer marchi, esclusione esplicita del parental gate), `docs/hardware-test-plan.md` con matrice dettagliata che dichiara esplicitamente "nessun risultato hardware finché la tabella non viene compilata", issue GitHub #3 aperta con la checklist.

## Riserve confermate e rilievi nuovi (non bloccanti)

**R1 — Parental gate assente (fuori scope su decisione del proprietario).** Confermo quanto già scritto nei miei audit: Area genitori (premi reali), Backup (esporta i dati del bambino) e Demo restano accessibili a chi usa l'app, bambino incluso. La decisione è tracciata ovunque con onestà; resta il prerequisito da riaprire prima di una candidatura alla categoria Kids degli store.

**R2 — Validazione hardware aperta.** La copertura automatica col manico finto è la migliore possibile senza hardware; la compatibilità reale con l'HX6322/04 resta non dimostrata finché la matrice dell'issue #3 non viene compilata su iOS e Android reali. È dichiarato correttamente.

**R3 (nuovo) — Reset di fabbrica del manico.** `allocateDeviceSessionIdentity` tratta ogni regressione del contatore non-rollover come pacchetto stale (scelta giusta contro i replay), ma un manico resettato che riparte da ID bassi verrebbe rifiutato sul percorso record-GATT finché il contatore non supera il vecchio massimo. Il fallback live continua a registrare le spazzolate, quindi non si perdono dati, ma suggerisco: (a) aggiungere il caso alla matrice hardware; (b) valutare un'azione "dimentica spazzolino" che azzeri il cursore del dispositivo.

**R4 (nuovo) — Superficie di parsing sull'import.** Un file `.brushlings` scelto dall'utente viene aperto con SQLite prima della validazione completa (`integrity_check` è il primo passo, ma il parser SQLite processa comunque un file arbitrario). Rischio basso e accettabile per un'app locale; da tenere presente se il formato circolerà via canali non fidati.

**R5 (nuovo) — Residui cosmetici.** `lib/_core/manus-runtime.ts` (bridge iframe della preview) e il fallback `"space.manus.app"` in `app.config.ts` sono gli ultimi residui del template; `docs/storage-design-notes.md` cita percorsi locali della macchina di sviluppo (`/home/ubuntu/...`). Solo pulizia, nessun impatto.

Nota di metodo: due commit dichiarano candidamente di esistere "per soddisfare il prerequisito di deploy richiesto dalla schedule" (`addebb9`); la storia è rumorosa (~137 commit per il ciclo) ma il risultato finale è coerente e la CI è verde su ogni merge.

## Conclusione

Il progetto è in uno stato molto migliore rispetto a entrambi gli audit precedenti: superficie d'attacco ridotta al minimo (app locale senza backend), contabilità di gioco robusta e verificabile, backup crash-safe con validazione reale, BLE difensivo e ben testato, CI completa e riproducibile. Le uniche cose che separano il progetto dagli store sono quelle già tracciate: matrice hardware (issue #3), parental gate (escluso per scelta), privacy policy pubblica e naming. Nessun nuovo blocker emerso dalla verifica indipendente.
