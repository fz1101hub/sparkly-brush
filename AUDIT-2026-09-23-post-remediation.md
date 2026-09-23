# Audit indipendente post-remediation — 23 settembre 2026 (sera)

Oggetto: `main` @ `a7769e3` (post-merge PR #5 "hardware validation assistant" e PR #6 "post-audit hardening") · Base di confronto: audit indipendente su `eed1179` (stamattina).

## Metodo

Audit a due livelli. (1) **Gate deterministici rieseguiti da me** nel container, con exit code catturati direttamente. (2) **Review profonda orchestrata**: 10 revisori paralleli, uno per sottosistema, sull'intero diff `eed1179..a7769e3` (~6.800 righe su 59 file) e sui file interi; ogni finding sottoposto a **3 verificatori avversariali indipendenti** istruiti a confutarlo (scarto a maggioranza, incertezza = confutato); un critico di completezza finale, con lacune chiuse manualmente. In totale **164 agenti, ~13,3M token di lavoro di verifica, 0 errori**. Dei 51 finding proposti, **4 sono stati confutati e scartati; 47 confermati** (10 major, 21 minor, 16 note).

## Verdetto

**Questo ciclo non conferma il "nessun blocker software noto" dichiarato da Manus.** I gate locali dichiarati sono tutti autentici (li ho riprodotti), le remediation dei miei rilievi precedenti sono reali e ben fatte nella struttura, e la qualità media resta alta. Ma la review profonda ha trovato **10 difetti major nuovi**, concentrati proprio nelle aree dichiarate "corrette": la famiglia della riconciliazione fallback BLE produce doppi accrediti in almeno 4 scenari realistici, il backup completo **diventa non ripristinabile dopo un cambio di fuso orario**, un file `.brushlings` artigianale può **installare trigger/view persistenti nel database dell'app**, e l'azione "Dimentica manico resettato" — introdotta per rispondere a un mio rilievo — è **un loop di farming e doppio accredito** se usata senza un reset di fabbrica reale (uso che la stessa UI suggerisce). Inoltre la diagnosi del blocco CI ("infrastrutturale esterno") è **errata**: è un blocco a livello account GitHub, persistente e destinato a ripresentarsi, e il workflow attuale è dimensionato per riesaurire la quota appena ripristinata.

Nessuno di questi difetti tocca dati sensibili remoti (l'app resta locale), ma il candidato **non è "fixed, nessun blocker"**: è "molto migliorato, con una nuova classe di bug di contabilità introdotta dalle stesse remediation, e una CI da riprogettare".

## 1. Gate rieseguiti in modo indipendente

| Gate | Dichiarato | Verificato da me | Esito |
|---|---|---|---|
| `pnpm install --frozen-lockfile` (pnpm 12.5.1) | Superato | exit 0 con pnpm 12.5.1 installato ad hoc (il pin `engines` ha rotto l'ambiente pnpm 10 preesistente — attrito reale per i contributor) | ✅ |
| `pnpm check` | Superato | exit 0 | ✅ |
| `pnpm test` | 26 file, 127 test | **26 file, 127 test, tutti passati** | ✅ |
| `pnpm lint --max-warnings 0` | Zero warning | exit 0 | ✅ |
| `pnpm audit --prod --audit-level critical` | Superato | exit 0; restano le 2 high `image-size` | ✅ |
| `expo-doctor` | 18/18 | 16/18 nel sandbox, entrambe le failure causate dal proxy locale ("Host not in allowlist"); **a differenza del ciclo scorso non esiste una run CI verde a corroborare il 18/18**, che resta sul solo claim locale di Manus | ⚠️ plausibile, non corroborato |
| Export web | Superato | exit 0 | ✅ |
| Export iOS/Android, `assembleDebug` Android (458 task) | Superati localmente | **Non riproducibili qui** (niente Android SDK nel container) e **non corroborati dalla CI** (mai eseguita): restano sulla parola di Manus | ⚠️ non corroborato |
| CI GitHub | "Bloccata esternamente" | Verificata via API: **tutte le ultime 8 run FALLITE**, v. finding C1 | ❌ diagnosi errata |

## 2. Finding major confermati (3/3 o 2/3 verificatori avversariali)

### Contabilità BLE / doppi accrediti (famiglia di 4)

**M1 — Doppio accredito su backfill ritardato senza clock del manico** — `lib/lifetime-progress.ts:462-465` + `lib/sonicare-client.native.ts:552-563`. Il match del fallback pendente esige |Δt| ≤ 30s, ma per i record `timeConfidence:"approximate"` (clock del manico illeggibile) `startedAt` è derivato dall'**ora della sync**, non della spazzolata: ogni riconnessione oltre 30 secondi manda a vuoto il match e la stessa spazzolata viene contata due volte (fallback + record GATT), permanentemente. Sistematico su tutta la popolazione di manici senza clock leggibile — che è esattamente la modalità degradata prevista da `docs/hardware-test-plan.md`.

**M2 — Progresso interveniente disattiva la riconciliazione ma non l'import** — `lifetime-progress.ts:194-196, 466-467`. Basta una sessione manuale (o di un altro manico) tra fallback e riconnessione: `hasInterveningProgress` annulla il match, ma il record BLE viene comunque importato come sessione nuova mentre il fallback resta accreditato. Stesso esito se un secondo fallback dello stesso device sovrascrive il marker (slot unico per device).

**M3 — Doppio salvataggio fallback su Disconnetti durante lo spazzolamento** — `contexts/brush-context.tsx:474-477`. `disconnect()` esegue in parallelo chiusura GATT e flush dei pendenti: il flush salva il fallback P1 e lo rimuove dalla coda; la disconnessione del client emette poi un secondo stop live che genera P2 per la stessa spazzolata (id diverso perché `Date.now()` è avanzato) → XP, monete e sessione duplicati e doppio modal premio.

**M4 — "Dimentica manico resettato" senza reset reale = farming ripetibile** — `lifetime-progress.ts:490-497` + `sonicare-client.native.ts:425-437`. L'azione svuota tutte le difese anti-duplicato e con `acceptNextSession` il client rilegge fino a **128 sessioni** ancora conservate dal manico, riaccreditandole. Il `lastSessionId` viene conservato nel cursore ma **non usato** per riconoscere un manico non resettato (guardia disponibile e inutilizzata). La UI aggrava: il dialogo suggerisce l'uso "prima di collegare un manico sostitutivo" e promette che nulla verrà alterato (`app/(tabs)/device.tsx:39-40`), invitando esattamente l'uso che duplica lo storico. È il rimedio al mio rilievo R3 del ciclo scorso: risolve il caso legittimo ma introduce un bypass del claim anti-farming (todo #6).

### Backup / import

**M5 — Backup non ripristinabile dopo un cambio di fuso orario** — `brush-storage.native.ts:841-851` + `backup-integrity.ts:203-207` (2 finding convergenti da dimensioni indipendenti). L'export ricostruisce il reward ledger **nel fuso corrente** ma scrive gli aggregati lifetime **storici**; il validatore all'import esige uguaglianza esatta tra somma ledger e aggregati. Sessioni serali delle 18:30 Roma diventano 12:30 New York → il file è internamente incoerente e **ogni telefono lo rifiuta**. Contraddice direttamente il claim "validazione timezone-stable" di `docs/storage-design-notes.md`: rompe il caso d'uso principale del backup (trasferimento) proprio nello scenario viaggio/trasloco.

**M6 — Schema del backup importato non validato: trigger/view arbitrari nel DB principale** — `brush-storage.native.ts:1198`. `SQLite.backupDatabaseAsync` copia pagina-per-pagina l'intero file importato (schema incluso) nel database dell'app; la validazione ispeziona righe e manifest ma mai `sqlite_schema`. Un `.brushlings` artigianale con una VIEW `sessions` (o trigger su tabelle reali) supera preflight, `integrity_check` e validazione streaming, e persiste nel database principale. Completa (e ridimensiona) il rimedio al mio rilievo R4: l'header preflight c'è, la superficie profonda resta.

**M7 — Validazione archivi parziali cieca ai NaN** — `backup-integrity.ts:181-192` + `brush-storage.native.ts:198-218`. `rowToSession` non verifica che i campi numerici siano numeri finiti; nel ramo parziale tutti i controlli sono confronti `<`/`>` che NaN rende falsi → un backup con `duration_seconds` testuale supera la validazione e corrompe gli aggregati (il ramo completo lo intercetterebbe, quello parziale no).

### Report hardware

**M8 — Over-redaction del report di collaudo** — `lib/hardware-validation.ts:283-288`. La regex di sanitizzazione tratta "Bluetooth:" come prefisso di identificativo e l'allowlist non contiene i valori reali dei log dell'app ("PoweredOn", "terminata", "annullata"...): i log diagnostici ordinari diventano "device id: [redacted]", svuotando la sezione diagnostica del report proprio dove serve per la matrice hardware dell'issue #3.

### CI / governance

**M9 — Blocco Actions misdiagnosticato: è account-level e persisterà** — `docs/post-audit-remediation-2026-09-23.md:24`, `todo.md:39`. Evidenza API: run #180 verde alle 05:54; run #181-183 falliscono in 5-6 secondi **con un `verify.yml` byte-identico a quello verde** (il file cambia solo dopo, alle 15:53) → ogni causa repo-side esclusa; i job riportano `runner_id: 0` (nessun runner mai assegnato) e log non scaricabili (404). Pattern univoco di esaurimento minuti/spending limit Actions su **repo privato**. Non è "esterno e transitorio": senza intervento su billing/quota ogni push futuro fallirà, e la condizione di release "CI interamente verde" dichiarata nel rapporto resta irraggiungibile. Il merge di PR #6 con CI rossa resta un'eccezione di governance basata su gate locali auto-dichiarati.

**M10 — Il workflow riesaurirà la quota appena ripristinata** — `.github/workflows/verify.yml`. Doppio trigger push+PR senza `concurrency` né `paths-ignore` (stessa SHA eseguita due volte a 26 secondi di distanza, verificato su run 184/185 e 186/187), più job `native-ios` su `macos-latest` (45 min timeout, moltiplicatore 10× su repo privati): fino a ~900 minuti fatturabili per singolo commit di PR, contro 2.000 minuti/mese del piano free — 2-3 commit bastano a bruciare il mese, coi checkpoint frequenti di Manus.

## 3. Minor e note principali (21+16, selezione)

- **Riconciliazione**: reset del cursore che ignora il `lastSessionId` conservato (`lifetime-progress.ts:483`); `expectedSessionId` calcolato su cursore post-reset (`:426`); fallback cancellato anche quando il rewind fallisce su archivi parziali (`brush-storage.native.ts:688`); batch web senza guardia sull'id già presente (`brush-storage.ts:288`).
- **UX/robustezza**: sessione manuale pendente solo in memoria, persa alla chiusura dell'app (`brush-context.tsx:154`); `syncLatest` annuncia successo anche con soli duplicati scartati; un errore transitorio di lettura sovrascrive il collaudo hardware salvato (`hardware-test.tsx:108`); race Android su cancellazione file subito dopo `shareAsync` (backup e report).
- **Privacy**: alias BLE = SHA-256 troncato **non salato** — sui MAC Android è invertibile a dizionario OUI (severità bassa per uno spazzolino, ma il claim "irreversibile" va sfumato); `containsLikelyRawDeviceId` esiste ma non è usato a runtime come cintura di sicurezza sull'export.
- **Economia**: migrazione del ledger acquisti mai persistita al load — un futuro cambio di listino altera ancora retroattivamente lo speso per chi non ricompra nulla (`brushling-storage.ts:84`); wallet demo mescola guadagni demo e spese reali.
- **Test**: la suite comportamentale gira quasi tutta sull'implementazione web; restore/rollback SQLite nativo e creazione backup nativa senza alcun test; rami fail-closed di `sessionIdsToSync` non coperti; fake SQLite senza semantica transazionale.
- **Repo**: filtro CI `feature/**` non corrisponde alla convenzione reale `feat/*` (i branch feature senza PR non hanno CI); pin `engines` senza `packageManager`/provisioning; README presenta CI e build iOS come gate operativi mai dimostrati; residuo `autoVerify` su scheme custom in `app.config.ts`.
- **Docs vs realtà**: `image-size` — i docs affermano "nessuna versione corretta upstream", ma `pnpm audit` indica **patched >= 2.0.3** (vulnerabile ≤ 2.0.2, risolto 1.2.1): la conclusione di non forzare un major breaking per Metro resta difendibile, la motivazione scritta è inesatta.

**Confutati dalla verifica avversariale (esclusi dal report)**: 4 finding, tra cui il presunto obbligo incoerente su `sessionCount` e la pubblicazione del nome BLE nel report (intenzionale e non identificante).

## 4. Cosa regge del rapporto di Manus

Per correttezza: **12 dei 15 rilievi** del rapporto di rimedio risultano genuinamente corretti alla verifica (preflight header, permessi Android con `neverForLocation` e `blockedPermissions`, timer manuale su clock assoluto, baseline archivi parziali, streaming bounded, fail-closed `sessionCount`, pulizia template, backfill contiguo nel caso nominale, alias applicato dove dichiarato, presentazione "Doppia sorpresa", pin toolchain, esclusioni calendario per orari approssimati). I problemi sono nelle **interazioni** tra i rimedi (fallback × clock assente, reset × anti-farming, replay-fuso × validazione esatta) — il pattern classico dei fix verificati singolarmente ma non in composizione — e nella **diagnosi CI**.

## 5. Azioni consigliate in ordine di priorità

1. **CI (M9+M10)**: risolvere quota/billing Actions dal pannello GitHub (Settings → Billing); aggiungere `concurrency` con cancel-in-progress, `paths-ignore` per i checkpoint documentali, valutare il job macOS solo su tag/release. Finché la CI non è verde, sospendere nuove "eccezioni di merge".
2. **Famiglia doppi accrediti (M1-M3)**: fare del confronto id-successore la chiave primaria del match (ignorando il tempo per record `approximate`); rimuovere-o-compensare il fallback anche quando il match fallisce ma `deviceSessionId` coincide; serializzare flush e disconnect.
3. **"Dimentica manico" (M4)**: usare il `lastSessionId` conservato come guardia (se il manico riappare con contatore ≥ precedente, niente re-import), limitare il re-import post-reset alle sessioni con id ≤ una soglia bassa, correggere il copy del dialogo.
4. **Backup (M5-M7)**: all'export, scrivere aggregati coerenti col ledger rigenerato (o validare con la stessa tolleranza timezone-stable dichiarata); whitelist di `sqlite_schema` all'import (solo tabelle/indici attesi, zero trigger/view); validare i tipi numerici in `rowToSession`.
5. **M8**: ancorare le regex di redazione a pattern di identificativo (MAC/UUID) invece che a parole chiave generiche.
6. Riportare test nativi veri su restore/rollback SQLite e sui rami fail-closed; persistere la migrazione del ledger acquisti; correggere `feature/**`→`feat/**` nel workflow.

Restano invariate le riserve strutturali già tracciate: matrice hardware reale (issue #3), parental gate (escluso per decisione del proprietario), privacy policy e decisioni store.
