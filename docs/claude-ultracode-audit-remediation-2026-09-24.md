# Valutazione e rimedio dell’audit Claude Ultracode

**Progetto:** Sparkly Brush  
**Data:** 24 settembre 2026  
**Autore:** Manus AI  
**Commit auditato:** `a7769e3` su `main`  
**Ramo di rimedio:** `fix/claude-ultracode-audit`  
**Pull request:** #7, aperta e non unita

## Conclusione

L’audit Claude Ultracode è **tecnicamente valido e più profondo dei cicli precedenti**. Ha esaminato le interazioni tra BLE, progressione lifetime, restore SQLite e process lifecycle invece di limitarsi ai singoli helper. La valutazione iniziale **8,2/10** è ragionevole per il commit auditato. In particolare, sette rilievi major erano riproducibili o sufficientemente fondati da richiedere una correzione. Due riguardavano condizioni di release già aperte. Il rilievo sui costi CI era corretto nella sostanza, ma non provava un problema di codice: i job GitHub non ricevevano un runner e non producevano step o log.[1] [2]

Il candidato corrente corregge i major applicativi confermati. Una prima re-review indipendente ha trovato due casi limite ulteriori: il doppio accredito al primo utilizzo senza cursore BLE e due bypass della whitelist SQLite. Entrambi sono stati riprodotti e corretti. Le re-review successive hanno chiuso il blocker BLE e, dopo una difesa aggiuntiva contro tabelle senza chiave primaria e ID duplicati, anche il blocker SQLite. Il verdetto read-only finale non contiene blocker applicativi riproducibili.

## Esito dei major

| ID | Rilievo Claude | Valutazione | Rimedio applicato |
|---|---|---|---|
| M1 | Sync BLE approssimata dopo fallback | Confermato | I fallback sono una coda bounded. La correlazione usa contatore atteso quando disponibile; al primo utilizzo può associare soltanto la coda più recente del batch GATT. La sostituzione è contabile e non un secondo accredito. |
| M2 | Progresso interveniente perso | Confermato | Ogni fallback conserva uno snapshot contabile. La sostituzione calcola il delta tra fallback e record autorevole e lo applica allo stato corrente, preservando sessioni manuali o BLE intervenute. |
| M3 | Due brushing offline prima della sync | Confermato | Il singolo slot è stato sostituito da una coda per dispositivo. Due fallback vengono correlati ai rispettivi successori e persistiti nella stessa transazione. Il teardown BLE è serializzato con il flush. |
| M4 | Replay dopo “Dimentica manico” | Confermato | L’azione richiede un cursore precedente e conserva la baseline del vecchio contatore. Client e storage rifiutano la nuova epoch se gli ID non dimostrano un reset reale. Il copy UI vieta l’uso su manici non resettati o sostitutivi. |
| M5 | Backup completo rifiutato dopo cambio fuso | Confermato | L’export rigioca ledger e progressione nel fuso corrente e scrive nel manifest gli stessi aggregati portatili. Il database locale non viene riscritto. |
| M6 | Schema SQLite artigianale importabile | Confermato e rafforzato dopo re-review | L’ispezione rifiuta trigger, view, oggetti `sqlite_` non canonici, tabelle, indici, colonne e chiavi primarie estranei. Il validatore semantico rifiuta ID duplicati. Il restore non copia più le pagine del database importato: inserisce solo righe validate nelle tabelle fidate e verifica ogni inserimento. |
| M7 | `NaN` e `Infinity` nel backup SQLite | Confermato | Sessioni e reward ledger richiedono stringhe bounded, interi safe, valori finiti e domini ammessi. La validazione è ripetuta dal validatore semantico prima del restore. |
| M8 | Nessun collaudo fisico completo | Confermato e aperto | La checklist è stata estesa a 13 casi e include backfill, reset, orari ricostruiti e backup. L’esecuzione richiede HX6322/04, iPhone e Android reali; resta tracciata nell’issue #3. |
| M9 | GitHub Actions senza runner | Confermato come blocco esterno | Il run PR #7 `35938089366` ha chiuso `verify` e `native-android` in circa tre secondi, con zero step. Il repository non può correggere quota o policy dell’account GitHub. La release e il merge richiedono un run remoto verde con runner assegnato; non viene dichiarata una causa di billing non verificata.[2] |
| M10 | Workflow CI costoso e duplicato | Confermato | Rimossi i push sui branch PR, aggiunti `concurrency` e `paths-ignore`. Android resta nel PR gate; macOS viene eseguito soltanto su tag `v*` o `workflow_dispatch`. |

## Correzioni aggiuntive

La sessione manuale che fallisce il salvataggio viene ora scritta in un journal AsyncStorage prima del tentativo. Viene recuperata al riavvio e deve essere salvata o ritentata prima di iniziare una nuova sessione. La migrazione del ledger acquisti viene persistita al primo caricamento, quindi un futuro cambio dei prezzi non può riscrivere il costo storico.

Un errore transitorio durante il caricamento della checklist hardware non sovrascrive più automaticamente lo stato salvato. Il report redige soltanto campi etichettati come identificativi e pattern MAC/UUID, senza alterare messaggi Bluetooth ordinari.

Il backup portatile continua a usare alias SHA-256 troncati. Questi alias sono **pseudonimi deterministici**, non una promessa di anonimato o irreversibilità. L’export sanifica anche ID sessione legacy e fallisce se rileva un MAC o UUID grezzo. Backup e report restano in cache dopo l’handoff allo share sheet Android; il cleanup immediato avviene soltanto se l’handoff fallisce.

Il filtro `autoVerify` è stato rimosso dallo scheme custom Android perché non rappresenta un Android App Link. Le permission BLE restano configurate come non usate per la localizzazione sui sistemi moderni; la compatibilità Families e l’eventuale adozione di Companion Device Manager restano decisioni di prodotto e release, non fix automatici.[6] [7]

## Verifiche del candidato

| Gate | Risultato |
|---|---|
| Installazione pnpm 12 frozen | Superata |
| Peer dependencies | Superate |
| TypeScript | Superato |
| Vitest | **30 file, 166 test superati** |
| ESLint | Superato con zero warning |
| Audit produttivo da severità `high` | **Superato; nessuna vulnerabilità nota** |
| Expo Doctor | **21/21** con Expo 57 |
| Expo dependency check | Superato |
| Export web | Superato |
| Export iOS | Superato |
| Export Android | Superato |
| Build Android nativa debug | **Superata anche dopo l’upgrade a Expo 57** con SDK 36, JDK 17 e NDK 27.1 |
| Build iOS nativa | Workflow su `macos-26` e Xcode 26.4.1; esecuzione richiesta su runner macOS o Mac reale |
| Collaudo HX6322/04 | Da eseguire su hardware reale |
| GitHub Actions | Run `35938089366` fallito a zero step; **merge bloccato** |

## Supply chain

L’upgrade incrementale da Expo 54 a Expo 57 ha eliminato `image-size` dal grafo delle dipendenze. I due advisory `high` che avevano motivato l’aggiornamento non sono più presenti e `pnpm audit --prod --audit-level high` passa senza vulnerabilità note.[4] [5] Expo 57 usa inoltre React Native 0.86.3, che include la correzione delle regressioni Hermes V1 di memoria e avvio segnalate nelle release precedenti.[8]

## Limiti e decisione di rilascio

Il candidato non è ancora pronto per una pubblicazione store. Le build native locali seguono il flusso Expo documentato, ma iOS richiede un runner macOS o un Mac reale con Xcode 26.4 o successivo; il deployment target minimo è iOS 16.4.[3] [9] Servono inoltre una CI GitHub verde, il collaudo fisico completo e le attività di release già tracciate: privacy policy, dichiarazioni Data Safety e target audience, revisione trademark e decisione esplicita su Kids/Families. Il parental gate resta escluso per scelta del proprietario e non è stato introdotto da questo audit.

## References

[1]: https://github.com/fz1101hub/sparkly-brush/blob/claude/repository-audit-pdq4ds/AUDIT-2026-09-23-post-remediation.md "Claude Ultracode post-remediation repository audit"
[2]: https://github.com/fz1101hub/sparkly-brush/actions/runs/35938089366 "Sparkly Brush PR 7 GitHub Actions run"
[3]: https://docs.expo.dev/guides/local-app-development/ "Expo local app development"
[4]: https://github.com/advisories/GHSA-w3rx-r6r6-pgpr "image-size ICNS denial-of-service advisory"
[5]: https://github.com/advisories/GHSA-5p2g-fcmc-qvqq "image-size JXL and HEIF denial-of-service advisory"
[6]: https://developer.android.com/develop/connectivity/bluetooth/bt-permissions "Android Bluetooth permissions"
[7]: https://support.google.com/googleplay/android-developer/answer/9893335?hl=en "Google Play Families Policy Requirements"
[8]: https://expo.dev/changelog/sdk-57 "Expo SDK 57 release notes"
[9]: https://expo.dev/changelog/sdk-56 "Expo SDK 56 release notes"
