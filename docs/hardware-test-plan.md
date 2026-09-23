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

## Matrice minima

| Caso | iOS | Android | Criterio di successo |
|---|---:|---:|---|
| Scansione e connessione | Da eseguire | Da eseguire | Il manico appare come Sonicare4Kids e lo stato diventa Collegato |
| Lettura metadati | Da eseguire | Da eseguire | Modello, firmware e batteria sono mostrati senza perdere campi dopo update batteria |
| Timer live | Da eseguire | Da eseguire | Avvio/arresto seguono il manico; tempo e zone avanzano senza salti anomali |
| Sync sessione | Da eseguire | Da eseguire | Una sessione terminata compare una sola volta nello storico |
| Deduplica | Da eseguire | Da eseguire | Sincronizzare di nuovo non accredita XP/monete né duplica la sessione |
| Disconnect/reconnect | Da eseguire | Da eseguire | Dopo tre cicli non compaiono doppi eventi, timer duplicati o crash |
| App in background | Da eseguire | Da eseguire | Al ritorno l’app recupera uno stato coerente; nessuna sessione fantasma |
| Riavvio app | Da eseguire | Da eseguire | Storico, progressione e dispositivo precedente restano coerenti |
| Backup/restore | Da eseguire | Da eseguire | Il file si esporta, si reimporta e conserva storico, progressi e ledger |

## Procedura dettagliata

1. Installare una development build pulita e avviare l’app.
2. Aprire **Spazzolino**, verificare che la modalità demo sia disattivata e premere **Cerca e collega**.
3. Annotare nome annunciato, modello, firmware, livello batteria e messaggi in **Diagnostica BLE**.
4. Avviare il manico e completare almeno 120 secondi. Verificare lo stato live e i quattro cambi zona.
5. Fermare il manico. Attendere la sincronizzazione automatica e annotare ID sessione, durata e obiettivo.
6. Premere la sincronizzazione manuale due volte. Verificare che storico, XP, monete e reward ledger non cambino dopo la prima contabilizzazione.
7. Disconnettere e riconnettere tre volte. Durante ogni ciclo avviare e fermare brevemente il manico; non devono apparire callback duplicate.
8. Ripetere una sessione dopo aver mandato l’app in background e dopo averla riavviata.
9. Esportare un backup `.brushlings`, annotare dimensione e conteggio sessioni, quindi importarlo su un secondo dispositivo o dopo una reinstallazione controllata.
10. Ripetere tutti i casi su iOS e Android.

## Raccolta evidenze

Per ogni piattaforma conservare: versione OS, versione app/commit, firmware del manico, screenshot di **Diagnostica BLE**, esito di ogni riga della matrice e messaggio di errore completo. Non pubblicare identificativi del dispositivo in issue pubbliche.

## Esito attuale

La copertura automatica usa un client BLE finto e verifica scansione/connessione simulata, update batteria, rimozione subscription, reconnect, callback stale, sincronizzazione sessione e aggiornamento provider. **La matrice fisica resta da eseguire perché richiede il manico HX6322/04 e due dispositivi reali.** Nessun risultato hardware è dichiarato finché la tabella non viene compilata.
