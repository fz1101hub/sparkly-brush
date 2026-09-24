# Upgrade Expo 57 e Metro — Sparkly Brush

**Data:** 24 settembre 2026  
**Autore:** Manus AI  
**Ramo:** `fix/claude-ultracode-audit`

## Esito

Sparkly Brush è stata aggiornata in modo incrementale da **Expo SDK 54** a **Expo SDK 57.0.24**. Il runtime ora usa **React Native 0.86.3**, **React 19.2.3**, **Expo Router 57.0.22** e **TypeScript 6.0.3**. Il passaggio intermedio attraverso SDK 55 e 56 ha permesso di applicare separatamente le migrazioni incompatibili previste da Expo.[1] [2] [3] [4]

L’aggiornamento risolve anche il limite supply-chain rimasto dall’audit Claude. `image-size` non è più presente nel grafo delle dipendenze e `pnpm audit --prod --audit-level high` non segnala vulnerabilità note. Expo Doctor supera **21 controlli su 21**, le dipendenze rispettano le versioni attese e `pnpm peers check` non rileva incompatibilità.

## Modifiche applicate

| Area | Risultato |
|---|---|
| Expo e React Native | Expo `57.0.24`, React Native `0.86.3`, React `19.2.3` |
| Router | Import applicativi migrati da `@react-navigation/*` agli entry point `expo-router/*`; dipendenze React Navigation dirette rimosse |
| Metro | `@react-native/metro-config` allineato a `0.86.3`; `image-size` assente dal lockfile e dal grafo |
| FileSystem | `File.copy()` atteso correttamente come operazione asincrona, secondo il contratto introdotto da SDK 56 |
| App config | Rimosse le opzioni obsolete `newArchEnabled` ed `edgeToEdgeEnabled`; aggiunti i config plugin richiesti da SDK 56/57 |
| React 19.2 | Corrette le inizializzazioni `Animated.Value`, la purezza del timestamp backup e il valore tema `unspecified` |
| React Native 0.86 | Sostituito `StyleSheet.absoluteFillObject` con `StyleSheet.absoluteFill`; aggiornati i tipi SF Symbols |
| CI | Audit produttivo bloccante dalla severità `high`; build iOS configurata su `macos-26` con Xcode `26.4.1` |

Expo SDK 55 rende obbligatoria la New Architecture e rimuove le relative opzioni legacy dalla configurazione.[1] SDK 56 richiede inoltre che gli import applicativi React Navigation passino dagli entry point Expo Router e rende asincroni `File.copy()` e `File.move()`.[2] [3] SDK 57 aggiorna React Native a 0.86 e, nella versione installata, include le correzioni Hermes V1 per memoria e avvio.[4]

## Verifiche completate

| Gate | Esito |
|---|---|
| Installazione frozen pnpm 12.5.1 | Superata |
| Peer dependencies | Superate |
| TypeScript 6 | Superato |
| Vitest | **30 file, 166 test superati** |
| ESLint | Superato con zero warning |
| Expo dependency check | Superato |
| Expo Doctor | **21/21** |
| Audit produttivo `high` | **Nessuna vulnerabilità nota** |
| Export web | Superato |
| Export iOS | Superato |
| Export Android | Superato |
| Build Android nativa debug | **Superata**, APK da 131.014.287 byte |
| Review indipendente | Nessun blocker nel codice o nelle dipendenze dopo la correzione del runner Xcode |

La build Android è stata rigenerata da zero con Continuous Native Generation, SDK Android 36, JDK 17 e NDK 27.1. I warning osservati provengono da API deprecate interne a Expo/React Native e non hanno impedito `assembleDebug`.

## CI iOS

La prima configurazione usava `macos-latest` con Xcode 26.4. La review ha rilevato che l’immagine macOS 15 disponibile non conteneva quella versione. Il job è stato corretto su **`macos-26` con Xcode `26.4.1`**, combinazione presente nell’inventario ufficiale GitHub e conforme al minimo Xcode 26.4 richiesto da Expo SDK 56 e successivi.[3] [5]

La build iOS nativa non è stata eseguita nel sandbox Linux. Resta un gate separato su runner macOS, avviato manualmente o tramite tag di release.

## Limiti rimasti

L’upgrade software è completo. Restano invariati i limiti di release già documentati: CI GitHub effettivamente verde, build iOS su runner macOS, collaudo fisico con HX6322/04 su iPhone e Android, privacy policy, dichiarazioni store e decisione Kids/Families. Il parental gate resta deliberatamente fuori scope su richiesta del proprietario.

La suite usa ancora `react-test-renderer`, che React 19.2 dichiara deprecato. I test passano, ma producono messaggi informativi; la futura migrazione a una libreria di test mantenuta è un intervento separato e non blocca Expo 57.

## References

[1]: https://expo.dev/changelog/sdk-55 "Expo SDK 55 release notes"
[2]: https://docs.expo.dev/router/migrate/sdk-55-to-56/ "Migrate Expo Router from SDK 55 to SDK 56"
[3]: https://expo.dev/changelog/sdk-56 "Expo SDK 56 release notes"
[4]: https://expo.dev/changelog/sdk-57 "Expo SDK 57 release notes"
[5]: https://github.com/actions/runner-images/blob/main/images/macos/macos-26-Readme.md "GitHub Actions macOS 26 runner image inventory"
