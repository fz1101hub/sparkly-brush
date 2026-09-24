# Rapporto di rimedio post-audit — Sparkly Brush

> **Documento storico.** Il successivo audit Claude Ultracode sul commit `a7769e3` ha trovato interazioni non coperte da questo ciclo. La valutazione corrente e i rimedi ulteriori sono documentati in `docs/claude-ultracode-audit-remediation-2026-09-24.md`.

**Data:** 23 settembre 2026  
**Ramo di sviluppo:** `fix/post-audit-device-reset-import-hardening`

**Merge finale:** PR #6, commit `e2469fd` in `main`
**Ambito escluso:** parental gate, per richiesta esplicita del proprietario

## Sintesi esecutiva

I due audit indipendenti sono stati verificati contro il codice e riprodotti con test mirati. I rilievi confermati relativi a integrità della cronologia, sincronizzazione BLE, backup SQLite, timer manuale, privacy degli identificatori, economia e toolchain sono stati corretti. Le re-review finali non riportano blocker software nelle aree incluse nello scope.

Il candidato non deve tuttavia essere descritto come **release pubblica definitiva** finché non saranno completati due passaggi esterni al codice: la matrice fisica con HX6322/04 su iPhone e Android e una CI GitHub interamente verde sul commit della PR. La candidatura alle categorie Kids/Families richiederà inoltre di riaprire il parental gate e di decidere Companion Device Manager, privacy policy e dichiarazioni store.

## Esito dei rilievi

| # | Rilievo | Esito | Rimedio verificato |
|---:|---|---|---|
| 1 | Reset o factory-reset del contatore BLE | **Corretto** | Azione per dispositivo “Dimentica manico resettato”; nuova epoch del solo manico; storico, XP, monete e Brushlings preservati; race di riconnessione coperta. |
| 2 | Import SQLite aperto prima di un controllo bounded | **Corretto** | Preflight sui soli 100 byte dell’header, prima e dopo la copia privata; verifica firma, page size, versioni, reserved bytes, schema ed encoding senza limite alla dimensione complessiva. |
| 3 | Configurazione e documentazione residue dal template | **Corretto** | Commenti e fallback template rimossi; documentazione usa fonti pubbliche; bundle identifier e workflow allineati al progetto. |
| 4 | Perdita delle sessioni effettuate offline | **Corretto** | Backfill contiguo `lastKnown+1 … latest`, rollover `uint16`, batch atomico e limite prudenziale. Una lacuna o un `sessionCount` assente/malformato interrompono la sync senza avanzare il cursore. |
| 5 | Timestamp errato per sessioni importate in ritardo | **Corretto** | Ricostruzione dal clock relativo del manico con rollover `uint32`; fallback `approximate` escluso da streak, calendario, missioni e bonus giornalieri. |
| 6 | Assenza di una CI verde dimostrabile sull’ultimo merge | **Workflow corretto; runner GitHub bloccati esternamente** | Workflow pnpm 12 frozen con tipi, 127 test, lint, audit critico, Expo Doctor, export e job nativi. I run push `35884850374` e PR `35884901213` hanno terminato tutti i job in pochi secondi con zero step e nessun log, prima perfino del checkout. |
| 7 | La CI produceva solo bundle JavaScript | **Corretto nel workflow** | Aggiunti prebuild e `assembleDebug` Android su JDK 17, oltre a prebuild, CocoaPods e build Xcode per simulatore su macOS. |
| 8 | Permessi Android e Families | **Mitigato, decisione Kids aperta** | `neverForLocation`, permessi location legacy limitati a SDK 30 e rimozione dei permessi storage/overlay non necessari. Companion Device Manager e target Families restano decisioni di pubblicazione. |
| 9 | Parental gate assente | **Escluso dallo scope** | Non implementato, coerentemente con la richiesta. Resta requisito da riaprire prima di una candidatura Kids o di proteggere azioni genitore/export. |
| 10 | Identificatori BLE nel backup portatile | **Corretto** | MAC, UUID e `device.id` vengono sostituiti da alias SHA-256 deterministici; ID sessione e cursori sono sanitizzati; UI esplicita contenuto e riservatezza del file. |
| 11 | Evoluzione e schiusa simultanee incoerenti | **Corretto** | Presentazione “Doppia sorpresa”, avatar evoluto e nomi separati; priorità isolata in funzione pura coperta da test. |
| 12 | Timer manuale basato sui tick JS | **Corretto** | Durata derivata da `Date.now()`; Stop e completamento automatico conservano una sessione non salvata, mostrano errore accessibile e consentono retry single-flight. |
| 13 | Farming di XP/monete e prezzi storici instabili | **Corretto** | Nuove sessioni incomplete senza XP/monete; politica per-sessione retrocompatibile; ledger acquisti con prezzo effettivamente pagato. |
| 14 | Backup grande materializzato in memoria | **Corretto** | Validazione semantica, ledger e backfill scorrono le righe SQLite con iteratori bounded; nessun limite applicativo alla dimensione del backup. |
| 15 | Archivio legacy parziale sovrascritto da replay delle sole righe fisiche | **Corretto** | La baseline lifetime viene preservata quando `history-complete=false`; replay completo consentito solo con archivio completo. Un test importa direttamente lo storage SQLite nativo con database simulato. |

## Hardening aggiuntivo emerso dalle re-review

La prima sincronizzazione non accetta più un conteggio storico ambiguo. `sessionCount` deve essere Base64 canonico e decodificarsi in **esattamente due byte**. Lettura fallita, payload vuoto, troncato a un byte, sovradimensionato o contenente caratteri Base64 invalidi falliscono prima della scrittura di `activeSessionId`; il cursore resta invariato.

La riconciliazione nativa di un fallback BLE in un archivio parziale è stata esercitata direttamente contro `lib/brush-storage.native.ts`. Il test prepara una baseline lifetime di 365 sessioni non tutte materializzate, sostituisce il fallback con il record autorevole e verifica che conteggi, XP e cursore avanzino una sola volta, mentre bonus, giorni perfetti e streak non vengano ricostruiti da una cronologia tronca.

Il salvataggio manuale è ora transazionale anche dal punto di vista dell’interfaccia. In caso di errore la sessione esatta resta in memoria, non è possibile avviarne un’altra, l’errore viene annunciato e il pulsante **Riprova** riusa lo stesso salvataggio protetto da single-flight. Sono coperti sia Stop manuale sia completamento automatico a 120 secondi, per dati reali e demo.

## Evidenze automatiche locali

| Gate | Risultato |
|---|---|
| `pnpm install --frozen-lockfile` con pnpm 12.5.1 | Superato |
| Fresh install da soli manifest, lockfile e workspace | Superato |
| `pnpm peers check` | Superato, nessun problema peer |
| `pnpm check` | Superato |
| `pnpm test` | **26 file, 127 test superati** |
| `pnpm lint` | Superato, zero warning |
| `pnpm audit --prod --audit-level critical` | Superato, zero advisory critici |
| `pnpm exec expo-doctor` | **18/18 controlli superati** |
| `pnpm exec expo install --check` | Dipendenze compatibili |
| Export Expo web, iOS e Android | Superati |
| Preview mobile web 390×844 | Renderizzata senza errori di build o TypeScript |
| Re-review BLE, storage parziale e timer manuale | **Fixed, nessun blocker** |
| Build Android nativa locale | **Superata**: `assembleDebug`, SDK 36, build-tools 36.0.0, NDK 27.1 e JDK 17; 458 task Gradle |
| Build iOS nativa | Demandata al job macOS della PR |
| GitHub Actions PR #6 | Fallimento infrastrutturale prima del primo step: tre job a zero step, nessun log disponibile |

## Rischi residui e condizioni di release

**Hardware reale.** Il protocollo è implementato e testato in simulazione, ma la compatibilità fisica definitiva richiede ancora HX6322/04, iPhone e Android. La checklist è stata estesa a tredici casi e include due sessioni offline, orari ricostruiti e reset di fabbrica. L’attività resta nell’issue GitHub #3.

**Kids/Families.** Il parental gate è intenzionalmente escluso. Prima di pubblicare l’app come prodotto rivolto esclusivamente ai bambini occorre rivalutare Companion Device Manager su Android, accesso alle aree genitore, export/restore, privacy policy, Data Safety, target audience e requisiti Apple Kids.[1][2]

**Supply chain.** `pnpm audit` segnala due advisory `high` in `image-size`, dipendenza transitiva di Metro usata in fase di build e non esposta dal runtime mobile. Gli advisory correnti indicano `2.0.3` come versione corretta. Un override alla major 2 è stato provato nel ciclo successivo, ma rompe l’export con Metro 0.83; il progetto attende quindi una combinazione Expo/Metro compatibile.[3] [4]

**Pubblicazione.** Prima degli store restano necessari privacy policy pubblica, dichiarazioni store accurate e revisione di naming/trademark. Il progetto dichiara già di essere indipendente e non affiliato a Philips.

## Decisione

Il codice non presenta blocker software noti nelle aree incluse nello scope dopo le re-review ed è stato unito in `main` tramite PR #6 al commit `e2469fd`. La CI remota non ha eseguito il workflow: entrambi gli eventi hanno creato i tre job, ma tutti sono falliti con `steps: []` e senza log, comportamento incompatibile con un errore del codice o di uno step. L’eccezione di merge è quindi documentata sulla base dei gate locali equivalenti, della fresh install e della build Android nativa. La build iOS resta non dimostrata fino al ripristino del runner macOS. Una dichiarazione di compatibilità HX6322/04 completa resta subordinata alla matrice hardware reale.

[1]: https://support.google.com/googleplay/android-developer/answer/9893335 "Google Play Families Policy"
[2]: https://developer.apple.com/app-store/review/guidelines/ "Apple App Review Guidelines"
[3]: https://github.com/advisories/GHSA-w3rx-r6r6-pgpr "image-size ICNS denial of service"
[4]: https://github.com/advisories/GHSA-5p2g-fcmc-qvqq "image-size JXL/HEIF denial of service"
