# Piano di prova hardware — Philips Sonicare for Kids HX6322/04

## Scopo

Questa prova convalida il protocollo BLE, il lifecycle della connessione e la contabilizzazione lifetime su un manico reale. Deve essere eseguita con una development build iOS e una Android perché Expo Go non include `react-native-ble-plx`.

## Prerequisiti

| Elemento | Requisito |
|---|---|
| Spazzolino | Philips Sonicare for Kids HX6322/04 carico e non connesso a un’altra app |
| iPhone | Bluetooth attivo, build nativa installata, permesso Bluetooth concesso |
| Android | Bluetooth attivo, build nativa installata, permessi Dispositivi nelle vicinanze concessi; posizione solo dove richiesta dalla versione Android |
| Dati | Modalità demo disattivata; annotare il numero iniziale di sessioni e le monete disponibili |

## Assistente in-app

Aprire **Spazzolino → Prova guidata e report**. La schermata conserva localmente lo stato del collaudo, presenta gli stessi tredici casi della matrice e permette di segnare **Superato**, **Fallito**, **Bloccato** o **Da fare**, con una nota fino a 1.000 caratteri. Il pulsante **Condividi report** crea un Markdown con versione app/OS, snapshot BLE, conteggi lifetime, esiti e log sanitizzati. Il report esclude l’ID persistente del dispositivo e oscura UUID, MAC e identificativi espliciti nei log.

## Matrice minima

| Caso | iOS | Android | Criterio di successo |
|---|---:|---:|---|
| Scansione e connessione | Da eseguire | Da eseguire | Il manico appare come Sonicare4Kids e lo stato diventa Collegato |
| Lettura metadati | Da eseguire | Da eseguire | Modello, firmware e batteria sono mostrati senza perdere campi dopo update batteria |
| Timer live | Da eseguire | Da eseguire | Avvio/arresto seguono il manico; tempo e zone avanzano senza salti anomali |
| Sync sessione | Da eseguire | Da eseguire | Una sessione terminata compare una sola volta nello storico |
| Due stop ravvicinati | Da eseguire | Da eseguire | Entrambe le sessioni vengono conservate e contabilizzate una sola volta |
| Sessioni offline / salto ID | Da eseguire | Da eseguire | Due sessioni fatte ad app chiusa vengono entrambe importate in ordine; il fallback live viene riconciliato senza doppio accredito e l’orario è ricostruito o dichiarato approssimato |
| Deduplica | Da eseguire | Da eseguire | Sincronizzare di nuovo non accredita XP/monete né duplica la sessione |
| Demo durante scansione | Da eseguire | Da eseguire | Attivando la demo la scansione viene annullata e nessun manico reale resta connesso |
| Disconnect/reconnect | Da eseguire | Da eseguire | Dopo tre cicli non compaiono doppi eventi, timer duplicati o crash |
| Reset di fabbrica | Da eseguire | Da eseguire | Dimenticando il solo manico, il contatore riparte senza perdere o duplicare storico e reward |
| App in background | Da eseguire | Da eseguire | Al ritorno l’app recupera uno stato coerente; nessuna sessione fantasma |
| Riavvio app | Da eseguire | Da eseguire | Storico, progressione e dispositivo precedente restano coerenti |
| Backup/restore | Da eseguire | Da eseguire | Il file si esporta, si reimporta e conserva storico, progressi e ledger |

## Procedura dettagliata

1. Installare una development build pulita e avviare l’app.
2. Aprire **Spazzolino**, verificare che la modalità demo sia disattivata e aprire **Prova guidata e report**.
3. Tornare a **Spazzolino**, premere **Cerca e collega**, quindi compilare nell’assistente nome annunciato, modello, firmware, livello batteria ed eventuali anomalie.
4. Avviare il manico e completare almeno 120 secondi. Verificare lo stato live e i quattro cambi zona.
5. Fermare il manico. Attendere la sincronizzazione automatica e annotare ID sessione, durata e obiettivo.
6. Premere la sincronizzazione manuale due volte. Verificare che storico, XP, monete e reward ledger non cambino dopo la prima contabilizzazione.
7. Avviare una nuova scansione e attivare subito la modalità demo; verificare che la scansione venga annullata e poi disattivare la demo.
8. Completare due sessioni ravvicinate, senza attendere la fine della prima sincronizzazione. Verificare due sole righe e due soli accrediti.
9. Annotare l’ora, chiudere l’app e completare due sessioni col manico. Riaprire e riconnettere: entrambe devono comparire una volta, in ordine, senza salto permanente dell’ID. Verificare che gli orari siano plausibili; se il clock non consente la ricostruzione, la dashboard deve indicarle come approssimate ed escluderle dal calendario. Completare poi una sessione con l’app aperta e verificare che il fallback live venga sostituito senza doppio accredito.
10. Disconnettere e riconnettere tre volte. Durante ogni ciclo avviare e fermare brevemente il manico; non devono apparire callback duplicate.
11. Creare un backup, eseguire il reset di fabbrica del manico, ricollegarlo e premere **Dimentica manico resettato**. Completare una sessione e verificare che i progressi precedenti restino intatti e la nuova sessione sia accreditata una sola volta.
12. Ripetere una sessione dopo aver mandato l’app in background e dopo averla riavviata.
13. Esportare un backup `.brushlings`, annotare dimensione e conteggio sessioni, quindi importarlo su un secondo dispositivo o dopo una reinstallazione controllata.
14. Condividere il report della piattaforma, scegliere **Nuovo**, quindi ripetere tutti i casi su iOS e Android.

## Raccolta evidenze

Per ogni piattaforma conservare il report generato e gli screenshot necessari a riprodurre le anomalie. Non pubblicare identificativi del dispositivo in issue pubbliche; il report applica una redazione automatica, ma le note inserite manualmente vanno comunque controllate prima della condivisione.

## Esito attuale

La copertura automatica usa un client BLE finto e verifica scansione/connessione simulata, annullamento scan/connect/sync, update batteria, rimozione subscription, reconnect, callback stale anche con errore, sync vincolata al manico originario, backfill contiguo, rollover `uint16`, record mancante, clock relativo, due stop ravvicinati, fallback e aggiornamento provider. Verifica inoltre normalizzazione della checklist, limiti delle note e redazione di UUID/MAC nel report. **La retention reale del HX6322/04 e l’intera matrice fisica restano da misurare sul manico, su iOS e su Android.** Nessun risultato hardware è dichiarato finché la tabella non viene compilata.
# Nuove verifiche della roadmap del 26 ottobre 2026

Queste prove si aggiungono alla matrice esistente. Sono procedure da eseguire, non esiti già ottenuti.

| Caso | Procedura | Esito atteso |
|---|---|---|
| Durata guidata | Nel profilo A impostare 60 s; avviare, mettere in pausa, chiudere e riaprire l'app. Provare anche 90 e 120 s. | Il recupero conserva la durata iniziale; quattro zone proporzionali; completamento e durata archiviati coerenti. Il valore GATT del manico non viene riscritto. |
| Profilo e backup | Dare un nome al Brushling, impostare modalità tranquilla e istruzioni babysitter; cambiare profilo, esportare e ripristinare il file sul secondo telefono. | Ogni bambino conserva i propri valori; tutte le nuove preferenze sono nel backup; una scrittura fallita non viene presentata come riuscita. |
| Promemoria intelligente | Attivare le opzioni e completare mattina/sera prima dell'orario programmato. Bloccare il telefono; ripetere dopo riavvio e cambio fuso. | Gli avvisi della routine completata vengono rimossi dopo la sincronizzazione con l'app; il richiamo delle 21 manca dopo la sera completata. Nessuna promessa di rilevare una spazzolata BLE non ancora sincronizzata. |
| Limite notifiche | Usare otto profili con richiamo delle 21; ispezionare le notifiche pendenti e aprire l'app il giorno dopo. | Al massimo 48 notifiche intelligenti; rinnovo della finestra di due giorni. Le opzioni e questo limite sono spiegati nelle impostazioni. |
| Sessione senza telefono | Con timer e manico fermi, registrare una mattina realmente fatta; ritentare e riavviare. | Una sola sessione manuale, nessun cursore BLE modificato, progressi persistenti. Non registrare manualmente un record già presente nel manico. |
| Modalità tranquilla | Attivare la preferenza; avviare il timer e completare una sessione. Provare anche VoiceOver/TalkBack e Riduci movimento di sistema. | Niente musica, chime, haptic o animazioni del compagno; i controlli restano etichettati. |
| Testina e batteria | Inserire un cambio testina a fine mese e collegare un manico con batteria ≤20%. | Scadenza a tre mesi di calendario senza data impossibile; avviso batteria basato sul valore letto. Nessun consumo motore inventato. |
| Rapporti | Archivio >120 sessioni, report 30/90 giorni, invio CSV e annullamento del foglio di condivisione. Provare anche backup legacy parziale. | Rapporti da SQLite completo, nessun identificativo BLE; giorni senza righe presenti nel calendario; incompletezza dichiarata. Aprire il CSV sul dispositivo ricevente e controllare accenti e celle. |
