# Sviluppo autonomo del 13 ottobre 2026 — verso la pubblicazione

**Ramo:** `ccr-2641c3c7-7vb0o0` (contiene la PR #7 al commit `6b9632c`, la verifica del 6 ottobre e i commit descritti qui).
**Oggetto:** chiusura dei rilievi ancora aperti dell'[audit indipendente del 30/9](audit-indipendente-2026-09-30.md) che non richiedono hardware, più le correzioni necessarie a una candidatura su Google Play e App Store.
**Limiti:** nessun hardware (manico, iPhone, Android), nessun Android SDK o Xcode, rete senza `api.expo.dev`. La configurazione nativa è verificata con `expo config --type introspect` (manifest e Info.plist generati), non con una build; il BLE su simulazione del dump GATT HX6340.

## Sintesi

- **Tutti i rilievi dell'audit correggibili senza hardware sono chiusi**: K7, le conferme sul web, S3, G3, G4, G8, G9, U7, L1, L3, L6, B3, B5 e i minori su rotte, accessibilità, configurazione nativa e dipendenze (§1).
- **Abbinamento del manico (B3)** e **permesso Bluetooth iOS contestuale (B5)** cambiano il comportamento visibile della scheda Spazzolino: vanno riprovati sull'HX6322/04 reale (issue #3), insieme ai messaggi per Localizzazione spenta su Android ≤ 11.
- **Restano aperti** solo i punti che richiedono il proprietario o risorse esterne: collaudo fisico (#3), runner CI (#9), due advisory `high` senza versione corretta (#8, `braces`), privacy policy, dichiarazioni store, marchi, parental gate (§3).
- **Prossimo passo richiesto dal proprietario:** nuovo audit indipendente dell'intero progetto con checklist di pubblicazione, poi correzione di quanto emerge.

## 1. Commit di questo intervento

| Commit | Rilievo | Cosa cambia |
|---|---|---|
| `4343b4c` | K7, advisory | `shell-quote` 1.12.0 (GHSA-pqg4-j6r4-53mv critico); `query-string` 7.1.3 patchato per `decode-uri-component` 0.5 (ESM): senza la patch `parse()` lanciava su ogni query. Test `dependency-compat`. |
| `a32520a` | web | `confirmDestructive`/`showMessage` in `lib/dialogs.ts`: su react-native-web `Alert.alert` è vuoto, quindi "Svuota storico", "Dimentica manico" e "Elimina premio" non facevano nulla. |
| `8959456` | S3 | I codici testuali v1/v2 con progressi incoerenti con lo storico (XP, monete, serie, collezionabili fuori dai massimi derivabili) vengono rifiutati. |
| `81dec19` | G3 | Le sessioni importate dal manico aggiornano missioni e serie anche su archivio parziale; la riconciliazione del fallback usa la sessione più recente. Test su SQLite reale (`partial-archive`). |
| `4856bef` | G4 | "Elimina storico" azzera il prezzo pagato nel ledger: il portafoglio riparte da zero senza debito nascosto; il dialogo elenca cosa si perde e cosa resta. E2E web. |
| `1041b66` | G9, G2 | Limiti dei premi dei genitori allineati al backup (40 premi, titoli di 60 caratteri), conferma prima di eliminare, testo "sessioni approssimative" corretto. |
| `6c0d38b` | U7 | `createdAt` del backup al momento dell'esportazione; messaggio di esito che non promette il salvataggio se il foglio di condivisione è stato annullato. |
| `3279d31` | L6, L3 | Redazione del report hardware nelle cinque lingue; tedesco corretto (carattere invisibile, "Handgriff", stringhe troncate). |
| `37bb7ca` | L1 | Plurali `{n|uno|altri}` nel renderer i18n, con regola francese (0 e 1 singolare); 32 stringhe convertite in cinque lingue. |
| `80345c2` | B5 | Su iOS il `BleManager` nasce al primo "Cerca e collega": il prompt Bluetooth compare quando serve. Attesa dell'adattatore (30 s) con messaggi distinti per spento, non autorizzato, non supportato. Test che ogni messaggio del client abbia una traduzione. |
| `d494433` | B3 | Manico abbinato: la scansione accetta solo l'identificativo ricordato (iOS può avvisare senza nome); "Cambia manico" cerca un manico diverso; "Dimentica manico resettato" funziona anche da disconnesso; messaggi dedicati in cinque lingue. 5 test del client con più periferiche, 3 del provider. |
| questo commit | rotte, a11y, config nativa, dipendenze | Vedi §2. |

## 2. Dettaglio dell'ultimo commit

| Area | Correzione | Verifica |
|---|---|---|
| Rotte | `app/+not-found.tsx` tradotto con ritorno a Oggi (riemerge la tab sottostante senza duplicarla); sitemap di expo-router disattivata: l'export web non contiene `_sitemap.html`, mentre il server di sviluppo la serve ancora. | E2E web `collegamento-inesistente`; stato axe `not-found` chiaro/scuro (il pulsante usa il blu fisso `#2457D6`: il primario del tema scuro dava 2,3:1) |
| Navigazione | `backBehavior="history"` sulle tab: le schermate nascoste tornano da dove sono state aperte; `useBack` sostituisce con Oggi quando non c'è cronologia (deep link). | `use-back.test` |
| Intestazione | L'indicatore di connessione legge lo stato reale del manico in tutte le schermate (otto passavano `connected={false}` fisso) ed è un elemento accessibile con ruolo immagine. | lint, test semantici |
| Lettori di schermo | `announce()` (VoiceOver/TalkBack; regione live sul web) per il cambio di zona del timer e l'apertura del modal di ricompensa; progressbar `accessible`. | `announce.test` |
| Riduci movimento | `useReducedMotion`: creatura ferma, niente coriandoli, niente dissolvenze nell'onboarding quando il sistema lo chiede. | `use-reduced-motion.test` |
| Aree di tocco | Consegna/eliminazione premi 44 pt, interruttore demo con `hitSlop`, pulsanti indietro, "Riprova", opzioni lingua, oggetti della tana, stati del collaudo ≥ 44 pt. | lettura stili |
| Premi | Conferma anche per "Segna consegnato". | — |
| Storico | I tre totali usano il record lifetime (le ultime 120 righe non sono più presentate come totale); in demo restano i dati simulati. | E2E `history-recent-sessions` |
| Azioni asincrone | `useAsyncAction`: 31 pulsanti che prima facevano `void promise` mostrano "Operazione non riuscita" se il salvataggio fallisce. | `use-async-action.test` |
| BLE Android ≤ 11 | Codici `react-native-ble-plx` tradotti (601 Localizzazione spenta, 600 scansione non avviata, 3 timeout, 200 connessione fallita, 100–102 stato adattatore). | 2 test del client |
| Config iOS | `requireFullScreen: true` (orientamento verticale anche su iPad); `userInterfaceStyle: "automatic"` su entrambe le piattaforme (prima iOS automatico e Android forzato chiaro) con splash scuro `#10162A`; barra di stato che segue il tema; `NSBluetoothAlwaysUsageDescription` dichiarato una sola volta (plugin, inglese) e tradotto via `InfoPlist.strings`. | `expo config --type introspect`, `audit-native-config.test` |
| Config Android | Plugin `with-android-orientation-compat`: proprietà `PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY` per mantenere il verticale sugli schermi grandi di Android 16. | `android-orientation-plugin.test`, introspect |
| Dipendenze | Rimossi `expo-image` (plugin e pacchetto mai importati), `@expo/ngrok`, `@types/qrcode`; rimosso il runtime web Manus (`lib/_core/manus-runtime.ts`, override delle safe area nell'iframe). | tsc, lint, test, E2E |

## 3. Cosa resta prima degli store

| Tema | Stato | Chi/cosa serve |
|---|---|---|
| Collaudo hardware HX6322/04 su iPhone e Android | Aperto ([#3](https://github.com/fz1101hub/sparkly-brush/issues/3)) | Manico reale: abbinamento, cambio manico, permesso iOS al primo collegamento, Localizzazione su Android ≤ 11, sync dei record. |
| CI GitHub senza runner | Aperto ([#9](https://github.com/fz1101hub/sparkly-brush/issues/9)) | Impostazioni dell'account (billing/Actions). |
| Advisory `high` | Aperto ([#8](https://github.com/fz1101hub/sparkly-brush/issues/8)): `node-forge` ≤ 1.4.0 e `braces` ≤ 3.0.3, ultime pubblicate 1.4.0 e 3.0.3 al 13 ottobre | Release a monte; il gate resta bloccante. |
| B4 — intervallo > 128 sessioni | Latente | Serve il manico reale per sapere quante sessioni conserva. |
| M4 — timer manuale con manico non collegato | Decisione di prodotto | Il manico scollegato può registrare una sessione mentre il timer manuale gira; i due accrediti vengono distinti solo alla sync. |
| Privacy policy, Data Safety / App Privacy, marchi, parental gate, Kids/Families | Aperti | Proprietario. |
| Materiale store (screenshot, descrizioni in cinque lingue, icona, versione/build) | Da preparare | Proprietario + build EAS. |
