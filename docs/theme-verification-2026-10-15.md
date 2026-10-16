# Verifica temi ordinari — 15 ottobre 2026

Il flusso verificato parte dalla scelta del tema nelle Impostazioni, salva la preferenza locale e riapplica la palette alla riapertura, mantenendo indipendenti sessioni, creature e progressi. Il timer manuale completa una sessione, mostra il risultato salvato e conserva la progressione dopo reload. Non sono coinvolti account, backend o API del prodotto.

## Risultati locali

| Controllo | Esito |
| --- | --- |
| Installazione dal lockfile con Node 22 e pnpm 12.5.1 | Passata |
| TypeScript | Passato |
| Vitest | 150 test, 28 file, tutti passati |
| Lint Expo, zero warning | Passato |
| Expo Doctor | 18/18 |
| Export web | Passato, 26 route statiche |
| Export iOS e Android | Entrambi passati, sei fondali inclusi |
| Playwright | 6 temi × 12 schermate, nessun errore JavaScript o di caricamento |
| Persistenza e isolamento dei progressi | Passati |
| Errore di salvataggio del tema | Tema precedente conservato, errore visibile |
| Sessione manuale completa e reload | Risultato e progressi conservati |
| Viewport 390×844 e 320×740 | Passate |
| Riduzione movimento | Attiva durante il collaudo |
| Contrasto dei testi nel campione verificato | Passato; almeno 4,5:1, 3:1 per testo grande |

Il test automatico è in `scripts/verify-theme-ui.cjs`; la procedura è in `docs/ordinary-themes.md`. La CI esegue lo stesso collaudo e conserva screenshot e rapporti nell’artifact `theme-review`.

## Correzioni emerse nel collaudo

- Stato `aria-checked` esplicito per i selettori web dei temi e degli esiti hardware, mantenendo lo stato nativo.
- Permesso wake lock negato gestito senza errori: la sessione continua e i lock arrivati dopo la chiusura vengono rilasciati. Quattro test dedicati coprono diniego, rilascio, attivazione tardiva ed errore di rilascio; il collaudo browser simula esplicitamente il diniego.
- Contrasto corretto per badge di livello, stato della mappa, monete, prezzi, controlli habitat e stati del collaudo.
- Aggiornamenti compatibili degli override per rimuovere la vulnerabilità critica di `shell-quote` e altre segnalazioni transitive correggibili senza migrazioni di API.

## Sicurezza e limiti

L’audit produttivo non rileva vulnerabilità critiche. Restano quattro advisory high e due moderate della toolchain, elencate nel README; il gate CI resta impostato su `critical` e non viene indebolito.

Le build native Android e iOS della prima integrazione sono riuscite nella CI della PR #10 dopo lo sblocco dell’account GitHub. L’esito del commit corrente è consultabile nei check della PR. Nessuna verifica software sostituisce il collaudo del manico fisico o la prova su un dispositivo con testo di sistema ingrandito.
