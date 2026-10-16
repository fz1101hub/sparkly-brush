# Profili e routine familiari

## Comportamento

- Fino a otto bambini, con nome modificabile e archivi indipendenti. Il primo profilo usa esattamente le chiavi e il nome database precedenti: nessuna copia o cancellazione dello storico esistente.
- Timer manuale con pausa, recupero dopo riavvio e journal persistente. Il tempo trascorso in background non viene accreditato. Una sessione in attesa di salvataggio mantiene lo stesso identificativo anche dopo riavvio, così il retry resta idempotente.
- Cambio bambino bloccato durante una sessione, un avvio o un salvataggio incompleto. Le connessioni Bluetooth vengono chiuse prima del cambio. Un manico appartiene al primo profilo che lo collega, anche dopo “Dimentica manico”, per evitare l’importazione dello stesso storico in profili diversi.
- Due notifiche locali giornaliere per bambino, con orari distinti e canale silenzioso. Il permesso OS si richiede soltanto con un salvataggio esplicito; il ripristino delle pianificazioni all’avvio non apre richieste. Il tap seleziona il bambino corretto senza interrompere una sessione attiva. Il web spiega che occorre l’app nativa.
- Una sola schermata introduttiva, dettagli facoltativi e guida rapida permanente nelle impostazioni. Controlli principali di almeno 44–48 punti, etichette accessibili, annuncio delle zone e layout flessibili per testo ingrandito.

## Persistenza e concorrenza

`createProfileStorage` e le factory dei repository catturano l’identità al momento della creazione. Ogni provider conserva la propria istanza: una scrittura ritardata non può finire nel profilo appena selezionato. I database SQLite, i journal di restore e quelli del timer sono separati per bambino. La selezione del profilo cambia solo dopo il salvataggio del registro famiglia e il caricamento dei provider precede il ritorno alla Home.

Preferenze, acquisti e premi familiari serializzano le modifiche e pubblicano il nuovo stato solo dopo il salvataggio. Un errore conserva la scelta o il saldo precedente e viene mostrato nell’interfaccia. Le vibrazioni di avvio e dei premi rispettano le preferenze del bambino; errori del feedback aptico non interrompono il timer o la connessione. Le modifiche ai promemoria annullano solo le due notifiche del profilo interessato e ripristinano la configurazione precedente quando il salvataggio fallisce.

I backup restano per bambino: selezionare il destinatario prima di importare. Temi e promemoria sono impostazioni del dispositivo e non fanno parte dell’archivio portatile. Non sono stati introdotti account, servizi remoti o raccolta dei dati dei bambini.

## Verifica

La suite include migrazione legacy e isolamento usando SQLite reale (`node:sqlite` dietro l’API asincrona Expo), salvataggi ritardati tra profili, registri corrotti, cambio profilo fallito, guardie di transizione, recupero del timer e retry dopo riavvio, sovrapposizione timer/BLE, concorrenza degli acquisti, preferenze e permessi notifiche. Il confine dell’SDK Expo è verificato per orari, canali, rifiuto definitivo, autorizzazione provvisoria iOS e tap duplicati.

Il runner Playwright verifica i sei temi su dodici route, contrasto del testo, errori di persistenza, pausa/riavvio/ripresa, blocco del cambio durante la sessione, due bambini con temi e progressi differenti, ripristino del primo profilo e layout a 320 pixel con testo raddoppiato. Produce schermate e report JSON negli artifact CI. La pipeline esegue inoltre TypeScript, Vitest, lint, audit critico, Expo Doctor, export web/iOS/Android e compilazioni native Android e simulatore iOS.

Il collaudo software non sostituisce le prove fisiche: consegna delle notifiche a schermo bloccato con impostazioni OS reali, lettori di schermo, font di sistema ingranditi e protocollo BLE sul manico HX6322/04 restano da verificare sui dispositivi. La modalità silenziosa rispetta i canali Android, che l’utente può modificare dalle impostazioni del telefono.
