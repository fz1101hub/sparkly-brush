# Fonti verificate per l’upgrade Expo 57

- Guida ufficiale Expo all’upgrade SDK: https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/ — consultata il 24 settembre 2026. Raccomanda upgrade incrementali, `expo install --fix`, Expo Doctor e rigenerazione dei progetti nativi con Continuous Native Generation.
- Expo SDK 55: https://expo.dev/changelog/sdk-55 — React Native 0.83 e React 19.2; rimozione di `newArchEnabled` e `edgeToEdgeEnabled`; New Architecture obbligatoria.
- Migrazione Expo Router SDK 55→56: https://docs.expo.dev/router/migrate/sdk-55-to-56/ — gli import applicativi `@react-navigation/*` devono passare agli entry point `expo-router/*` e le dipendenze dirette vanno rimosse.
- Expo SDK 56: https://expo.dev/changelog/sdk-56 — React Native 0.85, React 19.2, TypeScript 6; `File.copy()` e `File.move()` diventano asincroni; iOS minimo 16.4; Hermes V1 della release è affetto da una regressione di memoria.
- Expo SDK 57: https://expo.dev/changelog/sdk-57 — React Native 0.86; `expo@57.0.17` e React Native 0.86.3 risolvono le regressioni Hermes V1 di memoria e startup. Il registry npm riportava `expo@57.0.24` come `latest` il 24 settembre 2026.
- Advisory storici `image-size`: https://github.com/advisories/GHSA-w3rx-r6r6-pgpr e https://github.com/advisories/GHSA-5p2g-fcmc-qvqq. Dopo l’upgrade a Expo 57, `pnpm why image-size` non restituisce più dipendenze e `pnpm audit --prod --audit-level high` non rileva vulnerabilità note.
- Deprecazione React Test Renderer: https://react.dev/warnings/react-test-renderer — React raccomanda di migrare a una libreria mantenuta.
- Test Renderer moderno: https://github.com/mdjastrzebski/test-renderer — la linea 1.2 è compatibile con React 19.2 e sostituisce il renderer React deprecato senza introdurre Jest nel progetto Vitest.
