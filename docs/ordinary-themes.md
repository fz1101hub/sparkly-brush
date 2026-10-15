# Temi ordinari

Sei temi disponibili liberamente: Avventura (iniziale), Arcade, Cosmo, Giardino, Bolle e Sottomarino. Le edizioni festive non sono incluse.

## Uso

Dalla Home, toccare la tavolozza in alto a destra oppure aprire Impostazioni dall'area di gestione. «Scegli il tuo mondo» mostra i sei fondali con le rispettive palette. La scelta si applica dopo il salvataggio; se il salvataggio fallisce, il tema precedente rimane attivo e viene mostrato un messaggio per riprovare.

La preferenza usa la chiave locale `brushlings.appearance.v1`, separata da sessioni, progressi e preferenze di gioco. Non viene trasferita con i backup. Dati mancanti, non validi o non leggibili usano Avventura. Ogni tema include il proprio aspetto chiaro o scuro; non segue automaticamente l'aspetto del sistema.

## Interfaccia

- Fondali originali inclusi nel bundle, disponibili anche offline. Non contengono testo o creature: il compagno scelto e le sue evoluzioni continuano a usare gli avatar SVG del prodotto.
- Home con avanzamento del livello, routine mattina/sera e avvio manuale in primo piano. Il Bluetooth rimane accessibile separatamente.
- Sessione focalizzata su tempo rimanente e quattro zone. Il timer manuale può essere terminato dall'app; una sessione hardware si arresta dallo spazzolino.
- Palette condivise tra schermate, schede, risultato e barra di navigazione. Le illustrazioni non modificano habitat posseduti, accessori o premi.
- Animazioni del compagno e dei festeggiamenti rispettano «Riduci movimento» del sistema.

## Verifica

Test dedicati in `tests/app-themes.test.ts`: elenco dei sei temi, contrasto delle palette, salvataggio/ricaricamento, fallback e mancata scrittura. I controlli sul contrasto verificano almeno 4,5:1 per testi principali/secondari e pulsanti.

Eseguire nel runtime del repository (Node 22, pnpm 12.5.1): `pnpm check`, `pnpm test`, `pnpm lint` e gli export Expo web/iOS/Android previsti dalla CI.

Revisione visiva ancora necessaria su schermo piccolo, testo ingrandito, passaggio ripetuto tra i sei temi, riavvio, modalità demo, errore di salvataggio e sessioni BLE. I controlli su contrasto e persistenza eseguiti senza dipendenze non sostituiscono la compilazione o questa revisione.
