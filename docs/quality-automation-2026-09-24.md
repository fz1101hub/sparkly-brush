# Automazione qualità, accessibilità e stress lifetime

**Progetto:** Sparkly Brush  
**Data:** 24 settembre 2026  
**Ramo:** `fix/claude-ultracode-audit`

> **Nota del 1° ottobre 2026:** i conteggi e le versioni sotto documentano il checkpoint di settembre, non il candidato più recente. L'[audit Opus e la risposta tecnica](audit-opus-2026-10-01.md) coprono il fallback GATT Kids senza `40d2`, la riconciliazione BLE/storage, il lint esteso e il contrasto degli starter/modal. La PR #7 resta non unita finché la CI GitHub non esegue effettivamente i job e passa.

## Sintesi

Questo intervento aggiunge quattro livelli complementari di verifica: **stress pluriennale della progressione e dei backup**, **accessibilità automatica web e contratti semantici React Native**, **flussi end-to-end Android con Maestro** e **localizzazione completa in cinque lingue**. Nessuno di questi gate sostituisce la prova Bluetooth sul Philips Sonicare for Kids HX6322/04 reale; riducono però in modo sostanziale le regressioni rilevabili prima del collaudo fisico.

## Risultati implementati

| Area | Implementazione | Evidenza automatica |
|---|---|---|
| Progressione pluriennale | Replay incrementale di 14.610 sessioni complete, equivalenti a due sessioni al giorno per vent’anni | Totali sessioni, secondi, XP e oggetti verificati senza costruire lo storico completo |
| Backup streaming | Validazione semantica di 20.000 sessioni senza `Set` o array crescenti nel validatore | Stato serializzato finale inferiore a 4 KiB e crescita massima di 256 byte rispetto al checkpoint dopo 1.000 righe |
| Dispositivi BLE | Quaranta device, rollover `uint16`, reset e pruning di cursori/fallback | Massimo 32 cursori, 32 identità recenti e 32 fallback; nessun MAC o UUID grezzo nel profilo |
| Fusi orari | Gate separati per `America/New_York`, `Europe/Rome` e `Pacific/Kiritimati`, oltre alla suite UTC | Giorni civili consecutivi, ora ripetuta DST e coppia mattina/sera verificati |
| Semantica accessibile | Ruoli, nomi, valori, stato selezionato e `testID` stabili su onboarding, starter, timer, zone, device, backup, storico e collaudo | Contratti component-level con Test Renderer 1.2 |
| WCAG automatico | Playwright 1.63 + axe 4.13 su viewport mobile, in tema chiaro e scuro | Ventotto stati UI complessivi senza violazioni WCAG 2 A/AA e 2.1 A/AA; dialog, nomi dei controlli e valori ARIA verificati nel DOM |
| E2E web funzionale | Tre percorsi Playwright su Expo Web con timer E2E a cinque secondi | Sessione → ricompensa → storico; checklist hardware → backup; cinque lingue e modalità Sistema, sempre con persistenza dopo reload |
| Localizzazione | Italiano, inglese, tedesco, francese e spagnolo con rilevamento dispositivo, override persistente e fallback italiano | 856 chiavi per catalogo; parità, placeholder, valori vuoti, titoli evolutivi, migrazione backup, hydration e formati locali verificati |
| E2E web multilingua | Selettore lingua reale nella schermata Impostazioni | Cambio immediato tra cinque lingue, modalità Sistema, attributo `lang` e persistenza dopo reload |
| Metadati nativi | `expo-localization` con risorse iOS/Android per tutte le lingue | Prebuild genera cinque `InfoPlist.strings`, cinque `values-b+*`, `locales_config.xml` e dichiarazioni iOS |
| E2E Android | Due flow Maestro 2.10.0 e APK release E2E autonomo `x86_64` da 53 MiB | `assembleRelease` superato; primo avvio → timer → ricompensa → storico → backup; checklist hardware → riavvio → persistenza esito |
| CI | Gate axe e funzionale web nei pull request; build e flow Maestro su emulatore per release o `workflow_dispatch` | Report Playwright e Maestro caricati come artifact anche in caso di errore |

Tre review read-only separate hanno controllato streaming/stress, accessibilità e Maestro/CI. La review accessibilità ha inizialmente riprodotto l’assenza degli attributi `aria-value*` nel DOM e una duplicazione `aria-modal` su un wrapper web senza ruolo; entrambi i casi sono stati corretti e una re-review su server Expo fresco ha concluso senza blocker. Le review stress e Maestro hanno confermato le invarianti bounded e la coerenza tra flow, `testID`, persistenza e build E2E.

Una review finale indipendente, divisa tra percorso funzionale web, accessibilità light/dark e integrazione CI, non ha trovato blocker sorgente residui. Il revisore CI ha inoltre riprodotto in una copia isolata sia i tre audit axe sia i due percorsi funzionali con installazione frozen e Chromium, confermando che porte, timeout, artifact e variabile `EXPO_PUBLIC_E2E` sono coerenti.

Quattro review indipendenti aggiuntive hanno verificato i cataloghi inglese, tedesco, francese e spagnolo; una quinta ha esaminato architettura e persistenza. Sono stati corretti titoli evolutivi rimasti in italiano, formulazioni terminologiche, una race tra hydration e override, log diagnostici non ritraducibili, numeri del backup con separatore fisso e stati tecnici raw. Il client BLE conserva la propria identità durante il cambio lingua; un test dedicato impedisce regressioni di lifecycle.

## Modifiche tecniche rilevanti

Il percorso SQLite che ricostruisce la progressione da un archivio completo usa ora `getEachAsync` invece di materializzare tutte le righe. Anche l’inserimento fuori ordine ricostruisce reward ledger e aggregati in streaming. La deduplica dei backup importati resta garantita dalla chiave primaria canonica, dalla whitelist dello schema e dalla verifica semantica usata per i formati in memoria.

L’interfaccia espone contratti accessibili espliciti. Timer e quadranti sono progressbar con attributi `aria-valuemin`, `aria-valuenow`, `aria-valuemax` e `aria-valuetext`; gli starter sono un gruppo radio; gli switch comunicano stato e nome; gli input dell’area genitori hanno etichette programmatiche; gli errori backup sono annunciati; onboarding e ricompensa espongono un dialog modale. L’audit esteso a tutte le schermate ha corretto i testi delle superfici pastello fisse, gli stati bloccati che attenuavano anche il testo tramite `opacity` e i badge livello ridondanti. Una palette separata distingue ora accenti decorativi e accenti testuali AA, protetti anche da un test di contrasto su 54 combinazioni. Sul web, le animazioni non richiedono il native driver, le ombre usano `boxShadow` e `pointerEvents` è applicato via style, eliminando i warning React Native 0.86 osservati durante Playwright.

Il percorso Playwright funzionale ha rilevato una race concreta di `expo-keep-awake`: la sessione accelerata poteva terminare prima dell’attivazione del wake lock web e il cleanup generava un overlay Expo. Il wake lock resta attivo su iOS e Android, dove serve durante lo spazzolamento, ed è disabilitato sul web. Dopo la correzione, entrambi i percorsi funzionali completano senza overlay e verificano la persistenza dopo reload.

I flow Maestro usano esclusivamente identificatori stabili. Un test Vitest scansiona i file YAML e fallisce se un flow riferisce un `testID` non dichiarato dall’app. La build E2E è isolata da `EXPO_PUBLIC_E2E=1`: usa ABI `x86_64` e un timer manuale di cinque secondi. Le build ordinarie continuano a usare ABI ARM e il target reale di 120 secondi. La CI scarica l’asset ufficiale Maestro 2.10.0 e ne verifica lo SHA-256 prima dell’esecuzione.

La checklist hardware salva esplicitamente ogni modifica invece di affidarsi a un effetto successivo al render. Il flow attende l’indicatore `hardware-checklist-saved-1` prima del force-stop, quindi il test di persistenza non dipende da uno sleep arbitrario.

Il runtime i18n è locale e non introduce backend. Il catalogo italiano tipizzato è la sorgente delle chiavi e viene suddiviso nei domini core, dispositivo, famiglia e gioco. I cataloghi esteri devono avere esattamente le stesse chiavi e gli stessi placeholder. Le chiamate letterali al traduttore verificano i placeholder a compile time; i percorsi dinamici usano un’API distinta. La preferenza `system | it | en | de | fr | es` usa lo storage esistente ed entra nei backup senza rompere i formati legacy. Il provider attende l’idratazione prima di renderizzare l’app e protegge le modifiche concorrenti con una revisione monotona.

## Comandi

```bash
pnpm test
pnpm test:stress
pnpm test:a11y:semantic
pnpm test:a11y:web
pnpm test:e2e:web
pnpm test:i18n
pnpm test:e2e:android
```

`pnpm test:e2e:android` richiede un APK E2E già installato, un emulatore Android avviato e Maestro 2.10.0 nel `PATH`. Il workflow GitHub prepara automaticamente questi prerequisiti nei run manuali o di release.

## Limiti dichiarati

Il sandbox non espone `/dev/kvm`; l’emulatore Android in accelerazione software non ha completato il boot entro sei minuti. Sono stati comunque verificati localmente la configurazione x86_64, la build `assembleRelease` dell’APK E2E autonomo, i riferimenti dei selettori e la sintassi accettata dalla CLI fino alla fase di connessione al device. L’esecuzione completa dei due flow è demandata al runner GitHub con virtualizzazione hardware o a una workstation Android.

La suite Vitest completa comprende **42 file e 275 test**; il gate i18n dedicato esegue 68 verifiche e il gate stress aggiunge esecuzioni separate nei tre fusi orari. Playwright esegue **tre test di accessibilità che attraversano 28 stati UI** e **tre percorsi funzionali**, producendo un report axe distinto per ogni stato oltre a screenshot, video e trace in caso di errore. Il percorso multilingua completo termina in 54,1 secondi e la matrice axe in circa 1,8 minuti nel sandbox corrente.

La build Android nativa Expo 57 era già stata superata sul checkpoint precedente con SDK 36, JDK 17 e NDK 27.1, inclusa la variante E2E release. Per il candidato multilingua, `expo prebuild` genera correttamente i progetti iOS/Android e tutte le risorse localizzate. Il sandbox corrente contiene JDK 21 ma non Android SDK né JDK 17; non viene quindi dichiarata una nuova compilazione nativa dell’esatto checkout. Gli export Expo restano il gate locale disponibile, mentre la build Gradle rimane obbligatoria nella CI prima del merge.

Restano inoltre fuori dall’automazione il Bluetooth fisico, il comportamento radio in background, il picker documenti e lo share sheet di sistema. Questi casi rimangono nella checklist manuale dell’issue hardware.

## Fonti

Le decisioni seguono la documentazione ufficiale di Maestro per React Native, `launchApp`, selettori, attese e report JUnit [1], le API di accessibilità React Native [2], la guida Playwright per axe [3], le note Expo SDK 57 [4] e la guida Expo Localization [5].

[1]: https://docs.maestro.dev/get-started/supported-platform/react-native "Maestro — React Native"
[2]: https://reactnative.dev/docs/accessibility "React Native Accessibility"
[3]: https://playwright.dev/docs/accessibility-testing "Playwright Accessibility testing"
[4]: https://expo.dev/changelog/sdk-57 "Expo SDK 57"
[5]: https://docs.expo.dev/guides/localization/ "Expo Localization guide"
