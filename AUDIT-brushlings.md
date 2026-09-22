# Audit del branch `feature/brushlings-game`

Data: 22 settembre 2026 · Head analizzato: `f77efe1` · Base di confronto: `main` (`c0fd3b2`)

## Sintesi

Il branch aggiunge un layer di gioco completo ("Brushlings": starter ed evoluzioni, XP/monete, missioni giornaliere, inventario e uova, negozio della tana, premi definiti dai genitori, dashboard genitori, modalità demo isolata, backup portatile, audio offline e preferenze) in **+6.845 righe su 54 file**, con 22 nuovi test unitari e una GitHub Action di verifica.

L'impianto è **buono**: logica di gioco pura e testata, nessuna chiamata di rete aggiunta (coerente con la promessa privacy), demo mode correttamente isolata, IP originale dichiarato nel README. Ci sono però **un bloccante di build** (lockfile fuori sync mascherato dalla CI), **un bug di race** sulla creatura selezionata, **un difetto strutturale dell'economia** legato al cap dello storico e **l'assenza di un parental gate** in vista della pubblicazione Kids.

Verifiche eseguite sul branch: `pnpm install --frozen-lockfile` ❌ (vedi B1), `pnpm check` ❌ con lockfile committato / ✅ dopo rigenerazione, `pnpm test` ✅ (25 passati, 1 skippato), `pnpm lint` ✅, nessun segreto/`console.log`/`TODO` nel nuovo codice, nessun uso di rete nel nuovo codice.

---

## Bloccanti

**B1 — `pnpm-lock.yaml` non contiene `expo-audio`; la CI maschera il problema**
`package.json` aggiunge `expo-audio ~1.1.1`, ma il lockfile committato non è mai stato rigenerato: `pnpm install --frozen-lockfile` fallisce con `ERR_PNPM_OUTDATED_LOCKFILE` e di conseguenza `pnpm check` fallisce su un checkout pulito (`Cannot find module 'expo-audio'`). Il workflow `.github/workflows/verify.yml` aggira il problema installando con `--no-frozen-lockfile` e caricando il lockfile "refreshed" come artifact (commit `f77efe1`) invece di committarlo: così la CI è verde ma la repo non è riproducibile, e ogni run CI può risolvere versioni diverse (rischio supply-chain oltre che di build).
Correzione: rigenerare il lockfile in locale (`pnpm install`), committarlo, riportare la CI a `--frozen-lockfile` e rimuovere lo step "Capture refreshed lockfile". Ho verificato che con il lockfile rigenerato il typecheck passa pulito: è solo un problema di repo-state, non di codice.

## Bug

**B2 — Race sulla creatura selezionata: downgrade silenzioso e persistito** — `contexts/brushling-context.tsx:132-137`
L'effetto che riporta `selectedId` a Bloopi quando non è tra gli `unlockedIds` non aspetta `historyReady`: all'avvio `history` è `[]`, quindi gli sbloccati sono solo i tre starter. Se il profilo salvato ha Voltuff o Moonbit e lo storico si idrata un attimo dopo il profilo (ordine non garantito tra i due caricamenti AsyncStorage), la selezione viene degradata a Bloopi **e salvata su disco**. Fix: aggiungere la guardia `historyReady` (e idealmente attendere anche `profileReady` && `historyReady` insieme).

**B3 — Economia derivata da uno storico cappato a 120 sessioni** — `lib/brush-storage.ts:9`, `lib/customization.ts:154-163`, `lib/brushlings.ts:176-201`
Tutto (XP, monete guadagnate, bonus missioni "lifetime", achievement) è ricalcolato dalla history, che però è un buffer circolare di 120 sessioni (~2 mesi a 2 sessioni/giorno). Le monete spese invece sono assolute (somma dei prezzi degli `ownedIds`). Superato il cap, le sessioni vecchie escono dalla finestra: le monete "guadagnate" e i bonus giornalieri ricalcolati scendono mentre lo speso resta, quindi il saldo si sgonfia (il `Math.max(0, …)` nasconde il negativo) e XP/livello si appiattiscono al valore della finestra. Oggi i costi totali del negozio (308 monete) si coprono ben prima del cap, quindi l'impatto pratico è limitato, ma il modello va corretto prima di aggiungere contenuti: persistere un ledger cumulativo (guadagnato/speso) oppure salvare contatori aggregati separati dallo storico visualizzato.

## Pubblicazione Kids / privacy

**K1 — Nessun parental gate.** L'"Area genitori" (creazione, eliminazione e consegna di premi reali, dashboard di monitoraggio), il Backup (esporta lo storico del bambino via share sheet) e la Demo sono route nascoste dalla tab bar ma raggiungibili da chiunque usi l'app, bambino incluso. Per la categoria Kids dell'App Store un parental gate è un requisito di review (e una best practice COPPA); metterlo davanti a parent/backup/settings è il minimo prima della pubblicazione.

**K2 — Backup in chiaro.** Il codice di backup è JSON in chiaro con prefisso versionato, condiviso via share sheet verso canali scelti dall'utente (Mail, Drive…): accettabile per un'app local-first, ma contiene i dati comportamentali del bambino; da esplicitare nella futura privacy policy. Il `backupFingerprint` è solo descrittivo (data+conteggio+creatura), non un checksum di integrità. Piccola asimmetria: `normalizeParentRewards` nel parse del backup scarta silenziosamente premi senza `deliveredAt`, mentre il load locale li accetta.

Punti a favore: la parte di validazione del backup è robusta (throw su sessioni malformate, normalizzazione di customization e preferenze, demo esclusa dall'export, restore bloccato in demo con preview prima del ripristino), e il README dichiara correttamente l'originalità dei personaggi rispetto a IP esistenti.

## Qualità e manutenzione

**Q1 — Ottimo**: logica di gioco in moduli puri e deterministici con 22 test mirati (missioni, inventario, customization, backup, dashboard, premi, avventura, progressione); demo mode isolata su chiavi storage separate con guardie su BLE e acquisti non persistiti; audio generato offline come WAV data-URI senza asset né permesso microfono (`expo-audio` configurato playback-only); preferenze rispettate da aptica e suoni; nessun timer/`Math.random` nei componenti animati.

**Q2 — Helper data duplicati e semantica "streak" ambigua**: `localDateKey`/fasce mattina-sera/streak sono reimplementati in 4 file (`brushlings.ts`, `missions.ts`, `parent-dashboard.ts`, `parent-rewards.ts`). Attenzione in particolare: `computeStreak` (home) è la **streak corrente**, `longestStreak`/`longestCompletedDayStreak` (premi genitori, achievement) è la **streak più lunga di sempre** — stesso nome per l'utente, metriche diverse. Consolidare in un unico modulo di utilità e disambiguare le etichette.

**Q3 — Minori**: `perfectDayCount` ricalcola il sommario giornaliero per ogni giorno (O(n·giorni), irrilevante a queste scale); i due data-URI audio (~50 KB) sono generati a import time sul thread JS (meglio lazy); `components/haptic-tab.tsx` senza newline finale; la CI parte solo su PR verso main e push su `feature/**` (aggiungere push su `main`); il nesting dei provider in `app/_layout.tsx` ha un'indentazione incoerente che nasconde la gerarchia.

## Cosa NON cambia

Il branch non tocca server, BLE o dipendenze backend: i rilievi di sicurezza dell'audit di `main` (CORS riflesso, storage proxy aperto, JWT_SECRET senza fail-fast, boilerplate inutilizzato, dipendenze vulnerabili) restano validi e invariati.

## Azioni consigliate in ordine di priorità

1. **B1**: committare il lockfile rigenerato e riportare la CI a `--frozen-lockfile` (rimuovendo l'upload dell'artifact).
2. **B2**: aggiungere la guardia `historyReady` all'effetto di reset della selezione.
3. **K1**: parental gate davanti ad Area genitori, Backup e Impostazioni prima di qualsiasi distribuzione.
4. **B3**: introdurre un ledger persistente per monete/XP prima di ampliare il negozio o i contenuti.
5. **Q2**: consolidare gli helper data/streak e chiarire corrente vs. più lunga.
