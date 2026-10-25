# Temi ordinari

Sei temi liberi: Avventura (iniziale), Arcade, Cosmo, Giardino, Bolle e Sottomarino. Arrivati con la PR #10 e portati su questo ramo il 25 ottobre 2026.

## Uso

Dalla Home si tocca la barra del livello («Scegli il tema»), oppure Famiglia → Profili e temi. La scelta vale per il bambino attivo e si applica dopo il salvataggio; se fallisce, il tema precedente resta attivo con un messaggio. La chiave locale è `brushlings.appearance.v1`, separata da progressi e preferenze di gioco e non inclusa nei backup; dati mancanti o non validi tornano ad Avventura. Ogni tema ha il proprio aspetto chiaro o scuro e non segue quello del sistema.

## Interfaccia

La ricostruzione segue le tavole originali A–C–D–E–F–I ([contratto visivo](visual-reference-contract.md)): illustrazioni e marchi sono ritagliati dalle tavole senza ridisegnarli, mentre contatori, timer, zone e pulsanti sono componenti reali con i dati del profilo. Le creature usano la tavola dei compagni; le scritte sono tutte tradotte, e il fumetto italiano disegnato nella tavola della sessione compare solo in italiano.

- Home: mondo illustrato, livello, monete, routine mattina/sera, avvio del timer guidato e accesso allo spazzolino.
- Sessione: tempo rimanente a segmenti, quattro zone, compagno; il timer guidato si mette in pausa o si termina dall'app, una sessione del manico si arresta dallo spazzolino.
- Quattro destinazioni: Oggi, Mondo, Premi e Famiglia; storico, spazzolino, backup e impostazioni si aprono da Famiglia, esplora e missioni da Mondo.
- Le animazioni rispettano «Riduci movimento».

## Verifica

`tests/app-themes.test.ts` controlla elenco, contrasto delle palette, salvataggio e fallback. L'audit axe (`pnpm test:a11y:web`) attraversa per ciascuno dei sei temi Impostazioni, Oggi, sessione, Mondo, Premi, Famiglia e Spazzolino. Lo stesso test salva Home e sessione di ogni tema e `node scripts/theme-comparison.cjs` le mette accanto alle tavole originali, dopo averne verificato gli SHA-256: la CI carica `approved-comparison.png` tra gli artefatti. Il confronto serve a un controllo umano; i test superati non sono un'approvazione grafica.
