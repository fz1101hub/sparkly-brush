# Audit della repository — Sparkly Brush

Data: 22 settembre 2026 · Commit analizzato: `c0fd3b2`

## Sintesi

Sparkly Brush è un prototipo Expo/React Native (iOS/Android/web) per il Philips Sonicare for Kids HX6322/04. La parte applicativa (client BLE, codec, timer, storico locale) è ben scritta, coerente con quanto dichiarato nel README e verificata: **typecheck, lint e i 3 test del codec passano tutti**.

Il rischio principale non sta nell'app ma nel **backend boilerplate del template Manus** incluso nella repo (Express + tRPC + Drizzle/MySQL + OAuth): oggi non è usato dall'app — lo storico resta sul telefono — ma se venisse deployato così com'è esporrebbe diverse vulnerabilità serie. La raccomandazione principale è **rimuoverlo** (o, se servirà in futuro, correggerlo prima del deploy).

Verifiche eseguite: lettura completa del codice sorgente, `pnpm check` (tsc) ✅, `pnpm lint` ✅, `pnpm test` ✅ (3 passati, 1 skippato), `pnpm audit --prod` (146 advisory: 2 critical, 87 high, 50 moderate, 7 low — in gran parte nella toolchain Expo), ricerca di segreti hardcoded (nessuno trovato), controllo della storia git (nessun file `.env` mai committato).

---

## 1. Sicurezza

### Critiche (solo se il server viene deployato)

**S1 — CORS riflesso con credenziali su tutte le rotte** — `server/_core/index.ts:35-53`
Il middleware riflette qualsiasi `Origin` e imposta `Access-Control-Allow-Credentials: true`. Combinato con il cookie di sessione `SameSite=None` (`server/_core/cookies.ts:57`), qualunque sito web può eseguire richieste autenticate a nome dell'utente e leggerne le risposte (`/api/auth/me`, tRPC): CSRF e esfiltrazione dati. Correzione: allowlist di origin espliciti.

**S2 — Storage proxy senza autenticazione** — `server/_core/storageProxy.ts:5-47`
`GET /manus-storage/*` genera presigned URL per **qualsiasi** chiave passata nel path, usando la Forge API key del server, senza alcun controllo di autenticazione o di scope. È un open proxy sull'intero bucket di storage.

**S3 — Nessun fail-fast su `JWT_SECRET` mancante** — `server/_core/env.ts:3`, `server/_core/sdk.ts:138-141`
`cookieSecret` ha default `""`. Se la variabile manca, i JWT HS256 di sessione vengono firmati con segreto vuoto → token forgiabili da chiunque. Il server dovrebbe rifiutarsi di partire senza un segreto valido.

### Alte

**S4 — `state` OAuth non validato (no anti-CSRF)** — `server/_core/sdk.ts:41-44`, `constants/oauth.ts:81-92`
Lo `state` è solo il redirectUri in base64, senza nonce firmato o verifica server-side: niente protezione CSRF sul flusso di login, e il redirectUri usato nello scambio code→token è controllabile dal chiamante.

**S5 — Token di sessione in query string** — `app/oauth/callback.tsx:33-36, 106-165`
Il callback accetta `sessionToken` come parametro URL: i token finiscono in history del browser, log e referrer. Inoltre i log di debug stampano i primi 20-50 caratteri dei token (`lib/_core/auth.ts:27,45`, `lib/_core/api.ts:110`): da rimuovere in produzione.

**S6 — Dipendenze runtime con vulnerabilità note** (aggiornamenti disponibili, `pnpm audit`)
- `axios` < 1.16.0 — prototype pollution, MITM via `config.proxy`, leak di credenziali (HIGH, multiple)
- `drizzle-orm` < 0.45.2 — SQL injection via escaping identificatori (HIGH)
- `mysql2` < 3.22.0 — downgrade a `mysql_clear_password`, leak credenziali (HIGH)
- `@trpc/server` < 11.8.0 — prototype pollution (HIGH)
- `form-data` < 4.0.6 (via axios) — CRLF injection (HIGH)

Le 2 critical (`shell-quote`, `tar`) e la maggior parte delle high restanti stanno nella toolchain di sviluppo Expo/Metro/CLI: impatto solo in dev, si risolvono in gran parte aggiornando Expo.

### Medie / hardening

**S7 — `.env` non ignorato da git** — `.gitignore:34` copre solo `.env*.local`. Chi crea un `.env` con `JWT_SECRET`/`DATABASE_URL` (come previsto da `scripts/load-env.js`) rischia di committarlo. Aggiungere `.env` al `.gitignore`. (Verificato: nessun `.env` è mai stato committato.)

**S8 — Body limit 50 MB e nessun rate limiting** — `server/_core/index.ts:55-56`: DoS a basso costo su un server pubblico.

**S9 — Sessioni valide 1 anno** (`ONE_YEAR_MS`) senza rotazione né revoca lato server.

**Aspetti positivi**: nessun segreto hardcoded; cookie `httpOnly`; permessi Android BLE corretti (SCAN/CONNECT + FINE_LOCATION solo per API < 31); stringhe di uso Bluetooth iOS presenti; la dichiarazione privacy del README corrisponde al codice (nessun dato lascia il telefono: nessuna schermata usa tRPC o l'auth).

---

## 2. Architettura e manutenzione

**A1 — Backend boilerplate inutilizzato (raccomandazione principale)**
Il router applicativo (`server/routers.ts`) contiene solo `system` + `auth` del template; il README dichiara esplicitamente che non serve un account né un server. Sono di fatto peso morto: `server/`, `drizzle/`, `lib/_core/api|auth|manus-runtime`, `hooks/use-auth.ts`, `app/oauth/callback.tsx`, `app/dev/theme-lab.tsx`, `constants/oauth.ts`, `template.json` (17 KB di descriptor del template) e le dipendenze `express`, `mysql2`, `drizzle-orm`, `@trpc/*`, `jose`, `axios`, `superjson`, `cookie`, `dotenv`. Rimuoverli elimina S1-S6/S8-S9 alla radice, riduce install e superficie d'attacco.

**A2 — Identità del progetto**: `package.json` si chiama ancora `app-template` v1.0.0; manca `"type": "module"` (warning a ogni lint). Il deep-link scheme derivato dal bundleId col meccanismo timestamp Manus produce `manussparklybrush` (`app.config.ts:24-27`): funziona ma è un residuo del template; se l'OAuth viene rimosso, si può usare uno scheme parlante (`sparklybrush`).

**A3 — Asset e componenti orfani** (~1,5 MB): `react-logo*.png`, `partial-react-logo.png` e i componenti `hello-wave`, `parallax-scroll-view`, `external-link`, `collapsible` non sono referenziati. `sparkly-brush-icon.png` e `sparkly-brush-splash.png` non sono usati (la config usa `icon.png` e `splash-icon.png`; `splash-icon.png` è byte-identico a `android-icon-foreground.png`).

**A4 — Niente CI**: nessun workflow GitHub Actions; `check`/`lint`/`test` esistono ma non sono enforced sulle push.

**A5 — Manca una licenza** (`LICENSE`). Il rischio di denominazione Philips/Sonicare è già correttamente riconosciuto nel README.

**A6 — `userInterfaceStyle: "light"`** in `app.config.ts:48` mentre `theme.config.js` definisce una palette dark completa: scelta legittima per un prototipo, ma da uniformare.

---

## 3. Qualità del codice applicativo (BLE / timer / storico)

Giudizio complessivo: **buono**. Separazione piattaforma pulita (`sonicare-client.native/web.ts`), codec validato contro una cattura reale HX6340 con test su record corti/ID errati/durate implausibili, storico con cap a 120 sessioni e log diagnostici a 80, gestione permessi Android per versione API corretta.

Rilievi minori:

- **B1** — `lib/sonicare-client.native.ts:195`: ternario senza effetto (`handleState === 2 ? this.live.elapsedSeconds : this.live.elapsedSeconds`) — entrambi i rami identici; o è un bug (l'elapsed andrebbe azzerato/congelato) o va semplificato.
- **B2** — `lib/sonicare-client.native.ts:232-245`: la notifica batteria invia `model: "HX6322/04"` fisso; il merge `{ ...current, ...next }` in `contexts/brush-context.tsx:104-108` sovrascrive così il modello dettagliato (`"HX6322/04 · <modello letto>"`) a ogni aggiornamento batteria. Meglio omettere `model` dall'update batteria.
- **B3** — Le subscription dei monitor si accumulano in `this.subscriptions` a ogni riconnessione e vengono rimosse solo in `destroy()`: leak lieve in caso di connect/disconnect ripetuti; rimuoverle in `disconnect()`.
- **B4** — Copertura test minima: solo il codec. I candidati a costo più basso sono `brush-storage` (dedup/ordinamento/cap) e la logica di salvataggio sessione del context.
- **B5** — Il test di `auth.logout` è `describe.skip` (coerente con il backend inutilizzato: sparirebbe con A1).

---

## 4. Azioni consigliate in ordine di priorità

1. Decidere il destino del backend (A1): rimuoverlo (consigliato per l'app dichiarata) oppure correggere S1, S2, S3, S4 e S8 **prima** di qualunque deploy.
2. Aggiungere `.env` al `.gitignore` (S7) — una riga, nessun rischio.
3. Aggiornare le dipendenze runtime vulnerabili (S6): `axios`, `drizzle-orm`, `mysql2`, `@trpc/server` (o eliminarle con A1).
4. Pulizia: asset orfani, componenti template, `template.json`, nome pacchetto (A2, A3).
5. Aggiungere una CI minima (typecheck + lint + test) e una licenza (A4, A5).
6. Sistemare i rilievi B1-B3 nel client BLE e togliere i log dei token (S5) prima di una build distribuita.
