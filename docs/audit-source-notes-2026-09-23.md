# Fonti esterne verificate per l’audit del 23 settembre 2026

Queste note raccolgono le fonti esterne usate per verificare i rilievi degli audit indipendenti. Servono come base documentale per il rapporto finale.

## CI e build native

- Run GitHub Actions sul merge corrente `d80c194`: https://github.com/fz1101hub/sparkly-brush/actions/runs/35867397116 — conclusione `failure`.
- Run GitHub Actions sul branch post-audit, ancora sullo stesso SHA prima delle nuove modifiche: https://github.com/fz1101hub/sparkly-brush/actions/runs/35870985341 — conclusione `failure`.
- Run GitHub Actions della PR hardware su `eaf43408`: https://github.com/fz1101hub/sparkly-brush/actions/runs/35866959558 — conclusione `failure`; i log non risultavano più disponibili via `gh run view --log-failed`.
- Expo, sviluppo locale e generazione/compilazione dei progetti nativi: https://docs.expo.dev/guides/local-app-development/.
- Expo, credenziali e firma delle build di distribuzione: https://docs.expo.dev/app-signing/app-credentials/.
- Android Studio, command-line tools ufficiali Linux: https://developer.android.com/studio. Il pacchetto verificato durante il collaudo locale è `commandlinetools-linux-15859902_latest.zip`, checksum SHA-256 `4e4c464f145a7512b57d088ac6c278c03c9eea610886b35a5e0804e74eedf583`.

## Android Bluetooth e Families

- Permessi Bluetooth Android: https://developer.android.com/develop/connectivity/bluetooth/bt-permissions. Per scansione BLE diretta su Android 11/API 30 e precedenti serve `ACCESS_FINE_LOCATION`; su target API 31+ Android documenta `BLUETOOTH_SCAN` con `neverForLocation` quando l’app non deriva posizione e la limitazione della permission location legacy a `maxSdkVersion=30`.
- Companion Device Manager: https://developer.android.com/develop/connectivity/bluetooth/companion-device-pairing. Disponibile da Android 8/API 26; esegue il pairing iniziale senza permission di location, ma non sostituisce la successiva connessione GATT.
- Google Play Families Policy: https://support.google.com/googleplay/android-developer/answer/9893335?hl=en. Se il pubblico target include bambini, la policy richiede Companion Device Manager per Bluetooth salvo incompatibilità OS; un’app rivolta esclusivamente ai bambini non può richiedere permission di localizzazione. L’app attuale ha `minSdkVersion: 24`, scansione diretta e nessuna integrazione CDM. La decisione sul target store/età resta del proprietario.

## BLE e identificatori

- Documentazione react-native-ble-plx: https://dotintent.github.io/react-native-ble-plx/. `Device.id` è un MAC address su Android e un UUID su iOS. Il rilievo era confermato nel formato precedente; il ramo post-audit migra le chiavi locali ad alias SHA-256 troncati e riscrive gli ID legacy nella sola copia portatile, rigenerando il reward ledger senza modificare lo storico locale.
- Implementazione comunitaria Philips Sonicare BLE citata dal progetto: https://github.com/mtheli/philips_sonicare_ble. Il protocollo espone selettore sessione, record sessione, `latestSessionId`, `sessionCount` e `handleTime`; il tempo del manico va usato come clock relativo, non come Unix epoch autonomo. La retention reale dello storico HX6322/04 resta da validare su hardware.

## Advisory dipendenza image-size

- GitHub Advisory `GHSA-w3rx-r6r6-pgpr`: https://github.com/advisories/GHSA-w3rx-r6r6-pgpr. Denial of service nel parser ICNS di `image-size`; la pagina GitHub, aggiornata il 7 agosto 2026 e ricontrollata il 23 settembre 2026, indica versioni affette `<=2.0.2` e **nessuna versione corretta disponibile**.
- GitHub Advisory `GHSA-5p2g-fcmc-qvqq`: https://github.com/advisories/GHSA-5p2g-fcmc-qvqq. Denial of service nei parser JXL/HEIF di `image-size`; la pagina GitHub, aggiornata il 7 agosto 2026 e ricontrollata il 23 settembre 2026, indica versioni affette `<=2.0.2` e **nessuna versione corretta disponibile**.

Il pacchetto arriva transitivamente da Metro/Expo ed è usato durante il tooling di build, non dal runtime mobile distribuito. `pnpm audit` può mostrare un campo macchina `patched_versions >=2.0.3`, ma questo contraddice le due pagine GitHub Reviewed, che dichiarano ancora “Patched versions: None”; non viene quindi applicato un override major non pubblicato o non supportato. La CI mantiene il gate bloccante sulle vulnerabilità `critical`; i due advisory `high` devono restare documentati e monitorati fino a una correzione upstream compatibile.
