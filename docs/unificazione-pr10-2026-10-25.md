# Unificazione della PR #10 sul ramo Expo 57 — 25 ottobre 2026

La PR #10 (`feature/ordinary-themes`) aggiungeva sei temi con la grafica approvata, profili familiari, promemoria e sessioni recuperabili, ma partiva da `main` su Expo 54 e senza le correzioni di audit di questo ramo. Le sue funzioni sono state portate qui in cinque passi, ciascuno con typecheck, lint, test e verifiche proprie:

| Passo | Commit | Contenuto |
|---|---|---|
| 1 | `825857d` | Temi, font, tavole approvate, `profile-scope`, `DesignText`, ThemeProvider con caricamento tradotto. |
| 2 | `e3aa5a0` | Storage per profilo su SQLite nativo, web, preferenze, Brushling, premi e journal di ripristino. |
| 3 | `0248629` | Famiglia, journal del timer guidato con pausa e ripresa, guardie di cambio profilo, manici per bambino, promemoria locali, entitlement push rimosso. |
| 4 | `f63aca9` | Interfaccia approvata: Home, sessione, barra a quattro schede, selettori di tema, profili e promemoria, guida rapida. |
| 5 | questo passo | Confronto visivo dei sei temi in CI, documentazione, storia della PR #10 collegata al ramo. |

Infine la storia della PR #10 è stata collegata con `git merge -s ours`: il codice resta quello di questo ramo, ma GitHub riconosce i suoi commit come inclusi.

## Scelte di unificazione

- **Lingue**: tutti i testi della PR #10, scritti in italiano nel codice, sono nei cataloghi delle cinque lingue; gli errori viaggiano come chiavi (`LocalizedError`) e vengono tradotti dalla schermata che li mostra. Anche le notifiche usano la lingua della famiglia.
- **Lingua e blocco genitori condivisi**: nella PR erano preferenze del singolo bambino. Qui sono della famiglia, così cambiare profilo non cambia lingua e non scavalca il blocco.
- **Journal unico del timer**: il checkpoint della PR #10 e il record «sessione da salvare» di questo ramo sono un solo journal per profilo; il vecchio record viene migrato al primo avvio. Un journal illeggibile non sovrascrive niente finché il genitore non lo scarta.
- **Manico e timer guidato**: la PR #10 metteva in pausa il timer quando il manico iniziava a spazzolare; qui resta la regola dell'audit M4, che dà priorità al record del manico.
- **Manici dei fratelli**: oltre al rifiuto al collegamento (PR #10), le scansioni ignorano i manici di altri profili, così non si apre nemmeno la connessione.
- **Store catturati al mount** per preferenze, Brushling e premi, oltre che per spazzolino e tema: una scrittura tardiva resta nel profilo che l'ha iniziata.
- **Preferenze**: se il salvataggio fallisce, l'interfaccia torna al valore precedente (PR #10), mantenendo la protezione di questo ramo contro la corsa con il caricamento iniziale.
- **Schermata Oggi**: Home e sessione della PR #10, con le schede di questo ramo per sessione in pausa, da salvare o illeggibile e l'avviso della modalità demo. Timer e zone mantengono la semantica accessibile già verificata (progressbar con valori).
- **Restano di questo ramo**, perché già verificati per contrasto e test: onboarding a quattro pagine, modale del premio, scelta dello starter e i colori delle schermate secondarie.
- **Schermo acceso** solo durante la sessione, non su tutta la Home.

## Verifiche

- TypeScript, lint, 498 test unitari e di integrazione (inclusi quelli portati dalla PR #10), 96 test di localizzazione, stress lifetime.
- E2E web: 9 percorsi funzionali e 14 audit axe, sei temi compresi.
- Export web; plugin di configurazione controllato con `expo config --type introspect` (senza il plugin iOS riceve `aps-environment`, con il plugin no).
- I flussi Maestro passano dalla scheda Famiglia; vanno rieseguiti su emulatore nel workflow dedicato.

Restano da fare sui dispositivi: notifiche reali, lettori di schermo, testo di sistema ingrandito e manico HX6322/04.
