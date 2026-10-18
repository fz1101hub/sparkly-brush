# Temi ordinari

Sei temi disponibili liberamente: Avventura (iniziale), Arcade, Cosmo, Giardino, Bolle e Sottomarino. Le edizioni festive non sono incluse.

## Uso

Dalla Home, toccare la barra del livello («Scegli il tema») oppure aprire Famiglia → Profili e temi. «Scegli il tuo mondo» mostra i sei fondali con le rispettive palette. La scelta si applica dopo il salvataggio; se il salvataggio fallisce, il tema precedente rimane attivo e viene mostrato un messaggio per riprovare.

La preferenza usa la chiave locale `brushlings.appearance.v1`, separata da sessioni, progressi e preferenze di gioco. Non viene trasferita con i backup. Dati mancanti, non validi o non leggibili usano Avventura. Ogni tema include il proprio aspetto chiaro o scuro; non segue automaticamente l'aspetto del sistema.

## Interfaccia

La ricostruzione grafica segue ora le tavole originali A–C–D–E–F–I: riferimento e criteri di confronto sono in [visual-reference-contract.md](visual-reference-contract.md). I rapporti storici di collaudo descrivono la versione precedente e non certificano la fedeltà della ricostruzione.

- Tavole originali conservate nel bundle e ritagliate dichiarativamente per mantenere le illustrazioni e i marchi approvati. Personaggi ed evoluzioni usano grafica tridimensionale; i contatori e i controlli sono componenti reali.
- Home con avanzamento del livello, routine mattina/sera e avvio manuale in primo piano. Il Bluetooth rimane accessibile separatamente.
- Sessione focalizzata su tempo rimanente e quattro zone. Il timer manuale può essere terminato dall'app; una sessione hardware si arresta dallo spazzolino.
- Quattro destinazioni: Oggi, Mondo, Premi e Famiglia. Palette e tipografia condivise tra schermate, risultato e barra di navigazione. Le illustrazioni non modificano habitat posseduti, accessori o premi.
- Animazioni del compagno e dei festeggiamenti rispettano «Riduci movimento» del sistema.

## Verifica

Test dedicati in `tests/app-themes.test.ts`: elenco dei sei temi, contrasto delle palette, salvataggio/ricaricamento, fallback e mancata scrittura. Il controllo nel browser misura i colori dei testi e degli sfondi nel DOM, con soglia 4,5:1 per testo normale e 3:1 per testo grande; non misura i pixel delle illustrazioni o degli sfondi SVG.

Il repository dichiara Node 22 in `.nvmrc`; la CI fissa pnpm 12.5.1 e installa dal lockfile congelato. La verifica include TypeScript, 184 test in 35 file, lint, Expo Doctor e bundle web/iOS/Android, oltre alla compilazione Android debug e iOS simulator.

Il collaudo Playwright attraversa tutte le 12 schermate per ciascuno dei sei temi (72 combinazioni), misura il contrasto dei testi, verifica lo stato accessibile della selezione, il caricamento delle immagini e la persistenza dopo riapertura. Tocca inoltre tutte e quattro le voci della navigazione, verifica timer e pulsante di arresto visibile, isolamento dei progressi, errori di scrittura simulati, sessione manuale completa e recuperabile, progressi dopo reload, viewport da 320 punti e testo raddoppiato con riduzione movimento attiva. Gli originali e gli screenshot reali di Home e sessione sono affiancati in `approved-comparison.html` e nei sei file `comparison-*.png`; il test controlla gli SHA-256 delle tavole originali, mentre l'accettazione grafica richiede l'ispezione dei confronti.

Per ripeterlo:

```bash
pnpm exec playwright install chromium
pnpm exec expo export --platform web --output-dir dist
BRUSHLINGS_TEST_BUILD_DIR=dist pnpm test:ui
```

In alternativa, con il dev server avviato, usare `BRUSHLINGS_TEST_URL=http://127.0.0.1:8081 pnpm test:ui`. Il test usa un profilo browser nuovo e non modifica i dati del browser abituale. Gli screenshot, la tavola comparativa e il rapporto JSON sono in `test-results/themes`; la CI li pubblica come artifact `theme-review`.

Le prove con caratteri ingranditi sul dispositivo e con lo spazzolino HX6322/04 reale restano nel piano di collaudo hardware. La compilazione nativa e i test BLE con periferica simulata non costituiscono una prova del manico fisico.
