# Profili e routine familiari

Arrivati con la PR #10 e portati su questo ramo (Expo 57) il 25 ottobre 2026; le differenze rispetto alla PR sono in [unificazione-pr10-2026-10-25.md](unificazione-pr10-2026-10-25.md).

## Comportamento

- Fino a otto bambini, con nome modificabile (massimo 24 caratteri) e archivi indipendenti. Il primo profilo usa le chiavi e il nome del database precedenti: nessuna copia o cancellazione dello storico esistente.
- Lingua e blocco genitori sono della famiglia: cambiare bambino non cambia lingua e non scavalca il blocco. Suoni, musica, vibrazione, tema e promemoria sono del bambino.
- Timer guidato con journal per profilo: il checkpoint viene scritto prima dell'avvio e a ogni secondo. L'app in background mette in pausa la sessione; alla riapertura, anche dopo un riavvio, si può riprenderla o scartarla, senza accreditare il tempo ad app chiusa. Una sessione in attesa di salvataggio mantiene lo stesso identificativo, quindi il retry non raddoppia i premi. Un journal illeggibile blocca il timer finché il genitore non lo scarta.
- Se il manico inizia a spazzolare durante il timer guidato, vale la sessione del manico (audit M4) e il checkpoint viene rimosso.
- Cambio bambino bloccato durante una sessione, un avvio, una connessione o un salvataggio incompleto; le connessioni Bluetooth vengono chiuse prima del cambio. Demo e modalità reale non si scambiano con una sessione aperta.
- Un manico appartiene al primo profilo che lo collega, anche dopo «Dimentica manico» o un cambio di manico: le scansioni degli altri profili lo ignorano e il collegamento lo assegna prima di connettersi. Così lo storico interno del dispositivo non viene importato da più bambini. Il manico abbinato prima dei profili resta del primo profilo.
- Due notifiche locali al giorno per bambino, orari distinti e canale silenzioso, nella lingua della famiglia. Il permesso si chiede solo con un salvataggio esplicito; il riallineamento all'avvio non apre richieste. Il tocco sulla notifica apre il bambino giusto, ma non interrompe una sessione in corso. Il web spiega che servono le app native. L'entitlement push di iOS viene rimosso: non esistono notifiche remote.
- Lo schermo resta acceso solo durante una sessione.

## Persistenza e concorrenza

`createProfileStorage` e le factory dei repository fissano l'identità del profilo alla creazione e ogni provider tiene la propria istanza: una scrittura ritardata non può finire nel profilo appena selezionato. Database SQLite, journal di ripristino e journal del timer sono separati per bambino; la selezione cambia solo dopo il salvataggio del registro famiglia, e la Home torna visibile quando i provider del nuovo bambino sono pronti.

Se una preferenza non si salva, l'interfaccia torna al valore precedente. I backup sono per bambino: per trasferire una famiglia si esporta un file per bambino e lo si ripristina nel profilo corrispondente. Temi e promemoria non sono nei backup. Non esistono account, servizi remoti o raccolta di dati dei bambini.

## Verifica

Test unitari e di integrazione: registro famiglia corrotto, cambio profilo fallito, guardie, isolamento con SQLite reale (`tests/native-sqlite/family-profiles.test.ts`), journal del timer (pausa, riavvio, ripresa, migrazione del vecchio record, journal illeggibile), manici dei fratelli esclusi e assegnati, promemoria (orari, canali, rifiuto definitivo, autorizzazione provvisoria iOS, tocchi duplicati) e plugin che toglie l'entitlement push.

Restano da provare sui dispositivi: notifiche a schermo bloccato con impostazioni reali, lettori di schermo, font di sistema ingranditi e il manico HX6322/04.
